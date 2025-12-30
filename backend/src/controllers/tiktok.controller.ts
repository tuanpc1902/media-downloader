import { Request, Response } from 'express';
import { TikTokAnalyzeService } from '../services/tiktok-analyze.service';
import { TikTokDownloadService } from '../services/tiktok-download.service';
import { logger } from '../utils/logger';

const analyzeService = new TikTokAnalyzeService();
const downloadService = new TikTokDownloadService();

export class TikTokController {
  /**
   * POST /api/tiktok/analyze
   * Analyze TikTok video URL
   */
  async analyze(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }

      // Validate TikTok URL
      if (!url.includes('tiktok.com')) {
        res.status(400).json({ error: 'Chỉ hỗ trợ URL TikTok' });
        return;
      }

      const videoInfo = await analyzeService.analyze(url);
      res.json(videoInfo);
    } catch (error: any) {
      logger.error(`TikTok analyze error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi phân tích video TikTok' });
    }
  }

  /**
   * POST /api/tiktok/download
   * Create TikTok download job
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

      // Validate TikTok URL
      if (!url.includes('tiktok.com')) {
        res.status(400).json({ error: 'Chỉ hỗ trợ URL TikTok' });
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
      logger.error(`TikTok download error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi tạo download job' });
    }
  }

  /**
   * GET /api/tiktok/job/:id/status
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
   * POST /api/tiktok/job/:id/pause
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
   * POST /api/tiktok/job/:id/resume
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
   * DELETE /api/tiktok/job/:id
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
   * POST /api/tiktok/job/:id/retry
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

