const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const PORT = parseInt(process.env.PORT, 10) || 3000;

module.exports = { OPENAI_API_KEY, PORT };
