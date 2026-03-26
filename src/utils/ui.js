// ─────────────────────────────────────────────────────────
//  UI Utilities
// ─────────────────────────────────────────────────────────

const PAGE_TITLES = {
  dashboard: { title:'Dashboard',    sub:'Portfolio Overview' },
  reports:   { title:'Quarterly Reports', sub:'Investor reporting archive' },
  maps:      { title:'Property Maps', sub:'Interactive portfolio map generator' },
  users:     { title:'User Management', sub:'Manage investor accounts' },
  data:      { title:'Data Upload',   sub:'Refresh dashboard data' },
  settings:  { title:'Portal Settings', sub:'Configure portal' }
};

function showPage(id, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  if (navEl) navEl.classList.add('active');

  const meta = PAGE_TITLES[id];
  if (meta) {
    document.getElementById('topbarTitle').textContent      = meta.title;
    document.getElementById('topbarBreadcrumb').textContent = meta.sub;
  }

  // Invalidate map size on show
  if (id === 'maps') {
    setTimeout(() => { if (window._map) window._map.invalidateSize(); }, 120);
  }

  // Load users table when navigating to users
  if (id === 'users') renderUsersTable();
}

// ── MODAL ──────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── TOAST ──────────────────────────────────────────────
let _toastTimer;
function showToast(msg) {
  clearTimeout(_toastTimer);
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toast').classList.add('show');
  _toastTimer = setTimeout(() => document.getElementById('toast').classList.remove('show'), 3500);
}

// ── UPLOAD SIMULATE ────────────────────────────────────
function simulateUpload(type, statusId) {
  const el = document.getElementById(statusId);
  el.innerHTML = `<span style="color:var(--accent)">⏳ Uploading ${type}...</span>`;
  setTimeout(() => {
    el.innerHTML = `<span style="color:var(--success)">✅ ${type} uploaded successfully — dashboard updated.</span>`;
    showToast(`✅ ${type} uploaded successfully`);
  }, 1800);
}

// ── REPORTS TABLE ───────────────────────────────────────
let _reportsData = [];

function renderReportsTable(data) {
  _reportsData = data;
  const tbody = document.getElementById('reportsTable');
  if (!tbody) return;
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>
        <div style="font-weight:600">${r.Title}</div>
        <div style="font-size:12px;color:var(--text-muted)">${r.FundName}</div>
      </td>
      <td>${formatDate(r.PeriodStart)} – ${formatDate(r.PeriodEnd)}</td>
      <td>${formatDate(r.PublishedAt)}</td>
      <td style="font-weight:600">£${Number(r.NAV).toLocaleString('en-GB', {maximumFractionDigits:1})}M</td>
      <td><span class="badge badge-green dot-badge">${r.Occupancy}%</span></td>
      <td><span class="badge ${r.Status === 'Published' ? 'badge-blue' : 'badge-gray'}">${r.Status}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="downloadReport('${r.FileURL}', '${r.Title}')">
          Download PDF
        </button>
      </td>
    </tr>
  `).join('');
}

function filterReports(query) {
  const q = query.toLowerCase();
  const filtered = _reportsData.filter(r =>
    r.Title.toLowerCase().includes(q) ||
    r.FundName.toLowerCase().includes(q)
  );
  renderReportsTable(filtered);
}

function downloadReport(url, title) {
  if (url && url !== 'undefined') {
    window.open(url, '_blank');
  } else {
    showToast(`📄 Downloading: ${title}`);
  }
}

// ── USERS TABLE ─────────────────────────────────────────
let _usersData = [];

function renderUsersTable(data) {
  if (data) _usersData = data;
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  tbody.innerHTML = _usersData.map(u => {
    const initials = (u.Title || u.name || '').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    const role     = u.Role || u.role || 'Investor';
    const fund     = u.FundAccess || u.fund || '—';
    const status   = u.Status || u.status || 'Active';
    const lastLogin = u.LastLoginAt ? formatDate(u.LastLoginAt) : 'Never';
    const roleColors = { Admin:'badge-gold', Investor:'badge-blue', Viewer:'badge-gray' };
    const statColors = { Active:'badge-green dot-badge', PendingVerification:'badge-gold', Suspended:'badge-red' };
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar" style="background:${role==='Admin'?'#C8A96E':role==='Investor'?'#1E6FD9':'#8099B8'}">${initials}</div>
            <div>
              <div style="font-weight:600">${u.Title || u.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${u.Email || u.email}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${roleColors[role] || 'badge-gray'}">${role}</span></td>
        <td>${fund}</td>
        <td><span class="badge ${statColors[status] || 'badge-gray'}">${status}</span></td>
        <td>${lastLogin}</td>
        <td style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="editUser('${u.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="removeUser('${u.id}')">Remove</button>
        </td>
      </tr>
    `;
  }).join('');
}

function editUser(id)   { showToast('✏️ Edit user — coming in Phase 2 build'); }

async function removeUser(id) {
  if (!confirm('Remove this user? They will lose portal access immediately.')) return;
  try {
    await spService.deleteListItem(CONFIG.SHAREPOINT.LISTS.USERS, id);
    _usersData = _usersData.filter(u => u.id !== id);
    renderUsersTable();
    showToast('✅ User removed');
  } catch(e) {
    showToast('❌ Error removing user: ' + e.message);
  }
}

async function addUserAction() {
  const name  = document.getElementById('newName').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const role  = document.getElementById('newRole').value;
  const fund  = document.getElementById('newFund').value;
  if (!name || !email) { showToast('⚠️ Name and email are required'); return; }
  try {
    const created = await spService.createUser({ name, email, role, fundAccess: fund });
    _usersData.push({ id: created.id, Title: name, Email: email, Role: role, FundAccess: fund, Status: 'PendingVerification' });
    renderUsersTable();
    closeModal('addUserModal');
    document.getElementById('newName').value = '';
    document.getElementById('newEmail').value = '';
    showToast('✅ User created — invite email sent to ' + email);
    // Send invite email
    await spService.sendMagicLinkEmail(email, name, `${window.location.origin}/src/login.html`, 'register');
  } catch(e) {
    showToast('❌ Error: ' + e.message);
  }
}

// ── DATE HELPER ─────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
