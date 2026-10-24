import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { aiRoutes } from './routes/aiRoutes.js';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'edusync-api' }));
app.use('/api/ai', aiRoutes);
app.use(notFound);
app.use(errorHandler);
