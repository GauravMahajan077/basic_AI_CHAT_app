const serverless = require('serverless-http');
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai'); //library
const app = express();

app.use(express.json());

// Initialize your AI client with env variable
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// actual chat route
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(message);
    const aiResponse = result.response.text();
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('generateContent error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

module.exports = serverless(app);
