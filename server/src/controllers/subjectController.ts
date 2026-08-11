import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Subject } from '../models/Subject.js';

const subjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(400).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().max(4).optional(),
  deadline: z.coerce.date().optional(),
});
const lectureSchema = z.object({
  title: z.string().trim().min(1).max(180),
  youtubeUrl: z.string().url(),
  notes: z.string().max(10_000).optional(),
  tags: z.array(z.string().trim().max(30)).max(12).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const listSubjects: RequestHandler = async (req, res) => {
  const subjects = await Subject.find({ owner: req.auth!.sub }).sort({ position: 1, createdAt: -1 }).lean();
  return res.json({ subjects });
};

export const createSubject: RequestHandler = async (req, res) => {
  const input = subjectSchema.parse(req.body);
  const subject = await Subject.create({
    ...input,
    owner: req.auth!.sub,
    position: await Subject.countDocuments({ owner: req.auth!.sub }),
  });
  return res.status(201).json({ subject });
};

export const addLecture: RequestHandler = async (req, res) => {
  const input = lectureSchema.parse(req.body);
  const subject = await Subject.findOne({ _id: req.params.subjectId, owner: req.auth!.sub });
  if (!subject) return res.status(404).json({ message: 'Subject not found.' });
  const videoId = new URL(input.youtubeUrl).searchParams.get('v') ?? input.youtubeUrl.split('/').pop();
  subject.lectures.push({
    ...input,
    thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined,
  });
  await subject.save();
  return res.status(201).json({ lecture: subject.lectures.at(-1) });
};
