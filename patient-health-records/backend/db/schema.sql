-- Users table (admin, doctor, patient)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  ecard_number VARCHAR(7) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'admin', 'doctor', 'patient'
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS ecard_number VARCHAR(7);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ecard_number_unique ON users(ecard_number);

UPDATE users
SET ecard_number = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 7))
WHERE ecard_number IS NULL;

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(100) UNIQUE NOT NULL,
  specialization VARCHAR(100),
  hospital_name VARCHAR(255),
  approved_by INT REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  govt_id_type VARCHAR(50), -- 'aadhar', 'pan', 'passport', etc.
  govt_id_number VARCHAR(100) UNIQUE NOT NULL,
  govt_id_proof_url VARCHAR(255),
  nearby_hospital_name VARCHAR(255),
  profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  created_by_doctor_id INT REFERENCES doctors(id),
  created_by_self BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public';

CREATE TABLE IF NOT EXISTS patient_access_requests (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  requested_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  decided_by INT REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for account creation
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(255),
  details JSONB,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One date-wise clinical entry is created for every patient visit.
-- Most columns are nullable so all regions/doctors follow the same structure
-- while irrelevant data can be left empty for babies, specialty visits, etc.
CREATE TABLE IF NOT EXISTS medical_visits (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INT NOT NULL REFERENCES doctors(id),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIME DEFAULT CURRENT_TIME,
  hospital_name VARCHAR(255),
  department VARCHAR(100),
  chief_complaint TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  notes TEXT,
  height_cm NUMERIC(6,2),
  weight_kg NUMERIC(6,2),
  temperature_c NUMERIC(5,2),
  pulse_bpm INT,
  respiratory_rate_bpm INT,
  oxygen_saturation_percent NUMERIC(5,2),
  systolic_bp INT,
  diastolic_bp INT,
  blood_sugar_fasting_mg_dl NUMERIC(7,2),
  blood_sugar_random_mg_dl NUMERIC(7,2),
  blood_sugar_pp_mg_dl NUMERIC(7,2),
  hemoglobin_g_dl NUMERIC(5,2),
  prescription TEXT,
  lab_tests_requested TEXT,
  follow_up_date DATE,
  extra_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_ecard_number ON users(ecard_number);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_govt_id_number ON patients(govt_id_number);
CREATE INDEX IF NOT EXISTS idx_patients_created_by_doctor ON patients(created_by_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_profile_visibility ON patients(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_patient_access_patient_status ON patient_access_requests(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_access_doctor_status ON patient_access_requests(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_access_active ON patient_access_requests(patient_id, doctor_id, requested_until);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_visits_patient_date ON medical_visits(patient_id, visit_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_visits_doctor ON medical_visits(doctor_id);
