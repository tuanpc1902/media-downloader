import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '../lib/redis';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

/**
 * Get or create Redis connection for BullMQ
 * This creates a connection instance even if Redis is not yet connected
 * BullMQ will handle reconnection automatically
 */
function getOrCreateConnection(): Redis {
  let connection = getRedisConnection();
  
  // If no connection exists yet, create one
  // This allows queues to be created even before Redis is fully connected
  if (!connection) {
    // Create a new connection with retry strategy
    // This will connect when Redis becomes available
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (process.env.REDIS_URL) {
      connection = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 50, 3000),
        lazyConnect: true,
      });
    } else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      connection = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== ''
          ? process.env.REDIS_PASSWORD
          : undefined,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 50, 3000),
        lazyConnect: true,
      });
    } else if (!isProduction) {
      // Development fallback
      connection = new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 50, 3000),
        lazyConnect: true,
      });
    } else {
      // Production: no config = create a dummy connection that will fail gracefully
      // This allows the app to start, but queues won't work
      logger.warn('[Queue] No Redis config - creating queues with dummy connection (will not work until Redis is configured)');
      connection = new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        retryStrategy: () => null, // Don't retry
        lazyConnect: true,
        enableOfflineQueue: false,
      });
    }
    
    // Try to connect (non-blocking)
    connection.connect().catch(() => {
      // Ignore - will retry automatically
    });
  }
  
  return connection;
}

// Create connection (may not be connected yet, but BullMQ will handle it)
const connection = getOrCreateConnection();

// Create queues with connection
// BullMQ will queue operations until Redis is available
export const downloadQueue = new Queue('downloads', { connection });
export const tiktokDownloadQueue = new Queue('download-tiktok', { connection });
export const queueEvents = new QueueEvents('downloads', { connection });
export const tiktokQueueEvents = new QueueEvents('download-tiktok', { connection });

// Log status
if (isRedisAvailable()) {
  logger.info('[Queue] Queues initialized - Redis connected');
} else {
  logger.warn('[Queue] Queues initialized - Redis not yet connected (will retry automatically)');
}

// Export connection
export { connection };


