const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. Chat functionality will not work.');
}

const PORT = parseInt(process.env.PORT, 10) || 3000;

module.exports = { OPENAI_API_KEY, PORT };
