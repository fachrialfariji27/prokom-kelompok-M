const socket = io();
const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
const map = L.map('map', { zoomControl: true }).setView([-6.99, 110.42], 12);

const tileLayers = {
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }),
  light: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  })
};

tileLayers.dark.addTo(map);

const layers = {
  user: L.layerGroup().addTo(map),
  hospitals: L.layerGroup().addTo(map),
  clinics: L.layerGroup().addTo(map),
  ambulances: L.layerGroup().addTo(map),
  routes: L.layerGroup().addTo(map)
};

const state = {
  dashboard: null,
  facilities: { hospitals: [], clinics: [] },
  userLocation: null,
  selectedFacility: null,
  bookingChart: null,
  etaChart: null,
  activeTrackingId: null
};

const elements = {
  lastUpdated: document.getElementById('lastUpdated'),
  statActiveCases: document.getElementById('statActiveCases'),
  statAverageEta: document.getElementById('statAverageEta'),
  statFacilities: document.getElementById('statFacilities'),
  statSuccessRate: document.getElementById('statSuccessRate'),
  hospitalCards: document.getElementById('hospitalCards'),
  clinicCards: document.getElementById('clinicCards'),
  trackingCard: document.getElementById('trackingCard'),
  bookingTable: document.getElementById('bookingTable'),
  ambulanceAdminTable: document.getElementById('ambulanceAdminTable'),
  facilityAdminTable: document.getElementById('facilityAdminTable'),
  eventFeed: document.getElementById('eventFeed'),
  gpsBtn: document.getElementById('gpsBtn'),
  bukaFormBtn: document.getElementById('bukaFormBtn'),
  themeToggle: document.getElementById('themeToggle'),
  bookingTargetLabel: document.getElementById('bookingTargetLabel'),
  bookingForm: document.getElementById('bookingForm'),
  formRumahSakit: document.getElementById('formRumahSakit'),
  formKlinik: document.getElementById('formKlinik'),
  formAmbulans: document.getElementById('formAmbulans')
};

function formatTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function facilityBadgeClass(facility) {
  if (!facility.active) return 'badge-soft badge-soft--danger';
  if (facility.receivingPatients === false || facility.ambulancesAvailable === 0) return 'badge-soft badge-soft--warning';
  return 'badge-soft badge-soft--success';
}

function bookingBadgeClass(status) {
  if (status === 'Siaga di RS' || status === 'Tersedia') return 'badge-soft badge-soft--success';
  if (status === 'Pasien dalam penanganan') return 'badge-soft badge-soft--success';
  if (status === 'Ambulans telah tiba') return 'badge-soft badge-soft--primary';
  if (status === 'Ambulans menuju lokasi' || status === 'Ambulans sedang disiapkan') return 'badge-soft badge-soft--warning';
  return 'badge-soft badge-soft--danger';
}

function trafficColor(value) {
  if (value >= 1.8) return '#ff4d5e';
  if (value >= 1.2) return '#f5c451';
  return '#2dd4a3';
}

function userMarkerIcon() {
  return L.divIcon({
    className: 'map-pin map-pin--user',
    html: '<span>Anda</span>',
    iconSize: [58, 58],
    iconAnchor: [29, 58]
  });
}

function hospitalMarkerIcon() {
  return L.divIcon({
    className: 'map-pin map-pin--hospital',
    html: '<span>RS</span>',
    iconSize: [46, 46],
    iconAnchor: [23, 46]
  });
}

function clinicMarkerIcon() {
  return L.divIcon({
    className: 'map-pin map-pin--clinic',
    html: '<span>KL</span>',
    iconSize: [46, 46],
    iconAnchor: [23, 46]
  });
}

function ambulanceMarkerIcon() {
  return L.divIcon({
    className: 'map-pin map-pin--ambulance',
    html: '<span>AMB</span>',
    iconSize: [50, 50],
    iconAnchor: [25, 50]
  });
}

function clearLayers() {
  Object.values(layers).forEach((layer) => layer.clearLayers());
}

function facilityDistanceText(facility) {
  return `${facility.distanceKm.toFixed(1)} km`;
}

function buildFacilityCard(facility) {
  const statusLabel = facility.active ? 'Aktif' : 'Nonaktif';
  const availableLabel = `${facility.ambulancesAvailable} ambulans tersedia`;
  const actionLabel = facility.ambulancesAvailable > 0 && facility.active ? 'Pesan Ambulans' : 'Lihat Detail';

  return `
    <article class="facility-card">
      <div class="facility-card__head">
        <div>
          <p class="facility-card__eyebrow">${facility.type}</p>
          <h4>${facility.name}</h4>
        </div>
        <span class="${facilityBadgeClass(facility)}">${statusLabel}</span>
      </div>
      <p class="facility-card__address">${facility.address}</p>
      <div class="facility-card__meta">
        <span>${facility.phone}</span>
        <span>${facilityDistanceText(facility)}</span>
      </div>
      <div class="facility-card__meta">
        <span>${availableLabel}</span>
        <span>${facility.receivingPatients ? 'Menerima pasien' : 'Penuh'}</span>
      </div>
      <div class="facility-card__actions">
        <button class="btn btn-danger btn-sm" data-facility-book="${facility.id}">${actionLabel}</button>
        <button class="btn btn-outline-light btn-sm" data-facility-focus="${facility.id}">Lihat di Peta</button>
      </div>
    </article>
  `;
}

function renderFacilities() {
  const hospitals = [...state.facilities.hospitals].sort((a, b) => a.distanceKm - b.distanceKm || b.ambulancesAvailable - a.ambulancesAvailable);
  const clinics = [...state.facilities.clinics].sort((a, b) => a.distanceKm - b.distanceKm || b.ambulancesAvailable - a.ambulancesAvailable);

  elements.hospitalCards.innerHTML = hospitals.map(buildFacilityCard).join('');
  elements.clinicCards.innerHTML = clinics.map(buildFacilityCard).join('');

  document.querySelectorAll('[data-facility-book]').forEach((button) => {
    button.addEventListener('click', () => {
      const facility = findFacility(button.dataset.facilityBook);
      openBookingModal(facility);
    });
  });

  document.querySelectorAll('[data-facility-focus]').forEach((button) => {
    button.addEventListener('click', () => {
      const facility = findFacility(button.dataset.facilityFocus);
      if (facility) {
        map.setView([facility.location.lat, facility.location.lng], 15);
      }
    });
  });
}

function findFacility(id) {
  return state.facilities.hospitals.find((item) => item.id === id)
    || state.facilities.clinics.find((item) => item.id === id);
}

function renderMap() {
  clearLayers();

  const userLocation = state.userLocation || state.dashboard?.userLocation || { lat: -6.99, lng: 110.42 };
  L.marker([userLocation.lat, userLocation.lng], { icon: userMarkerIcon() })
    .bindPopup('Lokasi Anda')
    .addTo(layers.user);

  state.facilities.hospitals.forEach((facility) => {
    L.marker([facility.location.lat, facility.location.lng], { icon: hospitalMarkerIcon() })
      .bindPopup(`
        <strong>${facility.name}</strong><br />
        ${facility.address}<br />
        ${facility.phone}<br />
        Jarak: ${facilityDistanceText(facility)}
      `)
      .addTo(layers.hospitals);
  });

  state.facilities.clinics.forEach((facility) => {
    L.marker([facility.location.lat, facility.location.lng], { icon: clinicMarkerIcon() })
      .bindPopup(`
        <strong>${facility.name}</strong><br />
        ${facility.address}<br />
        ${facility.phone}<br />
        Jarak: ${facilityDistanceText(facility)}
      `)
      .addTo(layers.clinics);
  });

  state.dashboard?.ambulances.forEach((ambulance) => {
    L.marker([ambulance.location.lat, ambulance.location.lng], { icon: ambulanceMarkerIcon() })
      .bindPopup(`
        <strong>${ambulance.name}</strong><br />
        Sopir: ${ambulance.driver}<br />
        Nomor: ${ambulance.number || '-'}<br />
        Status: ${ambulance.status}
      `)
      .addTo(layers.ambulances);
  });

  const tracking = getCurrentTracking();
  if (tracking) {
    L.polyline(tracking.routeToUser || [], {
      color: '#1976D2',
      weight: 5,
      opacity: 0.9,
      dashArray: '8,8'
    }).addTo(layers.routes);

    L.polyline(tracking.routeToDestination || [], {
      color: '#E53935',
      weight: 5,
      opacity: 0.9
    }).addTo(layers.routes);
  }
}

function getCurrentTracking() {
  const fromSessions = state.dashboard?.trackingSessions || [];
  return fromSessions[0] || state.dashboard?.bookings?.[0] || null;
}

function renderStats() {
  const dashboard = state.dashboard;
  if (!dashboard) return;

  elements.statActiveCases.textContent = dashboard.dispatchSummary?.activeCases ?? 0;
  elements.statAverageEta.textContent = `${dashboard.analytics.averageEta}m`;
  elements.statFacilities.textContent = dashboard.hospitals.filter((item) => item.active).length + dashboard.clinics.filter((item) => item.active).length;
  elements.statSuccessRate.textContent = `${dashboard.analytics.successRate}%`;
  elements.lastUpdated.textContent = `Diperbarui ${formatTime(dashboard.updatedAt)}`;
}

function renderEvents() {
  const events = state.dashboard?.events || [];
  elements.eventFeed.innerHTML = events.map((event) => `
    <div class="event-item">
      <h4>${event.title}</h4>
      <div class="event-meta">${event.type.toUpperCase()} · ${formatTime(event.timestamp)}</div>
      <p>${event.detail}</p>
    </div>
  `).join('');
}

function renderCharts() {
  if (!state.dashboard) return;

  const bookingCtx = document.getElementById('bookingChart');
  const etaCtx = document.getElementById('etaChart');

  if (state.bookingChart) state.bookingChart.destroy();
  if (state.etaChart) state.etaChart.destroy();

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text');
  const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted');

  state.bookingChart = new Chart(bookingCtx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
      datasets: [
        {
          label: 'Pemesanan',
          data: state.dashboard.analytics.casesPerMonth,
          backgroundColor: 'rgba(25, 118, 210, 0.8)'
        },
        {
          label: 'Target keberhasilan',
          data: state.dashboard.analytics.successTrend,
          backgroundColor: 'rgba(229, 57, 53, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: mutedColor }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: mutedColor }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    }
  });

  state.etaChart = new Chart(etaCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
      datasets: [
        {
          label: 'ETA rata-rata',
          data: [14, 13, 12, 11, 10, state.dashboard.analytics.averageEta],
          borderColor: '#1976D2',
          backgroundColor: 'rgba(25, 118, 210, 0.15)',
          fill: true,
          tension: 0.35
        },
        {
          label: 'Respons tercepat',
          data: [11, 10, 10, 9, 8, state.dashboard.analytics.fastestResponse],
          borderColor: '#E53935',
          backgroundColor: 'rgba(229, 57, 53, 0.15)',
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: mutedColor }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: mutedColor }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    }
  });
}

function renderBookings() {
  const bookings = state.dashboard?.bookings || [];
  elements.bookingTable.innerHTML = bookings.map((booking) => `
    <tr>
      <td>
        <strong>${booking.patientName}</strong><br />
        <span class="small text-secondary">${formatDateTime(booking.bookingTime)}</span>
      </td>
      <td>${booking.destinationName}</td>
      <td>${booking.ambulanceName}<br /><span class="small text-secondary">${booking.ambulanceNumber || '-'}</span></td>
      <td>${booking.etaMinutes} menit</td>
      <td><span class="${bookingBadgeClass(booking.status)}">${booking.status}</span></td>
    </tr>
  `).join('');
}

function renderTracking() {
  const tracking = getCurrentTracking();
  if (!tracking) {
    elements.trackingCard.innerHTML = '<p>Belum ada pemesanan ambulans. Gunakan tombol <strong>Pesan Ambulans</strong> untuk memulai.</p>';
    return;
  }

  const steps = [
    'Permintaan diterima',
    'Ambulans sedang disiapkan',
    'Ambulans menuju lokasi',
    'Ambulans telah tiba',
    'Pasien dalam penanganan'
  ];

  elements.trackingCard.innerHTML = `
    <div class="tracking-summary">
      <div>
        <p class="summary-label">Fasilitas pengirim</p>
        <h4>${tracking.destinationName}</h4>
        <p>${tracking.destinationPhone || '-'}</p>
      </div>
      <div>
        <p class="summary-label">Sopir dan unit</p>
        <h4>${tracking.driverName}</h4>
        <p>${tracking.ambulanceName} · ${tracking.ambulanceNumber || '-'}</p>
      </div>
      <div>
        <p class="summary-label">ETA dan jarak</p>
        <h4>${tracking.etaMinutes} menit</h4>
        <p>${tracking.distanceKm?.toFixed ? tracking.distanceKm.toFixed(2) : tracking.distanceKm} km</p>
      </div>
    </div>
    <div class="tracking-status mt-4">
      <p class="summary-label">Status perjalanan</p>
      <div class="status-steps">
        ${steps.map((step) => `<span class="status-step ${tracking.statusHistory?.includes(step) ? 'is-active' : ''}">${step}</span>`).join('')}
      </div>
      <div class="tracking-meta mt-3">
        <span><strong>Lokasi kejadian:</strong> ${tracking.pickupLocation}</span>
        <span><strong>Kondisi:</strong> ${tracking.condition}</span>
        <span><strong>Catatan:</strong> ${tracking.note}</span>
      </div>
    </div>
  `;
}

function renderAdminTables() {
  const ambulances = state.dashboard?.ambulances || [];
  const facilities = [
    ...(state.dashboard?.hospitals || []).map((item) => ({ ...item, jenis: 'Rumah Sakit' })),
    ...(state.dashboard?.clinics || []).map((item) => ({ ...item, jenis: 'Klinik' }))
  ];

  elements.ambulanceAdminTable.innerHTML = ambulances.map((ambulance) => `
    <tr>
      <td><strong>${ambulance.name}</strong><br /><span class="small text-secondary">${ambulance.number || '-'}</span></td>
      <td>${ambulance.driver}</td>
      <td><span class="${bookingBadgeClass(ambulance.status)}">${ambulance.status}</span></td>
      <td><button class="btn btn-sm btn-outline-light" data-ambulance-toggle="${ambulance.id}">Ubah Status</button></td>
    </tr>
  `).join('');

  elements.facilityAdminTable.innerHTML = facilities.map((facility) => `
    <tr>
      <td><strong>${facility.name}</strong><br /><span class="small text-secondary">${facility.address}</span></td>
      <td>${facility.jenis}</td>
      <td>${facility.ambulancesAvailable}</td>
      <td><span class="${facilityBadgeClass(facility)}">${facility.active ? 'Aktif' : 'Nonaktif'}</span></td>
      <td class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-outline-light" data-facility-toggle="${facility.id}">Aktif / Nonaktif</button>
        <button class="btn btn-sm btn-outline-light" data-facility-plus="${facility.id}">+1 Ambulans</button>
        <button class="btn btn-sm btn-outline-light" data-facility-minus="${facility.id}">-1 Ambulans</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-ambulance-toggle]').forEach((button) => {
    button.addEventListener('click', () => toggleAmbulanceStatus(button.dataset.ambulanceToggle));
  });

  document.querySelectorAll('[data-facility-toggle]').forEach((button) => {
    button.addEventListener('click', () => toggleFacilityActive(button.dataset.facilityToggle));
  });

  document.querySelectorAll('[data-facility-plus]').forEach((button) => {
    button.addEventListener('click', () => adjustFacilityAmbulances(button.dataset.facilityPlus, 1));
  });

  document.querySelectorAll('[data-facility-minus]').forEach((button) => {
    button.addEventListener('click', () => adjustFacilityAmbulances(button.dataset.facilityMinus, -1));
  });
}

function renderDashboard() {
  if (!state.dashboard) return;
  renderStats();
  renderFacilities();
  renderMap();
  renderEvents();
  renderCharts();
  renderBookings();
  renderTracking();
  renderAdminTables();
}

function openBookingModal(facility) {
  state.selectedFacility = facility;
  elements.bookingTargetLabel.textContent = `${facility.name} · ${facility.phone}`;
  elements.bookingForm.tujuanId.value = facility.id;
  if (state.userLocation) {
    elements.bookingForm.lokasiKejadian.value = `Lokasi sekitar ${state.userLocation.lat.toFixed(4)}, ${state.userLocation.lng.toFixed(4)}`;
  }
  bookingModal.show();
}

function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: -6.99, lng: 110.42 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => resolve({ lat: -6.99, lng: 110.42 }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });
}

async function setUserLocation(location) {
  state.userLocation = location;
  await fetch('/api/lokasi-saya', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location })
  });
}

async function loadDashboard() {
  const [dashboardResponse, fasilitasResponse] = await Promise.all([
    fetch('/api/dashboard'),
    fetch('/api/fasilitas')
  ]);

  state.dashboard = await dashboardResponse.json();
  state.facilities = await fasilitasResponse.json();

  if (!state.userLocation) {
    state.userLocation = state.dashboard.userLocation;
  }

  renderDashboard();
}

async function refreshAll() {
  await loadDashboard();
}

async function createBookingFromForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.userLocation = state.userLocation || state.dashboard?.userLocation;

  const response = await fetch('/api/pemesanan-ambulans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!result.success) {
    alert(result.message || 'Gagal memproses pemesanan ambulans');
    return;
  }

  bookingModal.hide();
  state.activeTrackingId = result.booking?.id || null;
  await refreshAll();
}

async function addHospital(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.ambulancesAvailable = Number(payload.ambulancesAvailable || 0);
  payload.active = true;
  payload.receivingPatients = true;
  payload.location = state.userLocation || state.dashboard.userLocation;

  await fetch('/api/admin/rumah-sakit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  event.currentTarget.reset();
  await refreshAll();
}

async function addClinic(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.ambulancesAvailable = Number(payload.ambulancesAvailable || 0);
  payload.active = true;
  payload.receivingPatients = true;
  payload.location = state.userLocation || state.dashboard.userLocation;

  await fetch('/api/admin/klinik', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  event.currentTarget.reset();
  await refreshAll();
}

async function addAmbulance(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.battery = 90;
  payload.location = state.userLocation || state.dashboard.userLocation;
  payload.target = state.userLocation || state.dashboard.userLocation;

  await fetch('/api/admin/ambulans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  event.currentTarget.reset();
  await refreshAll();
}

async function toggleAmbulanceStatus(id) {
  const ambulance = state.dashboard.ambulances.find((item) => item.id === id);
  if (!ambulance) return;

  const nextStatus = ambulance.status === 'Offline' ? 'Tersedia' : ambulance.status === 'Tersedia' ? 'Ambulans sedang disiapkan' : 'Offline';
  await fetch(`/api/ambulances/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: nextStatus })
  });

  await refreshAll();
}

async function toggleFacilityActive(id) {
  const facility = findFacility(id);
  if (!facility) return;
  const isHospital = Boolean(state.dashboard.hospitals.find((item) => item.id === id));
  const endpoint = isHospital ? `/api/hospitals/${id}/capacity` : `/api/clinics/${id}/capacity`;

  await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !facility.active, receivingPatients: !facility.active })
  });

  await refreshAll();
}

async function adjustFacilityAmbulances(id, delta) {
  const facility = findFacility(id);
  if (!facility) return;
  const isHospital = Boolean(state.dashboard.hospitals.find((item) => item.id === id));
  const endpoint = isHospital ? `/api/hospitals/${id}/capacity` : `/api/clinics/${id}/capacity`;

  await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ambulancesAvailable: Math.max(0, (facility.ambulancesAvailable || 0) + delta) })
  });

  await refreshAll();
}

function initTheme() {
  const storedTheme = localStorage.getItem('sigap-theme') || 'dark';
  applyTheme(storedTheme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
  localStorage.setItem('sigap-theme', theme);
  elements.themeToggle.textContent = theme === 'light' ? 'Mode Terang' : 'Mode Gelap';
  tileLayers.dark.remove();
  tileLayers.light.remove();
  (theme === 'light' ? tileLayers.light : tileLayers.dark).addTo(map);
}

async function detectLocation() {
  const location = await getCurrentLocation();
  await setUserLocation(location);
  map.setView([location.lat, location.lng], 14);
  await refreshAll();
}

socket.on('dashboard:update', (payload) => {
  state.dashboard = payload;
  if (!state.userLocation) {
    state.userLocation = payload.userLocation;
  }
  state.facilities = {
    hospitals: payload.hospitals,
    clinics: payload.clinics
  };
  renderDashboard();
});

socket.on('permintaan:hasil', () => {
  refreshAll();
});

socket.on('tracking:hasil', () => {
  refreshAll();
});

elements.gpsBtn.addEventListener('click', detectLocation);
elements.bukaFormBtn.addEventListener('click', () => {
  const defaultFacility = state.facilities.hospitals[0] || state.facilities.clinics[0];
  if (defaultFacility) {
    openBookingModal(defaultFacility);
  } else {
    bookingModal.show();
  }
});
elements.themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme);
});
elements.bookingForm.addEventListener('submit', createBookingFromForm);
elements.formRumahSakit.addEventListener('submit', addHospital);
elements.formKlinik.addEventListener('submit', addClinic);
elements.formAmbulans.addEventListener('submit', addAmbulance);

document.addEventListener('click', (event) => {
  const selected = event.target.closest('[data-facility-book]');
  if (selected) {
    const facility = findFacility(selected.dataset.facilityBook);
    if (facility) {
      openBookingModal(facility);
    }
  }
});

(async () => {
  initTheme();
  await detectLocation();
  await refreshAll();
})();
