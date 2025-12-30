import { Worker, Job } from 'bullmq';
import { downloadVideo } from '../utils/downloader';
import { connection } from '../queue';
import { logger } from '../utils/logger';
import { config } from '../config';
import { getIO } from '../websocket';
import { ProgressUpdate } from '../types';
import { jobStore } from '../services/jobStore';
import fs from 'fs';
import path from 'path';

interface DownloadJobData {
  jobId: string;
  url: string;
  title?: string; // Video title
  format: string;
  outputPath: string;
  outputFormat?: string;
  audioOnly?: boolean;
  audioFormat?: 'mp3' | 'webm';
  audioBitrate?: number;
  downloadSubtitles?: boolean;
  downloadThumbnail?: boolean;
  downloadDescription?: boolean;
  resume?: boolean; // Resume download từ file .part
  paused?: boolean; // Job đã bị pause
  videoDuration?: number; // Video duration (seconds) để tính convert progress
}

/**
 * Download Worker - Xử lý download jobs từ queue
 */
export function createDownloadWorker(): Worker {
  const worker = new Worker<DownloadJobData>(
    'downloads',
    async (job: Job<DownloadJobData>) => {
      const { jobId, url, format, outputPath, outputFormat, audioOnly } = job.data;

      // Log title để debug
      logger.info(`Processing download job: ${jobId}`, {
        url: job.data.url,
        title: job.data.title,
        hasTitle: !!job.data.title,
        titleIsUrl: job.data.title ? (job.data.title.includes('http://') || job.data.title.includes('https://') || job.data.title.includes('youtube.com') || job.data.title.includes('youtu.be')) : false
      });

      // Validate title trước khi pass vào downloadVideo
      let finalTitle = job.data.title;
      if (!finalTitle || finalTitle.trim().length === 0) {
        logger.warn(`Job ${jobId}: title is empty, using default`);
        finalTitle = 'video';
      } else if (finalTitle.includes('http://') || finalTitle.includes('https://') || finalTitle.includes('youtube.com') || finalTitle.includes('youtu.be')) {
        logger.error(`Job ${jobId}: title is URL: ${finalTitle}, using default`);
        finalTitle = 'video';
      }

      const io = getIO();

      try {
        // Emit status: downloading với progress 0
        // Include title nếu có
        const initialUpdate: ProgressUpdate = {
          jobId,
          status: 'downloading',
          progress: 0,
          message: 'Đang khởi tạo download...',
        };
        
        logger.info(`Emitting initial progress for job ${jobId}`, {
          title: job.data.title,
        });
        io.to(`job-${jobId}`).emit('progress', initialUpdate);
        
        const roomSize = io.sockets.adapter.rooms.get(`job-${jobId}`)?.size || 0;
        logger.info(`Job ${jobId} room has ${roomSize} client(s)`);
        
        // Update job progress ngay
        job.updateProgress(0);

        // Xác định expected extension dựa trên audioFormat
        let expectedExtension: string | undefined;
        if (audioOnly) {
          if (job.data.audioFormat === 'mp3') {
            expectedExtension = 'mp3';
          } else if (job.data.audioFormat === 'webm') {
            expectedExtension = 'webm';
          }
        } else {
          // Video: mp4 hoặc webm tùy format
          expectedExtension = 'mp4'; // Default cho video
        }
        
        logger.info(`Download job ${jobId}: format=${format}, audioOnly=${audioOnly}, audioFormat=${job.data.audioFormat}, expectedExtension=${expectedExtension}`);
        
        // Download với progress callback - nhận cả promise và process
        const { promise: downloadPromise, process } = await downloadVideo(url, {
          format,
          outputPath,
          audioOnly,
          audioFormat: job.data.audioFormat,
          audioBitrate: job.data.audioBitrate,
          downloadSubtitles: job.data.downloadSubtitles,
          downloadThumbnail: job.data.downloadThumbnail,
          resume: job.data.resume || false, // Resume nếu có flag
          expectedExtension, // Pass expected extension để validate
          finalTitle: finalTitle, // Pass title đã validate để rename file cuối cùng
          jobId, // Pass jobId để rename file cuối cùng
          videoDuration: job.data.videoDuration, // Pass duration để tính convert progress
          onProgress: (update) => {
            const progressUpdate: ProgressUpdate = {
              ...update,
              jobId,
            };
            
            // Log progress update
            logger.info(`Progress update for job ${jobId}: ${update.progress}%`, {
              speed: update.speed,
              eta: update.eta,
              status: update.status,
            });
            
            // Emit progress qua WebSocket
            io.to(`job-${jobId}`).emit('progress', progressUpdate);
            
            // Log WebSocket emit
            const roomSize = io.sockets.adapter.rooms.get(`job-${jobId}`)?.size || 0;
            logger.debug(`Emitted progress to room job-${jobId}, clients: ${roomSize}`);

            // Update job progress
            job.updateProgress(update.progress);
          },
        });

        // Track process trong JobStore để có thể cancel
        jobStore.addJob(jobId, process);

        // Đợi download hoàn thành
        const finalFilePath = await downloadPromise;

        // Check xem job có bị cancel không (process bị kill)
        const jobProcess = jobStore.getJob(jobId);
        if (jobProcess && jobProcess.status === 'cancelled') {
          logger.info(`Job ${jobId} was cancelled`);
          jobStore.removeJob(jobId);
          // Không throw error, chỉ return để job được mark là completed (nhưng thực tế là cancelled)
          return {
            success: false,
            cancelled: true,
          };
        }

        // Kiểm tra file đã tồn tại
        if (!fs.existsSync(finalFilePath)) {
          throw new Error(`File không tồn tại sau khi download: ${finalFilePath}`);
        }

        const stats = fs.statSync(finalFilePath);
        const fileSize = stats.size;

        // Emit completed
        io.to(`job-${jobId}`).emit('progress', {
          jobId,
          status: 'completed',
          progress: 100,
          phase: 'finished',
          message: 'Hoàn thành!',
        } as ProgressUpdate);

        logger.info(`Download completed: ${jobId}, file: ${finalFilePath}, size: ${fileSize} bytes`);

        // Remove từ JobStore khi hoàn thành
        jobStore.removeJob(jobId);

        return {
          success: true,
          filePath: finalFilePath,
          fileSize,
        };
      } catch (error: any) {
        // Check xem có phải do cancel không
        const jobProcess = jobStore.getJob(jobId);
        const isCancelled = jobProcess && jobProcess.status === 'cancelled';
        
        if (isCancelled) {
          logger.info(`Job ${jobId} was cancelled (process killed)`);
          // Emit cancelled thay vì error
          io.to(`job-${jobId}`).emit('progress', {
            jobId,
            status: 'cancelled',
            progress: 0,
            message: 'Đã hủy download',
          } as ProgressUpdate);
        } else {
          logger.error(`Download job ${jobId} failed: ${error.message}`);
          // Emit error
          io.to(`job-${jobId}`).emit('progress', {
            jobId,
            status: 'error',
            progress: 0,
            message: error.message || 'Lỗi không xác định',
          } as ProgressUpdate);
        }

        // Remove từ JobStore
        jobStore.removeJob(jobId);

        // Nếu là cancelled, không throw error để job không bị retry
        if (isCancelled) {
          return {
            success: false,
            cancelled: true,
          };
        }

        throw error;
      }
    },
    {
      connection,
      concurrency: config.download.maxConcurrent,
      limiter: {
        max: config.download.maxConcurrent,
        duration: 1000,
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`Worker error: ${err.message}`);
  });

  return worker;
}

