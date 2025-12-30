import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './utils/logger';
import { checkDependencies } from './utils/checkDependencies';
import { checkRedis } from './utils/checkRedis';
import { initializeWebSocket } from './websocket';
import { createDownloadWorker } from './workers/download.worker';
import { createTikTokDownloadWorker } from './workers/tiktok-download.worker';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.server.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Check dependencies and Redis before starting
Promise.all([
  checkDependencies(),
  checkRedis().then((available) => {
    if (!available) {
      const redisInfo = config.redis.url 
        ? `Redis URL: ${config.redis.url.replace(/:[^:@]+@/, ':****@')}` // Hide password in URL
        : `Redis at ${config.redis.host}:${config.redis.port}`;
      throw new Error(
        `Redis connection failed. Please make sure Redis is running at ${redisInfo}. ` +
        `Check environment variables: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (or REDIS_URL)`
      );
    }
  }),
])
  .then(() => {
    // Initialize WebSocket
    initializeWebSocket(httpServer);

    // Start workers
    const downloadWorker = createDownloadWorker();
    logger.info('Download worker started');
    
    const tiktokWorker = createTikTokDownloadWorker();
    logger.info('TikTok download worker started');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await Promise.all([
        downloadWorker.close(),
        tiktokWorker.close(),
      ]);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    // Start server
    const PORT = config.server.port;
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.server.env}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server:', {
      message: error.message,
      stack: error.stack,
    });
    console.error('\n❌ Failed to start server:', error.message);
    if (error.message.includes('yt-dlp')) {
      console.error('\n💡 Solution: Make sure yt-dlp is installed or set YTDLP_PATH in .env');
    }
    if (error.message.includes('Redis') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solution: Make sure Redis is running. Start Redis with:');
      console.error('   Windows: docker run -d -p 6379:6379 redis');
      console.error('   Or install and start Redis service');
    }
    process.exit(1);
  });


