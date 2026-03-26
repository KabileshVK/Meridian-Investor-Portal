// ─────────────────────────────────────────────────────────
//  Auth Service — Magic Link via Microsoft Graph
// ─────────────────────────────────────────────────────────

class AuthService {

  // ── GENERATE SECURE TOKEN ──────────────────────────────
  generateToken(length = 64) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── CURRENT USER ───────────────────────────────────────
  getCurrentUser() {
    const raw = sessionStorage.getItem('meridian_user');
    return raw ? JSON.parse(raw) : null;
  }

  setCurrentUser(user) {
    sessionStorage.setItem('meridian_user', JSON.stringify({
      ...user,
      sessionStart: Date.now()
    }));
  }

  clearSession() {
    sessionStorage.clear();
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Session timeout check
    const timeout = CONFIG.PORTAL.SESSION_TIMEOUT * 60 * 1000;
    if (Date.now() - user.sessionStart > timeout) {
      this.clearSession();
      return false;
    }
    return true;
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'Admin';
  }

  refreshSession() {
    const user = this.getCurrentUser();
    if (user) this.setCurrentUser(user);
  }

  // ── OAUTH2 TOKEN (Client Credentials for Graph API) ────
  // NOTE: In production this must be done server-side (Azure Function)
  // This pattern is here to show the flow — client secret must NOT
  // be in frontend code in production. Use Azure Functions as proxy.
  async getGraphToken() {
    // In production: call your Azure Function endpoint
    // e.g. await fetch('/api/auth/token')
    // For demo with delegated permissions (user login), use MSAL instead:
    // https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview

    const existing = sessionStorage.getItem('sp_access_token');
    const expiry   = sessionStorage.getItem('sp_token_expiry');
    if (existing && expiry && Date.now() < parseInt(expiry)) return existing;

    // Call Azure Function proxy (keep client_secret server-side)
    const resp = await fetch('/api/auth/token');
    if (!resp.ok) throw new Error('Failed to obtain access token');
    const data = await resp.json();
    spService.setAccessToken(data.access_token, data.expires_in);
    return data.access_token;
  }

  // ── REGISTRATION FLOW ──────────────────────────────────
  async register(name, email) {
    await this.getGraphToken();

    // Check if user already exists
    const existing = await spService.getUserByEmail(email);
    if (existing) {
      if (existing.Status === 'Active') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
    }

    // Create user record in SharePoint
    const user = existing || await spService.createUser({ name, email, role: 'Investor', fundAccess: 'Fund I — Residential' });

    // Generate magic link token
    const token = this.generateToken();
    await spService.createSession(user.id, email, token);

    // Build magic link
    const magicLink = `${window.location.origin}/verify?token=${token}&action=register`;

    // Send confirmation email via Graph
    await spService.sendMagicLinkEmail(email, name, magicLink, 'register');
    await spService.writeAuditLog('REGISTER_REQUEST', email, `New registration: ${name}`);

    return true;
  }

  // ── LOGIN FLOW (Magic Link) ────────────────────────────
  async requestLoginLink(email) {
    await this.getGraphToken();

    const user = await spService.getUserByEmail(email);
    if (!user) {
      throw new Error('No account found with this email. Please register first.');
    }
    if (user.Status === 'PendingVerification') {
      throw new Error('Your account is pending verification. Please check your email.');
    }
    if (user.Status === 'Suspended') {
      throw new Error('Your account has been suspended. Contact support.');
    }

    const token = this.generateToken();
    await spService.createSession(user.id, email, token);

    const magicLink = `${window.location.origin}/verify?token=${token}&action=login`;
    await spService.sendMagicLinkEmail(email, user.Title, magicLink, 'login');
    await spService.writeAuditLog('LOGIN_REQUEST', email);

    return true;
  }

  // ── VERIFY MAGIC LINK ─────────────────────────────────
  async verifyToken(token) {
    await this.getGraphToken();

    const session = await spService.getSessionByToken(token);
    if (!session) throw new Error('This link is invalid or has already been used.');

    // Check expiry
    if (new Date(session.ExpiresAt) < new Date()) {
      throw new Error('This link has expired. Please request a new one.');
    }

    // Mark session used
    await spService.markSessionUsed(session.id);

    // Get user
    const user = await spService.getUserByEmail(session.UserEmail);
    if (!user) throw new Error('User account not found.');

    // Activate if pending
    if (user.Status === 'PendingVerification') {
      await spService.updateListItem(CONFIG.SHAREPOINT.LISTS.USERS, user.id, {
        Status: 'Active',
        ActivatedAt: new Date().toISOString()
      });
    }

    // Update last login
    await spService.updateListItem(CONFIG.SHAREPOINT.LISTS.USERS, user.id, {
      LastLoginAt: new Date().toISOString()
    });

    // Set session
    this.setCurrentUser({
      id:         user.id,
      name:       user.Title,
      email:      user.Email,
      role:       user.Role,
      fundAccess: user.FundAccess,
      initials:   user.Title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    });

    await spService.writeAuditLog('LOGIN_SUCCESS', user.Email);
    return user;
  }

  // ── LOGOUT ─────────────────────────────────────────────
  logout(reason = '') {
    const user = this.getCurrentUser();
    if (user) spService.writeAuditLog('LOGOUT', user.email);
    this.clearSession();
    window.location.href = '/login' + (reason ? `?reason=${reason}` : '');
  }

  // ── ROUTE GUARD ────────────────────────────────────────
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login?reason=auth_required';
      return false;
    }
    this.refreshSession();
    return true;
  }

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      window.location.href = '/403.html';
      return false;
    }
    return true;
  }
}

const authService = new AuthService();

// Auto session timeout check every minute
setInterval(() => {
  const user = authService.getCurrentUser();
  if (user && !authService.isAuthenticated()) {
    authService.logout('session_expired');
  }
}, 60000);
