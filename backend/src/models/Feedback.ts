import { Schema, model } from 'mongoose';

const feedbackSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
}, { timestamps: true });

export const Feedback = model('Feedback', feedbackSchema);
