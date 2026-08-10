-- Demo-only blockchain references. Do not store medical content on-chain.
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS blockchain_hash VARCHAR(66);
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS blockchain_transaction_id VARCHAR(100);
ALTER TABLE patient_access_requests ADD COLUMN IF NOT EXISTS blockchain_request_id BIGINT;
ALTER TABLE patient_access_requests ADD COLUMN IF NOT EXISTS blockchain_transaction_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_medical_visits_blockchain_hash ON medical_visits(blockchain_hash);
