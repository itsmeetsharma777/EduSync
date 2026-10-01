import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Workspace } from '../models/Workspace.js';

const workspaceSchema = z.object({
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
