INSERT INTO ambulances (id, name, driver_name, status, latitude, longitude, battery, last_seen, current_assignment) VALUES
('AMB-001', 'Ambulans Alpha', 'Rizky Maulana', 'Tersedia', -6.208800, 106.845400, 92, NOW(), NULL),
('AMB-002', 'Ambulans Bravo', 'Dian Pratama', 'Menuju Pasien', -6.198200, 106.839600, 81, NOW(), 'INC-001'),
('AMB-003', 'Ambulans Charlie', 'Siti Aisyah', 'Mengangkut Pasien', -6.224100, 106.832500, 74, NOW(), 'INC-002'),
('AMB-004', 'Ambulans Delta', 'Bima Saputra', 'Tiba di Rumah Sakit', -6.187300, 106.840800, 68, NOW(), 'INC-003'),
('AMB-005', 'Ambulans Echo', 'Nadia Putri', 'Offline', -6.240300, 106.820200, 55, NOW(), NULL);

INSERT INTO hospitals (id, name, latitude, longitude, phone, igd_beds_available, doctors_on_duty, icu_available, total_beds, receiving_patients) VALUES
('RS-001', 'RSUD Central Care', -6.189200, 106.846100, '+62 21 555 0180', 7, 4, TRUE, 18, TRUE),
('RS-002', 'Rumah Sakit Sehat Sentosa', -6.232400, 106.841500, '+62 21 555 0181', 2, 2, FALSE, 12, TRUE),
('RS-003', 'RS Metro Emergency Center', -6.200300, 106.856100, '+62 21 555 0182', 0, 3, TRUE, 14, FALSE),
('RS-004', 'RS Bina Medika', -6.218500, 106.828800, '+62 21 555 0183', 5, 5, TRUE, 20, TRUE),
('RS-005', 'RS Harapan Ibu', -6.173400, 106.833100, '+62 21 555 0184', 3, 2, FALSE, 10, TRUE);

INSERT INTO incidents (id, created_at, area, case_type, patient_name, ambulance_id, hospital_id, response_time_minutes, met_target) VALUES
('INC-001', NOW(), 'Menteng', 'cardiac', 'Andi Saputra', 'AMB-002', 'RS-001', 9, TRUE),
('INC-002', NOW(), 'Senen', 'trauma', 'Maya Lestari', 'AMB-003', 'RS-004', 11, TRUE),
('INC-003', NOW(), 'Tanah Abang', 'general', 'Budi Santoso', 'AMB-004', 'RS-001', 15, FALSE),
('INC-004', NOW(), 'Kuningan', 'pediatric', 'Nina Kirana', 'AMB-001', 'RS-002', 10, TRUE);
