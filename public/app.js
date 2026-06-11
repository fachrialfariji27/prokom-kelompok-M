const socket = io();
const map = L.map('map', { zoomControl: true }).setView([-6.2, 106.84], 12);

const isDarkTheme = () => document.documentElement.dataset.theme !== 'light';

const tileLayers = {
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }),
  light: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  })
};

tileLayers.dark.addTo(map);

const ambulanceLayer = L.layerGroup().addTo(map);
const hospitalLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);

let dashboard = null;
let responseChart = null;
let volumeChart = null;

const elements = {
  lastUpdated: document.getElementById('lastUpdated'),
  statActiveCases: document.getElementById('statActiveCases'),
  statAverageResponse: document.getElementById('statAverageResponse'),
  statHospitalsReceiving: document.getElementById('statHospitalsReceiving'),
  statSuccessRate: document.getElementById('statSuccessRate'),
  recommendedAmbulance: document.getElementById('recommendedAmbulance'),
  recommendedAmbulanceMeta: document.getElementById('recommendedAmbulanceMeta'),
  recommendedHospital: document.getElementById('recommendedHospital'),
  recommendedHospitalMeta: document.getElementById('recommendedHospitalMeta'),
  recommendedEta: document.getElementById('recommendedEta'),
  recommendedRoute: document.getElementById('recommendedRoute'),
  ambulanceTable: document.getElementById('ambulanceTable'),
  hospitalTable: document.getElementById('hospitalTable'),
  trafficList: document.getElementById('trafficList'),
  eventFeed: document.getElementById('eventFeed'),
  dispatchDemoBtn: document.getElementById('dispatchDemoBtn'),
  themeToggle: document.getElementById('themeToggle')
};

function formatTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

function badgeClassForStatus(status) {
  if (status.includes('Tersedia') || status.includes('Menerima')) return 'badge-soft badge-soft--success';
  if (status.includes('Menuju') || status.includes('Tiba')) return 'badge-soft badge-soft--primary';
  if (status.includes('Penuh') || status.includes('Offline')) return 'badge-soft badge-soft--danger';
  return 'badge-soft badge-soft--warning';
}

function iconColor(status) {
  if (status === 'Tersedia') return '#2dd4a3';
  if (status === 'Menuju Pasien') return '#0f62fe';
  if (status === 'Mengangkut Pasien') return '#f5c451';
  if (status === 'Tiba di Rumah Sakit') return '#ff4d5e';
  return '#7f8ea5';
}

function clearLayers(layer) {
  layer.clearLayers();
}

function drawMap(dashboardData) {
  clearLayers(ambulanceLayer);
  clearLayers(hospitalLayer);
  clearLayers(routeLayer);

  dashboardData.ambulances.forEach((ambulance) => {
    const marker = L.circleMarker([ambulance.location.lat, ambulance.location.lng], {
      radius: 10,
      color: iconColor(ambulance.status),
      fillColor: iconColor(ambulance.status),
      fillOpacity: 0.9,
      weight: 2
    });

    marker.bindPopup(`
      <strong>${ambulance.name}</strong><br />
      Status: ${ambulance.status}<br />
      Driver: ${ambulance.driver}<br />
      Battery: ${ambulance.battery}%
    `);

    marker.addTo(ambulanceLayer);
  });

  dashboardData.hospitals.forEach((hospital) => {
    const marker = L.marker([hospital.location.lat, hospital.location.lng]);
    marker.bindPopup(`
      <strong>${hospital.name}</strong><br />
      IGD beds: ${hospital.igdBedsAvailable}<br />
      Doctors on duty: ${hospital.doctorsOnDuty}<br />
      Status: ${hospital.receivingPatients ? 'Menerima pasien' : 'Penuh'}
    `);
    marker.addTo(hospitalLayer);
  });

  if (dashboardData.dispatchSummary?.lastRoute) {
    L.polyline(dashboardData.dispatchSummary.lastRoute, {
      color: '#ff4d5e',
      weight: 5,
      opacity: 0.85
    }).addTo(routeLayer);
  }
}

function renderAnalytics(analytics) {
  const responseCtx = document.getElementById('responseChart');
  const volumeCtx = document.getElementById('volumeChart');

  if (responseChart) {
    responseChart.destroy();
  }

  if (volumeChart) {
    volumeChart.destroy();
  }

  responseChart = new Chart(responseCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Response time (min)',
        data: analytics.responseTrend,
        tension: 0.35,
        borderColor: '#0f62fe',
        backgroundColor: 'rgba(15, 98, 254, 0.18)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') } }
      },
      scales: {
        x: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });

  volumeChart = new Chart(volumeCtx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Cases',
          data: analytics.monthlyCases,
          backgroundColor: 'rgba(255, 77, 94, 0.72)'
        },
        {
          label: 'Target success (%)',
          data: analytics.targetTrend,
          backgroundColor: 'rgba(45, 212, 163, 0.72)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') } }
      },
      scales: {
        x: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

function renderTraffic(traffic) {
  elements.trafficList.innerHTML = traffic
    .map(
      (item) => `
        <div class="traffic-item">
          <h4>${item.name}</h4>
          <div class="traffic-meta">Congestion ${item.congestion.toFixed(2)}x</div>
          <p>Speed ${item.speedKmh} km/h · Base ${item.baseSpeed} km/h</p>
        </div>
      `
    )
    .join('');
}

function renderEvents(events) {
  elements.eventFeed.innerHTML = events
    .map(
      (item) => `
        <div class="event-item">
          <h4>${item.title}</h4>
          <div class="event-meta">${item.type.toUpperCase()} · ${formatTime(item.timestamp)}</div>
          <p>${item.detail}</p>
        </div>
      `
    )
    .join('');
}

function renderTables(ambulances, hospitals) {
  elements.ambulanceTable.innerHTML = ambulances
    .map(
      (ambulance) => `
        <tr>
          <td>
            <strong>${ambulance.name}</strong><br />
            <span class="small text-secondary">${ambulance.id}</span>
          </td>
          <td>${ambulance.driver}</td>
          <td><span class="${badgeClassForStatus(ambulance.status)}">${ambulance.status}</span></td>
          <td>${ambulance.battery}%</td>
          <td>${formatTime(ambulance.lastSeen)}</td>
        </tr>
      `
    )
    .join('');

  elements.hospitalTable.innerHTML = hospitals
    .map(
      (hospital) => `
        <tr>
          <td>
            <strong>${hospital.name}</strong><br />
            <span class="small text-secondary">${hospital.phone}</span>
          </td>
          <td>${hospital.igdBedsAvailable}</td>
          <td>${hospital.doctorsOnDuty}</td>
          <td>${hospital.icuAvailable ? 'Ada' : 'Tidak ada'}</td>
          <td><span class="${badgeClassForStatus(hospital.receivingPatients ? 'Menerima' : 'Penuh')}">${hospital.receivingPatients ? 'Menerima pasien' : 'Penuh'}</span></td>
        </tr>
      `
    )
    .join('');
}

function findBestDispatch(dashboardData) {
  const ambulance = dashboardData.ambulances.find((item) => item.status === 'Menuju Pasien') || dashboardData.ambulances[0];
  const hospital = dashboardData.hospitals.find((item) => item.receivingPatients) || dashboardData.hospitals[0];
  const latestIncident = dashboardData.incidents[0];

  elements.recommendedAmbulance.textContent = ambulance ? `${ambulance.name}` : '--';
  elements.recommendedAmbulanceMeta.textContent = ambulance ? `${ambulance.driver} · ${ambulance.status}` : 'Menunggu data';
  elements.recommendedHospital.textContent = hospital ? hospital.name : '--';
  elements.recommendedHospitalMeta.textContent = hospital ? `${hospital.igdBedsAvailable} IGD beds available` : 'Menunggu data';
  elements.recommendedEta.textContent = latestIncident ? `${latestIncident.responseTimeMinutes} min` : '--';
  elements.recommendedRoute.textContent = latestIncident
    ? `${latestIncident.area} → ${latestIncident.hospitalName}`
    : 'Rute belum tersedia';
}

function updateStats(dashboardData) {
  elements.statActiveCases.textContent = dashboardData.dispatchSummary?.activeCases ?? 0;
  elements.statAverageResponse.textContent = `${dashboardData.analytics.averageResponse}m`;
  elements.statHospitalsReceiving.textContent = dashboardData.hospitals.filter((item) => item.receivingPatients).length;
  elements.statSuccessRate.textContent = `${dashboardData.analytics.successRate}%`;
  elements.lastUpdated.textContent = `Updated ${formatTime(dashboardData.updatedAt)}`;
}

function syncTheme(nextTheme) {
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem('theme', nextTheme);
  document.body.classList.toggle('light-theme', nextTheme === 'light');
  tileLayers.dark.remove();
  tileLayers.light.remove();
  (nextTheme === 'light' ? tileLayers.light : tileLayers.dark).addTo(map);
  if (dashboard) {
    renderAnalytics(dashboard.analytics);
  }
}

async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  dashboard = await response.json();
  updateStats(dashboard);
  renderTables(dashboard.ambulances, dashboard.hospitals);
  renderTraffic(dashboard.traffic);
  renderEvents(dashboard.events);
  findBestDispatch(dashboard);
  drawMap(dashboard);
  renderAnalytics(dashboard.analytics);
}

async function createDemoDispatch() {
  const payload = {
    patient: {
      name: 'Demo Patient',
      age: 37,
      condition: 'Shortness of breath and chest pain',
      severity: 'Tinggi'
    },
    area: 'Cikini',
    caseType: 'cardiac',
    location: { lat: -6.1938, lng: 106.8449 }
  };

  await fetch('/api/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  await loadDashboard();
}

socket.on('dashboard:update', (payload) => {
  dashboard = payload;
  updateStats(payload);
  renderTables(payload.ambulances, payload.hospitals);
  renderTraffic(payload.traffic);
  renderEvents(payload.events);
  findBestDispatch(payload);
  drawMap(payload);
  renderAnalytics(payload.analytics);
});

socket.on('dispatch:result', () => {
  loadDashboard();
});

elements.dispatchDemoBtn.addEventListener('click', createDemoDispatch);

elements.themeToggle.addEventListener('click', () => {
  const nextTheme = isDarkTheme() ? 'light' : 'dark';
  syncTheme(nextTheme);
  elements.themeToggle.textContent = nextTheme === 'light' ? 'Light Mode' : 'Dark Mode';
});

const storedTheme = localStorage.getItem('theme') || 'dark';
syncTheme(storedTheme);
elements.themeToggle.textContent = storedTheme === 'light' ? 'Light Mode' : 'Dark Mode';

loadDashboard().catch((error) => {
  console.error(error);
  elements.eventFeed.innerHTML = '<div class="event-item"><h4>Failed to load dashboard</h4><p>Check the backend server.</p></div>';
});
