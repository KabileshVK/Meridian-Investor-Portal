// ─────────────────────────────────────────────────────────
//  Auth Service — MSAL + Magic Link via Microsoft Graph
// ─────────────────────────────────────────────────────────

let _msalInstance = null;

function getMSAL() {
  if (_msalInstance) return _msalInstance;
  _msalInstance = new msal.PublicClientApplication(msalConfig);
  return _msalInstance;
}

class AuthService {

  generateToken(length = 64) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  async getGraphToken() {
    const msalApp = getMSAL();
    await msalApp.initialize();
    const accounts = msalApp.getAllAccounts();
    if (accounts.length > 0) {
      try {
        const result = await msalApp.acquireTokenSilent({ scopes: CONFIG.GRAPH.SCOPES, account: accounts[0] });
        spService.setAccessToken(result.accessToken, 3600);
        return result.accessToken;
      } catch(e) {}
    }
    const result = await msalApp.acquireTokenPopup({ scopes: CONFIG.GRAPH.SCOPES });
    spService.setAccessToken(result.accessToken, 3600);
    return result.accessToken;
  }

  getCurrentUser() {
    const raw = sessionStorage.getItem('meridian_user');
    return raw ? JSON.parse(raw) : null;
  }

  setCurrentUser(user) {
    sessionStorage.setItem('meridian_user', JSON.stringify({ ...user, sessionStart: Date.now() }));
  }

  clearSession() {
    sessionStorage.removeItem('meridian_user');
    sessionStorage.removeItem('sp_access_token');
    sessionStorage.removeItem('sp_token_expiry');
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (Date.now() - user.sessionStart > CONFIG.PORTAL.SESSION_TIMEOUT * 60 * 1000) {
      this.clearSession(); return false;
    }
    return true;
  }

  isAdmin() { return this.getCurrentUser()?.role === 'Admin'; }
  refreshSession() { const u = this.getCurrentUser(); if (u) this.setCurrentUser(u); }

  async register(name, email, org) {
    const token = await this.getGraphToken();
    spService.setAccessToken(token, 3600);
    const existing = await spService.getUserByEmail(email);
    if (existing?.Status === 'Active') throw new Error('Account already exists. Please sign in instead.');
    const user = existing || await spService.createUser({ name, email, org, role: 'Investor', fundAccess: 'Fund I — Residential' });
    const magicToken = this.generateToken();
    await spService.createSession(user.id, email, magicToken);
    const magicLink = `${window.location.origin}/src/verify.html?token=${magicToken}&action=register`;
    await spService.sendMagicLinkEmail(email, name, magicLink, 'register');
    await spService.writeAuditLog('REGISTER_REQUEST', email, `${name} | ${org}`);
    return true;
  }

  async requestLoginLink(email) {
    const token = await this.getGraphToken();
    spService.setAccessToken(token, 3600);
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

  async verifyToken(token) {
    const graphToken = await this.getGraphToken();
    spService.setAccessToken(graphToken, 3600);
    const session = await spService.getSessionByToken(token);
    if (!session) throw new Error('This link is invalid or has already been used.');
    if (new Date(session.ExpiresAt) < new Date()) throw new Error('This link has expired. Please request a new one.');
    await spService.markSessionUsed(session.id);
    const user = await spService.getUserByEmail(session.UserEmail);
    if (!user) throw new Error('User account not found.');
    if (user.Status === 'PendingVerification') {
      await spService.updateListItem(CONFIG.SHAREPOINT.LISTS.USERS, user.id, { Status: 'Active', ActivatedAt: new Date().toISOString() });
    }
    await spService.updateListItem(CONFIG.SHAREPOINT.LISTS.USERS, user.id, { LastLoginAt: new Date().toISOString() });
    this.setCurrentUser({
      id: user.id, name: user.Title, email: user.Email,
      role: user.Role, fundAccess: user.FundAccess,
      initials: (user.Title||'').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
    });
    await spService.writeAuditLog('LOGIN_SUCCESS', user.Email);
    return user;
  }

  async logout(reason = '') {
    const user = this.getCurrentUser();
    if (user) await spService.writeAuditLog('LOGOUT', user.email).catch(()=>{});
    this.clearSession();
    try { const m = getMSAL(); await m.initialize(); await m.logoutPopup(); } catch(e) {}
    window.location.href = '/src/login.html' + (reason ? `?reason=${reason}` : '');
  }

  requireAuth() {
    if (!this.isAuthenticated()) { window.location.href = '/src/login.html?reason=auth_required'; return false; }
    this.refreshSession(); return true;
  }

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) { window.location.href = '/src/403.html'; return false; }
    return true;
  }
}

const authService = new AuthService();

setInterval(() => {
  if (authService.getCurrentUser() && !authService.isAuthenticated()) authService.logout('session_expired');
}, 60000);
