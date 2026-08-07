const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { authMiddleware, doctorOnly } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const allowedFields = [
  'visit_date',
  'visit_time',
  'hospital_name',
  'department',
  'chief_complaint',
  'symptoms',
  'diagnosis',
  'notes',
  'height_cm',
  'weight_kg',
  'temperature_c',
  'pulse_bpm',
  'respiratory_rate_bpm',
  'oxygen_saturation_percent',
  'systolic_bp',
  'diastolic_bp',
  'blood_sugar_fasting_mg_dl',
  'blood_sugar_random_mg_dl',
  'blood_sugar_pp_mg_dl',
  'hemoglobin_g_dl',
  'prescription',
  'injections_given',
  'lab_tests_requested',
  'follow_up_date',
];

const numberFields = new Set([
  'height_cm',
  'weight_kg',
  'temperature_c',
  'pulse_bpm',
  'respiratory_rate_bpm',
  'oxygen_saturation_percent',
  'systolic_bp',
  'diastolic_bp',
  'blood_sugar_fasting_mg_dl',
  'blood_sugar_random_mg_dl',
  'blood_sugar_pp_mg_dl',
  'hemoglobin_g_dl',
]);

router.post('/import-medical-report', authMiddleware, doctorOnly, upload.single('report'), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key is not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Medical report file is required' });
    }

    const file = req.file;
    let reportText = '';
    let imageDataUrl = null;
    let model = process.env.GROQ_TEXT_MODEL || 'llama-3.1-8b-instant';

    if (file.mimetype === 'application/pdf') {
      reportText = await extractPdfText(file.buffer);
      if (!reportText) {
        return res.status(422).json({ error: 'No selectable text found in this PDF. Upload an image report or a text-based PDF.' });
      }
    } else if (file.mimetype.startsWith('image/')) {
      model = process.env.GROQ_VISION_MODEL || model;
      imageDataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    } else if (file.mimetype.startsWith('text/')) {
      reportText = file.buffer.toString('utf8');
    } else {
      return res.status(400).json({ error: 'Only PDF, image, or text reports are supported' });
    }

    const fields = await extractMedicalFields({ reportText, imageDataUrl, model });
    res.json({
      fields,
      source: {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();
    return parsed.text?.trim() || '';
  } finally {
    await parser.destroy();
  }
}

async function callGroqApi({ modelList, messages, responseFormat = { type: 'json_object' } }) {
  let lastError = null;
  for (const m of modelList) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: m,
          temperature: 0.1,
          response_format: responseFormat,
          messages,
        }),
      });

      if (response.ok) {
        return await response.json();
      }

      const errText = await response.text();
      lastError = new Error(`Groq API (${m}): ${errText}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Groq API calls failed on all candidate models');
}

async function extractMedicalFields({ reportText, imageDataUrl, model }) {
  const systemPrompt = `You extract structured clinical visit data for a hospital record system.
Return only valid JSON. Do not include markdown.
Use exactly these keys when data is present: ${allowedFields.join(', ')}.
Use empty string for fields not found or not applicable.
For BP split into systolic_bp and diastolic_bp.
For blood sugar use fasting/random/pp fields when identifiable.
Do not invent clinical values.`;

  const content = imageDataUrl
    ? [
        { type: 'text', text: 'Read this medical report image and extract the hospital visit fields as JSON.' },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    : `Medical report text:\n\n${reportText.slice(0, 18000)}`;

  const candidateModels = imageDataUrl
    ? [model, 'llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview']
    : [model, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192'];

  const data = await callGroqApi({
    modelList: candidateModels,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
  });

  const raw = data.choices?.[0]?.message?.content || '{}';
  return sanitizeFields(JSON.parse(raw));
}

function sanitizeFields(input) {
  const fields = {};

  for (const key of allowedFields) {
    const value = input[key];
    if (value === undefined || value === null) {
      fields[key] = '';
    } else if (numberFields.has(key)) {
      const normalized = String(value).replace(/[^\d.]/g, '');
      fields[key] = normalized;
    } else {
      fields[key] = String(value);
    }
  }

  return fields;
}

// Database connection
const pool = require('../config/database');

/**
 * Clinical Reference Ranges & Rule Engine Fallback
 */
function evaluateMetricRuleBased(metricKey, visits) {
  let normalCount = 0;
  let abnormalCount = 0;
  let totalDataPoints = 0;
  const observations = [];
  let status = 'NORMAL';

  const values = [];

  visits.forEach((v) => {
    const dateStr = v.visit_date ? new Date(v.visit_date).toISOString().split('T')[0] : 'Unknown date';

    if (metricKey === 'blood_pressure') {
      if (v.systolic_bp != null && v.diastolic_bp != null) {
        totalDataPoints++;
        const s = Number(v.systolic_bp);
        const d = Number(v.diastolic_bp);
        values.push({ date: dateStr, systolic: s, diastolic: d });

        if (s > 130 || d > 85 || s < 90 || d < 60) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): BP ${s}/${d} mmHg is outside optimal range (90-120/60-80 mmHg).`);
        } else {
          normalCount++;
        }
      }
    } else if (metricKey === 'pulse_bpm') {
      if (v.pulse_bpm != null) {
        totalDataPoints++;
        const val = Number(v.pulse_bpm);
        values.push({ date: dateStr, val });
        if (val < 60 || val > 100) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): Heart Rate ${val} bpm is outside normal range (60-100 bpm).`);
        } else {
          normalCount++;
        }
      }
    } else if (metricKey === 'oxygen_saturation_percent') {
      if (v.oxygen_saturation_percent != null) {
        totalDataPoints++;
        const val = Number(v.oxygen_saturation_percent);
        values.push({ date: dateStr, val });
        if (val < 95) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): SpO2 ${val}% is low (<95%).`);
        } else {
          normalCount++;
        }
      }
    } else if (metricKey === 'temperature_c') {
      if (v.temperature_c != null) {
        totalDataPoints++;
        const val = Number(v.temperature_c);
        values.push({ date: dateStr, val });
        if (val > 37.5 || val < 36.0) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): Body Temp ${val}°C is outside normal limits (36.0 - 37.5°C).`);
        } else {
          normalCount++;
        }
      }
    } else if (metricKey === 'respiratory_rate_bpm') {
      if (v.respiratory_rate_bpm != null) {
        totalDataPoints++;
        const val = Number(v.respiratory_rate_bpm);
        values.push({ date: dateStr, val });
        if (val < 12 || val > 20) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): Respiratory rate ${val} bpm is outside normal range (12-20 bpm).`);
        } else {
          normalCount++;
        }
      }
    } else if (metricKey === 'blood_sugar') {
      const fasting = v.blood_sugar_fasting_mg_dl != null ? Number(v.blood_sugar_fasting_mg_dl) : null;
      const random = v.blood_sugar_random_mg_dl != null ? Number(v.blood_sugar_random_mg_dl) : null;
      const pp = v.blood_sugar_pp_mg_dl != null ? Number(v.blood_sugar_pp_mg_dl) : null;

      if (fasting != null || random != null || pp != null) {
        totalDataPoints++;
        values.push({ date: dateStr, fasting, random, pp });
        let isAbnormal = false;
        if (fasting != null && (fasting > 100 || fasting < 70)) {
          isAbnormal = true;
          observations.push(`Visit (${dateStr}): Fasting blood sugar ${fasting} mg/dL is outside normal range (70-100 mg/dL).`);
        }
        if (random != null && random > 140) {
          isAbnormal = true;
          observations.push(`Visit (${dateStr}): Random blood sugar ${random} mg/dL is elevated (>140 mg/dL).`);
        }
        if (pp != null && pp > 140) {
          isAbnormal = true;
          observations.push(`Visit (${dateStr}): Post-prandial blood sugar ${pp} mg/dL is elevated (>140 mg/dL).`);
        }
        if (isAbnormal) abnormalCount++;
        else normalCount++;
      }
    } else if (metricKey === 'hemoglobin_g_dl') {
      if (v.hemoglobin_g_dl != null) {
        totalDataPoints++;
        const val = Number(v.hemoglobin_g_dl);
        values.push({ date: dateStr, val });
        if (val < 12.0 || val > 17.5) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): Hemoglobin ${val} g/dL is outside normal limits (12.0 - 17.5 g/dL).`);
        } else {
          normalCount++;
        }
      }
    } else if (metricKey === 'weight_bmi') {
      if (v.weight_kg != null) {
        totalDataPoints++;
        const weight = Number(v.weight_kg);
        const height = v.height_cm != null ? Number(v.height_cm) : null;
        let bmi = null;
        if (height && height > 0) {
          bmi = Number((weight / ((height / 100) ** 2)).toFixed(1));
        }
        values.push({ date: dateStr, weight, bmi });
        if (bmi && (bmi < 18.5 || bmi > 24.9)) {
          abnormalCount++;
          observations.push(`Visit (${dateStr}): BMI ${bmi} kg/m² indicates ${bmi < 18.5 ? 'Underweight' : bmi >= 30 ? 'Obesity' : 'Overweight'}.`);
        } else {
          normalCount++;
        }
      }
    }
  });

  if (totalDataPoints === 0) {
    return {
      status: 'NORMAL',
      summary: 'No timeline records available for this metric.',
      key_observations: ['Insufficient temporal data recorded.'],
      trend: 'STABLE',
      clinical_recommendation: 'Record vital metrics during upcoming patient visits to enable trend analysis.',
      data_points_count: 0
    };
  }

  if (abnormalCount > 0) {
    status = abnormalCount >= Math.ceil(totalDataPoints / 2) ? 'ABNORMAL' : 'BORDERLINE';
  }

  const metricTitleMap = {
    blood_pressure: 'Blood Pressure',
    pulse_bpm: 'Heart Rate / Pulse',
    oxygen_saturation_percent: 'Oxygen Saturation (SpO2)',
    temperature_c: 'Body Temperature',
    respiratory_rate_bpm: 'Respiratory Rate',
    blood_sugar: 'Blood Sugar',
    hemoglobin_g_dl: 'Hemoglobin',
    weight_bmi: 'Weight & BMI'
  };

  const name = metricTitleMap[metricKey] || metricKey;
  let summary = '';
  if (status === 'NORMAL') {
    summary = `Patient's ${name} timeline across ${totalDataPoints} recorded visit(s) remains consistently within normal medical parameters.`;
  } else if (status === 'BORDERLINE') {
    summary = `Patient's ${name} timeline shows mild fluctuations or occasional abnormal readings across ${totalDataPoints} visit(s). Close monitoring recommended.`;
  } else {
    summary = `Patient's ${name} timeline shows sustained or significant abnormal readings across ${totalDataPoints} visit(s) requiring medical review.`;
  }

  return {
    status,
    summary,
    key_observations: observations.length > 0 ? observations : [`All ${totalDataPoints} recorded readings fell within normal clinical reference ranges.`],
    trend: values.length >= 2 ? 'EVALUATED' : 'STABLE',
    clinical_recommendation: status === 'NORMAL' 
      ? 'Continue routine monitoring during standard clinical follow-ups.' 
      : 'Review medication compliance, lifestyle factors, or order targeted diagnostic investigations.',
    data_points_count: totalDataPoints
  };
}

/**
 * AI Timeline Analysis Endpoint
 * POST /api/ai/analyze-timeline
 */
router.post('/analyze-timeline', authMiddleware, doctorOnly, async (req, res) => {
  try {
    const { patient_id, metric_key } = req.body;

    if (!patient_id || !metric_key) {
      return res.status(400).json({ error: 'patient_id and metric_key are required' });
    }

    // Fetch visits for patient
    const visitsResult = await pool.query(
      `SELECT id, visit_date, visit_time, systolic_bp, diastolic_bp, pulse_bpm, 
              temperature_c, oxygen_saturation_percent, respiratory_rate_bpm,
              blood_sugar_fasting_mg_dl, blood_sugar_random_mg_dl, blood_sugar_pp_mg_dl,
              hemoglobin_g_dl, weight_kg, height_cm, notes, chief_complaint, diagnosis
       FROM medical_visits
       WHERE patient_id = $1
       ORDER BY visit_date ASC, visit_time ASC, created_at ASC`,
      [patient_id]
    );

    const visits = visitsResult.rows;
    const ruleEvaluation = evaluateMetricRuleBased(metric_key, visits);

    let aiResult = ruleEvaluation;

    // Call Groq AI API if configured
    if (process.env.GROQ_API_KEY && visits.length > 0) {
      try {
        const model = process.env.GROQ_TEXT_MODEL || 'llama-3.1-8b-instant';
        const systemPrompt = `You are an expert medical AI assistant specialized in analyzing patient longitudinal clinical vital metrics over time.
Given a sequence of visit dates and recorded values for metric '${metric_key}', evaluate the temporal health trajectory.
You must return valid JSON ONLY with the exact format:
{
  "status": "NORMAL" | "ABNORMAL" | "BORDERLINE",
  "summary": "Concise high-level clinical summary of the timeline trend (1-2 sentences)",
  "key_observations": ["Bullet point observation 1", "Bullet point observation 2"],
  "trend": "STABLE" | "RISING" | "DROPPING" | "FLUCTUATING",
  "clinical_recommendation": "Actionable advice for treating physician"
}
Criteria for status:
- NORMAL: Values remain consistently within standard healthy reference limits over time.
- ABNORMAL: Values show clinically significant elevation, depression, or persistent unhealthy trends over time.
- BORDERLINE: Mild or intermittent deviations present.
Do not invent visit records. Base analysis strictly on the provided timeline data.`;

        const timelineText = visits.map(v => {
          return `Date: ${v.visit_date ? new Date(v.visit_date).toISOString().split('T')[0] : 'N/A'}, Systolic BP: ${v.systolic_bp || 'N/A'}, Diastolic BP: ${v.diastolic_bp || 'N/A'}, Pulse: ${v.pulse_bpm || 'N/A'}, Temp: ${v.temperature_c || 'N/A'}°C, SpO2: ${v.oxygen_saturation_percent || 'N/A'}%, RespRate: ${v.respiratory_rate_bpm || 'N/A'}, FastingSugar: ${v.blood_sugar_fasting_mg_dl || 'N/A'}, RandomSugar: ${v.blood_sugar_random_mg_dl || 'N/A'}, PPSugar: ${v.blood_sugar_pp_mg_dl || 'N/A'}, Hb: ${v.hemoglobin_g_dl || 'N/A'}, Weight: ${v.weight_kg || 'N/A'}kg, Height: ${v.height_cm || 'N/A'}cm`;
        }).join('\n');

        const data = await callGroqApi({
          modelList: [model, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192'],
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Metric analyzed: ${metric_key}\nRule pre-evaluation: ${ruleEvaluation.status}\n\nPatient Timeline Records:\n${timelineText}` },
          ],
        });

        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        if (parsed.status && parsed.summary) {
          aiResult = {
            status: ['NORMAL', 'ABNORMAL', 'BORDERLINE'].includes(parsed.status.toUpperCase()) ? parsed.status.toUpperCase() : ruleEvaluation.status,
            summary: parsed.summary,
            key_observations: Array.isArray(parsed.key_observations) ? parsed.key_observations : ruleEvaluation.key_observations,
            trend: parsed.trend || ruleEvaluation.trend,
            clinical_recommendation: parsed.clinical_recommendation || ruleEvaluation.clinical_recommendation,
            data_points_count: ruleEvaluation.data_points_count
          };
        }
      } catch (aiErr) {
        console.error('Groq AI Timeline Analysis Error (falling back to rule engine):', aiErr.message);
      }
    }

    // Doctor ID from auth
    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    const doctorId = doctorResult.rows[0]?.id || null;

    // Save to database timeline_ai_analyses
    const insertResult = await pool.query(
      `INSERT INTO timeline_ai_analyses (patient_id, doctor_id, metric_key, status, summary, detailed_analysis, data_points_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        patient_id,
        doctorId,
        metric_key,
        aiResult.status,
        aiResult.summary,
        JSON.stringify(aiResult),
        aiResult.data_points_count
      ]
    );

    res.json({
      analysis: insertResult.rows[0],
      evaluation: aiResult
    });
  } catch (error) {
    console.error('Timeline AI Analysis endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Previous Timeline AI Analyses for Patient
 * GET /api/ai/timeline-analyses/:patientId
 */
router.get('/timeline-analyses/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await pool.query(
      `SELECT ta.*, d.license_number, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name
       FROM timeline_ai_analyses ta
       LEFT JOIN doctors d ON ta.doctor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE ta.patient_id = $1
       ORDER BY ta.created_at DESC`,
      [patientId]
    );

    res.json({ analyses: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.extractPdfText = extractPdfText;

