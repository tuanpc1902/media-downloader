import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '../config';
import Redis from 'ioredis';

// Redis connection
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
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


