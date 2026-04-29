import type { Request, Response, NextFunction } from 'express';

// Global Error Handler Middleware
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${req.method} ${req.url} >>`, err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
