# Meridian Investor Portal

Enterprise-grade investor portal built on Azure Static Web Apps + Microsoft Graph + SharePoint.

## Stack
- **Frontend:** Vanilla JS, HTML5, CSS3 (no framework dependencies)
- **Auth:** Passwordless magic link via Microsoft Graph Mail API
- **Data:** Microsoft SharePoint Lists via Graph API
- **Hosting:** Azure Static Web Apps
- **Maps:** Leaflet.js + CartoDB tiles
- **Charts:** Chart.js

---

## Project Structure

```
meridian-portal/
├── src/
│   ├── login.html              # Login + Register (magic link auth)
│   ├── verify.html             # Magic link verification handler
│   ├── config.example.js       # Config template (copy to config.js)
│   ├── pages/
│   │   └── dashboard.html      # Main app (all modules)
│   ├── services/
│   │   ├── sharepoint.js       # SharePoint Graph API service
│   │   └── auth.js             # Auth service (magic link)
│   ├── styles/
│   │   └── dashboard.css       # Enterprise dashboard styles
│   └── utils/
│       ├── data.js             # Data loading + sample fallback
│       ├── charts.js           # Chart.js initialization
│       ├── map.js              # Leaflet map + property markers
│       └── ui.js               # Navigation, modals, toast, tables
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml   # CI/CD pipeline
├── staticwebapp.config.json    # Azure SWA routing + security headers
├── SHAREPOINT_SOP.md           # Full SharePoint setup guide with sample data
└── README.md
```

---

## Local Setup

```bash
git clone https://github.com/YOUR_ORG/meridian-portal.git
cd meridian-portal

# Copy and fill in config
cp src/config.example.js src/config.js
# Edit config.js with your Azure AD + SharePoint values

# Run locally
npx live-server src --port=3000
# Open http://localhost:3000/login.html
```

---

## Deploy to Azure Static Web Apps

### Step 1 — Push to GitHub
```bash
git init
git remote add origin https://github.com/YOUR_ORG/meridian-portal.git
git add .
git commit -m "Initial enterprise portal build"
git push -u origin main
```

### Step 2 — Create Azure Static Web App
1. Azure Portal → Create a Resource → Static Web App
2. Connect to your GitHub repo
3. Build details:
   - App location: `/`
   - API location: `api`
   - Output location: `src`
4. Copy the deployment token

### Step 3 — Add GitHub Secret
GitHub repo → Settings → Secrets and Variables → Actions
Add: `AZURE_STATIC_WEB_APPS_API_TOKEN` = paste token from Step 2

### Step 4 — Add Environment Variables
Azure Portal → Your Static Web App → Configuration
Add all variables from SHAREPOINT_SOP.md Part 6

### Step 5 — Push triggers auto-deploy
Every push to `main` triggers GitHub Actions → deploys to Azure automatically.

---

## Auth Flow

```
User enters email
       ↓
Portal calls Graph API → creates session token in SharePoint
       ↓
Graph Mail API sends magic link email to user
       ↓
User clicks link → /verify.html?token=...
       ↓
Portal validates token against Portal_Sessions list
       ↓
Token marked as used → user session created
       ↓
Redirect to /pages/dashboard.html
```

---

## Security Features
- Passwordless authentication (no passwords stored)
- Single-use, time-limited magic links (15 min expiry)
- Session timeout (30 min configurable)
- Per-investor row-level data access (fundAccess field)
- Full audit logging to SharePoint
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Admin-only routes protected at Azure SWA routing level

---

## SharePoint Lists
See `SHAREPOINT_SOP.md` for full setup guide and sample data.

| List              | Purpose                       |
|-------------------|-------------------------------|
| Portal_Users      | User accounts + roles         |
| Portal_Sessions   | Magic link tokens             |
| Investor_Reports  | Quarterly report metadata     |
| KPI_Data          | Dashboard financial data      |
| Property_Data     | Map properties                |
| Audit_Log         | Security audit trail          |
| Funds             | Fund master data              |

---

## Notes
- `config.js` is in `.gitignore` — never commit secrets
- Production secrets go in Azure Static Web Apps environment variables
- The portal falls back to sample data if SharePoint is unreachable (demo mode)
- See `SHAREPOINT_SOP.md` for complete setup checklist before going live

---

*Built by Prudent Autolytics · kabilesh@prudentautolytics.com*
