-- Add blood group and emergency contact fields to patients table

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100);

-- Add the check once. PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS syntax.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_blood_group'
      AND conrelid = 'patients'::regclass
  ) THEN
    ALTER TABLE patients
      ADD CONSTRAINT check_blood_group
      CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN patients.blood_group IS 'Patient blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)';
COMMENT ON COLUMN patients.emergency_contact_name IS 'Emergency contact person full name';
COMMENT ON COLUMN patients.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN patients.emergency_contact_relation IS 'Relationship to patient (e.g., Spouse, Parent, Sibling)';
