import { Router } from 'express';
import { AnalyzeController } from '../controllers/analyze.controller';
import { DownloadController } from '../controllers/download.controller';
import { TikTokController } from '../controllers/tiktok.controller';
import { SearchController } from '../controllers/search.controller';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();
const analyzeController = new AnalyzeController();
const downloadController = new DownloadController();
const tiktokController = new TikTokController();
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

// Search routes
router.post('/search/youtube', apiRateLimiter, (req, res) => {
  searchController.searchYouTube(req, res);
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;


