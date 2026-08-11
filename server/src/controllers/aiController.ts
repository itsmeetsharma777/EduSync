import type { RequestHandler } from 'express';
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
  if (!env.openAiApiKey)
    return res
      .status(503)
      .json({
        message:
          'Video summaries require OPENAI_API_KEY on the server. Paste a transcript, then configure the key to enable this feature.',
      });
  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const response = await client.responses.create({
    model: env.openAiModel,
    input: `You are a precise study coach. Summarize this lecture transcript into concise Markdown with: a two-sentence overview, 4-6 key ideas, 3 active-recall questions, and a 20-word next-step recommendation. Do not invent facts not in the transcript.\n\nLecture title: ${input.title}\nCourse context: ${input.courseContext ?? 'Not provided'}\n\nTranscript:\n${input.transcript}`,
  });
  return res.json({ summary: response.output_text });
};
