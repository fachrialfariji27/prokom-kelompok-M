const defaultIncidentLocation = {
  lat: -6.21462,
  lng: 106.84513
};

function baseState() {
  return {
    traffic: [
      { id: 't1', name: 'Koridor Sudirman', congestion: 1.1, baseSpeed: 45, speedKmh: 40 },
      { id: 't2', name: 'Koridor Thamrin', congestion: 1.3, baseSpeed: 42, speedKmh: 32 },
      { id: 't3', name: 'Koridor Gatot Subroto', congestion: 0.9, baseSpeed: 48, speedKmh: 52 },
      { id: 't4', name: 'Koridor Senen', congestion: 1.5, baseSpeed: 38, speedKmh: 25 }
    ],
    ambulances: [
      {
        id: 'AMB-001',
        name: 'Ambulans Alpha',
        driver: 'Rizky Maulana',
        status: 'Tersedia',
        location: { lat: -6.2088, lng: 106.8454 },
        battery: 92,
        lastSeen: new Date().toISOString(),
        currentAssignment: null
      },
      {
        id: 'AMB-002',
        name: 'Ambulans Bravo',
        driver: 'Dian Pratama',
        status: 'Menuju Pasien',
        location: { lat: -6.1982, lng: 106.8396 },
        battery: 81,
        lastSeen: new Date().toISOString(),
        currentAssignment: 'INC-001'
      },
      {
        id: 'AMB-003',
        name: 'Ambulans Charlie',
        driver: 'Siti Aisyah',
        status: 'Mengangkut Pasien',
        location: { lat: -6.2241, lng: 106.8325 },
        battery: 74,
        lastSeen: new Date().toISOString(),
        currentAssignment: 'INC-002'
      },
      {
        id: 'AMB-004',
        name: 'Ambulans Delta',
        driver: 'Bima Saputra',
        status: 'Tiba di Rumah Sakit',
        location: { lat: -6.1873, lng: 106.8408 },
        battery: 68,
        lastSeen: new Date().toISOString(),
        currentAssignment: 'INC-003'
      },
      {
        id: 'AMB-005',
        name: 'Ambulans Echo',
        driver: 'Nadia Putri',
        status: 'Offline',
        location: { lat: -6.2403, lng: 106.8202 },
        battery: 55,
        lastSeen: new Date().toISOString(),
        currentAssignment: null
      }
    ],
    hospitals: [
      {
        id: 'RS-001',
        name: 'RSUD Central Care',
        location: { lat: -6.1892, lng: 106.8461 },
        phone: '+62 21 555 0180',
        igdBedsAvailable: 7,
        doctorsOnDuty: 4,
        icuAvailable: true,
        totalBeds: 18,
        receivingPatients: true,
        specialties: ['Trauma', 'Kardiologi', 'Umum']
      },
      {
        id: 'RS-002',
        name: 'Rumah Sakit Sehat Sentosa',
        location: { lat: -6.2324, lng: 106.8415 },
        phone: '+62 21 555 0181',
        igdBedsAvailable: 2,
        doctorsOnDuty: 2,
        icuAvailable: false,
        totalBeds: 12,
        receivingPatients: true,
        specialties: ['Anak', 'Umum']
      },
      {
        id: 'RS-003',
        name: 'RS Metro Emergency Center',
        location: { lat: -6.2003, lng: 106.8561 },
        phone: '+62 21 555 0182',
        igdBedsAvailable: 0,
        doctorsOnDuty: 3,
        icuAvailable: true,
        totalBeds: 14,
        receivingPatients: false,
        specialties: ['Trauma', 'Bedah', 'ICU']
      },
      {
        id: 'RS-004',
        name: 'RS Bina Medika',
        location: { lat: -6.2185, lng: 106.8288 },
        phone: '+62 21 555 0183',
        igdBedsAvailable: 5,
        doctorsOnDuty: 5,
        icuAvailable: true,
        totalBeds: 20,
        receivingPatients: true,
        specialties: ['Kardiologi', 'Obgyn', 'Umum']
      },
      {
        id: 'RS-005',
        name: 'RS Harapan Ibu',
        location: { lat: -6.1734, lng: 106.8331 },
        phone: '+62 21 555 0184',
        igdBedsAvailable: 3,
        doctorsOnDuty: 2,
        icuAvailable: false,
        totalBeds: 10,
        receivingPatients: true,
        specialties: ['Obgyn', 'Anak']
      }
    ],
    incidents: [],
    events: [
      {
        id: 'evt-001',
        type: 'dispatch',
        title: 'Ambulans Bravo diberangkatkan',
        detail: 'Menuju pasien dengan estimasi tiba 8 menit',
        timestamp: new Date().toISOString()
      },
      {
        id: 'evt-002',
        type: 'hospital',
        title: 'RS Metro Emergency Center penuh',
        detail: 'Sistem menandai status tidak menerima pasien',
        timestamp: new Date().toISOString()
      },
      {
        id: 'evt-003',
        type: 'routing',
        title: 'Rerouting aktif di Sudirman',
        detail: 'Lalu lintas meningkat, rute dialihkan otomatis',
        timestamp: new Date().toISOString()
      }
    ],
    dispatchSummary: {
      totalCases: 128,
      activeCases: 4,
      lastAssignedHospital: 'RSUD Central Care'
    }
  };
}

const initialIncidents = [
  {
    id: 'INC-001',
    createdAt: new Date().toISOString(),
    area: 'Menteng',
    caseType: 'cardiac',
    patientName: 'Andi Saputra',
    responseTimeMinutes: 9,
    hospitalName: 'RSUD Central Care',
    ambulanceId: 'AMB-002',
    metTarget: true
  },
  {
    id: 'INC-002',
    createdAt: new Date().toISOString(),
    area: 'Senen',
    caseType: 'trauma',
    patientName: 'Maya Lestari',
    responseTimeMinutes: 11,
    hospitalName: 'RS Bina Medika',
    ambulanceId: 'AMB-003',
    metTarget: true
  },
  {
    id: 'INC-003',
    createdAt: new Date().toISOString(),
    area: 'Tanah Abang',
    caseType: 'general',
    patientName: 'Budi Santoso',
    responseTimeMinutes: 15,
    hospitalName: 'RSUD Central Care',
    ambulanceId: 'AMB-004',
    metTarget: false
  },
  {
    id: 'INC-004',
    createdAt: new Date().toISOString(),
    area: 'Kuningan',
    caseType: 'pediatric',
    patientName: 'Nina Kirana',
    responseTimeMinutes: 10,
    hospitalName: 'Rumah Sakit Sehat Sentosa',
    ambulanceId: 'AMB-001',
    metTarget: true
  }
];

module.exports = {
  defaultIncidentLocation,
  initialIncidents,
  createInitialState() {
    const state = baseState();
    state.incidents = initialIncidents.map((incident) => ({ ...incident }));
    return state;
  }
};
