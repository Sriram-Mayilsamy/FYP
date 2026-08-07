-- Migration 008: Create timeline_ai_analyses table and ensure patient columns

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100);

CREATE TABLE IF NOT EXISTS timeline_ai_analyses (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INT REFERENCES doctors(id) ON DELETE SET NULL,
  metric_key VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  summary TEXT NOT NULL,
  detailed_analysis JSONB DEFAULT '{}'::jsonb,
  data_points_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timeline_ai_analyses_patient ON timeline_ai_analyses(patient_id, metric_key, created_at DESC);
