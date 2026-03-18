const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const lancedb = require('@lancedb/lancedb');

let openai;

function getOpenAIClient() {
  if (!openai) {
    const config = require('./config');
    openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return openai;
}

async function getEmbedding(text) {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function initVectorStore() {
  const faqPath = path.join(__dirname, '..', 'data', 'faqs.json');
  const faqs = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));

  const records = [];
  for (const faq of faqs) {
    const text = `${faq.question} ${faq.answer}`;
    const vector = await getEmbedding(text);
    records.push({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      text,
      vector,
    });
  }

  const dbPath = path.join(__dirname, '..', 'data', 'lancedb');
  const db = await lancedb.connect(dbPath);

  const tableNames = await db.tableNames();
  if (tableNames.includes('faqs')) {
    await db.dropTable('faqs');
  }

  const table = await db.createTable('faqs', records);
  return table;
}

async function searchFaqs(table, query, limit = 3) {
  const queryVector = await getEmbedding(query);
  const results = await table
    .vectorSearch(queryVector)
    .limit(limit)
    .toArray();
  return results;
}

async function generateAnswer(query, contexts) {
  const client = getOpenAIClient();

  const contextText = contexts
    .map((c, i) => `[${i + 1}] Q: ${c.question}\nA: ${c.answer}`)
    .join('\n\n');

  const systemPrompt = `You are a helpful customer support assistant for CloudSync Pro, a SaaS product.
Answer the user's question based ONLY on the following FAQ context. Be concise and helpful.
If the context does not contain relevant information to answer the question, say "I don't have information about that. Please contact our support team at support@cloudsyncpro.com for further assistance."

FAQ Context:
${contextText}`;

  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}

module.exports = { initVectorStore, searchFaqs, generateAnswer, getEmbedding };
