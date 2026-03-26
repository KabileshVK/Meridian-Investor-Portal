// ─────────────────────────────────────────────────────────
//  Charts — Chart.js initialization
// ─────────────────────────────────────────────────────────

let _charts = {};

function renderCharts(data) {
  // Destroy existing
  Object.values(_charts).forEach(c => c.destroy());
  _charts = {};

  const font = { family: "'DM Sans', sans-serif", size: 12 };
  Chart.defaults.font = font;
  Chart.defaults.color = '#8099B8';

  // ── DONUT ────────────────────────────────────────────
  const donutCtx = document.getElementById('chartDonut');
  if (donutCtx) {
    _charts.donut = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: data.AssetLabels || ['Residential','Commercial','Mixed Use'],
        datasets: [{
          data: data.AssetSplit || [62,24,14],
          backgroundColor: ['#1E6FD9','#C8A96E','#0E7C4A'],
          borderWidth: 0, hoverOffset: 8
        }]
      },
      options: {
        cutout: '74%',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` }
        }},
        animation: { animateRotate: true, duration: 900 }
      }
    });

    // Render legend
    const legend = document.getElementById('donutLegend');
    if (legend) {
      const labels = data.AssetLabels || ['Residential','Commercial','Mixed Use'];
      const vals   = data.AssetSplit  || [62,24,14];
      const colors = ['#1E6FD9','#C8A96E','#0E7C4A'];
      legend.innerHTML = labels.map((l,i) => `
        <div class="donut-legend-item">
          <div><span class="donut-dot" style="background:${colors[i]}"></span>${l}</div>
          <strong>${vals[i]}%</strong>
        </div>
      `).join('');
    }
  }

  // ── LINE ─────────────────────────────────────────────
  const lineCtx = document.getElementById('chartLine');
  if (lineCtx) {
    _charts.line = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: data.TrendLabels || ['Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
        datasets: [{
          label: 'Rental Income (£M)',
          data: data.IncomeTrend || [2.41,2.55,2.68,2.74,2.82,2.96,2.95,3.12],
          borderColor: '#1E6FD9',
          backgroundColor: 'rgba(30,111,217,0.07)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#1E6FD9',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: true, tension: 0.4
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font } },
          y: {
            grid: { color: '#EEF2F8', drawBorder: false },
            ticks: { font, callback: v => '£' + v + 'M' }
          }
        }
      }
    });
  }

  // ── BAR ──────────────────────────────────────────────
  const barCtx = document.getElementById('chartBar');
  if (barCtx) {
    _charts.bar = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: data.CapexCities || ['London','Manchester','Birmingham','Leeds','Bristol'],
        datasets: [
          {
            label: 'Budget £K',
            data: data.CapexBudget || [820,340,280,180,120],
            backgroundColor: '#EEF2F8',
            borderRadius: 5, borderSkipped: false
          },
          {
            label: 'Actual £K',
            data: data.CapexActual || [760,410,290,155,130],
            backgroundColor: '#1E6FD9',
            borderRadius: 5, borderSkipped: false
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font, boxWidth: 10, padding: 16, usePointStyle: true }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font } },
          y: {
            grid: { color: '#EEF2F8', drawBorder: false },
            ticks: { font, callback: v => '£' + v + 'K' }
          }
        }
      }
    });
  }
}
