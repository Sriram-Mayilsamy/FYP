const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authMiddleware, patientOnly, doctorOnly, adminOnly } = require('../middleware/auth');
const { createUniqueEcardNumber } = require('../utils/ecard');

const router = express.Router();

const isUniqueViolation = (error) => error.code === '23505';

const patientSelect = `
  SELECT u.id AS user_id, u.ecard_number, u.email, u.first_name, u.last_name, u.role, u.created_at,
         p.id AS patient_id, p.date_of_birth, p.govt_id_type, p.govt_id_number,
         p.govt_id_proof_url, p.nearby_hospital_name, p.created_by_doctor_id, p.created_by_self,
         p.profile_visibility, p.blood_group, p.emergency_contact_name, 
         p.emergency_contact_phone, p.emergency_contact_relation,
         creator_user.first_name AS doctor_first_name,
         creator_user.last_name AS doctor_last_name,
         creator_doc.license_number AS doctor_license_number
  FROM users u
  JOIN patients p ON u.id = p.user_id
  LEFT JOIN doctors creator_doc ON p.created_by_doctor_id = creator_doc.id
  LEFT JOIN users creator_user ON creator_doc.user_id = creator_user.id
`;

const visitSelect = `
  SELECT mv.*,
         doctor_user.first_name AS doctor_first_name,
         doctor_user.last_name AS doctor_last_name,
         doctor_user.ecard_number AS doctor_ecard_number,
         d.license_number AS doctor_license_number
  FROM medical_visits mv
  JOIN doctors d ON mv.doctor_id = d.id
  JOIN users doctor_user ON d.user_id = doctor_user.id
`;

const accessRequestSelect = `
  SELECT par.*,
         du.first_name AS doctor_first_name,
         du.last_name AS doctor_last_name,
         du.email AS doctor_email,
         du.ecard_number AS doctor_ecard_number,
         d.license_number AS doctor_license_number,
         d.specialization AS doctor_specialization,
         d.hospital_name AS doctor_hospital_name
  FROM patient_access_requests par
  JOIN doctors d ON par.doctor_id = d.id
  JOIN users du ON d.user_id = du.id
`;

async function getApprovedDoctorId(userId) {
  const result = await pool.query(
    'SELECT id, hospital_name FROM doctors WHERE user_id = $1 AND status = $2',
    [userId, 'approved']
  );

  if (result.rows.length === 0) {
    const error = new Error('Approved doctor profile not found');
    error.statusCode = 403;
    throw error;
  }

  return result.rows[0];
}

async function getVisitsByPatientId(patientId) {
  const result = await pool.query(
    `${visitSelect}
     WHERE mv.patient_id = $1
     ORDER BY mv.visit_date DESC, mv.visit_time DESC, mv.created_at DESC`,
    [patientId]
  );

  return result.rows;
}

async function getDoctorAccessState(doctorId, patientId) {
  const patientResult = await pool.query(
    'SELECT id, profile_visibility FROM patients WHERE id = $1',
    [patientId]
  );

  if (patientResult.rows.length === 0) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const patient = patientResult.rows[0];
  if (patient.profile_visibility === 'public') {
    return { canAccess: true, privacy: 'public', activeRequest: null, pendingRequest: null };
  }

  const activeResult = await pool.query(
    `SELECT id, requested_until, reason, status
     FROM patient_access_requests
     WHERE patient_id = $1
       AND doctor_id = $2
       AND status = 'approved'
       AND revoked_at IS NULL
       AND requested_until > CURRENT_TIMESTAMP
     ORDER BY requested_until DESC
     LIMIT 1`,
    [patientId, doctorId]
  );

  const pendingResult = await pool.query(
    `SELECT id, requested_until, reason, status, created_at
     FROM patient_access_requests
     WHERE patient_id = $1
       AND doctor_id = $2
       AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [patientId, doctorId]
  );

  return {
    canAccess: activeResult.rows.length > 0,
    privacy: 'private',
    activeRequest: activeResult.rows[0] || null,
    pendingRequest: pendingResult.rows[0] || null,
  };
}

async function requireDoctorPatientAccess(doctorId, patientId) {
  const access = await getDoctorAccessState(doctorId, patientId);
  if (!access.canAccess) {
    const error = new Error('Patient profile is private. Approved access is required.');
    error.statusCode = 403;
    throw error;
  }
  return access;
}

// Patient self registration
router.post('/self-register', async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      date_of_birth,
      govt_id_type,
      govt_id_number,
      govt_id_proof_url,
      nearby_hospital_name,
      blood_group,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;

    if (!email || !password || !govt_id_type || !govt_id_number || !nearby_hospital_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ecardNumber = await createUniqueEcardNumber(client);

      // Create user with patient role
      const userResult = await client.query(
        'INSERT INTO users (email, password, role, first_name, last_name, ecard_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, ecard_number',
        [email, hashedPassword, 'patient', first_name, last_name, ecardNumber]
      );

      const userId = userResult.rows[0].id;

      // Create patient record (self created)
      await client.query(
        `INSERT INTO patients
          (user_id, date_of_birth, govt_id_type, govt_id_number, govt_id_proof_url, nearby_hospital_name, 
           blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_by_self)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
        [userId, date_of_birth, govt_id_type, govt_id_number, govt_id_proof_url, nearby_hospital_name,
         blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation]
      );

      // Audit log
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [userId, 'patient_self_registration', JSON.stringify({ govt_id_type, govt_id_number, nearby_hospital_name })]
      );

      await client.query('COMMIT');

      const token = jwt.sign(
        { id: userId, email, role: 'patient' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'Patient registered successfully',
        token,
        user: { id: userId, email, role: 'patient', ecard_number: userResult.rows[0].ecard_number },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'Email or government ID is already registered' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Doctor creates patient record
router.post('/create-by-doctor', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      date_of_birth,
      govt_id_type,
      govt_id_number,
      govt_id_proof_url,
      nearby_hospital_name,
      blood_group,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;
    const doctorId = req.user.id;

    if (!email || !password || !govt_id_type || !govt_id_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ecardNumber = await createUniqueEcardNumber(client);

      // Create user with patient role
      const userResult = await client.query(
        'INSERT INTO users (email, password, role, first_name, last_name, ecard_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, ecard_number',
        [email, hashedPassword, 'patient', first_name, last_name, ecardNumber]
      );

      const userId = userResult.rows[0].id;

      // Get doctor's database id
      const doctorResult = await client.query(
        'SELECT id FROM doctors WHERE user_id = $1 AND status = $2',
        [doctorId, 'approved']
      );

      if (doctorResult.rows.length === 0) {
        const error = new Error('Approved doctor profile not found');
        error.statusCode = 403;
        throw error;
      }

      const docDbId = doctorResult.rows[0].id;

      // Create patient record (created by doctor)
      await client.query(
        `INSERT INTO patients
          (user_id, date_of_birth, govt_id_type, govt_id_number, govt_id_proof_url, nearby_hospital_name, 
           blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
           created_by_doctor_id, created_by_self)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)`,
        [userId, date_of_birth, govt_id_type, govt_id_number, govt_id_proof_url, nearby_hospital_name,
         blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, docDbId]
      );

      // Audit log
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details, created_by) VALUES ($1, $2, $3, $4)',
        [userId, 'patient_created_by_doctor', JSON.stringify({ govt_id_type, govt_id_number, doctor_id: doctorId, nearby_hospital_name }), doctorId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Patient record created successfully',
        ecard_number: userResult.rows[0].ecard_number,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'Email or government ID is already registered' });
    }
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Get patient profile
router.get('/profile', authMiddleware, patientOnly, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `${patientSelect}
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = result.rows[0];
    const visits = await getVisitsByPatientId(patient.patient_id);

    res.json({ 
      data: {
        ...patient, 
        visits 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/privacy', authMiddleware, patientOnly, async (req, res) => {
  try {
    const { profile_visibility } = req.body;
    if (!['public', 'private'].includes(profile_visibility)) {
      return res.status(400).json({ error: 'Profile visibility must be public or private' });
    }

    const result = await pool.query(
      `UPDATE patients
       SET profile_visibility = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING id AS patient_id, profile_visibility`,
      [profile_visibility, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/access-requests', authMiddleware, patientOnly, async (req, res) => {
  try {
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patientResult.rows[0].id;

    const result = await pool.query(
      `${accessRequestSelect}
       WHERE par.patient_id = $1
       ORDER BY
         CASE par.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
         par.created_at DESC`,
      [patientId]
    );

    const requests = result.rows;
    res.json({
      data: {
        pending: requests.filter((request) => request.status === 'pending'),
        active: requests.filter(
          (request) =>
            request.status === 'approved' &&
            !request.revoked_at &&
            new Date(request.requested_until).getTime() > Date.now()
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function updateOwnAccessRequest(req, res, status, extraValues = {}) {
  try {
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const fields = ['status = $1', 'decided_by = $2', 'decided_at = CURRENT_TIMESTAMP', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status, req.user.id, req.params.request_id, patientResult.rows[0].id];

    if (extraValues.revoked) {
      fields.push('revoked_at = CURRENT_TIMESTAMP');
    }

    const result = await pool.query(
      `UPDATE patient_access_requests
       SET ${fields.join(', ')}
       WHERE id = $3 AND patient_id = $4
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    return res.json({ data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

router.post('/access-requests/:request_id/approve', authMiddleware, patientOnly, (req, res) => {
  updateOwnAccessRequest(req, res, 'approved');
});

router.post('/access-requests/:request_id/reject', authMiddleware, patientOnly, (req, res) => {
  updateOwnAccessRequest(req, res, 'rejected');
});

router.post('/access-requests/:request_id/terminate', authMiddleware, patientOnly, (req, res) => {
  updateOwnAccessRequest(req, res, 'revoked', { revoked: true });
});

// Admin view all patient records
router.get('/admin', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id AS user_id, u.ecard_number, u.email, u.first_name, u.last_name, u.created_at,
              p.id AS patient_id, p.date_of_birth, p.govt_id_type, p.govt_id_number,
              p.govt_id_proof_url, p.nearby_hospital_name, p.profile_visibility, p.created_by_self,
              creator_user.email AS created_by_doctor_email,
              creator_user.first_name AS doctor_first_name,
              creator_user.last_name AS doctor_last_name,
              creator_doc.license_number AS doctor_license_number
       FROM patients p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN doctors creator_doc ON p.created_by_doctor_id = creator_doc.id
       LEFT JOIN users creator_user ON creator_doc.user_id = creator_user.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Doctor view patients created by themselves
router.get('/doctor/mine', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1 AND status = $2',
      [req.user.id, 'approved']
    );

    if (doctorResult.rows.length === 0) {
      return res.status(403).json({ error: 'Approved doctor profile not found' });
    }

    const result = await pool.query(
      `SELECT u.id AS user_id, u.ecard_number, u.email, u.first_name, u.last_name, u.created_at,
              p.id AS patient_id, p.date_of_birth, p.govt_id_type, p.govt_id_number,
              p.govt_id_proof_url, p.nearby_hospital_name, p.profile_visibility, p.created_by_self
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.created_by_doctor_id = $1
       ORDER BY u.created_at DESC`,
      [doctorResult.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Doctor finds patient by 7-character e-card and sees complete visit history
router.get('/ecard/:ecard_number', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const doctor = await getApprovedDoctorId(req.user.id);

    const ecardNumber = req.params.ecard_number.toUpperCase();
    const result = await pool.query(
      `${patientSelect}
       WHERE u.ecard_number = $1 AND u.role = 'patient'`,
      [ecardNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient e-card not found' });
    }

    const patient = result.rows[0];
    const access = await getDoctorAccessState(doctor.id, patient.patient_id);
    const visits = access.canAccess ? await getVisitsByPatientId(patient.patient_id) : [];

    res.json({ patient, visits, access });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:patient_id/access-requests', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const doctor = await getApprovedDoctorId(req.user.id);
    const { patient_id } = req.params;
    const { reason, requested_until } = req.body;

    if (!reason || !requested_until) {
      return res.status(400).json({ error: 'Reason and access duration are required' });
    }

    const requestedUntilDate = new Date(requested_until);
    if (Number.isNaN(requestedUntilDate.getTime()) || requestedUntilDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Access duration must be a future date and time' });
    }

    const patientResult = await pool.query('SELECT id, profile_visibility FROM patients WHERE id = $1', [patient_id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (patientResult.rows[0].profile_visibility === 'public') {
      return res.status(400).json({ error: 'This patient profile is public and does not need an access request' });
    }

    const existingPending = await pool.query(
      `SELECT *
       FROM patient_access_requests
       WHERE patient_id = $1 AND doctor_id = $2 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [patient_id, doctor.id]
    );

    if (existingPending.rows.length > 0) {
      return res.status(200).json({ message: 'Access request is already pending', request: existingPending.rows[0] });
    }

    const result = await pool.query(
      `INSERT INTO patient_access_requests (patient_id, doctor_id, reason, requested_until)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [patient_id, doctor.id, reason, requestedUntilDate.toISOString()]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, created_by) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'patient_access_requested', JSON.stringify({ patient_id, request_id: result.rows[0].id }), req.user.id]
    );

    res.status(201).json({ message: 'Access request sent to patient', request: result.rows[0] });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Doctor creates one standardized date-wise medical visit record
router.post('/:patient_id/visits', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const doctor = await getApprovedDoctorId(req.user.id);
    const { patient_id } = req.params;
    const {
      visit_date,
      visit_time,
      hospital_name,
      department,
      chief_complaint,
      symptoms,
      diagnosis,
      notes,
      height_cm,
      weight_kg,
      temperature_c,
      pulse_bpm,
      respiratory_rate_bpm,
      oxygen_saturation_percent,
      systolic_bp,
      diastolic_bp,
      blood_sugar_fasting_mg_dl,
      blood_sugar_random_mg_dl,
      blood_sugar_pp_mg_dl,
      hemoglobin_g_dl,
      prescription,
      injections_given,
      lab_tests_requested,
      follow_up_date,
      extra_data,
    } = req.body;

    const patientResult = await pool.query('SELECT id FROM patients WHERE id = $1', [patient_id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check access control
    await requireDoctorPatientAccess(doctor.id, patient_id);

    const result = await pool.query(
      `INSERT INTO medical_visits (
        patient_id, doctor_id, visit_date, visit_time, hospital_name, department,
        chief_complaint, symptoms, diagnosis, notes, height_cm, weight_kg,
        temperature_c, pulse_bpm, respiratory_rate_bpm, oxygen_saturation_percent,
        systolic_bp, diastolic_bp, blood_sugar_fasting_mg_dl,
        blood_sugar_random_mg_dl, blood_sugar_pp_mg_dl, hemoglobin_g_dl,
        prescription, injections_given, lab_tests_requested, follow_up_date, extra_data
      )
      VALUES (
        $1, $2, COALESCE($3, CURRENT_DATE), COALESCE($4, CURRENT_TIME), COALESCE($5, $6), $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27, COALESCE($28, '{}'::jsonb)
      )
      RETURNING *`,
      [
        patient_id,
        doctor.id,
        visit_date || null,
        visit_time || null,
        hospital_name || null,
        doctor.hospital_name || null,
        department || null,
        chief_complaint || null,
        symptoms || null,
        diagnosis || null,
        notes || null,
        height_cm || null,
        weight_kg || null,
        temperature_c || null,
        pulse_bpm || null,
        respiratory_rate_bpm || null,
        oxygen_saturation_percent || null,
        systolic_bp || null,
        diastolic_bp || null,
        blood_sugar_fasting_mg_dl || null,
        blood_sugar_random_mg_dl || null,
        blood_sugar_pp_mg_dl || null,
        hemoglobin_g_dl || null,
        prescription || null,
        injections_given || null,
        lab_tests_requested || null,
        follow_up_date || null,
        extra_data || {},
      ]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, created_by) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'medical_visit_created', JSON.stringify({ patient_id, visit_id: result.rows[0].id }), req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Doctor/admin view one complete read-only visit entry
router.get('/visits/:visit_id', authMiddleware, async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await getApprovedDoctorId(req.user.id);
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const visitResult = await pool.query(
      `${visitSelect}
       WHERE mv.id = $1`,
      [req.params.visit_id]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = visitResult.rows[0];
    if (doctor) {
      await requireDoctorPatientAccess(doctor.id, visit.patient_id);
    }

    const patientResult = await pool.query(
      `${patientSelect}
       WHERE p.id = $1`,
      [visit.patient_id]
    );

    res.json({ visit, patient: patientResult.rows[0] || null });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Admin or doctor view patient details
router.get('/admin/patient/:patient_user_id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patient_user_id } = req.params;

    const result = await pool.query(
      `${patientSelect}
       WHERE u.id = $1 AND u.role = 'patient'`,
      [patient_user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = result.rows[0];
    let visits = [];

    if (req.user.role === 'doctor') {
      const doctor = await getApprovedDoctorId(req.user.id);
      await requireDoctorPatientAccess(doctor.id, patient.patient_id);
    }

    visits = await getVisitsByPatientId(patient.patient_id);

    res.json({ ...patient, visits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
