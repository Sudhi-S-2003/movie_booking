import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { Errors } from './errors.js';

/** Wrap an async handler so rejected promises reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** Parse and return a zod-validated payload or throw a 400 with field errors. */
export const parse = <S extends z.ZodType>(schema: S, data: unknown): z.infer<S> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    throw Errors.badRequest('Validation failed', { fieldErrors });
  }
  return result.data;
};

/** Standard success envelope: `{ success: true, data }`. */
export const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

/** The authenticated user, or a 401. Use in handlers behind `isAuthenticated`. */
export const actorOf = (req: Request) => {
  if (!req.user) throw Errors.unauthorized();
  return req.user;
};
