// Test environment variables
require('dotenv').config();

console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
console.log('GOOGLE_API_KEY present:', !!process.env.GOOGLE_API_KEY);
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('CLAUDE_API_KEY present:', !!process.env.CLAUDE_API_KEY);