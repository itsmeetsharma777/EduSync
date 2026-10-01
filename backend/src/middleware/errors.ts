import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export const notFound: RequestHandler = (_req, res) => res.status(404).json({ message: 'Route not found.' });

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError)
    return res.status(422).json({ message: 'Please check the submitted fields.', issues: error.issues });
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong on our side.' });
};
