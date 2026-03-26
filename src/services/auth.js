// ─────────────────────────────────────────────────────────
//  Auth Service — MSAL Redirect Flow (no popup = no CORS)
// ─────────────────────────────────────────────────────────

let _msalInstance = null;
let _msalInitialized = false;

async function getMSAL() {
  if (!_msalInstance) {
    const PCA = window.msal?.PublicClientApplication;
    if (!PCA) throw new Error('MSAL library not loaded.');
    _msalInstance = new PCA(msalConfig);
  }
  if (!_msalInitialized) {
    await _msalInstance.initialize();
    _msalInitialized = true;

    // ── Handle redirect response on page load ─────────────
    try {
      const response = await _msalInstance.handleRedirectPromise();
      if (response?.accessToken) {
        sessionStorage.setItem('sp_access_token', response.accessToken);
        sessionStorage.setItem('sp_token_expiry', Date.now() + 3600 * 1000);

        // If we were mid-login/register, resume it
        const pending = sessionStorage.getItem('meridian_pending_action');
        if (pending) {
          sessionStorage.removeItem('meridian_pending_action');
          const { action, email, name, org } = JSON.parse(pending);
          spService.setAccessToken(response.accessToken, 3600);
          if (action === 'login')    await authService._doLoginLink(email);
          if (action === 'register') await authService._doRegister(name, email, org);
        }
      }
    } catch(e) {
      console.warn('MSAL redirect handle error:', e.message);
    }
  }
  return _msalInstance;
}

class AuthService {

  generateToken(length = 64) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── GET TOKEN — silent first, then redirect ────────────
  async getGraphToken() {
    const msalApp = await getMSAL();
    const accounts = msalApp.getAllAccounts();

    // 1. Try silent
    if (accounts.length > 0) {
      try {
        const result = await msalApp.acquireTokenSilent({
          scopes:  CONFIG.GRAPH.SCOPES,
          account: accounts[0]
        });
        spService.setAccessToken(result.accessToken, 3600);
        return result.accessToken;
      } catch(e) {
        // Silent failed — need interactive
      }
    }

    // 2. Already have a valid stored token?
    const stored  = sessionStorage.getItem('sp_access_token');
    const expiry  = sessionStorage.getItem('sp_token_expiry');
    if (stored && expiry && Date.now() < parseInt(expiry)) {
      return stored;
    }

    // 3. Redirect to Microsoft login
    // Store pending action so we can resume after redirect
    return null; // caller must check and trigger redirect
  }

  async triggerLoginRedirect(pendingAction) {
    const msalApp = await getMSAL();
    if (pendingAction) {
      sessionStorage.setItem('meridian_pending_action', JSON.stringify(pendingAction));
    }
    await msalApp.acquireTokenRedirect({ scopes: CONFIG.GRAPH.SCOPES });
  }

  // ── SESSION ────────────────────────────────────────────
  getCurrentUser() {
    const raw = sessionStorage.getItem('meridian_user');
    return raw ? JSON.parse(raw) : null;
  }

  setCurrentUser(user) {
    sessionStorage.setItem('meridian_user', JSON.stringify({
      ...user, sessionStart: Date.now()
    }));
  }

  clearSession() {
    ['meridian_user','sp_access_token','sp_token_expiry','meridian_pending_action']
      .forEach(k => sessionStorage.removeItem(k));
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (Date.now() - user.sessionStart > CONFIG.PORTAL.SESSION_TIMEOUT * 60 * 1000) {
      this.clearSession(); return false;
    }
    return true;
  }

  isAdmin()        { return this.getCurrentUser()?.role === 'Admin'; }
  refreshSession() { const u = this.getCurrentUser(); if (u) this.setCurrentUser(u); }

  // ── LOGIN REQUEST ──────────────────────────────────────
  async requestLoginLink(email) {
    let token = await this.getGraphToken();
    if (!token) {
      // Need to authenticate first — redirect to MS login
      await this.triggerLoginRedirect({ action: 'login', email });
      return; // page will redirect
    }
    spService.setAccessToken(token, 3600);
    await this._doLoginLink(email);
  }

  async _doLoginLink(email) {
    const user = await spService.getUserByEmail(email);
    if (!user) throw new Error('No account found. Please register first.');
    if (user.Status === 'PendingVerification') throw new Error('Account pending verification. Check your inbox.');
    if (user.Status === 'Suspended') throw new Error('Account suspended. Contact support.');

    const magicToken = this.generateToken();
    await spService.createSession(user.id, email, magicToken);
    const magicLink = `${window.location.origin}/src/verify.html?token=${magicToken}&action=login`;
    await spService.sendMagicLinkEmail(email, user.Title, magicLink, 'login');
    await spService.writeAuditLog('LOGIN_REQUEST', email);
    return true;
  }

  // ── REGISTER ───────────────────────────────────────────
  async register(name, email, org) {
    let token = await this.getGraphToken();
    if (!token) {
      await this.triggerLoginRedirect({ action: 'register', name, email, org });
      return;
    }
    spService.setAccessToken(token, 3600);
    await this._doRegister(name, email, org);
  }

  async _doRegister(name, email, org) {
    const existing = await spService.getUserByEmail(email);
    if (existing?.Status === 'Active') throw new Error('Account already exists. Please sign in instead.');
    const user = existing || await spService.createUser({
      name, email, org, role: 'Investor', fundAccess: 'Fund I — Residential'
    });
    const magicToken = this.generateToken();
    await spService.createSession(user.id, email, magicToken);
    const magicLink = `${window.location.origin}/src/verify.html?token=${magicToken}&action=register`;
    await spService.sendMagicLinkEmail(email, name, magicLink, 'register');
    await spService.writeAuditLog('REGISTER_REQUEST', email, `${name} | ${org}`);
    return true;
  }

  // ── VERIFY MAGIC LINK ──────────────────────────────────
  async verifyToken(token) {
    let graphToken = await this.getGraphToken();
    if (!graphToken) {
      await this.triggerLoginRedirect({ action: 'verify', token });
      return;
    }
    spService.setAccessToken(graphToken, 3600);

    const session = await spService.getSessionByToken(token);
    if (!session) throw new Error('This link is invalid or has already been used.');
    if (new Date(session.ExpiresAt) < new Date()) throw new Error('This link has expired. Please request a new one.');

    await spService.markSessionUsed(session.id);
    const user = await spService.getUserByEmail(session.UserEmail);
    if (!user) throw new Error('User account not found.');

    if (user.Status === 'PendingVerification') {
      await spService.updateListItem(CONFIG.SHAREPOINT.LISTS.USERS, user.id, {
        Status: 'Active', ActivatedAt: new Date().toISOString()
      });
    }
    await spService.updateListItem(CONFIG.SHAREPOINT.LISTS.USERS, user.id, {
      LastLoginAt: new Date().toISOString()
    });
    this.setCurrentUser({
      id:         user.id,
      name:       user.Title,
      email:      user.Email,
      role:       user.Role,
      fundAccess: user.FundAccess,
      initials:   (user.Title||'').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
    });
    await spService.writeAuditLog('LOGIN_SUCCESS', user.Email);
    return user;
  }

  // ── LOGOUT ─────────────────────────────────────────────
  async logout(reason = '') {
    const user = this.getCurrentUser();
    if (user) await spService.writeAuditLog('LOGOUT', user.email).catch(()=>{});
    this.clearSession();
    try {
      const msalApp = await getMSAL();
      await msalApp.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + '/src/login.html'
      });
    } catch(e) {
      window.location.href = '/src/login.html' + (reason ? `?reason=${reason}` : '');
    }
  }

  // ── ROUTE GUARDS ───────────────────────────────────────
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/src/login.html?reason=auth_required';
      return false;
    }
    this.refreshSession();
    return true;
  }

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) { window.location.href = '/src/403.html'; return false; }
    return true;
  }
}

const authService = new AuthService();

// Init MSAL on every page load to handle redirect response
getMSAL().catch(e => console.warn('MSAL init error:', e.message));

// Session timeout check
setInterval(() => {
  if (authService.getCurrentUser() && !authService.isAuthenticated()) {
    authService.logout('session_expired');
  }
}, 60000);
