const defaultUserLocation = {
  lat: -6.9667,
  lng: 110.4167
};

function createAmbulanceTrack(id, name, driver, number, origin, destination, status, availableAtHospital = null) {
  return {
    id,
    name,
    driver,
    number,
    status,
    availableAtHospital,
    location: origin,
    target: destination,
    etaMinutes: 0,
    distanceKm: 0,
    speedKmh: 48,
    battery: 90,
    lastSeen: new Date().toISOString(),
    assignmentId: null
  };
}

function baseState() {
  return {
    userLocation: defaultUserLocation,
    traffic: [
      { id: 'TR-001', name: 'Jl. Pandanaran', congestion: 1.1, baseSpeed: 42, speedKmh: 38 },
      { id: 'TR-002', name: 'Jl. Pahlawan', congestion: 1.3, baseSpeed: 45, speedKmh: 34 },
      { id: 'TR-003', name: 'Jl. Dr. Sutomo', congestion: 1.0, baseSpeed: 40, speedKmh: 40 },
      { id: 'TR-004', name: 'Jl. Siliwangi', congestion: 1.2, baseSpeed: 44, speedKmh: 36 },
      { id: 'TR-005', name: 'Jl. Raya Kaligawe', congestion: 1.4, baseSpeed: 38, speedKmh: 27 }
    ],
    hospitals: [
      {
        id: 'RS-SMG-001',
        name: 'RSUP Dr. Kariadi',
        address: 'Jl. Dr. Sutomo No.16, Randusari, Kec. Semarang Sel., Kota Semarang',
        phone: '(024) 8413476',
        location: { lat: -6.9875, lng: 110.4092 },
        ambulancesAvailable: 4,
        active: true,
        type: 'Rumah Sakit',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Trauma', 'Kardiologi', 'ICU', 'Stroke']
      },
      {
        id: 'RS-SMG-002',
        name: 'RSUP Dr. Kariadi - IGD Timur',
        address: 'Jl. Dr. Sutomo No.18, Randusari, Kec. Semarang Sel.',
        phone: '(024) 8310067',
        location: { lat: -6.9862, lng: 110.4071 },
        ambulancesAvailable: 2,
        active: true,
        type: 'Rumah Sakit',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['IGD', 'Bedah', 'Umum']
      },
      {
        id: 'RS-SMG-003',
        name: 'RSUD KRMT Wongsonegoro',
        address: 'Jl. Fatmawati Raya, Mangunharjo, Tembalang, Kota Semarang',
        phone: '(024) 6711500',
        location: { lat: -7.0212, lng: 110.4518 },
        ambulancesAvailable: 3,
        active: true,
        type: 'Rumah Sakit',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Trauma', 'Obgyn', 'Anak']
      },
      {
        id: 'RS-SMG-004',
        name: 'RS Telogorejo',
        address: 'Jl. KH Ahmad Dahlan No.18, Pekunden, Semarang Tengah, Kota Semarang',
        phone: '(024) 86466000',
        location: { lat: -6.9948, lng: 110.4179 },
        ambulancesAvailable: 2,
        active: true,
        type: 'Rumah Sakit',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Kardiologi', 'Stroke', 'ICU']
      },
      {
        id: 'RS-SMG-005',
        name: 'RS Columbia Asia Semarang',
        address: 'Jl. Siliwangi No.143, Kalibanteng Kulon, Semarang Barat, Kota Semarang',
        phone: '(024) 76633333',
        location: { lat: -6.9889, lng: 110.3948 },
        ambulancesAvailable: 1,
        active: true,
        type: 'Rumah Sakit',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Umum', 'ICU']
      },
      {
        id: 'RS-SMG-006',
        name: 'RS Islam Sultan Agung',
        address: 'Jl. Raya Kaligawe KM.4, Terboyo Kulon, Genuk, Kota Semarang',
        phone: '(024) 6580019',
        location: { lat: -6.9869, lng: 110.4589 },
        ambulancesAvailable: 0,
        active: true,
        type: 'Rumah Sakit',
        receivingPatients: false,
        distanceKm: 0,
        specialties: ['Obgyn', 'Trauma', 'Anak']
      }
    ],
    clinics: [
      {
        id: 'KL-SMG-001',
        name: 'Klinik Utama Semarang Sehat',
        address: 'Jl. Pandanaran No.56, Pekunden, Semarang Tengah, Kota Semarang',
        phone: '(024) 7641111',
        location: { lat: -6.9927, lng: 110.4182 },
        ambulancesAvailable: 1,
        active: true,
        type: 'Klinik',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Umum', 'Gawat Darurat Ringan']
      },
      {
        id: 'KL-SMG-002',
        name: 'Klinik Medika Tugu Muda',
        address: 'Jl. Pahlawan No.127, Semarang Barat, Kota Semarang',
        phone: '(024) 7602222',
        location: { lat: -6.9849, lng: 110.4057 },
        ambulancesAvailable: 0,
        active: true,
        type: 'Klinik',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Umum', 'Rawat Jalan']
      },
      {
        id: 'KL-SMG-003',
        name: 'Klinik Keluarga Banyumanik',
        address: 'Jl. Setiabudi No.88, Banyumanik, Kota Semarang',
        phone: '(024) 7468888',
        location: { lat: -7.0497, lng: 110.4312 },
        ambulancesAvailable: 1,
        active: true,
        type: 'Klinik',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Umum', 'Anak']
      },
      {
        id: 'KL-SMG-004',
        name: 'Klinik Siaga Kalibanteng',
        address: 'Jl. Abdulrahman Saleh No.21, Kalibanteng Kulon, Semarang Barat, Kota Semarang',
        phone: '(024) 7604444',
        location: { lat: -6.9728, lng: 110.3849 },
        ambulancesAvailable: 0,
        active: true,
        type: 'Klinik',
        receivingPatients: true,
        distanceKm: 0,
        specialties: ['Umum']
      },
      {
        id: 'KL-SMG-005',
        name: 'Klinik Pratama Genuk',
        address: 'Jl. Raya Genuk No.45, Genuk, Kota Semarang',
        phone: '(024) 6582222',
        location: { lat: -6.9781, lng: 110.4658 },
        ambulancesAvailable: 0,
        active: false,
        type: 'Klinik',
        receivingPatients: false,
        distanceKm: 0,
        specialties: ['Umum']
      }
    ],
    ambulances: [
      createAmbulanceTrack('AMB-SMG-001', 'Ambulans Kariadi 01', 'Budi Santoso', 'SMG 1101', { lat: -6.9875, lng: 110.4092 }, defaultUserLocation, 'Siaga di RSUP Dr. Kariadi', 'RSUP Dr. Kariadi'),
      createAmbulanceTrack('AMB-SMG-002', 'Ambulans Telogorejo 02', 'Rina Lestari', 'SMG 1102', { lat: -6.9948, lng: 110.4179 }, defaultUserLocation, 'Menuju Lokasi', 'RS Telogorejo'),
      createAmbulanceTrack('AMB-SMG-003', 'Ambulans Wongsonegoro 03', 'Agus Prabowo', 'SMG 1103', { lat: -7.0212, lng: 110.4518 }, defaultUserLocation, 'Tersedia', 'RSUD KRMT Wongsonegoro'),
      createAmbulanceTrack('AMB-SMG-004', 'Ambulans Sehat 04', 'Siti Aminah', 'SMG 1104', { lat: -6.9927, lng: 110.4182 }, defaultUserLocation, 'Mengantar Pasien', 'Klinik Utama Semarang Sehat'),
      createAmbulanceTrack('AMB-SMG-005', 'Ambulans Siaga 05', 'Dewi Puspita', 'SMG 1105', { lat: -6.9889, lng: 110.3948 }, defaultUserLocation, 'Offline', 'RS Columbia Asia Semarang')
    ],
    bookings: [],
    trackingSessions: [],
    events: [
      {
        id: 'evt-001',
        type: 'notifikasi',
        title: 'Sistem SIGAP Ambulans Semarang aktif',
        detail: 'Memantau rumah sakit, klinik, dan ambulans di Kota Semarang.',
        timestamp: new Date().toISOString()
      },
      {
        id: 'evt-002',
        type: 'peta',
        title: 'Peta interaktif siap digunakan',
        detail: 'Pengguna dapat mengaktifkan GPS dan memilih fasilitas terdekat.',
        timestamp: new Date().toISOString()
      },
      {
        id: 'evt-003',
        type: 'admin',
        title: 'Dashboard admin siap',
        detail: 'Admin dapat memperbarui data rumah sakit, klinik, dan ambulans.',
        timestamp: new Date().toISOString()
      }
    ],
    analytics: {
      totalBookings: 24,
      averageEta: 11.4,
      fastestResponse: 7,
      activeVehicles: 4,
      successRate: 92,
      topHospital: 'RSUP Dr. Kariadi',
      topClinic: 'Klinik Utama Semarang Sehat'
    }
  };
}

const initialBookings = [
  {
    id: 'BK-001',
    patientName: 'Andi Saputra',
    phone: '081234567891',
    bookingTime: new Date().toISOString(),
    destinationName: 'RSUP Dr. Kariadi',
    ambulanceName: 'Ambulans Kariadi 01',
    driverName: 'Budi Santoso',
    etaMinutes: 9,
    durationMinutes: 18,
    status: 'Ambulans menuju lokasi',
    pickupLocation: 'Jl. Pemuda, Semarang Tengah',
    condition: 'Sesak napas'
  },
  {
    id: 'BK-002',
    patientName: 'Maya Lestari',
    phone: '081234567892',
    bookingTime: new Date().toISOString(),
    destinationName: 'RS Telogorejo',
    ambulanceName: 'Ambulans Telogorejo 02',
    driverName: 'Rina Lestari',
    etaMinutes: 12,
    durationMinutes: 22,
    status: 'Pasien dalam penanganan',
    pickupLocation: 'Jl. Pandanaran, Semarang',
    condition: 'Kecelakaan lalu lintas'
  }
];

const trackingTemplates = [
  {
    stage: 'Permintaan diterima',
    etaMinutes: 12,
    positionOffset: 0.001
  },
  {
    stage: 'Ambulans sedang disiapkan',
    etaMinutes: 10,
    positionOffset: 0.003
  },
  {
    stage: 'Ambulans menuju lokasi',
    etaMinutes: 7,
    positionOffset: 0.006
  },
  {
    stage: 'Ambulans telah tiba',
    etaMinutes: 1,
    positionOffset: 0.008
  },
  {
    stage: 'Pasien dalam penanganan',
    etaMinutes: 0,
    positionOffset: 0.008
  }
];

function createInitialState() {
  const state = baseState();
  state.bookings = initialBookings.map((booking) => ({ ...booking }));
  state.trackingSessions = [];
  return state;
}

module.exports = {
  defaultUserLocation,
  trackingTemplates,
  createInitialState
};
