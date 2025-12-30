import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DownloadService } from '../services/download.service';
import { AnalyzeService } from '../services/analyze.service';
import { logger } from '../utils/logger';
import { downloadQueue } from '../queue';
import { jobStore } from '../services/jobStore';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { BatchDownloadRequest, BatchDownloadResponse } from '../types';
import { validateYouTubeUrls, parseUrlsFromText } from '../utils/urlValidator';

const downloadService = new DownloadService();
const analyzeService = new AnalyzeService();

export class DownloadController {
  /**
   * POST /api/download
   * Tạo download job
   */
  async createDownload(req: Request, res: Response): Promise<void> {
    try {
      const { 
        url, 
        format, 
        quality, 
        audioOnly, 
        audioFormat,
        audioBitrate,
        outputFormat, 
        downloadSubtitles, 
        downloadThumbnail, 
        downloadDescription 
      } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }
      
      // Validate audioFormat nếu audioOnly
      if (audioOnly) {
        if (!audioFormat || (audioFormat !== 'mp3' && audioFormat !== 'webm')) {
          logger.warn(`Invalid audioFormat: ${audioFormat}, defaulting to mp3`);
          // Không reject, chỉ log warning và dùng default
        }
        logger.info(`Download request: audioOnly=true, audioFormat=${audioFormat}, bitrate=${audioBitrate || 'best'}`);
      }

      // Format yt-dlp format string
      const ytdlpFormat = downloadService.formatYtdlpFormat({
        url,
        format: format || 'best',
        quality,
        audioOnly,
        audioFormat,
        audioBitrate,
        outputFormat,
      });

      const job = await downloadService.createDownloadJob({
        url,
        format: ytdlpFormat,
        quality,
        audioOnly,
        audioFormat,
        audioBitrate,
        outputFormat,
        downloadSubtitles,
        downloadThumbnail,
        downloadDescription,
      });

      res.json(job);
    } catch (error: any) {
      logger.error(`Create download error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi tạo download job' });
    }
  }

  /**
   * GET /api/download/:id/status
   * Lấy trạng thái download job
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await downloadQueue.getJob(id);

      if (!job) {
        res.status(404).json({ error: 'Job không tồn tại' });
        return;
      }

      const state = await job.getState();
      const progress = job.progress as number || 0;

      res.json({
        id: job.id,
        status: state,
        progress,
        data: job.data,
      });
    } catch (error: any) {
      logger.error(`Get status error: ${error.message}`);
      res.status(500).json({ error: 'Lỗi lấy trạng thái' });
    }
  }

  /**
   * GET /api/download/:id/file
   * Download file đã hoàn thành
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await downloadQueue.getJob(id);

      if (!job) {
        res.status(404).json({ error: 'Job không tồn tại' });
        return;
      }

      const state = await job.getState();
      if (state !== 'completed') {
        res.status(400).json({ error: 'File chưa sẵn sàng' });
        return;
      }

      const result = job.returnvalue;
      if (!result || !result.filePath) {
        res.status(404).json({ error: 'File không tồn tại' });
        return;
      }

      const filePath = result.filePath;
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File không tồn tại trên server' });
        return;
      }

      const fileName = path.basename(filePath);
      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error(`Download file error: ${err.message}`);
        }
      });
    } catch (error: any) {
      logger.error(`Download file error: ${error.message}`);
      res.status(500).json({ error: 'Lỗi tải file' });
    }
  }

  /**
   * DELETE /api/download/:id
   * Hủy download job và kill process
   */
  async cancelDownload(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Kill process nếu đang chạy (quan trọng: phải kill trước)
      const killed = jobStore.killJob(id);
      if (killed) {
        logger.info(`Killed process for job ${id}`);
      }
      
      // Cleanup job directory (jobs/<jobId>/)
      try {
        const jobDir = path.join(config.download.jobsDir, id);
        if (fs.existsSync(jobDir)) {
          fs.rmSync(jobDir, { recursive: true, force: true });
          logger.info(`Cleaned up job directory: ${jobDir}`);
        }
      } catch (error: any) {
        logger.warn(`Failed to cleanup job directory: ${error.message}`);
      }

      // Emit cancelled status qua WebSocket ngay lập tức
      const { getIO } = await import('../websocket');
      const io = getIO();
      io.to(`job-${id}`).emit('progress', {
        jobId: id,
        status: 'cancelled',
        progress: 0,
        message: 'Đã hủy download',
      });

      // Remove job khỏi queue (sau khi kill process)
      const job = await downloadQueue.getJob(id);
      if (job) {
        const state = await job.getState();
        
        if (state === 'active') {
          // Job đang được worker xử lý - không thể remove trực tiếp
          // Process đã bị kill, worker sẽ throw error và job sẽ tự fail
          // Chỉ cần log và return success
          logger.info(`Job ${id} is active, process killed. Worker will handle cleanup.`);
        } else if (state === 'waiting' || state === 'delayed') {
          // Job chưa được xử lý - có thể remove
          try {
            await job.remove();
            logger.info(`Removed job ${id} from queue`);
          } catch (removeError: any) {
            // Nếu vẫn bị lock (race condition), ignore
            if (removeError.message?.includes('locked')) {
              logger.warn(`Job ${id} is locked, will be cleaned up by worker`);
            } else {
              throw removeError;
            }
          }
        } else if (state === 'completed' || state === 'failed') {
          // Job đã hoàn thành hoặc failed - chỉ cần log
          logger.info(`Job ${id} is already ${state}`);
        }
      } else {
        logger.warn(`Job ${id} not found in queue`);
      }

      res.json({ message: 'Đã hủy job' });
    } catch (error: any) {
      logger.error(`Cancel download error: ${error.message}`);
      
      // Nếu lỗi là do job bị lock, vẫn return success vì process đã bị kill
      if (error.message?.includes('locked')) {
        logger.warn(`Job is locked but process killed, returning success`);
        res.json({ message: 'Đã hủy job (process killed)' });
      } else {
        res.status(500).json({ error: 'Lỗi hủy job' });
      }
    }
  }

  /**
   * POST /api/download/:id/pause
   * Tạm dừng download job (kill process nhưng giữ state để resume)
   */
  async pauseDownload(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Kill process nhưng không remove job
      const killed = jobStore.killJob(id);
      if (!killed) {
        res.status(404).json({ error: 'Job không tồn tại hoặc không đang chạy' });
        return;
      }

      // Update job status trong queue
      const job = await downloadQueue.getJob(id);
      if (job) {
        // Lưu job data để resume sau
        await job.updateData({ ...job.data, paused: true });
      }

      // Update status trong JobStore
      jobStore.updateStatus(id, 'paused');

      // Emit paused status qua WebSocket
      const { getIO } = await import('../websocket');
      const io = getIO();
      io.to(`job-${id}`).emit('progress', {
        jobId: id,
        status: 'paused',
        progress: job?.progress as number || 0,
        message: 'Đã tạm dừng download',
      });

      logger.info(`Paused job ${id}`);
      res.json({ message: 'Đã tạm dừng download' });
    } catch (error: any) {
      logger.error(`Pause download error: ${error.message}`);
      res.status(500).json({ error: 'Lỗi tạm dừng download' });
    }
  }

  /**
   * POST /api/download/:id/resume
   * Tiếp tục download job đã pause
   */
  async resumeDownload(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Lấy job từ queue
      const job = await downloadQueue.getJob(id);
      if (!job) {
        res.status(404).json({ error: 'Job không tồn tại' });
        return;
      }

      const jobData = job.data as any;
      
      // Kiểm tra xem có file .part để resume không
      const outputPath = jobData.outputPath;
      const basePath = outputPath.replace(/\.%\(ext\)s$/, '');
      const partFile = basePath + '.part';
      
      if (!fs.existsSync(partFile) && !fs.existsSync(basePath)) {
        res.status(400).json({ error: 'Không tìm thấy file để resume. Có thể file đã bị xóa.' });
        return;
      }

      // Tạo job mới với cùng params và resume flag
      // Sử dụng cùng outputPath để resume từ file .part
      const newJobId = uuidv4();
      const newJob = await downloadQueue.add(
        `download-${newJobId}`,
        {
          ...jobData,
          jobId: newJobId,
          resume: true, // Flag để resume
        },
        {
          jobId: newJobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      logger.info(`Resumed job ${id} as new job ${newJobId}`);

      res.json({ 
        message: 'Đã tiếp tục download',
        jobId: newJobId,
      });
    } catch (error: any) {
      logger.error(`Resume download error: ${error.message}`);
      res.status(500).json({ error: 'Lỗi tiếp tục download' });
    }
  }

  /**
   * POST /api/download/batch
   * Tạo nhiều download jobs từ nhiều URLs
   */
  async createBatchDownload(req: Request, res: Response): Promise<void> {
    try {
      const { urls, options }: BatchDownloadRequest = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ error: 'URLs là bắt buộc và phải là mảng' });
        return;
      }

      if (!options || !options.type) {
        res.status(400).json({ error: 'Options.type là bắt buộc (audio hoặc video)' });
        return;
      }

      // Validate và normalize URLs
      const { valid, invalid } = validateYouTubeUrls(urls);
      
      if (valid.length === 0) {
        res.status(400).json({ 
          error: 'Không có URL hợp lệ',
          invalidUrls: invalid.map(item => ({ url: item.url, error: item.error }))
        });
        return;
      }

      if (invalid.length > 0) {
        logger.warn(`Invalid URLs detected: ${invalid.map(item => `${item.url} (${item.error})`).join(', ')}`);
      }

      // Dùng normalized URLs (đã được validate và normalize)
      const validUrls = valid.map(item => item.normalized);

      // Tạo jobs cho từng URL
      const jobs: BatchDownloadResponse['jobs'] = [];
      const errors: Array<{ url: string; error: string }> = [];

      for (const url of validUrls) {
        try {
          const audioOnly = options.type === 'audio';
          const audioFormat = options.audioFormat || (options.format === 'mp3' ? 'mp3' : 'webm');
          const audioBitrate = options.audioBitrate || options.bitrate;

          // Format yt-dlp format string
          const ytdlpFormat = downloadService.formatYtdlpFormat({
            url,
            format: options.quality || 'best',
            quality: options.quality,
            audioOnly,
            audioFormat,
            audioBitrate,
            outputFormat: options.format,
          });

          const job = await downloadService.createDownloadJob({
            url,
            format: ytdlpFormat,
            quality: options.quality,
            audioOnly,
            audioFormat,
            audioBitrate,
            outputFormat: options.format,
            downloadSubtitles: options.downloadSubtitles,
            downloadThumbnail: options.downloadThumbnail,
          });

          jobs.push({
            jobId: job.id,
            url,
            status: job.status,
          });
        } catch (error: any) {
          logger.error(`Failed to create job for URL ${url}: ${error.message}`);
          errors.push({
            url,
            error: error.message || 'Lỗi tạo job',
          });
        }
      }

      // Log kết quả
      logger.info(`Batch download: ${jobs.length} jobs created, ${errors.length} errors`);

      res.json({
        jobs,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      logger.error(`Create batch download error: ${error.message}`);
      res.status(500).json({ error: error.message || 'Lỗi tạo batch download' });
    }
  }

  /**
   * POST /api/download/playlist
   * Tải toàn bộ playlist
   */
  async createPlaylistDownload(req: Request, res: Response): Promise<void> {
    try {
      const {
        url,
        audioOnly,
        audioFormat,
        audioBitrate,
        quality,
        downloadSubtitles,
        downloadThumbnail,
      } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }

      // Analyze playlist để lấy danh sách videos
      const playlistInfo = await analyzeService.analyzePlaylist(url);

      if (playlistInfo.videos.length === 0) {
        res.status(400).json({ error: 'Playlist trống hoặc không thể truy cập' });
        return;
      }

      // Tạo jobs cho từng video trong playlist
      const jobs: BatchDownloadResponse['jobs'] = [];
      const errors: Array<{ url: string; error: string }> = [];

      for (const video of playlistInfo.videos) {
        try {
          const ytdlpFormat = downloadService.formatYtdlpFormat({
            url: video.url,
            format: quality || 'best',
            quality,
            audioOnly: audioOnly || false,
            audioFormat,
            audioBitrate,
            outputFormat: audioOnly ? (audioFormat === 'mp3' ? 'mp3' : 'webm-opus') : 'mp4',
          });

          const job = await downloadService.createDownloadJob({
            url: video.url,
            format: ytdlpFormat,
            quality,
            audioOnly,
            audioFormat,
            audioBitrate,
            outputFormat: audioOnly ? (audioFormat === 'mp3' ? 'mp3' : 'webm-opus') : 'mp4',
            downloadSubtitles,
            downloadThumbnail,
          });

          jobs.push({
            jobId: job.id,
            url: video.url,
            status: job.status,
          });
        } catch (error: any) {
          logger.error(`Failed to create job for video ${video.id}: ${error.message}`);
          errors.push({
            url: video.url,
            error: error.message || 'Lỗi tạo job',
          });
        }
      }

      logger.info(`Playlist download: ${jobs.length} jobs created, ${errors.length} errors`);

      res.json({
        jobs,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      logger.error(`Create playlist download error: ${error.message}`);
      res.status(500).json({ error: error.message || 'Lỗi tạo playlist download' });
    }
  }
}


