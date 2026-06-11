INSERT INTO hospitals (id, name, address, phone, latitude, longitude, ambulances_available, active, receiving_patients, facility_type) VALUES
('RS-SMG-001', 'RSUP Dr. Kariadi', 'Jl. Dr. Sutomo No.16, Randusari, Semarang Selatan, Kota Semarang', '(024) 8413476', -6.987500, 110.409200, 4, 1, 1, 'Rumah Sakit'),
('RS-SMG-002', 'RSUP Dr. Kariadi - IGD Timur', 'Jl. Dr. Sutomo No.18, Randusari, Semarang Selatan, Kota Semarang', '(024) 8310067', -6.986200, 110.407100, 2, 1, 1, 'Rumah Sakit'),
('RS-SMG-003', 'RSUD KRMT Wongsonegoro', 'Jl. Fatmawati Raya, Mangunharjo, Tembalang, Kota Semarang', '(024) 6711500', -7.021200, 110.451800, 3, 1, 1, 'Rumah Sakit'),
('RS-SMG-004', 'RS Telogorejo', 'Jl. KH Ahmad Dahlan No.18, Pekunden, Semarang Tengah, Kota Semarang', '(024) 86466000', -6.994800, 110.417900, 2, 1, 1, 'Rumah Sakit'),
('RS-SMG-005', 'RS Columbia Asia Semarang', 'Jl. Siliwangi No.143, Kalibanteng Kulon, Semarang Barat, Kota Semarang', '(024) 76633333', -6.988900, 110.394800, 1, 1, 1, 'Rumah Sakit'),
('RS-SMG-006', 'RS Islam Sultan Agung', 'Jl. Raya Kaligawe KM.4, Terboyo Kulon, Genuk, Kota Semarang', '(024) 6580019', -6.986900, 110.458900, 0, 1, 0, 'Rumah Sakit');

INSERT INTO clinics (id, name, address, phone, latitude, longitude, ambulances_available, active, receiving_patients, facility_type) VALUES
('KL-SMG-001', 'Klinik Utama Semarang Sehat', 'Jl. Pandanaran No.56, Pekunden, Semarang Tengah, Kota Semarang', '(024) 7641111', -6.992700, 110.418200, 1, 1, 1, 'Klinik'),
('KL-SMG-002', 'Klinik Medika Tugu Muda', 'Jl. Pahlawan No.127, Semarang Barat, Kota Semarang', '(024) 7602222', -6.984900, 110.405700, 0, 1, 1, 'Klinik'),
('KL-SMG-003', 'Klinik Keluarga Banyumanik', 'Jl. Setiabudi No.88, Banyumanik, Kota Semarang', '(024) 7468888', -7.049700, 110.431200, 1, 1, 1, 'Klinik'),
('KL-SMG-004', 'Klinik Siaga Kalibanteng', 'Jl. Abdulrahman Saleh No.21, Kalibanteng Kulon, Semarang Barat, Kota Semarang', '(024) 7604444', -6.972800, 110.384900, 0, 1, 1, 'Klinik'),
('KL-SMG-005', 'Klinik Pratama Genuk', 'Jl. Raya Genuk No.45, Genuk, Kota Semarang', '(024) 6582222', -6.978100, 110.465800, 0, 0, 0, 'Klinik');

INSERT INTO ambulances (id, name, driver, number, status, latitude, longitude, battery, last_seen, assignment_id) VALUES
('AMB-SMG-001', 'Ambulans Kariadi 01', 'Budi Santoso', 'SMG 1101', 'Siaga di RS', -6.987500, 110.409200, 92, NOW(), NULL),
('AMB-SMG-002', 'Ambulans Telogorejo 02', 'Rina Lestari', 'SMG 1102', 'Ambulans menuju lokasi', -6.994800, 110.417900, 81, NOW(), 'BK-001'),
('AMB-SMG-003', 'Ambulans Wongsonegoro 03', 'Agus Prabowo', 'SMG 1103', 'Tersedia', -7.021200, 110.451800, 88, NOW(), NULL),
('AMB-SMG-004', 'Ambulans Sehat 04', 'Siti Aminah', 'SMG 1104', 'Mengantar Pasien', -6.992700, 110.418200, 74, NOW(), 'BK-002'),
('AMB-SMG-005', 'Ambulans Siaga 05', 'Dewi Puspita', 'SMG 1105', 'Offline', -6.988900, 110.394800, 55, NOW(), NULL);

INSERT INTO bookings (id, patient_name, phone, booking_time, destination_name, destination_id, ambulance_name, ambulance_number, driver_name, eta_minutes, duration_minutes, status, pickup_location, condition_text, note_text, latitude, longitude, facility_type, completed_at) VALUES
('BK-001', 'Andi Saputra', '081234567891', NOW(), 'RSUP Dr. Kariadi', 'RS-SMG-001', 'Ambulans Kariadi 01', 'SMG 1101', 'Budi Santoso', 9, 19, 'Ambulans menuju lokasi', 'Jl. Pemuda, Semarang Tengah', 'Sesak napas', '-', -6.990900, 110.420800, 'Rumah Sakit', NULL),
('BK-002', 'Maya Lestari', '081234567892', NOW(), 'RS Telogorejo', 'RS-SMG-004', 'Ambulans Telogorejo 02', 'SMG 1102', 'Rina Lestari', 12, 22, 'Pasien dalam penanganan', 'Jl. Pandanaran, Semarang', 'Kecelakaan lalu lintas', '-', -6.994200, 110.418300, 'Rumah Sakit', NOW());
