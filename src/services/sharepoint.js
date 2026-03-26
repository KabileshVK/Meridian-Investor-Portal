// ─────────────────────────────────────────────────────────
//  SharePoint Service — Microsoft Graph API
//  All data reads/writes go through this service
// ─────────────────────────────────────────────────────────

class SharePointService {
  constructor() {
    this.baseUrl = CONFIG.GRAPH.BASE_URL;
    this.siteUrl  = CONFIG.SHAREPOINT.SITE_URL;
    this.lists    = CONFIG.SHAREPOINT.LISTS;
  }

  // ── TOKEN MANAGEMENT ───────────────────────────────────
  getAccessToken() {
    return sessionStorage.getItem('sp_access_token');
  }

  setAccessToken(token, expiresIn) {
    sessionStorage.setItem('sp_access_token', token);
    sessionStorage.setItem('sp_token_expiry', Date.now() + (expiresIn * 1000));
  }

  isTokenExpired() {
    const expiry = sessionStorage.getItem('sp_token_expiry');
    return !expiry || Date.now() > parseInt(expiry);
  }

  // ── HTTP HELPERS ────────────────────────────────────────
  async graphRequest(endpoint, method = 'GET', body = null) {
    const token = this.getAccessToken();
    if (!token || this.isTokenExpired()) {
      window.location.href = '/login?reason=session_expired';
      return null;
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (response.status === 401) {
      sessionStorage.clear();
      window.location.href = '/login?reason=unauthorized';
      return null;
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Graph API error: ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  // ── SITE ID ─────────────────────────────────────────────
  async getSiteId() {
    if (this._siteId) return this._siteId;
    const hostname = 'prudentautolytics49.sharepoint.com';
    const path     = '/sites/ASP-InestorPortal';
    const data     = await this.graphRequest(`/sites/${hostname}:${path}`);
    this._siteId   = data.id;
    return this._siteId;
  }

  // ── LIST ITEMS ──────────────────────────────────────────
  async getListItems(listName, filter = '', select = '', orderby = '') {
    const siteId = await this.getSiteId();
    let url = `/sites/${siteId}/lists/${listName}/items?expand=fields`;
    if (filter)  url += `&$filter=${encodeURIComponent(filter)}`;
    if (select)  url += `&$select=${encodeURIComponent(select)}`;
    if (orderby) url += `&$orderby=${encodeURIComponent(orderby)}`;
    const data = await this.graphRequest(url);
    return data?.value?.map(i => ({ id: i.id, ...i.fields })) || [];
  }

  async createListItem(listName, fields) {
    const siteId = await this.getSiteId();
    return this.graphRequest(
      `/sites/${siteId}/lists/${listName}/items`,
      'POST',
      { fields }
    );
  }

  async updateListItem(listName, itemId, fields) {
    const siteId = await this.getSiteId();
    return this.graphRequest(
      `/sites/${siteId}/lists/${listName}/items/${itemId}/fields`,
      'PATCH',
      fields
    );
  }

  async deleteListItem(listName, itemId) {
    const siteId = await this.getSiteId();
    return this.graphRequest(
      `/sites/${siteId}/lists/${listName}/items/${itemId}`,
      'DELETE'
    );
  }

  // ── PORTAL USERS ────────────────────────────────────────
  async getUserByEmail(email) {
    const items = await this.getListItems(
      this.lists.USERS,
      `fields/Email eq '${email}'`
    );
    return items[0] || null;
  }

  async createUser(userData) {
    return this.createListItem(this.lists.USERS, {
      Title:        userData.name,
      Email:        userData.email,
      Role:         userData.role,
      FundAccess:   userData.fundAccess,
      Status:       'PendingVerification',
      RegisteredAt: new Date().toISOString(),
      LoginCount:   0,
      MFAEnabled:   false
    });
  }

  async updateUserLastLogin(userId) {
    return this.updateListItem(this.lists.USERS, userId, {
      LastLoginAt: new Date().toISOString(),
      LoginCount:  null // Handled server-side increment
    });
  }

  async getAllUsers() {
    return this.getListItems(this.lists.USERS, '', '', 'fields/Title asc');
  }

  // ── SESSIONS ────────────────────────────────────────────
  async createSession(userId, email, token) {
    const expiresAt = new Date(Date.now() + CONFIG.PORTAL.MAGIC_LINK_EXPIRY * 60 * 1000);
    return this.createListItem(this.lists.SESSIONS, {
      Title:     `session_${userId}_${Date.now()}`,
      UserEmail: email,
      UserID:    userId,
      Token:     token,
      ExpiresAt: expiresAt.toISOString(),
      Used:      false,
      IPAddress: ''
    });
  }

  async getSessionByToken(token) {
    const items = await this.getListItems(
      this.lists.SESSIONS,
      `fields/Token eq '${token}' and fields/Used eq false`
    );
    return items[0] || null;
  }

  async markSessionUsed(sessionId) {
    return this.updateListItem(this.lists.SESSIONS, sessionId, {
      Used: true,
      UsedAt: new Date().toISOString()
    });
  }

  // ── REPORTS ─────────────────────────────────────────────
  async getReports(fundAccess) {
    const filter = fundAccess === 'All'
      ? ''
      : `fields/FundName eq '${fundAccess}'`;
    return this.getListItems(this.lists.REPORTS, filter, '', 'fields/PeriodEnd desc');
  }

  async createReport(reportData) {
    return this.createListItem(this.lists.REPORTS, {
      Title:       reportData.title,
      FundName:    reportData.fund,
      PeriodStart: reportData.periodStart,
      PeriodEnd:   reportData.periodEnd,
      NAV:         reportData.nav,
      Occupancy:   reportData.occupancy,
      RentalIncome:reportData.rentalIncome,
      FileURL:     reportData.fileUrl,
      PublishedAt: new Date().toISOString(),
      PublishedBy: reportData.publishedBy,
      Status:      'Published'
    });
  }

  // ── KPI DATA ─────────────────────────────────────────────
  async getKPIData(fundName, quarter) {
    let filter = `fields/FundName eq '${fundName}'`;
    if (quarter) filter += ` and fields/Quarter eq '${quarter}'`;
    const items = await this.getListItems(this.lists.KPI_DATA, filter, '', 'fields/Period desc');
    return items[0] || null;
  }

  async getAllKPIData(fundAccess) {
    const filter = fundAccess === 'All' ? '' : `fields/FundName eq '${fundAccess}'`;
    return this.getListItems(this.lists.KPI_DATA, filter, '', 'fields/Period desc');
  }

  // ── PROPERTIES ──────────────────────────────────────────
  async getProperties(filter = '') {
    return this.getListItems(this.lists.PROPERTIES, filter, '', 'fields/City asc');
  }

  async createProperty(data) {
    return this.createListItem(this.lists.PROPERTIES, {
      Title:       data.name,
      City:        data.city,
      Country:     data.country,
      Latitude:    data.lat,
      Longitude:   data.lng,
      AssetClass:  data.assetClass,
      Occupancy:   data.occupancy,
      AnnualIncome:data.annualIncome,
      Units:       data.units,
      FundName:    data.fund,
      Status:      data.status || 'Active'
    });
  }

  // ── FUNDS ────────────────────────────────────────────────
  async getFunds() {
    return this.getListItems(this.lists.FUNDS);
  }

  // ── AUDIT LOG ────────────────────────────────────────────
  async writeAuditLog(action, userEmail, details = '') {
    return this.createListItem(this.lists.AUDIT_LOG, {
      Title:     action,
      UserEmail: userEmail,
      Action:    action,
      Details:   details,
      Timestamp: new Date().toISOString(),
      IPAddress: ''
    }).catch(e => console.warn('Audit log failed:', e)); // Non-blocking
  }

  // ── GRAPH EMAIL (Magic Link) ─────────────────────────────
  async sendMagicLinkEmail(toEmail, toName, magicLink, type = 'login') {
    const isRegistration = type === 'register';
    const subject = isRegistration
      ? `Welcome to ${CONFIG.PORTAL.NAME} — Confirm your registration`
      : `Your secure login link — ${CONFIG.PORTAL.NAME}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { margin:0; padding:0; background:#F7F9FC; font-family:'Segoe UI',sans-serif; }
  .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(10,37,64,0.10); }
  .header { background:linear-gradient(135deg,#0A2540,#1E6FD9); padding:40px 40px 32px; }
  .header-logo { font-size:22px; font-weight:700; color:#fff; letter-spacing:0.02em; }
  .header-logo span { color:#C8A96E; }
  .body { padding:40px; }
  .greeting { font-size:22px; font-weight:600; color:#0A2540; margin-bottom:12px; }
  .text { font-size:15px; color:#4A6080; line-height:1.7; margin-bottom:28px; }
  .btn { display:inline-block; background:#1E6FD9; color:#fff; padding:16px 36px; border-radius:8px; text-decoration:none; font-size:15px; font-weight:600; letter-spacing:0.02em; }
  .expiry { margin-top:24px; font-size:13px; color:#8099B8; }
  .security { margin-top:32px; padding:16px; background:#F7F9FC; border-radius:8px; font-size:12px; color:#8099B8; line-height:1.6; }
  .footer { background:#F7F9FC; padding:24px 40px; font-size:12px; color:#8099B8; border-top:1px solid #EEF2F8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="header-logo">Meridian <span>Capital</span></div>
  </div>
  <div class="body">
    <div class="greeting">Hello, ${toName || 'Investor'}</div>
    <p class="text">
      ${isRegistration
        ? 'Thank you for registering with the Meridian Investor Portal. Click the button below to confirm your email address and activate your account.'
        : 'You requested a secure sign-in link for the Meridian Investor Portal. Click the button below to access your account — no password needed.'
      }
    </p>
    <a href="${magicLink}" class="btn">
      ${isRegistration ? 'Confirm Registration & Sign In' : 'Sign In Securely'}
    </a>
    <p class="expiry">⏱ This link expires in ${CONFIG.PORTAL.MAGIC_LINK_EXPIRY} minutes and can only be used once.</p>
    <div class="security">
      🔒 <strong>Security notice:</strong> If you did not request this link, you can safely ignore this email. Your account remains secure. Never share this link with anyone.
    </div>
  </div>
  <div class="footer">
    ${CONFIG.PORTAL.NAME} · ${CONFIG.PORTAL.COMPANY}<br/>
    Need help? Contact <a href="mailto:${CONFIG.PORTAL.SUPPORT_EMAIL}" style="color:#1E6FD9">${CONFIG.PORTAL.SUPPORT_EMAIL}</a>
  </div>
</div>
</body>
</html>`;

    // Send via Microsoft Graph (requires Mail.Send permission on App Registration)
    const token = this.getAccessToken();
    const payload = {
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: toEmail, name: toName || toEmail } }],
        from: { emailAddress: { address: CONFIG.GRAPH.SEND_AS, name: CONFIG.GRAPH.SENDER_NAME } }
      },
      saveToSentItems: false
    };

    const response = await fetch(
      `${this.baseUrl}/users/${CONFIG.GRAPH.SEND_AS}/sendMail`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    return response.ok;
  }
}

// Singleton
const spService = new SharePointService();
