const bcryptjs = require('bcryptjs');
const pool = require('../config/database');
const { createUniqueEcardNumber } = require('../utils/ecard');

async function seed() {
  const client = await pool.connect();

  try {
    // Seed master admin
    const adminEmail = process.env.MASTER_ADMIN_EMAIL || 'admin@hospital.com';
    const adminPassword = process.env.MASTER_ADMIN_PASSWORD || 'admin123';
    const adminHashedPassword = await bcryptjs.hash(adminPassword, 10);

    const adminEcard = await createUniqueEcardNumber(client);
    const adminResult = await client.query(
      `INSERT INTO users (email, password, role, first_name, last_name, ecard_number)
       VALUES ($1, $2, 'admin', 'Master', 'Admin', $3)
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         role = 'admin',
         first_name = 'Master',
         last_name = 'Admin',
         ecard_number = COALESCE(users.ecard_number, EXCLUDED.ecard_number),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, role`,
      [adminEmail, adminHashedPassword, adminEcard]
    );

    console.log('Seeded master admin:', adminResult.rows[0]);

    // Seed test patient
    const patientEmail = 'patient1@example.com';
    const patientPassword = 'patient123';
    const patientHashedPassword = await bcryptjs.hash(patientPassword, 10);

    const patientEcard = await createUniqueEcardNumber(client);
    const patientUserResult = await client.query(
      `INSERT INTO users (email, password, role, first_name, last_name, ecard_number)
       VALUES ($1, $2, 'patient', 'John', 'Doe', $3)
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         role = 'patient',
         first_name = 'John',
         last_name = 'Doe',
         ecard_number = COALESCE(users.ecard_number, EXCLUDED.ecard_number),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, role`,
      [patientEmail, patientHashedPassword, patientEcard]
    );

    const patientUserId = patientUserResult.rows[0].id;

    // Create patient record
    await client.query(
      `INSERT INTO patients (user_id, date_of_birth, govt_id_type, govt_id_number, govt_id_proof_url, nearby_hospital_name, created_by_self)
       VALUES ($1, $2, 'aadhar', '123456789012', 'https://example.com/proof', 'City Hospital', true)
       ON CONFLICT (user_id) DO NOTHING`,
      [patientUserId, '1990-05-15']
    );

    console.log('Seeded test patient:', patientUserResult.rows[0]);
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
