const express = require('express');
const path = require('path');
const config = require('./config');
const { initVectorStore, searchFaqs, generateAnswer } = require('./rag');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let faqTable = null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const results = await searchFaqs(faqTable, message, 3);
    const reply = await generateAnswer(message, results);
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

async function start() {
  console.log('Initializing vector store...');
  faqTable = await initVectorStore();
  console.log('Vector store ready.');

  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

start().catch(console.error);

module.exports = app;
