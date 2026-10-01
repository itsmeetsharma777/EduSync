import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Feedback } from '../models/Feedback.js';

const feedbackSchema = z.object({ message: z.string().trim().min(1).max(5000) });

export const createFeedback: RequestHandler = async (req, res) => {
  const input = feedbackSchema.parse(req.body);
  const feedback = await Feedback.create({ owner: req.auth!.sub, message: input.message });
  return res.status(201).json({ feedback: { id: feedback.id, message: feedback.message, createdAt: feedback.createdAt } });
};
