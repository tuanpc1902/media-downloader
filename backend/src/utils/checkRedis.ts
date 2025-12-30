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
    
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      retryStrategy: () => null, // Không retry khi check
      connectTimeout: 3000,
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

    // Timeout sau 5 giây
    timeout = setTimeout(() => {
      logger.error('❌ Redis connection timeout');
      safeResolve(false);
    }, 5000);
  });
}

