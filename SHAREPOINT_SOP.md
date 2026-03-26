# MERIDIAN INVESTOR PORTAL
## SharePoint Setup SOP — Complete Step-by-Step Guide
### Site: https://prudentautolytics49.sharepoint.com/sites/ASP-InestorPortal

---

## OVERVIEW

This SOP covers everything needed to configure SharePoint as the data backend
for the Meridian Investor Portal. Follow in order — each step depends on the last.

---

## PART 1 — AZURE AD APP REGISTRATION CONFIGURATION

You already have an App Registration. Ensure these API permissions are granted:

### Required Microsoft Graph Permissions (Application permissions)

| Permission               | Type        | Purpose                             |
|--------------------------|-------------|-------------------------------------|
| Sites.ReadWrite.All      | Application | Read/write SharePoint lists         |
| User.Read.All            | Application | Look up user profiles               |
| Mail.Send                | Application | Send magic link emails              |

### How to add permissions (if not already done):
1. Go to portal.azure.com → Azure Active Directory → App Registrations
2. Open your app → API Permissions → Add a Permission
3. Choose Microsoft Graph → Application Permissions
4. Add each permission above → Grant Admin Consent

---

## PART 2 — CREATE SHAREPOINT LISTS

Navigate to: https://prudentautolytics49.sharepoint.com/sites/ASP-InestorPortal
Site Contents → New → List

Create these 7 lists exactly as named below:

---

### LIST 1: Portal_Users

**Purpose:** Stores all investor and admin user accounts

| Column Name    | Type           | Required | Notes                                 |
|----------------|----------------|----------|---------------------------------------|
| Title          | Single line    | Yes      | Full name (rename default Title col)  |
| Email          | Single line    | Yes      | Unique email address                  |
| Role           | Choice         | Yes      | Choices: Admin, Investor, Viewer      |
| FundAccess     | Single line    | Yes      | e.g. "Fund I — Residential"           |
| Status         | Choice         | Yes      | Choices: Active, PendingVerification, Suspended, Inactive |
| RegisteredAt   | Date and Time  | No       | Auto-set on registration              |
| ActivatedAt    | Date and Time  | No       | When email confirmed                  |
| LastLoginAt    | Date and Time  | No       | Updated on each login                 |
| LoginCount     | Number         | No       | Incremented on each login             |
| Organisation   | Single line    | No       | Company/fund name                     |
| MFAEnabled     | Yes/No         | No       | Default: No                           |
| Notes          | Multiple lines | No       | Admin notes                           |

**Sample data to add (5 rows):**

Row 1:
- Title: Anne-Marié Williams
- Email: investor@meridian.com
- Role: Investor
- FundAccess: Fund II — Commercial
- Status: Active
- RegisteredAt: 2024-11-01
- LastLoginAt: 2025-01-15
- Organisation: Williams Capital

Row 2:
- Title: Robert Chen
- Email: r.chen@meridian.com
- Role: Investor
- FundAccess: Fund I — Residential
- Status: Active
- RegisteredAt: 2024-10-15
- LastLoginAt: 2025-01-14
- Organisation: Chen Investments Ltd

Row 3:
- Title: Sarah Mitchell
- Email: admin@meridian.com
- Role: Admin
- FundAccess: All Funds
- Status: Active
- RegisteredAt: 2024-01-01
- LastLoginAt: 2025-01-15
- Organisation: Meridian Capital

Row 4:
- Title: James Hartley
- Email: j.hartley@meridian.com
- Role: Investor
- FundAccess: Fund III — Mixed Portfolio
- Status: Active
- RegisteredAt: 2024-09-20
- LastLoginAt: 2025-01-12
- Organisation: Hartley Capital Partners

Row 5:
- Title: Priya Sharma
- Email: p.sharma@meridian.com
- Role: Viewer
- FundAccess: Fund I — Residential
- Status: Inactive
- RegisteredAt: 2024-06-01
- LastLoginAt: 2025-01-08
- Organisation: Sharma Family Office

---

### LIST 2: Portal_Sessions

**Purpose:** Stores magic link tokens for passwordless authentication

| Column Name | Type          | Required | Notes                          |
|-------------|---------------|----------|--------------------------------|
| Title       | Single line   | Yes      | Auto-generated session ID      |
| UserEmail   | Single line   | Yes      | Email of the user              |
| UserID      | Single line   | Yes      | SharePoint item ID of user     |
| Token       | Single line   | Yes      | Secure 128-char hex token      |
| ExpiresAt   | Date and Time | Yes      | 15 mins from creation          |
| Used        | Yes/No        | Yes      | Default: No. Set to Yes on use |
| UsedAt      | Date and Time | No       | When token was consumed        |
| IPAddress   | Single line   | No       | Optional — requestor IP        |

**No sample data needed** — created automatically on login/register requests.

**Important:** Create a scheduled Power Automate flow to delete rows older than 24 hours
(to keep this list clean and secure).

---

### LIST 3: Investor_Reports

**Purpose:** Stores metadata about quarterly investor reports

| Column Name  | Type          | Required | Notes                              |
|--------------|---------------|----------|------------------------------------|
| Title        | Single line   | Yes      | e.g. "Q4 2024 Investor Report"     |
| FundName     | Choice        | Yes      | Fund I / Fund II / Fund III / All  |
| PeriodStart  | Date and Time | Yes      | Start of reporting period          |
| PeriodEnd    | Date and Time | Yes      | End of reporting period            |
| NAV          | Number        | No       | Net Asset Value in £M              |
| Occupancy    | Number        | No       | Occupancy % e.g. 94.2              |
| RentalIncome | Number        | No       | Quarterly rental income £M         |
| FileURL      | Hyperlink     | No       | URL to PDF in SharePoint/Azure     |
| PublishedAt  | Date and Time | Yes      | When made available to investors   |
| PublishedBy  | Single line   | No       | Admin who published it             |
| Status       | Choice        | Yes      | Published, Archived, Draft         |
| Quarter      | Single line   | No       | e.g. "Q4 2024"                     |

**Sample data (5 rows):**

Row 1:
- Title: Q4 2024 Investor Report
- FundName: Fund II — Commercial
- PeriodStart: 2024-10-01 / PeriodEnd: 2024-12-31
- NAV: 248.4 / Occupancy: 94.2 / RentalIncome: 3.12
- PublishedAt: 2025-01-15 / Status: Published / Quarter: Q4 2024

Row 2:
- Title: Q3 2024 Investor Report
- FundName: Fund II — Commercial
- PeriodStart: 2024-07-01 / PeriodEnd: 2024-09-30
- NAV: 229.2 / Occupancy: 92.8 / RentalIncome: 2.95
- PublishedAt: 2024-10-18 / Status: Archived / Quarter: Q3 2024

Row 3:
- Title: Q2 2024 Investor Report
- FundName: Fund I — Residential
- PeriodStart: 2024-04-01 / PeriodEnd: 2024-06-30
- NAV: 215.8 / Occupancy: 91.5 / RentalIncome: 2.96
- PublishedAt: 2024-07-19 / Status: Archived / Quarter: Q2 2024

Row 4:
- Title: Q1 2024 Investor Report
- FundName: Fund I — Residential
- PeriodStart: 2024-01-01 / PeriodEnd: 2024-03-31
- NAV: 204.1 / Occupancy: 88.3 / RentalIncome: 2.82
- PublishedAt: 2024-04-18 / Status: Archived / Quarter: Q1 2024

Row 5:
- Title: Q4 2023 Annual Report
- FundName: Fund III — Mixed Portfolio
- PeriodStart: 2023-10-01 / PeriodEnd: 2023-12-31
- NAV: 192.6 / Occupancy: 87.1 / RentalIncome: 2.74
- PublishedAt: 2024-01-12 / Status: Archived / Quarter: Q4 2023

---

### LIST 4: KPI_Data

**Purpose:** Quarterly KPI snapshots that power the dashboard charts

| Column Name    | Type          | Required | Notes                           |
|----------------|---------------|----------|---------------------------------|
| Title          | Single line   | Yes      | e.g. "Q4 2024 — Fund II"        |
| FundName       | Choice        | Yes      | Which fund this data belongs to |
| Quarter        | Single line   | Yes      | e.g. "Q4 2024"                  |
| Period         | Single line   | Yes      | e.g. "2024-Q4" (for sorting)    |
| NAV            | Number        | Yes      | £M                              |
| Occupancy      | Number        | Yes      | %                               |
| RentalIncome   | Number        | Yes      | £M quarterly                    |
| ChurnRate      | Number        | Yes      | %                               |
| NAVDelta       | Single line   | No       | e.g. "+8.3% vs Q3"              |
| OccDelta       | Single line   | No       | e.g. "+1.4pp vs Q3"             |
| IncomeDelta    | Single line   | No       | e.g. "+5.7% vs Q3"              |
| ChurnDelta     | Single line   | No       | e.g. "+0.9pp vs Q3"             |
| IncomeTrend    | Multiple lines| No       | JSON array e.g. [2.41,2.55,...] |
| TrendLabels    | Multiple lines| No       | JSON array e.g. ["Q1 23",...]   |
| AssetSplit     | Multiple lines| No       | JSON array e.g. [62,24,14]      |
| AssetLabels    | Multiple lines| No       | JSON array                      |
| CapexBudget    | Multiple lines| No       | JSON array per city             |
| CapexActual    | Multiple lines| No       | JSON array per city             |
| CapexCities    | Multiple lines| No       | JSON array                      |

**Sample data (1 row for Q4 2024):**

- Title: Q4 2024 — Fund II
- FundName: Fund II — Commercial
- Quarter: Q4 2024 / Period: 2024-Q4
- NAV: 248.4 / Occupancy: 94.2 / RentalIncome: 3.12 / ChurnRate: 5.8
- NAVDelta: +8.3% vs Q3 / OccDelta: +1.4pp vs Q3
- IncomeDelta: +5.7% vs Q3 / ChurnDelta: +0.9pp vs Q3
- IncomeTrend: [2.41, 2.55, 2.68, 2.74, 2.82, 2.96, 2.95, 3.12]
- TrendLabels: ["Q1 23","Q2 23","Q3 23","Q4 23","Q1 24","Q2 24","Q3 24","Q4 24"]
- AssetSplit: [62, 24, 14]
- AssetLabels: ["Residential","Commercial","Mixed Use"]
- CapexBudget: [820, 340, 280, 180, 120]
- CapexActual: [760, 410, 290, 155, 130]
- CapexCities: ["London","Manchester","Birmingham","Leeds","Bristol"]

---

### LIST 5: Property_Data

**Purpose:** All property locations powering the interactive map

| Column Name  | Type          | Required | Notes                          |
|--------------|---------------|----------|--------------------------------|
| Title        | Single line   | Yes      | Property name                  |
| City         | Choice        | Yes      | London/Manchester/Birmingham/etc|
| Country      | Single line   | No       | Default: UK                    |
| Latitude     | Number        | Yes      | e.g. 51.510                    |
| Longitude    | Number        | Yes      | e.g. -0.122                    |
| AssetClass   | Choice        | Yes      | Residential/Commercial/Mixed Use|
| Occupancy    | Number        | Yes      | % e.g. 97                      |
| AnnualIncome | Number        | No       | £ e.g. 840000                  |
| Units        | Number        | No       | Number of units                |
| FundName     | Choice        | Yes      | Which fund                     |
| Status       | Choice        | Yes      | Active/Disposed/Refurbishment  |
| PostCode     | Single line   | No       | UK postcode                    |
| AcquiredDate | Date and Time | No       | Acquisition date               |
| Notes        | Multiple lines| No       | Admin notes                    |

**Sample data (14 properties — enter all):**

1: Mayfair Residential Block | London | 51.510 | -0.122 | Residential | 97% | £840K | 24 units | Fund I
2: Southwark Commercial Hub | London | 51.500 | -0.089 | Commercial | 91% | £620K | 8 units | Fund II
3: Islington Mixed Use | London | 51.521 | -0.132 | Mixed Use | 88% | £410K | 12 units | Fund III
4: Canary Wharf Office Suite | London | 51.504 | -0.018 | Commercial | 95% | £720K | 6 units | Fund II
5: Spinningfields Office | Manchester | 53.480 | -2.245 | Commercial | 95% | £380K | 10 units | Fund II
6: Northern Quarter Apartments | Manchester | 53.473 | -2.233 | Residential | 98% | £310K | 18 units | Fund I
7: Piccadilly Mixed Use | Manchester | 53.478 | -2.237 | Mixed Use | 86% | £245K | 9 units | Fund III
8: Digbeth Residential | Birmingham | 52.476 | -1.896 | Residential | 92% | £280K | 22 units | Fund I
9: Brindleyplace Mixed | Birmingham | 52.474 | -1.906 | Mixed Use | 85% | £220K | 14 units | Fund III
10: City Centre Offices | Leeds | 53.797 | -1.549 | Commercial | 90% | £195K | 7 units | Fund II
11: Headingley Residential | Leeds | 53.821 | -1.579 | Residential | 96% | £168K | 16 units | Fund I
12: Harbourside Apartments | Bristol | 51.448 | -2.597 | Residential | 96% | £175K | 20 units | Fund I
13: Steel City Residential | Sheffield | 53.381 | -1.469 | Residential | 93% | £155K | 18 units | Fund I
14: Grainger Town Mixed Use | Newcastle | 54.972 | -1.613 | Mixed Use | 87% | £142K | 11 units | Fund III

---

### LIST 6: Audit_Log

**Purpose:** Security audit trail of all user actions

| Column Name | Type          | Required | Notes                           |
|-------------|---------------|----------|---------------------------------|
| Title       | Single line   | Yes      | Action type                     |
| UserEmail   | Single line   | Yes      | Who performed the action        |
| Action      | Choice        | Yes      | LOGIN_REQUEST / LOGIN_SUCCESS / LOGOUT / REGISTER_REQUEST / USER_CREATED / USER_REMOVED / REPORT_VIEWED / DATA_UPLOADED |
| Details     | Multiple lines| No       | Additional context              |
| Timestamp   | Date and Time | Yes      | Exact time                      |
| IPAddress   | Single line   | No       | Requestor IP                    |
| SessionID   | Single line   | No       | Associated session token prefix |

**No sample data needed** — auto-populated by the portal.

---

### LIST 7: Funds

**Purpose:** Fund master data

| Column Name  | Type          | Required | Notes                          |
|--------------|---------------|----------|--------------------------------|
| Title        | Single line   | Yes      | Fund name                      |
| Description  | Multiple lines| No       | Fund description               |
| FundType     | Choice        | Yes      | Residential/Commercial/Mixed   |
| ManagerName  | Single line   | No       | Fund manager                   |
| InceptionDate| Date and Time | No       | Fund launch date               |
| TargetReturn | Number        | No       | % target IRR                   |
| Status       | Choice        | Yes      | Active/Closed/Fundraising      |

**Sample data (3 rows):**

Row 1: Fund I — Residential | UK residential buy-to-let | Residential | Sarah Mitchell | 2019-01-01 | 8.5% | Active
Row 2: Fund II — Commercial | UK commercial office and retail | Commercial | Sarah Mitchell | 2020-06-01 | 7.2% | Active
Row 3: Fund III — Mixed Portfolio | Diversified UK property portfolio | Mixed | Sarah Mitchell | 2022-03-01 | 9.1% | Active

---

## PART 3 — SET LIST PERMISSIONS

For each list, restrict permissions so investors cannot browse raw data:

1. Open each list → Settings gear → List Settings
2. Permissions for this list → Stop Inheriting Permissions
3. Remove all except Site Owners
4. The portal reads data via the App Registration token — users never access lists directly

---

## PART 4 — GET YOUR SHAREPOINT SITE ID

Run this in browser or Postman (with a valid Graph token):

GET https://graph.microsoft.com/v1.0/sites/prudentautolytics49.sharepoint.com:/sites/ASP-InestorPortal

Copy the `id` field from the response and add it to your config.js:
  SHAREPOINT.SITE_ID: "your-site-id-here"

---

## PART 5 — UPDATE config.js

Copy src/config.example.js → src/config.js and fill in:
- AZURE_AD.TENANT_ID
- AZURE_AD.CLIENT_ID
- AZURE_AD.CLIENT_SECRET (only in Azure Function, NOT in frontend)
- GRAPH.SEND_AS (the email address to send magic links from)
- SHAREPOINT.SITE_ID

**IMPORTANT:** config.js is in .gitignore — NEVER commit it to GitHub.
Store secrets in Azure Static Web Apps environment variables instead.

---

## PART 6 — AZURE STATIC WEB APPS ENVIRONMENT VARIABLES

In Azure Portal → Your Static Web App → Configuration → Application Settings

Add these:
- AZURE_TENANT_ID
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET
- SHAREPOINT_SITE_ID
- SEND_AS_EMAIL

---

## CHECKLIST

Before going live, confirm all of the following:

[ ] 7 SharePoint lists created with correct columns
[ ] Sample data entered in all 5 data lists
[ ] List permissions locked down (no public access)
[ ] Azure AD App Registration has correct Graph permissions
[ ] Admin consent granted for all permissions
[ ] config.js filled in locally (NOT committed to Git)
[ ] Azure Static Web Apps env variables set
[ ] Site ID confirmed by calling Graph API
[ ] Email sending tested (send a test magic link)
[ ] Login flow tested end-to-end
[ ] Admin and investor views both tested
[ ] Audit log verified to be writing entries

---

*Generated by Prudent Autolytics — Meridian Investor Portal Project*
*SharePoint Site: https://prudentautolytics49.sharepoint.com/sites/ASP-InestorPortal*
