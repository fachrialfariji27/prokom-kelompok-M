CREATE TABLE ambulances (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  status VARCHAR(40) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  battery INTEGER NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  current_assignment VARCHAR(30)
);

CREATE TABLE hospitals (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  igd_beds_available INTEGER NOT NULL,
  doctors_on_duty INTEGER NOT NULL,
  icu_available BOOLEAN NOT NULL,
  total_beds INTEGER NOT NULL,
  receiving_patients BOOLEAN NOT NULL
);

CREATE TABLE incidents (
  id VARCHAR(30) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  area VARCHAR(100) NOT NULL,
  case_type VARCHAR(40) NOT NULL,
  patient_name VARCHAR(120) NOT NULL,
  ambulance_id VARCHAR(20) NOT NULL,
  hospital_id VARCHAR(20) NOT NULL,
  response_time_minutes INTEGER NOT NULL,
  met_target BOOLEAN NOT NULL,
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE tracking_events (
  id SERIAL PRIMARY KEY,
  incident_id VARCHAR(30) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  event_time TIMESTAMP NOT NULL,
  details TEXT,
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);
