// ─────────────────────────────────────────────────────────
//  Map Utility — Leaflet Interactive Property Map
// ─────────────────────────────────────────────────────────

function initMap() {
  if (window._map) {
    window._map.remove();
    window._map = null;
  }

  const mapEl = document.getElementById('propertyMap');
  if (!mapEl) return;

  const map = L.map('propertyMap', {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([52.8, -1.7], 6);

  window._map = map;

  // Carto light tiles — clean, corporate look
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '©<a href="https://openstreetmap.org">OpenStreetMap</a> ©<a href="https://carto.com">CartoDB</a>',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  renderMapMarkers(map, window._properties || []);
}

function renderMapMarkers(map, properties) {
  // Clear existing markers
  if (window._markerLayer) {
    window._markerLayer.clearLayers();
  }

  const mapType   = document.getElementById('mapType')?.value    || 'locations';
  const city      = document.getElementById('cityFilter')?.value  || 'all';
  const assetClass= document.getElementById('assetFilter')?.value || 'all';
  const minOcc    = parseInt(document.getElementById('minOcc')?.value || '0');

  // Filter
  let filtered = properties.filter(p => {
    if (city !== 'all' && p.City !== city) return false;
    if (assetClass !== 'all' && p.AssetClass !== assetClass) return false;
    if ((p.Occupancy || 0) < minOcc) return false;
    return true;
  });

  const markerLayer = L.layerGroup().addTo(map);
  window._markerLayer = markerLayer;

  // Update stats
  const totalEl  = document.getElementById('mapStatTotal');
  const occEl    = document.getElementById('mapStatOcc');
  const vacantEl = document.getElementById('mapStatVacant');

  if (totalEl)  totalEl.textContent  = filtered.length;
  if (occEl)    occEl.textContent    = filtered.length
    ? (filtered.reduce((s,p) => s + (p.Occupancy || 0), 0) / filtered.length).toFixed(1) + '%'
    : '—';
  if (vacantEl) vacantEl.textContent = filtered.filter(p => (p.Occupancy || 100) < 95).length;

  filtered.forEach(p => {
    const lat = parseFloat(p.Latitude);
    const lng = parseFloat(p.Longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    let color, radius;

    if (mapType === 'heatmap') {
      // Vacancy heatmap: red = high vacancy, green = low vacancy
      const vacancy = 100 - (p.Occupancy || 0);
      if (vacancy < 5)       { color = '#0E7C4A'; }
      else if (vacancy < 10) { color = '#C8A96E'; }
      else if (vacancy < 20) { color = '#F59E0B'; }
      else                   { color = '#B91C1C'; }
      radius = 14;
    } else if (mapType === 'income') {
      // Income density: larger = more income
      const income = p.AnnualIncome || 0;
      radius = Math.min(6 + income / 80000, 22);
      color = '#1E6FD9';
    } else {
      // Standard: color by asset class
      const classColors = {
        'Residential': '#1E6FD9',
        'Commercial':  '#C8A96E',
        'Mixed Use':   '#0E7C4A'
      };
      color = classColors[p.AssetClass] || '#8099B8';
      radius = 10;
    }

    const marker = L.circleMarker([lat, lng], {
      radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.88
    }).addTo(markerLayer);

    // Popup
    const income = p.AnnualIncome
      ? '£' + (p.AnnualIncome / 1000).toFixed(0) + 'K p.a.'
      : '—';

    marker.bindPopup(`
      <div style="font-family:'DM Sans',sans-serif;min-width:200px;padding:4px">
        <div style="font-weight:700;font-size:14px;color:#0A2540;margin-bottom:6px">${p.Title}</div>
        <div style="font-size:12px;color:#4A6080;margin-bottom:10px">${p.City} · ${p.AssetClass}</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <tr>
            <td style="color:#8099B8;padding:3px 0">Occupancy</td>
            <td style="font-weight:600;text-align:right">${p.Occupancy}%</td>
          </tr>
          <tr>
            <td style="color:#8099B8;padding:3px 0">Annual Income</td>
            <td style="font-weight:600;text-align:right">${income}</td>
          </tr>
          <tr>
            <td style="color:#8099B8;padding:3px 0">Units</td>
            <td style="font-weight:600;text-align:right">${p.Units || '—'}</td>
          </tr>
          <tr>
            <td style="color:#8099B8;padding:3px 0">Fund</td>
            <td style="font-weight:600;text-align:right">${p.FundName || '—'}</td>
          </tr>
        </table>
        <div style="margin-top:10px">
          <span style="
            display:inline-block;
            background:${color}22;
            color:${color};
            padding:3px 10px;
            border-radius:20px;
            font-size:11px;
            font-weight:600
          ">
            ${p.Status || 'Active'}
          </span>
        </div>
      </div>
    `, { maxWidth: 260 });
  });

  // Add legend for heatmap
  addMapLegend(map, mapType);
}

function addMapLegend(map, mapType) {
  if (window._legend) map.removeControl(window._legend);

  if (mapType === 'heatmap') {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.style.cssText = 'background:white;padding:12px 16px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:12px;box-shadow:0 2px 12px rgba(10,37,64,0.12);min-width:140px';
      div.innerHTML = `
        <div style="font-weight:600;color:#0A2540;margin-bottom:8px">Vacancy Level</div>
        ${[
          ['#0E7C4A','< 5%'],
          ['#C8A96E','5–10%'],
          ['#F59E0B','10–20%'],
          ['#B91C1C','> 20%']
        ].map(([c,l]) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <div style="width:12px;height:12px;border-radius:50%;background:${c}"></div>
            <span style="color:#4A6080">${l}</span>
          </div>
        `).join('')}
      `;
      return div;
    };
    legend.addTo(map);
    window._legend = legend;
  } else if (mapType === 'locations') {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.style.cssText = 'background:white;padding:12px 16px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:12px;box-shadow:0 2px 12px rgba(10,37,64,0.12);min-width:140px';
      div.innerHTML = `
        <div style="font-weight:600;color:#0A2540;margin-bottom:8px">Asset Class</div>
        ${[
          ['#1E6FD9','Residential'],
          ['#C8A96E','Commercial'],
          ['#0E7C4A','Mixed Use']
        ].map(([c,l]) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <div style="width:12px;height:12px;border-radius:50%;background:${c}"></div>
            <span style="color:#4A6080">${l}</span>
          </div>
        `).join('')}
      `;
      return div;
    };
    legend.addTo(map);
    window._legend = legend;
  }
}

function regenerateMap() {
  if (!window._map) return;
  renderMapMarkers(window._map, window._properties || []);
  showToast('🗺️ Map updated');
}
