// ─────────────────────────────────────────────────────────
//  MERIDIAN INVESTOR PORTAL — Environment Configuration
//  Copy this to config.js and fill in your actual values.
//  NEVER commit config.js to GitHub — it is in .gitignore
// ─────────────────────────────────────────────────────────

const CONFIG = {
  // Azure AD App Registration
  AZURE_AD: {
    TENANT_ID:     "YOUR_TENANT_ID",           // e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    CLIENT_ID:     "YOUR_CLIENT_ID",           // App Registration Client ID
    CLIENT_SECRET: "YOUR_CLIENT_SECRET",       // App Registration Client Secret (server-side only)
    REDIRECT_URI:  "https://YOUR_DOMAIN/verify"
  },

  // Microsoft Graph API
  GRAPH: {
    BASE_URL:    "https://graph.microsoft.com/v1.0",
    SEND_AS:     "noreply@yourdomain.com",     // The mailbox used to send magic link emails
    SENDER_NAME: "Meridian Investor Portal"
  },

  // SharePoint
  SHAREPOINT: {
    SITE_URL:    "https://prudentautolytics49.sharepoint.com/sites/ASP-InestorPortal",
    SITE_ID:     "YOUR_SHAREPOINT_SITE_ID",    // Get from Graph: /sites/{hostname}:/{path}

    // List Names (must match exactly what you create in SharePoint)
    LISTS: {
      USERS:         "Portal_Users",
      SESSIONS:      "Portal_Sessions",
      REPORTS:       "Investor_Reports",
      KPI_DATA:      "KPI_Data",
      PROPERTIES:    "Property_Data",
      AUDIT_LOG:     "Audit_Log",
      FUNDS:         "Funds"
    }
  },

  // Portal Settings
  PORTAL: {
    NAME:              "Meridian Investor Portal",
    COMPANY:           "Meridian Capital",
    SUPPORT_EMAIL:     "investor.relations@meridian.com",
    MAGIC_LINK_EXPIRY: 15,   // minutes
    SESSION_TIMEOUT:   30,   // minutes
    MAX_LOGIN_ATTEMPTS: 5
  }
};

// Export for use across modules
if (typeof module !== 'undefined') module.exports = CONFIG;
