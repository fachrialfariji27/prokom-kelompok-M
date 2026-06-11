CREATE TABLE hospitals (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(30) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  ambulances_available INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  receiving_patients TINYINT(1) NOT NULL DEFAULT 1,
  facility_type VARCHAR(40) NOT NULL DEFAULT 'Rumah Sakit'
);

CREATE TABLE clinics (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(30) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  ambulances_available INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  receiving_patients TINYINT(1) NOT NULL DEFAULT 1,
  facility_type VARCHAR(40) NOT NULL DEFAULT 'Klinik'
);

CREATE TABLE ambulances (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  driver VARCHAR(150) NOT NULL,
  number VARCHAR(40) NOT NULL,
  status VARCHAR(60) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  battery INT NOT NULL DEFAULT 100,
  last_seen DATETIME NOT NULL,
  assignment_id VARCHAR(30)
);

CREATE TABLE bookings (
  id VARCHAR(30) PRIMARY KEY,
  patient_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  booking_time DATETIME NOT NULL,
  destination_name VARCHAR(150) NOT NULL,
  destination_id VARCHAR(30) NOT NULL,
  ambulance_name VARCHAR(150) NOT NULL,
  ambulance_number VARCHAR(40) NOT NULL,
  driver_name VARCHAR(150) NOT NULL,
  eta_minutes INT NOT NULL,
  duration_minutes INT NOT NULL,
  status VARCHAR(80) NOT NULL,
  pickup_location TEXT NOT NULL,
  condition_text TEXT NOT NULL,
  note_text TEXT,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  facility_type VARCHAR(40) NOT NULL,
  completed_at DATETIME NULL
);

CREATE TABLE tracking_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id VARCHAR(30) NOT NULL,
  status VARCHAR(80) NOT NULL,
  status_time DATETIME NOT NULL,
  note TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
