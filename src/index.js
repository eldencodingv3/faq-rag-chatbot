const express = require('express');
const path = require('path');
const config = require('./config');
const { initVectorStore, searchFaqs, generateAnswer } = require('./rag');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let faqTable = null;
let initError = null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', vectorStoreReady: faqTable !== null });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!faqTable) {
      return res.status(503).json({
        error: 'Vector store not initialized. Please set a valid OPENAI_API_KEY and restart.',
        reply: 'I\'m sorry, the chatbot is not fully configured yet. The administrator needs to set a valid OpenAI API key.'
      });
    }

    const results = await searchFaqs(faqTable, message, 3);
    const reply = await generateAnswer(message, results);
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Start server first, then init vector store
app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);

  // Initialize vector store in background
  console.log('Initializing vector store...');
  initVectorStore()
    .then(table => {
      faqTable = table;
      console.log('Vector store ready.');
    })
    .catch(err => {
      initError = err;
      console.error('Failed to initialize vector store:', err.message);
      console.error('Chat functionality will not work until a valid OPENAI_API_KEY is set.');
    });
});

module.exports = app;
