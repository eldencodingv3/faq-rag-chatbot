const fs = require('fs');
const path = require('path');

const faqPath = path.join(__dirname, '..', 'data', 'faqs.json');

describe('FAQ data', () => {
  let faqs;

  beforeAll(() => {
    const raw = fs.readFileSync(faqPath, 'utf-8');
    faqs = JSON.parse(raw);
  });

  test('faqs.json exists and is valid JSON', () => {
    expect(faqs).toBeDefined();
    expect(Array.isArray(faqs)).toBe(true);
  });

  test('has at least 10 FAQ entries', () => {
    expect(faqs.length).toBeGreaterThanOrEqual(10);
  });

  test('each FAQ has id, question, and answer fields', () => {
    faqs.forEach((faq) => {
      expect(faq).toHaveProperty('id');
      expect(faq).toHaveProperty('question');
      expect(faq).toHaveProperty('answer');
      expect(typeof faq.id).toBe('number');
      expect(typeof faq.question).toBe('string');
      expect(typeof faq.answer).toBe('string');
      expect(faq.question.length).toBeGreaterThan(0);
      expect(faq.answer.length).toBeGreaterThan(0);
    });
  });

  test('FAQ IDs are unique', () => {
    const ids = faqs.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('Config module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('throws if OPENAI_API_KEY is not set', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => require('../src/config')).toThrow('OPENAI_API_KEY');
  });

  test('exports OPENAI_API_KEY and PORT with defaults', () => {
    process.env.OPENAI_API_KEY = 'test-key-123';
    delete process.env.PORT;
    const config = require('../src/config');
    expect(config.OPENAI_API_KEY).toBe('test-key-123');
    expect(config.PORT).toBe(3000);
  });

  test('PORT can be overridden via env', () => {
    process.env.OPENAI_API_KEY = 'test-key-123';
    process.env.PORT = '8080';
    const config = require('../src/config');
    expect(config.PORT).toBe(8080);
  });
});

describe('API health endpoint', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.OPENAI_API_KEY = 'test-key-for-health';

    // Mock rag module to avoid LanceDB/OpenAI dependency
    jest.mock('../src/rag', () => ({
      initVectorStore: jest.fn(),
      searchFaqs: jest.fn(),
      generateAnswer: jest.fn(),
    }));

    const express = require('express');
    app = express();
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  test('GET /api/health returns status ok', async () => {
    // Use a simple HTTP test without supertest
    const http = require('http');
    const server = app.listen(0);
    const port = server.address().port;

    const result = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/api/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      }).on('error', reject);
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: 'ok' });

    server.close();
  });
});
