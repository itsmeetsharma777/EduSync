import { Schema, model, type InferSchemaType } from 'mongoose';

const lectureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    youtubeUrl: { type: String, required: true, trim: true },
    thumbnailUrl: String,
    channel: String,
    durationSeconds: Number,
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    notes: { type: String, default: '' },
    tags: [{ type: String, trim: true }],
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isBookmarked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const subjectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 400 },
    icon: { type: String, default: '✦' },
    color: { type: String, default: '#B896FF' },
    deadline: Date,
    position: { type: Number, default: 0 },
    lectures: [lectureSchema],
  },
  { timestamps: true },
);

export type SubjectDocument = InferSchemaType<typeof subjectSchema>;
export const Subject = model('Subject', subjectSchema);
