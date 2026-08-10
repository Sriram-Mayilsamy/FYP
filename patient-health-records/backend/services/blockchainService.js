const path = require('path');
const { createHash } = require('crypto');
const { ethers } = require('ethers');

const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'HealthcareRegistry.sol', 'HealthcareRegistry.json');

function isConfigured() {
  return Boolean(process.env.BLOCKCHAIN_RPC_URL && process.env.CONTRACT_ADDRESS && process.env.PRIVATE_KEY);
}

function getContract() {
  if (!isConfigured()) {
    throw new Error('Blockchain demo is not configured. Set BLOCKCHAIN_RPC_URL, CONTRACT_ADDRESS and PRIVATE_KEY.');
  }
  // Artifact is produced by `npm run blockchain:compile`; keeping ABI separate prevents embedding contract data in API code.
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const artifact = require(artifactPath);
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, signer);
}

function stableValue(value) {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === 'object') return Object.keys(value).sort().reduce((result, key) => {
    result[key] = stableValue(value[key]);
    return result;
  }, {});
  return value;
}

// Hash the database representation, so any later direct edit of visit data is detectable.
function hashMedicalVisit(visit) {
  const payload = {
    patientId: String(visit.patient_id),
    doctorId: String(visit.doctor_id),
    createdAt: stableValue(visit.created_at),
    medicalData: stableValue({
      visit_date: visit.visit_date, visit_time: visit.visit_time, hospital_name: visit.hospital_name,
      department: visit.department, chief_complaint: visit.chief_complaint, symptoms: visit.symptoms,
      diagnosis: visit.diagnosis, notes: visit.notes, height_cm: visit.height_cm, weight_kg: visit.weight_kg,
      temperature_c: visit.temperature_c, pulse_bpm: visit.pulse_bpm, respiratory_rate_bpm: visit.respiratory_rate_bpm,
      oxygen_saturation_percent: visit.oxygen_saturation_percent, systolic_bp: visit.systolic_bp,
      diastolic_bp: visit.diastolic_bp, blood_sugar_fasting_mg_dl: visit.blood_sugar_fasting_mg_dl,
      blood_sugar_random_mg_dl: visit.blood_sugar_random_mg_dl, blood_sugar_pp_mg_dl: visit.blood_sugar_pp_mg_dl,
      hemoglobin_g_dl: visit.hemoglobin_g_dl, prescription: visit.prescription, injections_given: visit.injections_given,
      lab_tests_requested: visit.lab_tests_requested, follow_up_date: visit.follow_up_date, extra_data: visit.extra_data,
    }),
  };
  return `0x${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function eventValue(receipt, eventName, argument) {
  const event = receipt.logs.find((log) => log.fragment && log.fragment.name === eventName);
  if (!event) throw new Error(`Expected ${eventName} event was not emitted`);
  return event.args[argument];
}

async function addMedicalRecord(patientId, recordHash) {
  const transaction = await getContract().addMedicalRecord(String(patientId), recordHash);
  const receipt = await transaction.wait();
  return { transactionId: transaction.hash, recordId: eventValue(receipt, 'MedicalRecordAdded', 'recordId').toString() };
}

async function requestAccess(patientId, doctorId) {
  const transaction = await getContract().requestAccess(String(patientId), String(doctorId));
  const receipt = await transaction.wait();
  return { transactionId: transaction.hash, requestId: eventValue(receipt, 'AccessRequested', 'requestId').toString() };
}

async function approveAccess(requestId, expiresAt) {
  const expirySeconds = Math.floor(new Date(expiresAt).getTime() / 1000);
  const transaction = await getContract().approveAccess(requestId, expirySeconds);
  await transaction.wait();
  return { transactionId: transaction.hash };
}

async function revokeAccess(requestId) {
  const transaction = await getContract().revokeAccess(requestId);
  await transaction.wait();
  return { transactionId: transaction.hash };
}

async function getMedicalRecord(recordId) {
  const record = await getContract().getMedicalRecord(recordId);
  return { recordId: record.recordId.toString(), patientId: record.patientId, recordHash: record.recordHash, createdAt: Number(record.createdAt) };
}

async function getAccessRequest(requestId) {
  const request = await getContract().getAccessRequest(requestId);
  return { requestId: request.requestId.toString(), patientId: request.patientId, doctorId: request.doctorId, status: Number(request.status), requestedAt: Number(request.requestedAt), approvedAt: Number(request.approvedAt), expiresAt: Number(request.expiresAt) };
}

module.exports = { isConfigured, hashMedicalVisit, addMedicalRecord, requestAccess, approveAccess, revokeAccess, getMedicalRecord, getAccessRequest };
