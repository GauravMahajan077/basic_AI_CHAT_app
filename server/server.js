// server.js (CommonJS) — drop this in and run
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// NOTE: require the correct exported class from @google/genai
const { GoogleGenAI } = require('@google/genai'); // <--- important

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY = process.env.GOOGLE_API_KEY?.trim();
if (!GOOGLE_KEY) {
  console.error("ERROR: GOOGLE_API_KEY not found in .env");
  process.exit(1);
}

// Initialize client. If you want Vertex AI instead, set vertexai: true and provide project/location.
const ai = new GoogleGenAI({ apiKey: GOOGLE_KEY, vertexai: false });

// Helper: safe extractor for common response shapes
function extractTextFromResponse(resp) {
  // Many versions offer resp.text or resp.output[].content[].text or resp.candidates
  if (!resp) return "";
  if (typeof resp.text === "string") return resp.text;
  if (Array.isArray(resp.output) && resp.output.length) {
    try {
      // modern shape: output[0].content[0].text
      const c = resp.output[0].content?.[0];
      if (c?.text) return c.text;
    } catch (e) {}
  }
  if (Array.isArray(resp.candidates)) {
    return resp.candidates.map(c => c.output || c.text || JSON.stringify(c)).join("\n");
  }
  // fallback
  return JSON.stringify(resp).slice(0, 2000);
}

// Health
app.get('/', (req, res) => res.send('OK'));

// List models available to your API key/project
app.get('/api/models', async (req, res) => {
  try {
    const list = await ai.models.list(); // returns metadata about available models
    // simplify the output
    const models = (list?.models || []).map(m => ({
      name: m.name,
      displayName: m.displayName,
      supportedMethods: m.supportedMethods || m.supported_methods || []
    }));
    res.json({ models });
  } catch (e) {
    console.error("list models error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Generate text from a chosen model. Provide { model, prompt } in body.
// IMPORTANT: run /api/models first, pick a model name from the returned list, then pass it here (do not assume gemini-1.5-flash exists).
app.post('/api/chat', async (req, res) => {
  const prompt = req.body.message || req.body.prompt || "Hello";
  const model = req.body.model || "gemini-2.5-flash"; // default — replace if not in your list

  try {
    const response = await ai.models.generateContent({
      model,
      // contents: allow complex multimodal inputs; here we send a single text message
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = extractTextFromResponse(response);
    res.json({ model, text, raw: response });
  } catch (err) {
    console.error("generateContent error:", err);
    // If you see 404 model not found: call /api/models and pick a supported model name
    res.status(500).json({ error: err?.message || String(err) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
