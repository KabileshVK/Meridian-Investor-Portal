// ─────────────────────────────────────────────────────────
//  Data Loader — SharePoint via Graph + sample data fallback
// ─────────────────────────────────────────────────────────

// ── SAMPLE DATA (shown when SharePoint not yet configured) ──
const SAMPLE_KPI = {
  Q4_2024: {
    FundName:     'Fund II — Commercial',
    Quarter:      'Q4 2024',
    Period:       '2024-Q4',
    NAV:          248.4,
    Occupancy:    94.2,
    RentalIncome: 3.12,
    ChurnRate:    5.8,
    NAVDelta:     '+8.3% vs Q3',
    OccDelta:     '+1.4pp vs Q3',
    IncomeDelta:  '+5.7% vs Q3',
    ChurnDelta:   '+0.9pp vs Q3',
    // Chart data
    IncomeTrend:  [2.41, 2.55, 2.68, 2.74, 2.82, 2.96, 2.95, 3.12],
    TrendLabels:  ['Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    AssetSplit:   [62, 24, 14],
    AssetLabels:  ['Residential','Commercial','Mixed Use'],
    CapexBudget:  [820, 340, 280, 180, 120],
    CapexActual:  [760, 410, 290, 155, 130],
    CapexCities:  ['London','Manchester','Birmingham','Leeds','Bristol']
  }
};

const SAMPLE_REPORTS = [
  { id:'1', Title:'Q4 2024 Investor Report', FundName:'Fund II — Commercial', PeriodStart:'2024-10-01', PeriodEnd:'2024-12-31', PublishedAt:'2025-01-15', NAV:248.4, Occupancy:94.2, RentalIncome:3.12, Status:'Published',   FileURL:'' },
  { id:'2', Title:'Q3 2024 Investor Report', FundName:'Fund II — Commercial', PeriodStart:'2024-07-01', PeriodEnd:'2024-09-30', PublishedAt:'2024-10-18', NAV:229.2, Occupancy:92.8, RentalIncome:2.95, Status:'Archived',    FileURL:'' },
  { id:'3', Title:'Q2 2024 Investor Report', FundName:'Fund I — Residential',  PeriodStart:'2024-04-01', PeriodEnd:'2024-06-30', PublishedAt:'2024-07-19', NAV:215.8, Occupancy:91.5, RentalIncome:2.96, Status:'Archived',    FileURL:'' },
  { id:'4', Title:'Q1 2024 Investor Report', FundName:'Fund I — Residential',  PeriodStart:'2024-01-01', PeriodEnd:'2024-03-31', PublishedAt:'2024-04-18', NAV:204.1, Occupancy:88.3, RentalIncome:2.82, Status:'Archived',    FileURL:'' },
  { id:'5', Title:'Q4 2023 Annual Report',   FundName:'Fund III — Mixed',      PeriodStart:'2023-10-01', PeriodEnd:'2023-12-31', PublishedAt:'2024-01-12', NAV:192.6, Occupancy:87.1, RentalIncome:2.74, Status:'Archived',    FileURL:'' },
];

const SAMPLE_USERS = [
  { id:'1', Title:'Anne-Marié Williams', Email:'investor@meridian.com', Role:'Investor', FundAccess:'Fund II — Commercial',     Status:'Active',  LastLoginAt:'2025-01-15T10:32:00Z' },
  { id:'2', Title:'Robert Chen',         Email:'r.chen@meridian.com',   Role:'Investor', FundAccess:'Fund I — Residential',     Status:'Active',  LastLoginAt:'2025-01-14T14:20:00Z' },
  { id:'3', Title:'Sarah Mitchell',      Email:'admin@meridian.com',    Role:'Admin',    FundAccess:'All Funds',                Status:'Active',  LastLoginAt:'2025-01-15T09:15:00Z' },
  { id:'4', Title:'James Hartley',       Email:'j.hartley@meridian.com',Role:'Investor', FundAccess:'Fund III — Mixed Portfolio',Status:'Active',  LastLoginAt:'2025-01-12T11:00:00Z' },
  { id:'5', Title:'Priya Sharma',        Email:'p.sharma@meridian.com', Role:'Viewer',   FundAccess:'Fund I — Residential',     Status:'Inactive',LastLoginAt:'2025-01-08T09:00:00Z' },
];

const SAMPLE_PROPERTIES = [
  { id:'1',  Title:'Mayfair Residential Block',    City:'London',     Latitude:51.510, Longitude:-0.122, AssetClass:'Residential', Occupancy:97, AnnualIncome:840000, Units:24, FundName:'Fund I — Residential',     Status:'Active' },
  { id:'2',  Title:'Southwark Commercial Hub',     City:'London',     Latitude:51.500, Longitude:-0.089, AssetClass:'Commercial',  Occupancy:91, AnnualIncome:620000, Units:8,  FundName:'Fund II — Commercial',      Status:'Active' },
  { id:'3',  Title:'Islington Mixed Use',          City:'London',     Latitude:51.521, Longitude:-0.132, AssetClass:'Mixed Use',   Occupancy:88, AnnualIncome:410000, Units:12, FundName:'Fund III — Mixed Portfolio', Status:'Active' },
  { id:'4',  Title:'Canary Wharf Office Suite',    City:'London',     Latitude:51.504, Longitude:-0.018, AssetClass:'Commercial',  Occupancy:95, AnnualIncome:720000, Units:6,  FundName:'Fund II — Commercial',      Status:'Active' },
  { id:'5',  Title:'Spinningfields Office',        City:'Manchester', Latitude:53.480, Longitude:-2.245, AssetClass:'Commercial',  Occupancy:95, AnnualIncome:380000, Units:10, FundName:'Fund II — Commercial',      Status:'Active' },
  { id:'6',  Title:'Northern Quarter Apartments',  City:'Manchester', Latitude:53.473, Longitude:-2.233, AssetClass:'Residential', Occupancy:98, AnnualIncome:310000, Units:18, FundName:'Fund I — Residential',     Status:'Active' },
  { id:'7',  Title:'Piccadilly Mixed Use',         City:'Manchester', Latitude:53.478, Longitude:-2.237, AssetClass:'Mixed Use',   Occupancy:86, AnnualIncome:245000, Units:9,  FundName:'Fund III — Mixed Portfolio', Status:'Active' },
  { id:'8',  Title:'Digbeth Residential',          City:'Birmingham', Latitude:52.476, Longitude:-1.896, AssetClass:'Residential', Occupancy:92, AnnualIncome:280000, Units:22, FundName:'Fund I — Residential',     Status:'Active' },
  { id:'9',  Title:'Brindleyplace Mixed',          City:'Birmingham', Latitude:52.474, Longitude:-1.906, AssetClass:'Mixed Use',   Occupancy:85, AnnualIncome:220000, Units:14, FundName:'Fund III — Mixed Portfolio', Status:'Active' },
  { id:'10', Title:'City Centre Offices',          City:'Leeds',      Latitude:53.797, Longitude:-1.549, AssetClass:'Commercial',  Occupancy:90, AnnualIncome:195000, Units:7,  FundName:'Fund II — Commercial',      Status:'Active' },
  { id:'11', Title:'Headingley Residential',       City:'Leeds',      Latitude:53.821, Longitude:-1.579, AssetClass:'Residential', Occupancy:96, AnnualIncome:168000, Units:16, FundName:'Fund I — Residential',     Status:'Active' },
  { id:'12', Title:'Harbourside Apartments',       City:'Bristol',    Latitude:51.448, Longitude:-2.597, AssetClass:'Residential', Occupancy:96, AnnualIncome:175000, Units:20, FundName:'Fund I — Residential',     Status:'Active' },
  { id:'13', Title:'Steel City Residential',       City:'Sheffield',  Latitude:53.381, Longitude:-1.469, AssetClass:'Residential', Occupancy:93, AnnualIncome:155000, Units:18, FundName:'Fund I — Residential',     Status:'Active' },
  { id:'14', Title:'Grainger Town Mixed Use',      City:'Newcastle',  Latitude:54.972, Longitude:-1.613, AssetClass:'Mixed Use',   Occupancy:87, AnnualIncome:142000, Units:11, FundName:'Fund III — Mixed Portfolio', Status:'Active' },
];

// ── LOAD DASHBOARD ─────────────────────────────────────
async function loadDashboard(user) {
  let kpiData, reports, properties, users;

  try {
    // Try SharePoint first
    const spKPI = await spService.getAllKPIData(user.fundAccess);
    kpiData = spKPI.length > 0 ? spKPI[0] : SAMPLE_KPI.Q4_2024;
  } catch(e) {
    console.warn('SharePoint KPI load failed, using sample data:', e.message);
    kpiData = SAMPLE_KPI.Q4_2024;
  }

  try {
    reports = await spService.getReports(user.fundAccess);
    if (!reports.length) reports = SAMPLE_REPORTS;
  } catch(e) {
    reports = SAMPLE_REPORTS;
  }

  try {
    properties = await spService.getProperties();
    if (!properties.length) properties = SAMPLE_PROPERTIES;
  } catch(e) {
    properties = SAMPLE_PROPERTIES;
  }

  try {
    if (user.role === 'Admin') {
      users = await spService.getAllUsers();
      if (!users.length) users = SAMPLE_USERS;
      renderUsersTable(users);
    }
  } catch(e) {
    renderUsersTable(SAMPLE_USERS);
  }

  // Render everything
  renderKPIs(kpiData);
  renderCharts(kpiData);
  renderActivityFeed();
  renderReportsTable(reports);
  window._properties = properties;

  // Update subtitle
  document.getElementById('dashboardSubtitle').textContent =
    `${kpiData.Quarter || 'Q4 2024'} · ${user.fundAccess || 'All Funds'}`;
}

// ── RENDER KPIs ─────────────────────────────────────────
function renderKPIs(data) {
  document.getElementById('kpiNAV').textContent       = `£${data.NAV}M`;
  document.getElementById('kpiOcc').textContent       = `${data.Occupancy}%`;
  document.getElementById('kpiIncome').textContent    = `£${data.RentalIncome}M`;
  document.getElementById('kpiChurn').textContent     = `${data.ChurnRate}%`;
  document.getElementById('kpiNAVDelta').textContent  = `↑ ${data.NAVDelta}`;
  document.getElementById('kpiOccDelta').textContent  = `↑ ${data.OccDelta}`;
  document.getElementById('kpiIncomeDelta').textContent = `↑ ${data.IncomeDelta}`;
  document.getElementById('kpiChurnDelta').textContent  = `↑ ${data.ChurnDelta}`;
}

// ── ACTIVITY FEED ────────────────────────────────────────
function renderActivityFeed() {
  const items = [
    { color:'dot-blue',  title:'Q4 2024 Report Published', desc:'Annual performance report now live', time:'2h ago' },
    { color:'dot-green', title:'Manchester — 3 new leases signed', desc:'Occupancy improved to 97.1%', time:'1d ago' },
    { color:'dot-gold',  title:'CapEx: Refurbishment completed', desc:'Birmingham Block B — £420K final cost', time:'3d ago' },
    { color:'dot-blue',  title:'Map data refreshed', desc:'Vacancy heatmap updated for all cities', time:'5d ago' },
    { color:'dot-green', title:'New investor registered', desc:'James Hartley — Fund III access granted', time:'1w ago' },
  ];
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  feed.innerHTML = items.map(i => `
    <div class="activity-item">
      <div class="activity-dot ${i.color}"></div>
      <div>
        <div class="activity-title">${i.title}</div>
        <div class="activity-desc">${i.desc}</div>
      </div>
      <div class="activity-time">${i.time}</div>
    </div>
  `).join('');
}
