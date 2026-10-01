import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Workspace } from '../models/Workspace.js';

const lectureSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(240),
  url: z.string().max(2000),
  duration: z.string().max(40),
  channel: z.string().max(180),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  favorite: z.boolean(),
  bookmarked: z.boolean(),
  tags: z.array(z.string().max(80)).max(50),
  note: z.string().max(50000),
  summary: z.string().max(50000).optional(),
});

const subjectSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(180),
  detail: z.string().max(500),
  short: z.string().max(30),
  color: z.string().max(40),
  accent: z.enum(['lavender', 'peach', 'mint', 'neutral']),
  deadline: z.string().max(100),
  icon: z.string().max(20),
  pinned: z.boolean(),
  lectures: z.array(lectureSchema).max(1000),
});

const workspaceSchema = z.object({
  subjects: z.array(subjectSchema).max(100),
  dailyGoalMinutes: z.number().int().min(1).max(1440),
  studiedTodayMinutes: z.number().int().min(0).max(100000),
  language: z.enum(['en', 'es']),
  tasks: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(180),
    subjectId: z.string().max(100),
    due: z.coerce.date(),
    kind: z.enum(['assignment', 'exam', 'revision']),
    priority: z.enum(['low', 'medium', 'high']),
    done: z.boolean(),
  })).max(1000),
  notes: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(180),
    subjectId: z.string().max(100),
    body: z.string().max(50000),
    updatedAt: z.coerce.date(),
  })).max(1000),
  goals: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(180),
    target: z.number().min(0),
    current: z.number().min(0),
    unit: z.string().trim().min(1).max(30),
  })).max(100),
  studyHistory: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    minutes: z.number().int().min(0).max(100000),
  })).max(366),
  activity: z.array(z.object({
    id: z.string().min(1).max(100),
    label: z.string().trim().min(1).max(240),
    time: z.string().trim().min(1).max(80),
    category: z.enum(['study', 'note', 'task', 'account']),
  })).max(1000),
});

export const getWorkspace: RequestHandler = async (req, res) => {
  const workspace = await Workspace.findOne({ owner: req.auth!.sub }).lean();
  return res.json({ workspace });
};

export const saveWorkspace: RequestHandler = async (req, res) => {
  const input = workspaceSchema.parse(req.body);
  const workspace = await Workspace.findOneAndUpdate(
    { owner: req.auth!.sub },
    { $set: input, $setOnInsert: { owner: req.auth!.sub } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  return res.json({ workspace });
};
