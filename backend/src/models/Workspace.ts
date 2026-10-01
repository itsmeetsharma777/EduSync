import { Schema, model } from 'mongoose';

const lectureSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 240 },
  url: { type: String, required: true, maxlength: 2000 },
  duration: { type: String, required: true, maxlength: 40 },
  channel: { type: String, required: true, maxlength: 180 },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  favorite: { type: Boolean, default: false },
  bookmarked: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
  note: { type: String, default: '', maxlength: 50000 },
  summary: { type: String, maxlength: 50000 },
}, { _id: false });

const subjectSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  detail: { type: String, default: '', maxlength: 500 },
  short: { type: String, required: true, maxlength: 30 },
  color: { type: String, required: true, maxlength: 40 },
  accent: { type: String, enum: ['lavender', 'peach', 'mint', 'neutral'], default: 'neutral' },
  deadline: { type: String, default: '' },
  icon: { type: String, default: '•', maxlength: 20 },
  pinned: { type: Boolean, default: false },
  lectures: { type: [lectureSchema], default: [] },
}, { _id: false });

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
  subjects: { type: [subjectSchema], default: [] },
  dailyGoalMinutes: { type: Number, default: 60, min: 1, max: 1440 },
  studiedTodayMinutes: { type: Number, default: 0, min: 0, max: 100000 },
  language: { type: String, enum: ['en', 'es'], default: 'en' },
  tasks: { type: [taskSchema], default: [] },
  notes: { type: [noteSchema], default: [] },
  goals: { type: [goalSchema], default: [] },
  activity: { type: [activitySchema], default: [] },
  studyHistory: {
    type: [{
      date: { type: String, required: true },
      minutes: { type: Number, required: true, min: 0, max: 100000 },
    }],
    default: [],
  },
}, { timestamps: true });

export const Workspace = model('Workspace', workspaceSchema);
