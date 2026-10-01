import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 30 },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    avatarUrl: String,
    isSuspended: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    sessions: [
      {
        id: { type: String, required: true },
        userAgent: { type: String, default: 'Unknown device' },
        createdAt: { type: Date, default: Date.now },
        lastActiveAt: { type: Date, default: Date.now },
      },
    ],
    lastActiveAt: Date,
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
