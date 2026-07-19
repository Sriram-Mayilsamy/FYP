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

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Groq import failed: ${message}`);
  }

  const data = await response.json();
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

module.exports = router;
module.exports.extractPdfText = extractPdfText;
