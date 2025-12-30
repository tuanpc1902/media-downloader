import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

/**
 * Kiểm tra kết nối Redis
 */
export async function checkRedis(): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    let timeout: NodeJS.Timeout | null = null;
    
    // Log Redis config (without password)
    logger.info('Checking Redis connection...', {
      host: config.redis.host,
      port: config.redis.port,
      hasPassword: !!config.redis.password,
      hasUrl: !!config.redis.url,
    });
    
    // Support both connection string (REDIS_URL) and individual config
    const redis = config.redis.url
      ? new Redis(config.redis.url, {
          maxRetriesPerRequest: null,
          retryStrategy: () => null, // Không retry khi check
          connectTimeout: 10000, // Increase timeout for Render (10 seconds)
        })
      : new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined, // Handle empty string as undefined
          maxRetriesPerRequest: null,
          retryStrategy: () => null, // Không retry khi check
          connectTimeout: 10000, // Increase timeout for Render (10 seconds)
        });

    const safeResolve = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        try {
          if (redis.status === 'ready' || redis.status === 'connecting') {
            redis.disconnect();
          }
        } catch (error) {
          // Ignore errors when disconnecting
        }
        resolve(value);
      }
    };

    redis.on('connect', () => {
      logger.info('✅ Redis connection established');
      safeResolve(true);
    });

    redis.on('ready', () => {
      logger.info('✅ Redis connection established');
      safeResolve(true);
    });

    redis.on('error', (error) => {
      logger.error('❌ Redis connection failed:', error.message);
      safeResolve(false);
    });

    // Timeout sau 10 giây (tăng cho Render)
    timeout = setTimeout(() => {
      logger.error('❌ Redis connection timeout after 10 seconds');
      safeResolve(false);
    }, 10000);
  });
}

