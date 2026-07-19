const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Master admin login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcryptjs.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, ecard_number: user.ecard_number } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Doctor login
router.post('/doctor-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT u.*, d.status FROM users u LEFT JOIN doctors d ON u.id = d.user_id WHERE u.email = $1 AND u.role = $2',
      [email, 'doctor']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Doctor account not approved yet' });
    }

    const validPassword = await bcryptjs.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, ecard_number: user.ecard_number } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patient login
router.post('/patient-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'patient']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcryptjs.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, ecard_number: user.ecard_number } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin searches any account by hospital e-card number
router.get('/admin/ecard/:ecard_number', authMiddleware, adminOnly, async (req, res) => {
  try {
    const ecardNumber = req.params.ecard_number.toUpperCase();
    const userResult = await pool.query(
      `SELECT id, ecard_number, email, role, first_name, last_name, created_at
       FROM users
       WHERE ecard_number = $1`,
      [ecardNumber]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found for this e-card' });
    }

    const account = userResult.rows[0];
    let details = null;
    let visits = [];

    if (account.role === 'patient') {
      const patientResult = await pool.query(
        `SELECT p.*, creator_user.first_name AS doctor_first_name,
                creator_user.last_name AS doctor_last_name,
                creator_doc.license_number AS doctor_license_number
         FROM patients p
         LEFT JOIN doctors creator_doc ON p.created_by_doctor_id = creator_doc.id
         LEFT JOIN users creator_user ON creator_doc.user_id = creator_user.id
         WHERE p.user_id = $1`,
        [account.id]
      );
      details = patientResult.rows[0] || null;

      if (details) {
        const visitsResult = await pool.query(
          `SELECT mv.*, doctor_user.first_name AS doctor_first_name,
                  doctor_user.last_name AS doctor_last_name,
                  d.license_number AS doctor_license_number
           FROM medical_visits mv
           JOIN doctors d ON mv.doctor_id = d.id
           JOIN users doctor_user ON d.user_id = doctor_user.id
           WHERE mv.patient_id = $1
           ORDER BY mv.visit_date DESC, mv.visit_time DESC, mv.created_at DESC`,
          [details.id]
        );
        visits = visitsResult.rows;
      }
    }

    if (account.role === 'doctor') {
      const doctorResult = await pool.query(
        'SELECT * FROM doctors WHERE user_id = $1',
        [account.id]
      );
      details = doctorResult.rows[0] || null;
    }

    res.json({ account, details, visits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
