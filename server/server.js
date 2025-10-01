require('dotenv').config();
const express = require('express');
const cors = require('cors');

 const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY = process.env.GOOGLE_API_KEY?.trim();
if (!GOOGLE_KEY) {
  console.error("ERROR: GOOGLE_API_KEY not found in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GOOGLE_KEY, vertexai: false });


function extractTextFromResponse(resp) {
 
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

  return JSON.stringify(resp).slice(0, 2000);
}


app.get('/', (req, res) => res.send('OK'));




app.get('/api/models', async (req, res) => {
  try {
    const list = await ai.models.list();

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


app.post('/api/chat', async (req, res) => {
  const prompt = req.body.message || req.body.prompt || "Hello";
  const model = req.body.model || "gemini-2.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
    
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = extractTextFromResponse(response);
    res.json({ model, text, raw: response });
  } catch (err) {
    console.error("generateContent error:", err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
