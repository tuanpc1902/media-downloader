import { Worker, Job } from 'bullmq';
import { downloadVideo } from '../utils/downloader';
import { connection } from '../queue';
import { logger } from '../utils/logger';
import { config } from '../config';
import { getIO } from '../websocket';
import { ProgressUpdate } from '../types';
import fs from 'fs';

interface FacebookDownloadJobData {
  jobId: string;
  url: string;
  title: string;
  author?: string;
  format: string;
  outputPath: string;
  formatType: 'video' | 'audio';
  audioFormat?: 'mp3' | 'm4a';
}

/**
 * Facebook Download Worker
 * 
 * Handles Facebook-specific download jobs with:
 * - Video and story download
 * - Proper file naming: {title} - {author}.{ext}
 * - Audio extraction and conversion
 */
export function createFacebookDownloadWorker(): Worker {
  const worker = new Worker<FacebookDownloadJobData>(
    'download-facebook',
    async (job: Job<FacebookDownloadJobData>) => {
      const { jobId, url, format, outputPath, formatType, audioFormat, title, author } = job.data;

      logger.info(`Processing Facebook download job: ${jobId}`, {
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
          message: 'Đang khởi tạo download Facebook...',
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
        let downloadFormat = format;
        let downloadedFilePath: string;
        
        try {
          const { promise: downloadPromise } = await downloadVideo(url, {
            format: downloadFormat,
            outputPath,
            audioOnly,
            audioFormat: audioFormat === 'mp3' ? 'mp3' : 'webm',
            onProgress: (update: ProgressUpdate) => {
              // Emit progress qua WebSocket
              io.to(`job-${jobId}`).emit('progress', {
                ...update,
                jobId,
              });
              job.updateProgress(update.progress);
            },
            expectedExtension,
            finalTitle: author ? `${title} - ${author}` : title,
            jobId,
          });

          // Wait for download to complete
          downloadedFilePath = await downloadPromise;
        } catch (formatError: any) {
          // Nếu lỗi do format không có sẵn, thử lại với format đơn giản hơn
          const errorMessage = (formatError.message || formatError.toString() || '').toLowerCase();
          const originalError = formatError.message || formatError.toString() || '';
          
          logger.warn(`Facebook download error caught: ${originalError}`, {
            jobId,
            format: downloadFormat,
            formatType,
          });
          
          const isFormatError = 
            errorMessage.includes('requested format is not available') ||
            errorMessage.includes('format is not available') ||
            errorMessage.includes('no video formats found') ||
            errorMessage.includes('no formats found') ||
            errorMessage.includes('requested format') ||
            (errorMessage.includes('[facebook]') && errorMessage.includes('format')) ||
            (errorMessage.includes('facebook') && errorMessage.includes('format')) ||
            errorMessage.includes('extractorerror') ||
            (errorMessage.includes('download failed') && errorMessage.includes('format'));
            
          if (isFormatError) {
            logger.warn(`Format ${downloadFormat} not available, retrying with simpler format`, {
              jobId,
              originalFormat: downloadFormat,
              errorMessage: originalError,
            });
            
            // Emit warning
            io.to(`job-${jobId}`).emit('progress', {
              jobId,
              status: 'downloading',
              progress: 0,
              message: 'Format yêu cầu không có sẵn, đang thử format khác...',
            });
            
            // Fallback format đơn giản hơn
            if (formatType === 'audio') {
              downloadFormat = 'bestaudio/best';
            } else {
              downloadFormat = 'bestvideo+bestaudio/best';
            }
            
            // Retry với format đơn giản hơn
            const { promise: downloadPromise } = await downloadVideo(url, {
              format: downloadFormat,
              outputPath,
              audioOnly,
              audioFormat: audioFormat === 'mp3' ? 'mp3' : 'webm',
              onProgress: (update: ProgressUpdate) => {
                io.to(`job-${jobId}`).emit('progress', {
                  ...update,
                  jobId,
                });
                job.updateProgress(update.progress);
              },
              expectedExtension,
              finalTitle: author ? `${title} - ${author}` : title,
              jobId,
            });
            
            downloadedFilePath = await downloadPromise;
          } else {
            // Nếu không phải lỗi format, throw lại
            throw formatError;
          }
        }

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

        logger.info(`Facebook download job ${jobId} completed: ${downloadedFilePath}`);
      } catch (error: any) {
        logger.error(`Facebook download job ${jobId} failed: ${error}`);
        
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
    logger.info(`Facebook job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Facebook job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`Facebook worker error: ${err.message}`);
  });

  return worker;
}

