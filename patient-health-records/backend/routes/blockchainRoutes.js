const express = require('express');
const pool = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const blockchain = require('../services/blockchainService');

const router = express.Router();

async function canViewVisit(user, visit) {
  if (user.role === 'admin') return true;
  if (user.role === 'patient') {
    const owned = await pool.query('SELECT 1 FROM patients WHERE id = $1 AND user_id = $2', [visit.patient_id, user.id]);
    return owned.rows.length > 0;
  }
  if (user.role === 'doctor') return visit.doctor_user_id === user.id;
  return false;
}

// Re-hashes the PostgreSQL visit and compares it with the immutable blockchain hash.
// Admin audit inventory: no clinical data is returned, only identifiers and blockchain metadata.
router.get('/records', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mv.id, mv.patient_id, mv.visit_date, mv.created_at, mv.blockchain_hash, mv.blockchain_transaction_id,
              patient_user.ecard_number AS patient_ecard, patient_user.first_name AS patient_first_name,
              patient_user.last_name AS patient_last_name, doctor_user.first_name AS doctor_first_name,
              doctor_user.last_name AS doctor_last_name
       FROM medical_visits mv
       JOIN patients p ON p.id = mv.patient_id
       JOIN users patient_user ON patient_user.id = p.user_id
       JOIN doctors d ON d.id = mv.doctor_id
       JOIN users doctor_user ON doctor_user.id = d.user_id
       ORDER BY mv.created_at DESC
       LIMIT 100`
    );
    res.json({ data: result.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/records/:id/verify', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mv.*, d.user_id AS doctor_user_id
       FROM medical_visits mv JOIN doctors d ON d.id = mv.doctor_id WHERE mv.id = $1`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Medical record not found' });
    const visit = result.rows[0];
    if (!(await canViewVisit(req.user, visit))) return res.status(403).json({ error: 'Access denied' });
    if (!visit.blockchain_hash || !visit.blockchain_transaction_id) {
      return res.json({ status: 'NOT_REGISTERED', message: 'This legacy record has not been registered on blockchain yet.' });
    }
    if (!blockchain.isConfigured()) return res.status(503).json({ error: 'Blockchain demo is not configured' });
    const currentHash = blockchain.hashMedicalVisit(visit);
    const chainRecord = await blockchain.getMedicalRecord(visit.blockchain_transaction_id.split(':')[1]);
    const valid = currentHash === chainRecord.recordHash && currentHash === visit.blockchain_hash;
    return res.json({
      status: valid ? 'VALID' : 'INVALID',
      message: valid ? 'Record integrity verified' : 'Medical record integrity compromised',
      recordId: visit.id, transactionId: visit.blockchain_transaction_id.split(':')[0], blockchainHash: chainRecord.recordHash,
    });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.get('/access-history', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'patient') return res.status(403).json({ error: 'Access denied' });
    const values = [];
    const filter = req.user.role === 'patient' ? 'WHERE p.user_id = $1' : '';
    if (req.user.role === 'patient') values.push(req.user.id);
    const result = await pool.query(
      `SELECT par.id, par.status, par.created_at, par.decided_at, par.revoked_at, par.requested_until,
              par.blockchain_request_id, par.blockchain_transaction_id, u.ecard_number AS patient_ecard,
              du.first_name AS doctor_first_name, du.last_name AS doctor_last_name
       FROM patient_access_requests par JOIN patients p ON p.id = par.patient_id JOIN users u ON u.id = p.user_id
       JOIN doctors d ON d.id = par.doctor_id JOIN users du ON du.id = d.user_id ${filter}
       ORDER BY par.created_at DESC`, values
    );
    res.json({ data: result.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/status', authMiddleware, (req, res) => res.json({ configured: blockchain.isConfigured() }));

module.exports = router;
