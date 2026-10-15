import { Request, Response, NextFunction } from 'express';
import { captureError } from '../config/monitoring';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = error.statusCode || error.status || 500;
  console.error(`[${req.method} ${req.originalUrl}]`, error.stack || error);
  if (status >= 500) captureError(error, { method: req.method, path: req.originalUrl });

  // Malformed JSON body
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' }
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }
    });
  }

  // Prisma: unique constraint and record-not-found
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'A record with this value already exists' }
    });
  }
  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Record not found' }
    });
  }

  // Never leak internal error details to clients in production
  const message = status < 500 || process.env.NODE_ENV !== 'production'
    ? error.message || 'Request failed'
    : 'Something went wrong. Please try again.';

  res.status(status).json({
    success: false,
    error: { code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR', message }
  });
};
