import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env from root or server
if (fs.existsSync(path.join(rootDir, '.env'))) {
  dotenv.config({ path: path.join(rootDir, '.env') });
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const app = express();
const PORT = process.env.PORT || 3001;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }));

// Health / status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasSarvamKey: Boolean(SARVAM_API_KEY && SARVAM_API_KEY !== 'your_sarvam_api_key_here'),
    timestamp: new Date().toISOString()
  });
});

// Mascots pack discovery
app.get('/api/mascots', (req, res) => {
  try {
    const packsDir = path.join(rootDir, 'mascot-packs');
    if (!fs.existsSync(packsDir)) {
      return res.json([]);
    }
    const folders = fs.readdirSync(packsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const packs = [];
    for (const folder of folders) {
      const manifestPath = path.join(packsDir, folder, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          packs.push(content);
        } catch (err) {
          console.error(`Error parsing manifest for ${folder}:`, err.message);
        }
      }
    }
    res.json(packs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Speech-to-Text (STT) via Sarvam AI
app.post('/api/stt', async (req, res) => {
  if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
    return res.status(503).json({
      error: 'Sarvam API key not configured',
      fallback: true
    });
  }

  try {
    // If base64 sent in JSON or raw audio buffer
    let audioBuffer;
    let mimeType = 'audio/wav';

    if (req.body && req.body.audioBase64) {
      audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
      if (req.body.mimeType) mimeType = req.body.mimeType;
    } else if (Buffer.isBuffer(req.body)) {
      audioBuffer = req.body;
      mimeType = req.headers['content-type'] || 'audio/wav';
    } else {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, 'audio.wav');
    formData.append('language_code', req.body.language_code || 'hi-IN');
    formData.append('model', 'saaras:v3');

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Sarvam STT failed with status', response.status, errorText);
      return res.status(response.status).json({ error: errorText, fallback: true });
    }

    const data = await response.json();
    res.json({
      transcript: data.transcript || '',
      language_code: data.language_code || 'hi-IN'
    });
  } catch (err) {
    console.error('STT proxy error:', err.message);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

// Text-to-Speech (TTS) via Sarvam AI
app.post('/api/tts', async (req, res) => {
  const { text, language_code = 'hi-IN', speaker = 'shreya', pace = 1.0 } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
    return res.status(503).json({
      error: 'Sarvam API key not configured',
      fallback: true
    });
  }

  try {
    const validBulbulSpeakers = [
      'aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan',
      'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun',
      'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'anand',
      'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani',
      'mohit', 'kavitha', 'rehan', 'soham', 'rupali'
    ];
    const targetSpeaker = validBulbulSpeakers.includes(speaker) ? speaker : 'shreya';

    const payload = {
      inputs: [text],
      target_language_code: language_code,
      speaker: targetSpeaker,
      pace: pace,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v3'
    };

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Sarvam TTS failed with status', response.status, errorText);
      return res.status(response.status).json({ error: errorText, fallback: true });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('TTS proxy error:', err.message);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

// LLM/NLU Parsing fallback via Sarvam AI
app.post('/api/parse', async (req, res) => {
  const { prompt, text, fieldType, options = [] } = req.body || {};

  if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
    return res.status(503).json({ error: 'Sarvam key not configured', fallback: true });
  }

  try {
    const systemPrompt = `You are a concise form extraction assistant for a government kiosk in Hindi.
The user spoke: "${text}".
Field Type: "${fieldType}".
Possible options (if applicable): ${JSON.stringify(options)}.
Extract ONLY the final clean value as a JSON object: {"value": "...", "confidence": 0.95}. Do not include markdown or explanations.`;

    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY
      },
      body: JSON.stringify({
        model: 'sarvam-2b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ fallback: true });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch {
      res.json({ value: content.trim(), confidence: 0.8 });
    }
  } catch (err) {
    res.status(500).json({ error: err.message, fallback: true });
  }
});

app.listen(PORT, () => {
  console.log(`AI Seva Setu backend proxy listening on port ${PORT}`);
  console.log(`Sarvam API Key configured: ${Boolean(SARVAM_API_KEY && SARVAM_API_KEY !== 'your_sarvam_api_key_here')}`);
});
