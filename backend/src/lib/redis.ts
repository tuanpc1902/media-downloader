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
    client.on('ready', () => {
      logger.info('[Redis] Connected and ready');
      redisAvailable = true;
      client.ping().catch((err) => {
        logger.warn('[Redis] PING failed after ready event:', err.message);
        redisAvailable = false;
      });
    });
    
    client.on('error', (error) => {
      logger.error('[Redis] Connection error:', error.message);
      redisAvailable = false;
      // Don't throw - just mark as unavailable
      // Retry strategy will handle reconnection
    });
    
    client.on('close', () => {
      logger.warn('[Redis] Connection closed');
      redisAvailable = false;
    });
    
    client.on('reconnecting', () => {
      logger.info('[Redis] Reconnecting...');
    });
    
    // Attempt connection with retry
    try {
      await client.connect();
      
      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test connection with PING (with longer timeout for first connection)
      try {
        const result = await Promise.race([
          client.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PING timeout')), 10000)
          ),
        ]);
        
        if (result === 'PONG') {
          redisAvailable = true;
        } else {
          redisAvailable = false;
        }
      } catch (pingError: any) {
        if (client.status !== 'connecting') {
          redisAvailable = false;
        }
      }
    } catch (error: any) {
      logger.error('[Redis] Failed to connect:', error.message);
      logger.error('[Redis] Error details:', {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
      });
      redisAvailable = false;
      
      // Don't disconnect immediately - let retry strategy handle it
      // The retry strategy will attempt to reconnect automatically
      logger.info('[Redis] Retry strategy will attempt reconnection...');
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
 * Also checks if client is connecting (will be ready soon)
 * Improved logic: rely on actual client status rather than flag
 */
export function isRedisAvailable(): boolean {
  if (!redisClient) {
    return false;
  }
  
  // Check actual connection status - this is the source of truth
  const status = redisClient.status;
  
  // Status can be: 'ready', 'connecting', 'connect', 'end', 'close', 'wait', 'reconnecting'
  // We consider Redis available if status is 'ready' or 'connecting'
  // 'connecting' means it's in the process of connecting, so it will be available soon
  const isConnected = status === 'ready' || status === 'connecting' || status === 'connect';
  
  // Update redisAvailable flag to keep it in sync
  if (status === 'ready') {
    redisAvailable = true;
  } else if (status === 'end' || status === 'close') {
    redisAvailable = false;
  }
  
  // Return true if status indicates connection is ready or in progress
  // Don't rely solely on the flag as it might be out of sync
  return isConnected;
}

/**
 * Wait for Redis to be available (with timeout)
 * Useful when Redis is connecting but not ready yet
 * Will actively try to reconnect if disconnected
 */
export async function waitForRedis(timeoutMs: number = 5000): Promise<boolean> {
  if (isRedisAvailable()) {
    return true;
  }
  
  // If no client exists, try to initialize
  if (!redisClient) {
    logger.info('[Redis] No client exists in waitForRedis, attempting to initialize...');
    try {
      await initializeRedis();
      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (isRedisAvailable()) {
        return true;
      }
    } catch (e: any) {
      logger.warn('[Redis] Failed to initialize in waitForRedis:', e.message);
    }
  }
  
  if (!redisClient) {
    return false;
  }
  
  const startTime = Date.now();
  let reconnectAttempted = false;
  
  while (Date.now() - startTime < timeoutMs) {
    // Check if available now
    if (isRedisAvailable()) {
      logger.info('[Redis] Available after waiting');
      return true;
    }
    
    const status = redisClient.status;
    
    // Check if it's connecting
    if (status === 'connecting') {
      logger.info('[Redis] Status is connecting, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    
    // If disconnected or ended, try to reconnect
    if ((status === 'end' || status === 'close') && !reconnectAttempted) {
      logger.info(`[Redis] Status is ${status}, attempting to reconnect...`);
      reconnectAttempted = true;
      try {
        // Disconnect first if needed
        if (status !== 'end') {
          try {
            redisClient.disconnect();
          } catch (e) {
            // Ignore
          }
        }
        
        // Try to connect
        await redisClient.connect();
        logger.info('[Redis] Reconnect attempt completed, waiting for ready...');
        // Wait for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test with PING
        try {
          const pingResult = await Promise.race([
            redisClient.ping(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('PING timeout')), 3000)
            ),
          ]);
          
          if (pingResult === 'PONG') {
            logger.info('[Redis] PING successful after reconnect');
            redisAvailable = true;
            return true;
          }
        } catch (pingErr) {
          logger.warn('[Redis] PING failed after reconnect attempt');
        }
      } catch (e: any) {
        logger.warn('[Redis] Reconnect attempt failed:', e.message);
        // Continue waiting, retry strategy might kick in
      }
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Final check
  const finalAvailable = isRedisAvailable();
  if (!finalAvailable) {
    logger.warn(`[Redis] Still not available after ${timeoutMs}ms wait. Status: ${redisClient?.status || 'no client'}`);
  }
  
  return finalAvailable;
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
 * Manually reconnect to Redis
 * Useful when Redis becomes available after app startup
 */
export async function reconnectRedis(): Promise<{ success: boolean; message: string }> {
  if (!redisClient) {
    // No client exists, initialize from scratch
    logger.info('[Redis] No client exists, initializing...');
    await initializeRedis();
    
    // Wait a bit for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (isRedisAvailable()) {
      return { success: true, message: 'Redis connected successfully' };
    } else {
      // Check if client was created after initialization
      const status = redisClient ? (redisClient as Redis).status : 'no client';
      return { success: false, message: `Failed to initialize Redis connection. Status: ${status}` };
    }
  }

  try {
    const currentStatus = redisClient.status;
    logger.info(`[Redis] Current status: ${currentStatus}`);
    
    // If client exists but disconnected, try to reconnect
    if (currentStatus === 'end' || currentStatus === 'close') {
      logger.info('[Redis] Attempting manual reconnection...');
      
      // Disconnect first if needed
      if (currentStatus !== 'end') {
        try {
          redisClient.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      
      // Reconnect
      await redisClient.connect();
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test connection with longer timeout
      const result = await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PING timeout')), 10000)
        ),
      ]);
      
      if (result === 'PONG') {
        redisAvailable = true;
        logger.info('[Redis] Manual reconnection successful');
        return { success: true, message: 'Redis reconnected successfully' };
      } else {
        redisAvailable = false;
        return { success: false, message: `Connection test failed. Result: ${result}` };
      }
    } else if (currentStatus === 'ready') {
      // Verify it's actually working
      try {
        const pingResult = await Promise.race([
          redisClient.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PING timeout')), 5000)
          ),
        ]);
        if (pingResult === 'PONG') {
          redisAvailable = true;
          return { success: true, message: 'Redis is already connected and working' };
        }
      } catch (e) {
        // PING failed even though status is ready - try to reconnect
        logger.warn('[Redis] Status is ready but PING failed, reconnecting...');
        // Recursive call - will eventually return
        const result = await reconnectRedis();
        return result;
      }
    } else if (currentStatus === 'connecting') {
      // Wait for connection to complete
      logger.info('[Redis] Connection in progress, waiting...');
      let attempts = 0;
      while (attempts < 10 && redisClient.status !== 'ready') {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (redisClient.status === 'ready') {
        redisAvailable = true;
        return { success: true, message: 'Redis connection completed' };
      } else {
        return { success: false, message: `Connection still in progress. Status: ${redisClient.status}` };
      }
    } else {
      return { success: false, message: `Redis is in ${currentStatus} state. Please wait or check Redis server.` };
    }
  } catch (error: any) {
    logger.error('[Redis] Manual reconnection failed:', error.message);
    logger.error('[Redis] Error stack:', error.stack);
    redisAvailable = false;
    return { success: false, message: `Reconnection failed: ${error.message}` };
  }
  
  // This should never be reached, but satisfies TypeScript's control flow analysis
  return { success: false, message: 'Unexpected error in reconnectRedis' };
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

