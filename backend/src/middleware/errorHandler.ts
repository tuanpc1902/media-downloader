import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  res.status(500).json({
    error: 'Lỗi server nội bộ',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}


