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
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

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
  const value =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatMinutes(minutes) {
  return Math.max(1, Math.round(minutes));
}

function buildPolyline(origin, destination) {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  return [
    [origin.lat, origin.lng],
    [midLat + 0.002, midLng - 0.002],
    [destination.lat, destination.lng]
  ];
}

function trafficMultiplier() {
  const hour = new Date().getHours();
  const rushHours = hour >= 6 && hour <= 9 || hour >= 16 && hour <= 19;
  const base = rushHours ? 1.35 : 1;
  return +(base + (Math.random() * 0.3)).toFixed(2);
}

function computeEtaMinutes(distanceKm, speedKmh, multiplier) {
  const minutes = (distanceKm / Math.max(speedKmh, 15)) * 60 * multiplier;
  return formatMinutes(minutes);
}

function ambulanceSpeed(status) {
  switch (status) {
    case 'Menuju Pasien':
      return 48;
    case 'Mengangkut Pasien':
      return 42;
    case 'Tiba di Rumah Sakit':
      return 34;
    case 'Offline':
      return 0;
    default:
      return 0;
  }
}

function scoreHospital(hospital, caseType, distanceKm, etaMinutes) {
  const capabilityScore = {
    trauma: hospital.specialties.includes('Trauma') ? 4 : 0,
    cardiac: hospital.specialties.includes('Kardiologi') ? 4 : 0,
    pediatric: hospital.specialties.includes('Anak') ? 4 : 0,
    maternity: hospital.specialties.includes('Obgyn') ? 4 : 0,
    general: 2
  }[caseType] || 1;

  const availabilityScore = hospital.receivingPatients ? 4 : -6;
  const bedScore = hospital.igdBedsAvailable * 0.7;
  const icuScore = hospital.icuAvailable ? 2 : 0;
  const proximityPenalty = distanceKm * 1.4;
  const etaPenalty = etaMinutes * 0.35;

  return capabilityScore + availabilityScore + bedScore + icuScore - proximityPenalty - etaPenalty;
}

function estimateHospitalTravel(ambulance, hospital, multiplier) {
  const distanceKm = haversineKm(ambulance.location, hospital.location);
  const etaMinutes = computeEtaMinutes(distanceKm, 38, multiplier);
  return {
    distanceKm: +distanceKm.toFixed(2),
    etaMinutes,
    route: buildPolyline(ambulance.location, hospital.location)
  };
}

function chooseNearestAmbulance(location) {
  const available = state.ambulances.filter((ambulance) => ambulance.status === 'Tersedia');
  const pool = available.length > 0 ? available : state.ambulances.filter((ambulance) => ambulance.status !== 'Offline');

  return pool
    .map((ambulance) => {
      const distanceKm = haversineKm(ambulance.location, location);
      const etaMinutes = computeEtaMinutes(distanceKm, ambulanceSpeed(ambulance.status) || 45, trafficMultiplier());
      return {
        ...ambulance,
        distanceKm: +distanceKm.toFixed(2),
        etaMinutes
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm || a.etaMinutes - b.etaMinutes)[0];
}

function chooseBestHospital(caseType, location) {
  const multiplier = trafficMultiplier();
  const evaluated = state.hospitals
    .map((hospital) => {
      const distanceKm = haversineKm(location, hospital.location);
      const etaMinutes = computeEtaMinutes(distanceKm, 38, multiplier);
      const score = scoreHospital(hospital, caseType, distanceKm, etaMinutes);
      return {
        ...hospital,
        distanceKm: +distanceKm.toFixed(2),
        etaMinutes,
        score,
        route: buildPolyline(location, hospital.location)
      };
    })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

  return evaluated[0];
}

function recomputeAnalytics() {
  const casesPerDay = state.incidents.length;
  const responseTimes = state.incidents.map((incident) => incident.responseTimeMinutes);
  const averageResponse = responseTimes.length
    ? responseTimes.reduce((sum, item) => sum + item, 0) / responseTimes.length
    : 0;
  const successRate = state.incidents.length
    ? Math.round(
        (state.incidents.filter((incident) => incident.metTarget).length / state.incidents.length) * 100
      )
    : 0;

  const hospitalUsage = state.incidents.reduce((accumulator, incident) => {
    accumulator[incident.hospitalName] = (accumulator[incident.hospitalName] || 0) + 1;
    return accumulator;
  }, {});

  const areaUsage = state.incidents.reduce((accumulator, incident) => {
    accumulator[incident.area] = (accumulator[incident.area] || 0) + 1;
    return accumulator;
  }, {});

  const ambulanceUsage = state.incidents.reduce((accumulator, incident) => {
    accumulator[incident.ambulanceId] = (accumulator[incident.ambulanceId] || 0) + 1;
    return accumulator;
  }, {});

  const topHospital = Object.entries(hospitalUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const topArea = Object.entries(areaUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const topAmbulance = Object.entries(ambulanceUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  return {
    casesPerDay,
    averageResponse: +averageResponse.toFixed(1),
    topHospital,
    topArea,
    topAmbulance,
    successRate,
    monthlyCases: [8, 11, 13, 15, 18, casesPerDay],
    responseTrend: [14, 13, 12, 11, 10, Math.max(8, Math.round(averageResponse))],
    targetTrend: [85, 86, 87, 88, 89, successRate]
  };
}

function getRecentEvents() {
  return state.events.slice(0, 12);
}

function buildDashboardPayload() {
  return {
    updatedAt: new Date().toISOString(),
    traffic: state.traffic,
    ambulances: state.ambulances,
    hospitals: state.hospitals,
    incidents: state.incidents.slice(0, 8),
    analytics: recomputeAnalytics(),
    events: getRecentEvents(),
    dispatchSummary: state.dispatchSummary
  };
}

function pushEvent(type, title, detail) {
  state.events.unshift({
    id: cryptoRandomId(),
    type,
    title,
    detail,
    timestamp: new Date().toISOString()
  });
  state.events = state.events.slice(0, 20);
}

function cryptoRandomId() {
  return `evt-${Math.random().toString(36).slice(2, 10)}`;
}

function updateAmbientTraffic() {
  state.traffic = state.traffic.map((segment) => ({
    ...segment,
    congestion: Math.max(0.2, Math.min(2.5, +(segment.congestion + (Math.random() - 0.4) * 0.2).toFixed(2))),
    speedKmh: Math.max(18, Math.round(segment.baseSpeed / Math.max(segment.congestion, 0.5)))
  }));
}

function driftAmbulances() {
  state.ambulances = state.ambulances.map((ambulance) => {
    if (ambulance.status === 'Offline') {
      return ambulance;
    }

    const headingLat = (Math.random() - 0.5) * 0.0015;
    const headingLng = (Math.random() - 0.5) * 0.0015;
    const multiplier = ambulance.status === 'Tersedia' ? 0.35 : 0.75;

    return {
      ...ambulance,
      location: {
        lat: +(ambulance.location.lat + headingLat * multiplier).toFixed(6),
        lng: +(ambulance.location.lng + headingLng * multiplier).toFixed(6)
      },
      lastSeen: new Date().toISOString(),
      battery: Math.max(25, Math.min(100, ambulance.battery - (ambulance.status === 'Tersedia' ? 0 : 1)))
    };
  });
}

function refreshHospitalStatus() {
  state.hospitals = state.hospitals.map((hospital) => {
    const occupancy = hospital.totalBeds - hospital.igdBedsAvailable;
    const loadRatio = occupancy / hospital.totalBeds;
    const receivingPatients = hospital.overrideReceivingPatients ?? loadRatio < 0.86;

    return {
      ...hospital,
      receivingPatients,
      statusLabel: receivingPatients ? 'Menerima Pasien' : 'Penuh'
    };
  });
}

function seedHistory() {
  if (state.incidents.length > 0) {
    return;
  }

  seed.initialIncidents.forEach((incident, index) => {
    const ambulance = state.ambulances[index % state.ambulances.length];
    const hospital = state.hospitals[index % state.hospitals.length];
    state.incidents.push({
      ...incident,
      ambulanceId: ambulance.id,
      ambulanceName: ambulance.name,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      responseTimeMinutes: incident.responseTimeMinutes,
      metTarget: incident.responseTimeMinutes <= 12
    });
  });
}

function dispatchCase(payload) {
  const caseType = payload.caseType || 'general';
  const location = payload.location || seed.defaultIncidentLocation;
  const nearestAmbulance = chooseNearestAmbulance(location);
  const bestHospital = chooseBestHospital(caseType, location);
  const multiplier = trafficMultiplier();
  const ambulanceTrip = estimateHospitalTravel(nearestAmbulance, bestHospital, multiplier);
  const responseTimeMinutes = Math.max(5, Math.round((nearestAmbulance.distanceKm || 0) * 1.5 + ambulanceTrip.etaMinutes / 2));

  const dispatch = {
    id: cryptoRandomId(),
    createdAt: new Date().toISOString(),
    patient: {
      name: payload.patient?.name || 'Pasien Baru',
      age: payload.patient?.age || 0,
      condition: payload.patient?.condition || 'Belum diisi',
      severity: payload.patient?.severity || 'Sedang'
    },
    area: payload.area || 'Area Baru',
    caseType,
    location,
    ambulanceId: nearestAmbulance.id,
    ambulanceName: nearestAmbulance.name,
    hospitalId: bestHospital.id,
    hospitalName: bestHospital.name,
    route: ambulanceTrip.route,
    distanceKm: ambulanceTrip.distanceKm,
    etaMinutes: ambulanceTrip.etaMinutes,
    responseTimeMinutes,
    metTarget: responseTimeMinutes <= 12
  };

  state.dispatchSummary.totalCases += 1;
  state.dispatchSummary.activeCases = Math.max(1, state.dispatchSummary.activeCases + 1);
  state.dispatchSummary.lastAssignedHospital = bestHospital.name;
  state.dispatchSummary.lastRoute = ambulanceTrip.route;

  state.incidents.unshift(dispatch);
  state.incidents = state.incidents.slice(0, 20);
  pushEvent('dispatch', 'Dispatch baru dibuat', `${dispatch.ambulanceName} -> ${dispatch.hospitalName}`);

  const ambulanceIndex = state.ambulances.findIndex((item) => item.id === nearestAmbulance.id);
  if (ambulanceIndex >= 0) {
    state.ambulances[ambulanceIndex] = {
      ...state.ambulances[ambulanceIndex],
      status: 'Menuju Pasien',
      currentAssignment: dispatch.id,
      battery: Math.max(30, state.ambulances[ambulanceIndex].battery - 3),
      lastSeen: new Date().toISOString()
    };
  }

  return dispatch;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ambulance-command-center' });
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboardPayload());
});

app.get('/api/ambulances', (req, res) => {
  res.json(state.ambulances);
});

app.get('/api/hospitals', (req, res) => {
  res.json(state.hospitals);
});

app.get('/api/incidents', (req, res) => {
  res.json(state.incidents);
});

app.get('/api/analytics', (req, res) => {
  res.json(recomputeAnalytics());
});

app.post('/api/dispatch', (req, res) => {
  const dispatch = dispatchCase(req.body || {});
  io.emit('dashboard:update', buildDashboardPayload());
  res.status(201).json({ success: true, dispatch });
});

app.post('/api/hospitals/:id/capacity', (req, res) => {
  const hospital = state.hospitals.find((item) => item.id === req.params.id);

  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Rumah sakit tidak ditemukan' });
  }

  const updates = req.body || {};
  hospital.igdBedsAvailable = Number.isFinite(updates.igdBedsAvailable) ? updates.igdBedsAvailable : hospital.igdBedsAvailable;
  hospital.doctorsOnDuty = Number.isFinite(updates.doctorsOnDuty) ? updates.doctorsOnDuty : hospital.doctorsOnDuty;
  hospital.icuAvailable = typeof updates.icuAvailable === 'boolean' ? updates.icuAvailable : hospital.icuAvailable;
  hospital.receivingPatients = typeof updates.receivingPatients === 'boolean' ? updates.receivingPatients : hospital.receivingPatients;
  hospital.overrideReceivingPatients = typeof updates.receivingPatients === 'boolean' ? updates.receivingPatients : hospital.overrideReceivingPatients;
  hospital.statusLabel = hospital.receivingPatients ? 'Menerima Pasien' : 'Penuh';

  pushEvent('hospital', 'Pembaruan kapasitas IGD', hospital.name);
  io.emit('dashboard:update', buildDashboardPayload());
  res.json({ success: true, hospital });
});

app.post('/api/ambulances/:id/status', (req, res) => {
  const ambulance = state.ambulances.find((item) => item.id === req.params.id);

  if (!ambulance) {
    return res.status(404).json({ success: false, message: 'Ambulans tidak ditemukan' });
  }

  ambulance.status = req.body.status || ambulance.status;
  ambulance.currentAssignment = req.body.currentAssignment ?? ambulance.currentAssignment;
  ambulance.lastSeen = new Date().toISOString();
  pushEvent('ambulance', 'Status ambulans diperbarui', `${ambulance.name}: ${ambulance.status}`);
  io.emit('dashboard:update', buildDashboardPayload());
  res.json({ success: true, ambulance });
});

io.on('connection', (socket) => {
  socket.emit('dashboard:update', buildDashboardPayload());

  socket.on('dispatch:create', (payload) => {
    const dispatch = dispatchCase(payload || {});
    io.emit('dashboard:update', buildDashboardPayload());
    socket.emit('dispatch:result', dispatch);
  });
});

seedHistory();
refreshHospitalStatus();
updateAmbientTraffic();

setInterval(() => {
  driftAmbulances();
  updateAmbientTraffic();
  refreshHospitalStatus();
  io.emit('dashboard:update', buildDashboardPayload());
}, 5000);

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Emergency command center running on http://localhost:${PORT}`);
});
