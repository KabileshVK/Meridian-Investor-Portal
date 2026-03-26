// ─────────────────────────────────────────────────────────
//  MERIDIAN INVESTOR PORTAL — Configuration
//  ⚠️  DO NOT COMMIT THIS FILE — it is in .gitignore
// ─────────────────────────────────────────────────────────

// ── MSAL (Microsoft Authentication Library) ───────────────
const msalConfig = {
  auth: {
    clientId:                "337fdd29-7d4d-4a39-9b4c-4ebc0ea7bf9a",
    authority:               "https://login.microsoftonline.com/8633bc14-1446-4b1a-b39b-9eab02755c9a",
    redirectUri:             window.location.origin,
    postLogoutRedirectUri:   window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation:       "sessionStorage",
    storeAuthStateInCookie: true,
  },
};

const loginRequest = {
  scopes: ["User.Read"],
};

const spRequest = {
  scopes: ["https://prudentautolytics49.sharepoint.com/.default"],
};

// ── PORTAL CONFIG ─────────────────────────────────────────
const CONFIG = {

  AZURE_AD: {
    TENANT_ID:    "8633bc14-1446-4b1a-b39b-9eab02755c9a",
    CLIENT_ID:    "337fdd29-7d4d-4a39-9b4c-4ebc0ea7bf9a",
    REDIRECT_URI: window.location.origin + "/src/verify.html",
  },

  GRAPH: {
    BASE_URL:    "https://graph.microsoft.com/v1.0",
    SEND_AS:     "Kabileshvijayakumar@prudentautolytics.com",
    SENDER_NAME: "Meridian Investor Portal",
    // Scopes used when acquiring token for Graph calls
    SCOPES:      ["User.Read", "Mail.Send", "Sites.ReadWrite.All"],
  },

  SHAREPOINT: {
    SITE_URL:  "https://prudentautolytics49.sharepoint.com/sites/ASP-InestorPortal",
    SITE_ID:   "prudentautolytics49.sharepoint.com,df65f3e2-2570-42d0-91c5-ab2ad91b2eed,1af96729-9fc4-4230-9e6d-f1cb9cc226a0",
    SP_SCOPES: ["https://prudentautolytics49.sharepoint.com/.default"],

    LISTS: {
      USERS:      "Portal_Users",
      SESSIONS:   "Portal_Sessions",
      REPORTS:    "Investor_Reports",
      KPI_DATA:   "KPI_Data",
      PROPERTIES: "Property_Data",
      AUDIT_LOG:  "Audit_Log",
      FUNDS:      "Funds"
    }
  },

  PORTAL: {
    NAME:               "Meridian Investor Portal",
    COMPANY:            "Meridian Capital",
    SUPPORT_EMAIL:      "Kabileshvijayakumar@prudentautolytics.com",
    MAGIC_LINK_EXPIRY:  15,   // minutes
    SESSION_TIMEOUT:    30,   // minutes
    MAX_LOGIN_ATTEMPTS: 5
  }
};
