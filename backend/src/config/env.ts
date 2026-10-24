import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  aiProvider: process.env.AI_PROVIDER === 'gemini' ? 'gemini' as const : 'openai' as const,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
};
