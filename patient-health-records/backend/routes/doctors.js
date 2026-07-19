const express = require('express');
const bcryptjs = require('bcryptjs');
const pool = require('../config/database');
const { authMiddleware, adminOnly, doctorOnly } = require('../middleware/auth');
const { createUniqueEcardNumber } = require('../utils/ecard');

const router = express.Router();

const isUniqueViolation = (error) => error.code === '23505';

// Doctor registration request (creates pending doctor account)
router.post('/register-request', async (req, res) => {
  try {
    const { email, password, first_name, last_name, license_number, specialization, hospital_name } = req.body;

    if (!email || !password || !license_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ecardNumber = await createUniqueEcardNumber(client);

      // Create user with doctor role
      const userResult = await client.query(
        'INSERT INTO users (email, password, role, first_name, last_name, ecard_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [email, hashedPassword, 'doctor', first_name, last_name, ecardNumber]
      );

      const userId = userResult.rows[0].id;

      // Create doctor record with pending status
      await client.query(
        'INSERT INTO doctors (user_id, license_number, specialization, hospital_name, status) VALUES ($1, $2, $3, $4, $5)',
        [userId, license_number, specialization, hospital_name, 'pending']
      );

      // Audit log
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [userId, 'doctor_registration_request', JSON.stringify({ email, license_number })]
      );

      await client.query('COMMIT');

      res.status(201).json({ message: 'Doctor registration request submitted. Awaiting admin approval.' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'Email or license number is already registered' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get pending doctor requests (admin only)
router.get('/pending-requests', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.ecard_number, u.email, u.first_name, u.last_name, d.id as doctor_id, d.license_number, d.specialization, d.hospital_name, d.created_at FROM users u JOIN doctors d ON u.id = d.user_id WHERE d.status = $1 ORDER BY d.created_at DESC',
      ['pending']
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve doctor (admin only)
router.post('/approve/:doctor_id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const adminId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE doctors SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING user_id',
        ['approved', adminId, doctor_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Doctor not found');
      }

      const userId = result.rows[0].user_id;

      // Audit log
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details, created_by) VALUES ($1, $2, $3, $4)',
        [userId, 'doctor_approved', JSON.stringify({ admin_id: adminId }), adminId]
      );

      await client.query('COMMIT');

      res.json({ message: 'Doctor approved successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject doctor (admin only)
router.post('/reject/:doctor_id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const adminId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE doctors SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING user_id',
        ['rejected', adminId, doctor_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Doctor not found');
      }

      const userId = result.rows[0].user_id;

      // Audit log
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details, created_by) VALUES ($1, $2, $3, $4)',
        [userId, 'doctor_rejected', JSON.stringify({ admin_id: adminId }), adminId]
      );

      await client.query('COMMIT');

      res.json({ message: 'Doctor rejected' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all approved doctors (for patients to view)
router.get('/approved-list', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.ecard_number, u.first_name, u.last_name, d.license_number, d.specialization, d.hospital_name FROM users u JOIN doctors d ON u.id = d.user_id WHERE d.status = $1',
      ['approved']
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all doctor requests/accounts (admin only)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id AS doctor_id, d.license_number, d.specialization, d.hospital_name,
              d.status, d.approved_at, d.created_at,
              u.id AS user_id, u.ecard_number, u.email, u.first_name, u.last_name,
              admin.email AS approved_by_email
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN users admin ON d.approved_by = admin.id
       ORDER BY d.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
