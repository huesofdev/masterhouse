import { Request, Response, NextFunction } from 'express'
import { AppError } from '../error/AppError'

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500
  let message = 'Something went wrongin our end...'

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message === 'Request aborted') {
    // Client dropped connection during a stream/upload
    statusCode = 499; // Client Closed Request
    message = 'Client closed the request before completion';
    console.warn(`[Client Disconnect] ${req.method} ${req.originalUrl} - Upload aborted by client.`);
  } else {
    console.log('unhandled Error', err)
  }

  res.status(statusCode).json({
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    message: message,
    // Only leak the stack trace when you are developing locally
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  
}
