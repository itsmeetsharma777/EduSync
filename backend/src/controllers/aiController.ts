import type { RequestHandler } from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';

const summarySchema = z.object({
  title: z.string().trim().min(1).max(240),
  transcript: z.string().trim().min(80).max(120_000),
  courseContext: z.string().trim().max(400).optional(),
});

export const summarizeLecture: RequestHandler = async (req, res) => {
  const input = summarySchema.parse(req.body);
  const prompt = `You are a precise study coach. Summarize this lecture transcript into concise Markdown with: a two-sentence overview, 4-6 key ideas, 3 active-recall questions, and a 20-word next-step recommendation. Do not invent facts not in the transcript.

Lecture title: ${input.title}
Course context: ${input.courseContext ?? 'Not provided'}

Transcript:
${input.transcript}`;
  if (env.aiProvider === 'openai' && !env.openAiApiKey)
    return res
      .status(503)
      .json({
        message: 'AI_PROVIDER is openai but OPENAI_API_KEY is missing on the server.',
      });
  if (env.aiProvider === 'gemini' && !env.geminiApiKey)
    return res.status(503).json({ message: 'AI_PROVIDER is gemini but GEMINI_API_KEY is missing on the server.' });
  if (env.aiProvider === 'gemini') {
    const client = new GoogleGenAI({ apiKey: env.geminiApiKey });
    const response = await client.models.generateContent({ model: env.geminiModel, contents: prompt });
    return res.json({ summary: response.text ?? '' });
  }
  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const response = await client.responses.create({ model: env.openAiModel, input: prompt });
  return res.json({ summary: response.output_text });
};
