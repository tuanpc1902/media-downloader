import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Quá nhiều requests. Vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false,
});


