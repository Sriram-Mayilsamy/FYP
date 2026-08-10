require('dotenv').config();
const pool = require('../config/database');
const blockchain = require('../services/blockchainService');

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('Usage: npm run blockchain:verify -- <visitId>');
  const result = await pool.query('SELECT * FROM medical_visits WHERE id = $1', [id]);
  if (!result.rows.length) throw new Error('Medical record not found');
  const visit = result.rows[0];
  const chainRecord = await blockchain.getMedicalRecord(visit.blockchain_transaction_id.split(':')[1]);
  console.log(blockchain.hashMedicalVisit(visit) === chainRecord.recordHash ? 'VALID: Record integrity verified' : 'INVALID: Medical record integrity compromised');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
