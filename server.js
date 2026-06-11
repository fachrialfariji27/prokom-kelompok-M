const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const seed = require('./src/data/seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATUS_SEQUENCE = [
  'Permintaan diterima',
  'Ambulans sedang disiapkan',
  'Ambulans menuju lokasi',
  'Ambulans telah tiba',
  'Pasien dalam penanganan'
];

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const state = seed.createInitialState();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(a, b) {
  const radius = 6371;
  const deltaLat = degToRad(b.lat - a.lat);
  const deltaLng = degToRad(b.lng - a.lng);
  const lat1 = degToRad(a.lat);
  const lat2 = degToRad(b.lat);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatNumber(value, digits = 2) {
  return +Number(value).toFixed(digits);
}

function toPoint(location) {
  if (Array.isArray(location)) {
    return { lat: location[0], lng: location[1] };
  }

  return location;
}

function buildPolyline(origin, destination) {
  const originPoint = toPoint(origin);
  const destinationPoint = toPoint(destination);
  const midLat = (originPoint.lat + destinationPoint.lat) / 2;
  const midLng = (originPoint.lng + destinationPoint.lng) / 2;

  return [
    [originPoint.lat, originPoint.lng],
    [midLat + 0.0015, midLng - 0.0015],
    [destinationPoint.lat, destinationPoint.lng]
  ];
}

function travelMinutes(distanceKm, speedKmh, congestion = 1) {
  return Math.max(1, Math.round((distanceKm / Math.max(speedKmh, 18)) * 60 * congestion));
}

function trafficMultiplier() {
  const hour = new Date().getHours();
  const rushHour = (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19);
  const base = rushHour ? 1.3 : 1;
  return formatNumber(base + Math.random() * 0.25, 2);
}

function trafficSpeed(segment) {
  return Math.max(18, Math.round(segment.baseSpeed / Math.max(segment.congestion, 0.4)));
}

function updateTraffic() {
  const multiplier = trafficMultiplier();
  state.traffic = state.traffic.map((segment) => {
    const nextCongestion = Math.max(0.35, Math.min(2.4, formatNumber(segment.congestion + (Math.random() - 0.45) * 0.2 * multiplier, 2)));

    return {
      ...segment,
      congestion: nextCongestion,
      speedKmh: trafficSpeed({ ...segment, congestion: nextCongestion })
    };
  });
}

function updateVehicleDrift() {
  state.ambulances = state.ambulances.map((vehicle) => {
    if (vehicle.status === 'Offline') {
      return vehicle;
    }

    const target = toPoint(vehicle.target || state.userLocation);
    const current = toPoint(vehicle.location);
    const step = vehicle.status === 'Tersedia' || vehicle.status === 'Siaga di RS' ? 0.08 : 0.22;

    return {
      ...vehicle,
      location: {
        lat: formatNumber(current.lat + (target.lat - current.lat) * step + (Math.random() - 0.5) * 0.0004, 6),
        lng: formatNumber(current.lng + (target.lng - current.lng) * step + (Math.random() - 0.5) * 0.0004, 6)
      },
      battery: Math.max(20, Math.min(100, vehicle.battery - (vehicle.status === 'Tersedia' ? 0 : 1))),
      lastSeen: new Date().toISOString()
    };
  });
}

function facilityDistance(userLocation, facility) {
  return formatNumber(haversineKm(userLocation, toPoint(facility.location)), 2);
}

function sortFacilities(userLocation, collection) {
  return collection
    .map((facility) => ({
      ...clone(facility),
      distanceKm: facilityDistance(userLocation, facility)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || b.ambulancesAvailable - a.ambulancesAvailable);
}

function getAvailableVehicles() {
  return state.ambulances.filter((vehicle) => vehicle.status !== 'Offline');
}

function chooseVehicle(userLocation) {
  const vehicles = getAvailableVehicles();

  return vehicles
    .map((vehicle) => ({
      ...vehicle,
      distanceKm: facilityDistance(userLocation, vehicle),
      etaMinutes: travelMinutes(facilityDistance(userLocation, vehicle), 38, trafficMultiplier())
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || b.battery - a.battery)[0] || vehicles[0];
}

function chooseFacility(payload, userLocation) {
  if (payload.tujuanId) {
    const selectedHospital = state.hospitals.find((item) => item.id === payload.tujuanId);
    const selectedClinic = state.clinics.find((item) => item.id === payload.tujuanId);
    if (selectedHospital) return selectedHospital;
    if (selectedClinic) return selectedClinic;
  }

  const hospitals = sortFacilities(userLocation, state.hospitals.filter((item) => item.active && item.receivingPatients));
  const clinics = sortFacilities(userLocation, state.clinics.filter((item) => item.active && item.receivingPatients));
  return hospitals[0] || clinics[0] || state.hospitals[0] || state.clinics[0];
}

function buildAnalytics() {
  const totalBookings = state.bookings.length;
  const etaValues = state.bookings.map((booking) => booking.etaMinutes || 0);
  const averageEta = totalBookings ? etaValues.reduce((sum, item) => sum + item, 0) / totalBookings : 0;
  const successRate = totalBookings
    ? Math.round((state.bookings.filter((booking) => booking.etaMinutes <= 12).length / totalBookings) * 100)
    : state.analytics.successRate;

  const hospitalUsage = state.bookings.reduce((accumulator, booking) => {
    accumulator[booking.destinationName] = (accumulator[booking.destinationName] || 0) + 1;
    return accumulator;
  }, {});

  const clinicUsage = state.bookings.reduce((accumulator, booking) => {
    if (booking.assignedFacilityType === 'Klinik') {
      accumulator[booking.destinationName] = (accumulator[booking.destinationName] || 0) + 1;
    }
    return accumulator;
  }, {});

  const topHospital = Object.entries(hospitalUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || state.analytics.topHospital;
  const topClinic = Object.entries(clinicUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || state.analytics.topClinic;

  return {
    totalBookings,
    averageEta: formatNumber(averageEta, 1),
    fastestResponse: totalBookings ? Math.min(...etaValues.filter((value) => value > 0)) : state.analytics.fastestResponse,
    activeVehicles: getAvailableVehicles().length,
    successRate,
    topHospital,
    topClinic,
    casesPerMonth: [18, 21, 24, 27, 29, totalBookings || 30],
    etaTrend: [14, 13, 12, 11, 10, Math.max(8, Math.round(averageEta || 11))],
    successTrend: [88, 89, 90, 91, 92, successRate]
  };
}

function getRecentEvents() {
  return state.events.slice(0, 10);
}

function getSessionById(id) {
  return state.trackingSessions.find((session) => session.id === id);
}

function nextStatus(currentStatus) {
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
  return STATUS_SEQUENCE[Math.min(currentIndex + 1, STATUS_SEQUENCE.length - 1)];
}

function progressTracking(session) {
  if (!session || session.status === 'Pasien dalam penanganan') {
    return session;
  }

  const updated = { ...session };
  const current = toPoint(updated.ambulanceLocation);
  const target = updated.status === 'Ambulans menuju lokasi' || updated.status === 'Ambulans sedang disiapkan'
    ? toPoint(updated.userLocation)
    : toPoint(updated.destinationLocation || updated.userLocation);
  const pace = updated.status === 'Permintaan diterima' ? 0.18 : updated.status === 'Ambulans sedang disiapkan' ? 0.25 : 0.34;

  updated.ambulanceLocation = {
    lat: formatNumber(current.lat + (target.lat - current.lat) * pace + (Math.random() - 0.5) * 0.0003, 6),
    lng: formatNumber(current.lng + (target.lng - current.lng) * pace + (Math.random() - 0.5) * 0.0003, 6)
  };
  updated.distanceKm = formatNumber(haversineKm(updated.ambulanceLocation, target), 2);
  updated.etaMinutes = Math.max(0, updated.etaMinutes - 1);
  updated.status = nextStatus(updated.status);
  updated.statusHistory = [...new Set([...(updated.statusHistory || []), updated.status])];
  updated.updatedAt = new Date().toISOString();

  if (updated.status === 'Ambulans telah tiba') {
    updated.ambulanceLocation = clone(updated.userLocation);
  }

  if (updated.status === 'Pasien dalam penanganan') {
    updated.completedAt = new Date().toISOString();
  }

  return updated;
}

function syncTrackingSessions() {
  state.trackingSessions = state.trackingSessions.map((session) => progressTracking(session));
  state.bookings = state.bookings.map((booking) => {
    const session = getSessionById(booking.id);
    return session ? { ...booking, ...session } : booking;
  });

  state.ambulances = state.ambulances.map((vehicle) => {
    const session = vehicle.assignmentId ? getSessionById(vehicle.assignmentId) : null;
    if (!session) {
      return vehicle;
    }

    return {
      ...vehicle,
      status: session.status === 'Pasien dalam penanganan' ? 'Mengantar Pasien' : session.status,
      location: clone(session.ambulanceLocation),
      target: session.status === 'Ambulans menuju lokasi' || session.status === 'Ambulans sedang disiapkan' ? session.userLocation : session.destinationLocation || session.userLocation,
      lastSeen: new Date().toISOString()
    };
  });
}

function createBookingRecord(payload) {
  const userLocation = clone(payload.userLocation || state.userLocation);
  const facility = chooseFacility(payload, userLocation);
  const vehicle = chooseVehicle(userLocation);
  const facilityPoint = toPoint(facility.location);
  const vehiclePoint = toPoint(vehicle.location);
  const routeToUser = buildPolyline(vehiclePoint, userLocation);
  const routeToDestination = buildPolyline(userLocation, facilityPoint);
  const etaToUser = travelMinutes(haversineKm(vehiclePoint, userLocation), 38, trafficMultiplier());
  const bookingTime = new Date().toISOString();

  const record = {
    id: `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    patientName: payload.namaLengkap,
    phone: payload.nomorTelepon,
    bookingTime,
    destinationName: facility.name,
    destinationId: facility.id,
    destinationAddress: facility.address,
    destinationPhone: facility.phone,
    ambulanceName: vehicle.name,
    ambulanceNumber: vehicle.number,
    driverName: vehicle.driver,
    etaMinutes: etaToUser,
    durationMinutes: etaToUser + travelMinutes(haversineKm(userLocation, facilityPoint), 32, trafficMultiplier()),
    status: STATUS_SEQUENCE[0],
    pickupLocation: payload.lokasiKejadian,
    condition: payload.keluhan,
    note: payload.catatanTambahan || '-',
    userLocation,
    ambulanceLocation: clone(vehiclePoint),
    destinationLocation: clone(facilityPoint),
    routeToUser,
    routeToDestination,
    assignedFacilityType: facility.type,
    statusHistory: [STATUS_SEQUENCE[0]],
    completedAt: null,
    updatedAt: bookingTime
  };

  state.bookings.unshift(record);
  state.bookings = state.bookings.slice(0, 30);
  state.trackingSessions.unshift(clone(record));
  state.trackingSessions = state.trackingSessions.slice(0, 12);

  const vehicleIndex = state.ambulances.findIndex((item) => item.id === vehicle.id);
  if (vehicleIndex >= 0) {
    state.ambulances[vehicleIndex] = {
      ...state.ambulances[vehicleIndex],
      status: 'Ambulans sedang disiapkan',
      assignmentId: record.id,
      target: userLocation,
      battery: Math.max(25, state.ambulances[vehicleIndex].battery - 5),
      lastSeen: bookingTime
    };
  }

  const destinationIsHospital = record.assignedFacilityType === 'Rumah Sakit';
  const destinationCollection = destinationIsHospital ? state.hospitals : state.clinics;
  const destinationIndex = destinationCollection.findIndex((item) => item.id === facility.id);
  if (destinationIndex >= 0 && destinationCollection[destinationIndex].ambulancesAvailable > 0) {
    destinationCollection[destinationIndex].ambulancesAvailable -= 1;
  }

  state.analytics.totalBookings += 1;
  state.analytics.averageEta = formatNumber((state.analytics.averageEta * 0.85) + (record.etaMinutes * 0.15), 1);
  state.analytics.activeVehicles = getAvailableVehicles().length;
  state.analytics.topHospital = state.bookings[0]?.destinationName || state.analytics.topHospital;
  state.analytics.topClinic = state.bookings.find((booking) => booking.assignedFacilityType === 'Klinik')?.destinationName || state.analytics.topClinic;
  state.analytics.successRate = Math.min(99, state.analytics.successRate + 1);

  state.events.unshift({
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    type: 'pemesanan',
    title: 'Permintaan ambulans baru diterima',
    detail: `${record.patientName} memilih ${record.destinationName}.`,
    timestamp: bookingTime
  });
  state.events = state.events.slice(0, 20);

  return record;
}

function normalizeBookingInput(body) {
  return {
    namaLengkap: body.namaLengkap || body.patientName || 'Pengguna',
    nomorTelepon: body.nomorTelepon || body.phone || '-',
    lokasiKejadian: body.lokasiKejadian || body.pickupLocation || 'Lokasi pengguna',
    keluhan: body.keluhan || body.condition || 'Belum diisi',
    catatanTambahan: body.catatanTambahan || body.note || '-',
    tujuanId: body.tujuanId || body.facilityId || null,
    userLocation: body.userLocation || body.location || state.userLocation
  };
}

function buildDashboardPayload() {
  return {
    updatedAt: new Date().toISOString(),
    userLocation: state.userLocation,
    traffic: state.traffic,
    ambulances: state.ambulances,
    hospitals: sortFacilities(state.userLocation, state.hospitals),
    clinics: sortFacilities(state.userLocation, state.clinics),
    bookings: state.bookings,
    trackingSessions: state.trackingSessions,
    analytics: buildAnalytics(),
    events: getRecentEvents(),
    dispatchSummary: {
      totalCases: state.bookings.length,
      activeCases: state.trackingSessions.filter((session) => session.status !== 'Pasien dalam penanganan').length,
      lastAssignedHospital: state.bookings[0]?.destinationName || state.analytics.topHospital,
      lastRoute: state.trackingSessions[0]?.routeToUser || null
    }
  };
}

function ensureBookingConsistency(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    return null;
  }

  const bookingIndex = state.bookings.findIndex((item) => item.id === sessionId);
  if (bookingIndex >= 0) {
    state.bookings[bookingIndex] = { ...state.bookings[bookingIndex], ...session };
  }

  return session;
}

function updateHospitalCapacity(id, updates) {
  const hospital = state.hospitals.find((item) => item.id === id);
  if (!hospital) {
    return null;
  }

  if (typeof updates.name === 'string') hospital.name = updates.name;
  if (typeof updates.address === 'string') hospital.address = updates.address;
  if (typeof updates.phone === 'string') hospital.phone = updates.phone;
  if (typeof updates.active === 'boolean') hospital.active = updates.active;
  if (typeof updates.receivingPatients === 'boolean') hospital.receivingPatients = updates.receivingPatients;
  if (Number.isFinite(updates.ambulancesAvailable)) hospital.ambulancesAvailable = updates.ambulancesAvailable;

  return hospital;
}

function updateClinicCapacity(id, updates) {
  const clinic = state.clinics.find((item) => item.id === id);
  if (!clinic) {
    return null;
  }

  if (typeof updates.name === 'string') clinic.name = updates.name;
  if (typeof updates.address === 'string') clinic.address = updates.address;
  if (typeof updates.phone === 'string') clinic.phone = updates.phone;
  if (typeof updates.active === 'boolean') clinic.active = updates.active;
  if (typeof updates.receivingPatients === 'boolean') clinic.receivingPatients = updates.receivingPatients;
  if (Number.isFinite(updates.ambulancesAvailable)) clinic.ambulancesAvailable = updates.ambulancesAvailable;

  return clinic;
}

function updateAmbulance(id, updates) {
  const vehicle = state.ambulances.find((item) => item.id === id);
  if (!vehicle) {
    return null;
  }

  if (typeof updates.name === 'string') vehicle.name = updates.name;
  if (typeof updates.driver === 'string') vehicle.driver = updates.driver;
  if (typeof updates.number === 'string') vehicle.number = updates.number;
  if (typeof updates.status === 'string') vehicle.status = updates.status;
  if (Number.isFinite(updates.battery)) vehicle.battery = updates.battery;
  if (updates.location && typeof updates.location.lat === 'number' && typeof updates.location.lng === 'number') {
    vehicle.location = clone(updates.location);
  }
  if (updates.target && typeof updates.target.lat === 'number' && typeof updates.target.lng === 'number') {
    vehicle.target = clone(updates.target);
  }

  vehicle.lastSeen = new Date().toISOString();
  return vehicle;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'sigap-ambulans-semarang' });
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboardPayload());
});

app.get('/api/fasilitas', (req, res) => {
  res.json({
    hospitals: sortFacilities(state.userLocation, state.hospitals),
    clinics: sortFacilities(state.userLocation, state.clinics)
  });
});

app.get('/api/lokasi-saya', (req, res) => {
  res.json({ userLocation: state.userLocation });
});

app.post('/api/lokasi-saya', (req, res) => {
  const location = req.body?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return res.status(400).json({ success: false, message: 'Lokasi tidak valid' });
  }

  state.userLocation = clone(location);
  io.emit('dashboard:update', buildDashboardPayload());
  res.json({ success: true, userLocation: state.userLocation });
});

app.get('/api/riwayat-pemesanan', (req, res) => {
  res.json(state.bookings);
});

app.get('/api/tracking/:id', (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Data tracking tidak ditemukan' });
  }

  res.json({ success: true, session });
});

app.get('/api/ambulances', (req, res) => {
  res.json(state.ambulances);
});

app.get('/api/hospitals', (req, res) => {
  res.json(state.hospitals);
});

app.get('/api/clinics', (req, res) => {
  res.json(state.clinics);
});

app.get('/api/incidents', (req, res) => {
  res.json(state.bookings);
});

app.get('/api/analytics', (req, res) => {
  res.json(buildAnalytics());
});

app.post('/api/pemesanan-ambulans', (req, res) => {
  const input = normalizeBookingInput(req.body || {});
  const booking = createBookingRecord(input);
  io.emit('dashboard:update', buildDashboardPayload());
  res.status(201).json({ success: true, message: 'Permintaan ambulans berhasil dikirim', booking, tracking: ensureBookingConsistency(booking.id) });
});

app.post('/api/dispatch', (req, res) => {
  const input = normalizeBookingInput(req.body || {});
  const booking = createBookingRecord(input);
  io.emit('dashboard:update', buildDashboardPayload());
  res.status(201).json({ success: true, message: 'Permintaan ambulans berhasil dikirim', booking });
});

app.post('/api/admin/rumah-sakit', (req, res) => {
  const payload = req.body || {};
  const hospital = {
    id: payload.id || `RS-SMG-${String(state.hospitals.length + 1).padStart(3, '0')}`,
    name: payload.name || 'Rumah Sakit Baru',
    address: payload.address || '-',
    phone: payload.phone || '-',
    location: payload.location || clone(state.userLocation),
    ambulancesAvailable: Number.isFinite(payload.ambulancesAvailable) ? payload.ambulancesAvailable : 0,
    active: typeof payload.active === 'boolean' ? payload.active : true,
    receivingPatients: typeof payload.receivingPatients === 'boolean' ? payload.receivingPatients : true,
    type: 'Rumah Sakit'
  };

  state.hospitals.unshift(hospital);
  io.emit('dashboard:update', buildDashboardPayload());
  res.status(201).json({ success: true, hospital });
});

app.post('/api/admin/klinik', (req, res) => {
  const payload = req.body || {};
  const clinic = {
    id: payload.id || `KL-SMG-${String(state.clinics.length + 1).padStart(3, '0')}`,
    name: payload.name || 'Klinik Baru',
    address: payload.address || '-',
    phone: payload.phone || '-',
    location: payload.location || clone(state.userLocation),
    ambulancesAvailable: Number.isFinite(payload.ambulancesAvailable) ? payload.ambulancesAvailable : 0,
    active: typeof payload.active === 'boolean' ? payload.active : true,
    receivingPatients: typeof payload.receivingPatients === 'boolean' ? payload.receivingPatients : true,
    type: 'Klinik'
  };

  state.clinics.unshift(clinic);
  io.emit('dashboard:update', buildDashboardPayload());
  res.status(201).json({ success: true, clinic });
});

app.post('/api/admin/ambulans', (req, res) => {
  const payload = req.body || {};
  const vehicle = {
    id: payload.id || `AMB-SMG-${String(state.ambulances.length + 1).padStart(3, '0')}`,
    name: payload.name || 'Ambulans Baru',
    driver: payload.driver || 'Belum diisi',
    number: payload.number || '-',
    status: payload.status || 'Tersedia',
    location: payload.location || clone(state.userLocation),
    target: payload.target || clone(state.userLocation),
    battery: Number.isFinite(payload.battery) ? payload.battery : 90,
    lastSeen: new Date().toISOString(),
    assignmentId: null
  };

  state.ambulances.unshift(vehicle);
  io.emit('dashboard:update', buildDashboardPayload());
  res.status(201).json({ success: true, ambulance: vehicle });
});

app.patch('/api/hospitals/:id/capacity', (req, res) => {
  const hospital = updateHospitalCapacity(req.params.id, req.body || {});
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Rumah sakit tidak ditemukan' });
  }

  io.emit('dashboard:update', buildDashboardPayload());
  res.json({ success: true, hospital });
});

app.patch('/api/clinics/:id/capacity', (req, res) => {
  const clinic = updateClinicCapacity(req.params.id, req.body || {});
  if (!clinic) {
    return res.status(404).json({ success: false, message: 'Klinik tidak ditemukan' });
  }

  io.emit('dashboard:update', buildDashboardPayload());
  res.json({ success: true, clinic });
});

app.patch('/api/ambulances/:id/status', (req, res) => {
  const vehicle = updateAmbulance(req.params.id, req.body || {});
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Ambulans tidak ditemukan' });
  }

  io.emit('dashboard:update', buildDashboardPayload());
  res.json({ success: true, ambulance: vehicle });
});

io.on('connection', (socket) => {
  socket.emit('dashboard:update', buildDashboardPayload());

  socket.on('permintaan:baru', (payload) => {
    const booking = createBookingRecord(normalizeBookingInput(payload || {}));
    io.emit('dashboard:update', buildDashboardPayload());
    socket.emit('permintaan:hasil', booking);
  });

  socket.on('tracking:simulasi', (trackingId) => {
    const session = getSessionById(trackingId);
    if (!session) {
      return;
    }

    const updated = progressTracking(session);
    const index = state.trackingSessions.findIndex((item) => item.id === trackingId);
    if (index >= 0) {
      state.trackingSessions[index] = updated;
      state.bookings = state.bookings.map((booking) => (booking.id === trackingId ? { ...booking, ...updated } : booking));
      io.emit('dashboard:update', buildDashboardPayload());
      socket.emit('tracking:hasil', updated);
    }
  });
});

setInterval(() => {
  updateTraffic();
  updateVehicleDrift();
  syncTrackingSessions();
  io.emit('dashboard:update', buildDashboardPayload());
}, 5000);

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

let activePort = PORT;

function startListening() {
  server.listen(activePort);
}

server.on('listening', () => {
  console.log(`SIGAP Ambulans Semarang running on http://localhost:${activePort}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    activePort += 1;
    console.warn(`Port ${activePort - 1} sedang dipakai, mencoba port ${activePort}`);
    startListening();
    return;
  }

  throw error;
});

startListening();
