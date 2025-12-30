import { Worker, Job } from 'bullmq';
import { downloadVideo } from '../utils/downloader';
import { connection } from '../queue';
import { logger } from '../utils/logger';
import { config } from '../config';
import { getIO } from '../websocket';
import { ProgressUpdate } from '../types';
// import { tiktokJobStore } from '../services/tiktok-job-store'; // Unused for now
import fs from 'fs';
// import path from 'path'; // Unused for now

interface TikTokDownloadJobData {
  jobId: string;
  url: string;
  title: string;
  author: string;
  format: string;
  outputPath: string;
  formatType: 'video' | 'audio';
  audioFormat?: 'mp3' | 'm4a';
}

/**
 * TikTok Download Worker
 * 
 * Handles TikTok-specific download jobs with:
 * - No watermark video download
 * - Proper file naming: {title} - {author}.{ext}
 * - Audio extraction and conversion
 */
export function createTikTokDownloadWorker(): Worker {
  const worker = new Worker<TikTokDownloadJobData>(
    'download-tiktok',
    async (job: Job<TikTokDownloadJobData>) => {
      const { jobId, url, format, outputPath, formatType, audioFormat, title, author } = job.data;

      logger.info(`Processing TikTok download job: ${jobId}`, {
        url,
        title,
        author,
        formatType,
        audioFormat,
      });

      const io = getIO();

      try {
        // Emit initial status
        const initialUpdate: ProgressUpdate = {
          jobId,
          status: 'downloading',
          progress: 0,
          message: 'Đang khởi tạo download TikTok...',
        };
        io.to(`job-${jobId}`).emit('progress', initialUpdate);
        job.updateProgress(0);

        // Determine expected extension
        let expectedExtension: string;
        if (formatType === 'audio') {
          expectedExtension = audioFormat === 'mp3' ? 'mp3' : 'm4a';
        } else {
          expectedExtension = 'mp4';
        }

        // Download với progress callback
        const audioOnly = formatType === 'audio';
        const { promise: downloadPromise } = await downloadVideo(url, {
          format,
          outputPath,
          audioOnly,
          audioFormat: audioFormat === 'mp3' ? 'mp3' : 'webm', // yt-dlp uses webm for opus
          onProgress: (update: ProgressUpdate) => {
            // Emit progress qua WebSocket
            io.to(`job-${jobId}`).emit('progress', {
              ...update,
              jobId,
            });
            job.updateProgress(update.progress);
          },
          expectedExtension,
          finalTitle: `${title} - ${author}`,
          jobId,
        });

        // Job metadata already stored in tiktokJobStore by service
        // Track process in jobStore for cancellation
        // (This will be done by downloadVideo if needed)

        // Wait for download to complete
        const downloadedFilePath = await downloadPromise;

        // Verify file exists
        if (!fs.existsSync(downloadedFilePath)) {
          throw new Error('File không tồn tại sau khi download');
        }

        // Emit completed status
        const completedUpdate: ProgressUpdate = {
          jobId,
          status: 'completed',
          progress: 100,
          message: 'Download hoàn thành',
        };
        io.to(`job-${jobId}`).emit('progress', completedUpdate);
        io.to(`job-${jobId}`).emit('completed', {
          jobId,
          filePath: downloadedFilePath,
          fileSize: fs.statSync(downloadedFilePath).size,
        });

        logger.info(`TikTok download job ${jobId} completed: ${downloadedFilePath}`);
      } catch (error: any) {
        logger.error(`TikTok download job ${jobId} failed: ${error}`);
        
        // Emit error
        const errorUpdate: ProgressUpdate = {
          jobId,
          status: 'error',
          progress: 0,
          message: error.message || 'Lỗi download',
        };
        io.to(`job-${jobId}`).emit('progress', errorUpdate);
        io.to(`job-${jobId}`).emit('error', {
          jobId,
          error: error.message || 'Lỗi download',
        });

        throw error;
      }
    },
    {
      connection,
      concurrency: config.download.maxConcurrent,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`TikTok job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`TikTok job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`TikTok worker error: ${err.message}`);
  });

  return worker;
}

