import { Request, Response } from 'express';
import { FacebookAnalyzeService } from '../services/facebook-analyze.service';
import { FacebookDownloadService } from '../services/facebook-download.service';
import { logger } from '../utils/logger';

const analyzeService = new FacebookAnalyzeService();
const downloadService = new FacebookDownloadService();

export class FacebookController {
  /**
   * POST /api/facebook/analyze
   * Analyze Facebook video/story URL
   */
  async analyze(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }

      // Validate Facebook URL
      if (!url.includes('facebook.com') && !url.includes('fb.com') && !url.includes('m.facebook.com')) {
        res.status(400).json({ error: 'Chỉ hỗ trợ URL Facebook' });
        return;
      }

      const videoInfo = await analyzeService.analyze(url);
      res.json(videoInfo);
    } catch (error: any) {
      logger.error(`Facebook analyze error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi phân tích video/story Facebook' });
    }
  }

  /**
   * POST /api/facebook/download
   * Create Facebook download job
   */
  async createDownload(req: Request, res: Response): Promise<void> {
    try {
      const { url, format, audioFormat, quality } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }

      if (!format || (format !== 'video' && format !== 'audio')) {
        res.status(400).json({ error: 'Format phải là "video" hoặc "audio"' });
        return;
      }

      // Validate Facebook URL
      if (!url.includes('facebook.com') && !url.includes('fb.com') && !url.includes('m.facebook.com')) {
        res.status(400).json({ error: 'Chỉ hỗ trợ URL Facebook' });
        return;
      }

      const job = await downloadService.createDownloadJob({
        url,
        format,
        audioFormat,
        quality,
      });

      res.json({
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
      });
    } catch (error: any) {
      logger.error(`Facebook download error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi tạo download job' });
    }
  }

  /**
   * GET /api/facebook/job/:id/status
   * Get job status
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await downloadService.getJob(id);

      if (!job) {
        res.status(404).json({ error: 'Job không tồn tại' });
        return;
      }

      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        phase: job.phase,
        speed: job.speed,
        eta: job.eta,
        downloadedBytes: job.downloadedBytes,
        totalBytes: job.totalBytes,
        filePath: job.filePath,
        error: job.error,
      });
    } catch (error: any) {
      logger.error(`Get job status error: ${error.message}`);
      res.status(500).json({ error: 'Lỗi lấy trạng thái job' });
    }
  }

  /**
   * POST /api/facebook/job/:id/pause
   * Pause download job
   */
  async pauseJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await downloadService.pauseJob(id);
      res.json({ id, status: 'paused' });
    } catch (error: any) {
      logger.error(`Pause job error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi pause job' });
    }
  }

  /**
   * POST /api/facebook/job/:id/resume
   * Resume download job
   */
  async resumeJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await downloadService.resumeJob(id);
      res.json({ id, status: 'downloading' });
    } catch (error: any) {
      logger.error(`Resume job error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi resume job' });
    }
  }

  /**
   * DELETE /api/facebook/job/:id
   * Cancel download job
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await downloadService.cancelJob(id);
      res.json({ id, status: 'cancelled' });
    } catch (error: any) {
      logger.error(`Cancel job error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi cancel job' });
    }
  }

  /**
   * POST /api/facebook/job/:id/retry
   * Retry failed job
   */
  async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await downloadService.retryJob(id);
      res.json({ id: job.id, status: job.status });
    } catch (error: any) {
      logger.error(`Retry job error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi retry job' });
    }
  }
}

