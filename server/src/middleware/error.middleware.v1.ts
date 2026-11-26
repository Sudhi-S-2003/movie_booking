import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ApiError from '../services/error/ApiError.js';
import { HTTP_STATUS, ERROR_CODES } from '../services/error/error.constant.js';
import { ProtectedRecordError } from '../db/systemContext.js';
import { env } from '../env.js';

/**
 * Central error handler. Known error types map to precise status codes;
 * anything unexpected becomes a generic 500 so internals never leak.
 */
const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
  }
  if (err instanceof ProtectedRecordError) {
    return res.status(403).json({ success: false, code: err.code, message: err.message });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const fieldErrors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: ERROR_CODES.VALIDATION_ERROR, message: 'Validation failed', details: { fieldErrors } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: ERROR_CODES.BAD_REQUEST, message: `Invalid ${err.path}` });
  }
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    const keys = Object.keys((err as { keyValue?: object }).keyValue ?? {});
    return res.status(HTTP_STATUS.CONFLICT).json({ success: false, code: ERROR_CODES.CONFLICT, message: `${keys.join(', ') || 'Value'} already exists` });
  }
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: ERROR_CODES.BAD_REQUEST, message: 'Malformed JSON body' });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  return res.status(HTTP_STATUS.INTERNAL).json({ success: false, code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error' });
};

export default errorMiddleware;
