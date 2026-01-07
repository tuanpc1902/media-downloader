import { Router } from 'express';
import { AnalyzeController } from '../controllers/analyze.controller';
import { DownloadController } from '../controllers/download.controller';
import { TikTokController } from '../controllers/tiktok.controller';
import { FacebookController } from '../controllers/facebook.controller';
import { SearchController } from '../controllers/search.controller';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();
const analyzeController = new AnalyzeController();
const downloadController = new DownloadController();
const tiktokController = new TikTokController();
const facebookController = new FacebookController();
const searchController = new SearchController();

// Analyze routes
router.post('/analyze', apiRateLimiter, (req, res) => {
  analyzeController.analyze(req, res);
});

router.post('/analyze/playlist', apiRateLimiter, (req, res) => {
  analyzeController.analyzePlaylist(req, res);
});

// Download routes
router.post('/download', apiRateLimiter, (req, res) => {
  downloadController.createDownload(req, res);
});

router.post('/download/batch', apiRateLimiter, (req, res) => {
  downloadController.createBatchDownload(req, res);
});

router.get('/download/:id/status', (req, res) => {
  downloadController.getStatus(req, res);
});

router.get('/download/:id/file', (req, res) => {
  downloadController.downloadFile(req, res);
});

router.delete('/download/:id', (req, res) => {
  downloadController.cancelDownload(req, res);
});

router.post('/download/:id/pause', (req, res) => {
  downloadController.pauseDownload(req, res);
});

router.post('/download/:id/resume', (req, res) => {
  downloadController.resumeDownload(req, res);
});

router.post('/download/playlist', apiRateLimiter, (req, res) => {
  downloadController.createPlaylistDownload(req, res);
});

// TikTok routes
router.post('/tiktok/analyze', apiRateLimiter, (req, res) => {
  tiktokController.analyze(req, res);
});

router.post('/tiktok/download', apiRateLimiter, (req, res) => {
  tiktokController.createDownload(req, res);
});

router.get('/tiktok/job/:id/status', (req, res) => {
  tiktokController.getJobStatus(req, res);
});

router.post('/tiktok/job/:id/pause', (req, res) => {
  tiktokController.pauseJob(req, res);
});

router.post('/tiktok/job/:id/resume', (req, res) => {
  tiktokController.resumeJob(req, res);
});

router.delete('/tiktok/job/:id', (req, res) => {
  tiktokController.cancelJob(req, res);
});

router.post('/tiktok/job/:id/retry', (req, res) => {
  tiktokController.retryJob(req, res);
});

// Facebook routes
router.post('/facebook/analyze', apiRateLimiter, (req, res) => {
  facebookController.analyze(req, res);
});

router.post('/facebook/download', apiRateLimiter, (req, res) => {
  facebookController.createDownload(req, res);
});

router.get('/facebook/job/:id/status', (req, res) => {
  facebookController.getJobStatus(req, res);
});

router.post('/facebook/job/:id/pause', (req, res) => {
  facebookController.pauseJob(req, res);
});

router.post('/facebook/job/:id/resume', (req, res) => {
  facebookController.resumeJob(req, res);
});

router.delete('/facebook/job/:id', (req, res) => {
  facebookController.cancelJob(req, res);
});

router.post('/facebook/job/:id/retry', (req, res) => {
  facebookController.retryJob(req, res);
});

// Search routes
router.post('/search/youtube', apiRateLimiter, (req, res) => {
  searchController.searchYouTube(req, res);
});

// Health check
router.get('/health', async (_req, res) => {
  try {
    const { checkRedisHealth, isRedisAvailable } = await import('../lib/redis');
    const redisHealth = await checkRedisHealth();
    
    res.json({
      status: 'ok',
      redis: isRedisAvailable() ? 'connected' : 'disconnected',
      redisDetails: redisHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis health check (detailed)
router.get('/health/redis', async (_req, res) => {
  try {
    const { checkRedisHealth, isRedisAvailable } = await import('../lib/redis');
    const redisHealth = await checkRedisHealth();
    res.json({
      status: isRedisAvailable() ? 'ok' : 'error',
      redis: {
        ...redisHealth.config,
        connected: redisHealth.available,
        status: redisHealth.status,
      },
      envVars: {
        REDIS_HOST: process.env.REDIS_HOST || 'NOT SET',
        REDIS_PORT: process.env.REDIS_PORT || 'NOT SET',
        REDIS_PASSWORD: process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET',
        REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT SET',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis reconnect endpoint (manual trigger)
router.post('/health/redis/reconnect', async (_req, res) => {
  try {
    const { reconnectRedis, checkRedisHealth } = await import('../lib/redis');
    const result = await reconnectRedis();
    const redisHealth = await checkRedisHealth();
    
    res.json({
      status: result.success ? 'ok' : 'error',
      message: result.message,
      redis: {
        ...redisHealth.config,
        connected: redisHealth.available,
        status: redisHealth.status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;


