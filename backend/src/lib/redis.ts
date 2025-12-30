/**
 * Production-grade Redis Connection Manager
 * 
 * Features:
 * - Async connection with retry logic
 * - Graceful degradation (app doesn't crash if Redis fails)
 * - Supports REDIS_URL and REDIS_HOST+PORT
 * - No hard-coded localhost in production
 * - Connection state tracking
 */

import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Global state
export let redisAvailable: boolean = false;
export let redisClient: Redis | null = null;
export let redisConnection: Redis | null = null; // For BullMQ

// Connection configuration
interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
}

/**
 * Build Redis options from environment variables
 * Priority: REDIS_URL > REDIS_HOST+REDIS_PORT
 */
function buildRedisConfig(): RedisConfig | null {
  const isProduction = config.server.env === 'production';
  
  // Priority 1: REDIS_URL
  if (process.env.REDIS_URL) {
    logger.info('[Redis] Using REDIS_URL for connection');
    return { url: process.env.REDIS_URL };
  }
  
  // Priority 2: REDIS_HOST + REDIS_PORT
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  
  if (host && port) {
    logger.info('[Redis] Using REDIS_HOST and REDIS_PORT for connection', {
      host,
      port: parseInt(port, 10),
    });
    return {
      host,
      port: parseInt(port, 10),
      password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== ''
        ? process.env.REDIS_PASSWORD
        : undefined,
    };
  }
  
  // Development fallback (only in non-production)
  if (!isProduction) {
    logger.warn('[Redis] No Redis config found, using localhost:6379 (development only)');
    return {
      host: 'localhost',
      port: 6379,
      password: undefined,
    };
  }
  
  // Production: No Redis config = Redis unavailable
  logger.warn('[Redis] No Redis configuration found in production environment');
  return null;
}

/**
 * Create Redis client with proper options
 */
function createRedisClient(redisConfig: RedisConfig): Redis {
  const options: RedisOptions = {
    maxRetriesPerRequest: null, // BullMQ requirement
    retryStrategy: (times: number) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, max 3000ms
      const delay = Math.min(times * 50, 3000);
      if (times > 10) {
        logger.error('[Redis] Max retry attempts reached, giving up');
        return null; // Stop retrying
      }
      logger.warn(`[Redis] Retry attempt ${times} in ${delay}ms`);
      return delay;
    },
    connectTimeout: 10000, // 10 seconds
    lazyConnect: true, // Don't connect immediately
    enableOfflineQueue: false, // Don't queue commands when disconnected
  };

  if (redisConfig.url) {
    return new Redis(redisConfig.url, options);
  } else {
    return new Redis({
      ...options,
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
    });
  }
}

/**
 * Initialize Redis connection with retry logic
 * This function does NOT throw errors - it gracefully handles failures
 */
export async function initializeRedis(): Promise<void> {
  const redisConfig = buildRedisConfig();
  
  if (!redisConfig) {
    logger.warn('[Redis] Unavailable – running without Redis');
    redisAvailable = false;
    redisClient = null;
    redisConnection = null;
    return;
  }

  try {
    logger.info('[Redis] Initializing connection...');
    
    // Create client
    const client = createRedisClient(redisConfig);
    redisClient = client;
    redisConnection = client; // Same instance for BullMQ
    
    // Set up event handlers
    client.on('connect', () => {
      logger.info('[Redis] Connecting...');
    });
    
    client.on('ready', () => {
      logger.info('[Redis] Connected and ready');
      redisAvailable = true;
    });
    
    client.on('error', (error) => {
      logger.error('[Redis] Connection error:', error.message);
      redisAvailable = false;
      // Don't throw - just mark as unavailable
    });
    
    client.on('close', () => {
      logger.warn('[Redis] Connection closed');
      redisAvailable = false;
    });
    
    client.on('reconnecting', (delay: number) => {
      logger.info(`[Redis] Reconnecting in ${delay}ms...`);
    });
    
    // Attempt connection with retry
    try {
      await client.connect();
      
      // Test connection with PING
      const result = await Promise.race([
        client.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PING timeout')), 5000)
        ),
      ]);
      
      if (result === 'PONG') {
        logger.info('[Redis] Connection test successful (PING/PONG)');
        redisAvailable = true;
      } else {
        logger.warn('[Redis] Connection test failed');
        redisAvailable = false;
      }
    } catch (error: any) {
      logger.error('[Redis] Failed to connect:', error.message);
      redisAvailable = false;
      
      // Don't disconnect immediately - let retry strategy handle it
      // But mark as unavailable
    }
    
  } catch (error: any) {
    logger.error('[Redis] Initialization error:', error.message);
    redisAvailable = false;
    redisClient = null;
    redisConnection = null;
  }
}

/**
 * Get Redis client (null if unavailable)
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Get Redis connection for BullMQ (null if unavailable)
 */
export function getRedisConnection(): Redis | null {
  return redisConnection;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient !== null && redisClient.status === 'ready';
}

/**
 * Gracefully disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('[Redis] Disconnected gracefully');
    } catch (error: any) {
      logger.error('[Redis] Error during disconnect:', error.message);
      // Force disconnect
      redisClient.disconnect();
    } finally {
      redisClient = null;
      redisConnection = null;
      redisAvailable = false;
    }
  }
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<{
  available: boolean;
  status: string;
  config: {
    host?: string;
    port?: number;
    hasPassword: boolean;
    hasUrl: boolean;
  };
}> {
  const isAvailable = isRedisAvailable();
  const redisConfig = buildRedisConfig();
  
  return {
    available: isAvailable,
    status: redisClient?.status || 'disconnected',
    config: {
      host: redisConfig?.host,
      port: redisConfig?.port,
      hasPassword: !!redisConfig?.password,
      hasUrl: !!redisConfig?.url,
    },
  };
}

