import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config';
import Redis from 'ioredis';

// Redis connection
// Support both connection string (REDIS_URL) and individual config (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
const connection = config.redis.url 
  ? new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
    })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined, // Handle empty string as undefined
      maxRetriesPerRequest: null,
    });

// Download Queue
export const downloadQueue = new Queue('downloads', { connection });

// TikTok Download Queue
export const tiktokDownloadQueue = new Queue('download-tiktok', { connection });

// Queue Events (để lắng nghe job events)
export const queueEvents = new QueueEvents('downloads', { connection });
export const tiktokQueueEvents = new QueueEvents('download-tiktok', { connection });

// Worker sẽ được khởi tạo trong worker/index.ts
export { connection };


