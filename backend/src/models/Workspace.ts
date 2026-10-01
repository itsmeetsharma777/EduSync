import { Schema, model } from 'mongoose';

const taskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  subjectId: { type: String, default: '' },
  due: { type: Date, required: true },
  kind: { type: String, enum: ['assignment', 'exam', 'revision'], default: 'assignment' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  done: { type: Boolean, default: false },
}, { _id: false });

const noteSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  subjectId: { type: String, default: '' },
  body: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const goalSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, maxlength: 180 },
  target: { type: Number, required: true, min: 0 },
  current: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, maxlength: 30 },
}, { _id: false });

const activitySchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true, maxlength: 240 },
  time: { type: String, required: true, maxlength: 80 },
  category: { type: String, enum: ['study', 'note', 'task', 'account'], required: true },
}, { _id: false });

const workspaceSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  dailyGoalMinutes: { type: Number, default: 60, min: 1, max: 1440 },
  studiedTodayMinutes: { type: Number, default: 0, min: 0, max: 100000 },
  language: { type: String, enum: ['en', 'es'], default: 'en' },
  tasks: { type: [taskSchema], default: [] },
  notes: { type: [noteSchema], default: [] },
  goals: { type: [goalSchema], default: [] },
  activity: { type: [activitySchema], default: [] },
}, { timestamps: true });

export const Workspace = model('Workspace', workspaceSchema);
