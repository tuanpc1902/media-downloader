import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './utils/logger';
import { checkDependencies } from './utils/checkDependencies';
import { initializeRedis, isRedisAvailable, disconnectRedis } from './lib/redis';
import { initializeWebSocket } from './websocket';
import { createDownloadWorker } from './workers/download.worker';
import { createTikTokDownloadWorker } from './workers/tiktok-download.worker';
import { createFacebookDownloadWorker } from './workers/facebook-download.worker';
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

// Bootstrap application
async function bootstrap() {
  try {
    // Step 1: Check dependencies (yt-dlp, ffmpeg)
    // This can still fail and block startup if critical dependencies are missing
    await checkDependencies();
    logger.info('✅ Dependencies check passed');

    // Step 2: Initialize Redis (non-blocking, graceful degradation)
    // Redis failure will NOT crash the server
    await initializeRedis();
    
    if (isRedisAvailable()) {
      logger.info('✅ Redis connected - queue features enabled');
    } else {
      logger.warn('⚠️  Redis unavailable - running without queue features');
      logger.warn('   Download queue and workers will not function until Redis is available');
      logger.warn('   API endpoints will still work, but job processing is disabled');
    }

    // Step 3: Initialize WebSocket (always available)
    initializeWebSocket(httpServer);
    logger.info('✅ WebSocket initialized');

    // Step 4: Start workers (only if Redis is available)
    let downloadWorker: ReturnType<typeof createDownloadWorker> | null = null;
    let tiktokWorker: ReturnType<typeof createTikTokDownloadWorker> | null = null;
    let facebookWorker: ReturnType<typeof createFacebookDownloadWorker> | null = null;
    
    if (isRedisAvailable()) {
      try {
        downloadWorker = createDownloadWorker();
        logger.info('✅ Download worker started');
        
        tiktokWorker = createTikTokDownloadWorker();
        logger.info('✅ TikTok download worker started');
        
        facebookWorker = createFacebookDownloadWorker();
        logger.info('✅ Facebook download worker started');
      } catch (error: any) {
        logger.error('Failed to start workers:', error.message);
        // Continue anyway - workers are optional if Redis fails later
      }
    } else {
      logger.warn('⚠️  Workers not started - Redis unavailable');
    }

    // Step 5: Graceful shutdown handler
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      
      // Close workers
      if (downloadWorker) {
        try {
          await downloadWorker.close();
        } catch (error: any) {
          logger.error('Error closing download worker:', error.message);
        }
      }
      
      if (tiktokWorker) {
        try {
          await tiktokWorker.close();
        } catch (error: any) {
          logger.error('Error closing TikTok worker:', error.message);
        }
      }
      
      if (facebookWorker) {
        try {
          await facebookWorker.close();
        } catch (error: any) {
          logger.error('Error closing Facebook worker:', error.message);
        }
      }
      
      // Disconnect Redis
      await disconnectRedis();
      
      // Close HTTP server
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    // Step 6: Start HTTP server (always starts, regardless of Redis)
    const PORT = config.server.port;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📦 Environment: ${config.server.env}`);
      logger.info(`🔌 Redis: ${isRedisAvailable() ? 'Connected' : 'Unavailable'}`);
      logger.info(`🌐 Frontend URL: ${config.server.frontendUrl}`);
    });
    
  } catch (error: any) {
    // Only critical errors (like missing yt-dlp) should crash the server
    logger.error('Failed to start server:', {
      message: error.message,
      stack: error.stack,
    });
    console.error('\n❌ Failed to start server:', error.message);
    
    if (error.message.includes('yt-dlp')) {
      console.error('\n💡 Solution: Make sure yt-dlp is installed or set YTDLP_PATH in .env');
    }
    
    // Redis errors should NOT crash the server anymore
    // But log them for debugging
    if (error.message.includes('Redis') || error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Redis connection failed, but server will continue without Redis');
      console.error('   Queue features will be disabled until Redis is available');
      console.error('   Check /api/health endpoint for Redis status');
    }
    
    // Only exit if it's a critical error (not Redis)
    if (!error.message.includes('Redis') && !error.message.includes('ECONNREFUSED')) {
      process.exit(1);
    }
  }
}

// Start the application
bootstrap();


