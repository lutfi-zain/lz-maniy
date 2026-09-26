import { runEval } from './run.js';

// Run benchmark on Groq gpt-oss-20b
await runEval('groq', 'openai/gpt-oss-20b');
