import { v4 as uuidv4 } from 'uuid';
import { facebookDownloadQueue } from '../queue';
import { logger } from '../utils/logger';
import { config } from '../config';
import { createOutputPath } from '../utils/filename';
import { analyzeVideo } from '../utils/downloader';
import { facebookJobStore } from './facebook-job-store';
import { jobStore } from './jobStore';
import path from 'path';
import fs from 'fs';

export interface FacebookDownloadRequest {
  url: string;
  format: 'video' | 'audio';
  type?: 'video' | 'story'; // Auto-detected if not provided
  audioFormat?: 'mp3' | 'm4a';
  quality?: 'best' | '720p' | '480p' | '360p';
}

export interface FacebookDownloadJob {
  id: string;
  url: string;
  title: string;
  author?: string;
  status: 'pending' | 'downloading' | 'converting' | 'completed' | 'error' | 'cancelled' | 'paused';
  format: string;
  progress: number;
  phase?: 'downloading' | 'converting' | 'completed';
  speed?: string;
  eta?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  filePath?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Facebook-specific download service
 * 
 * Features:
 * - Facebook video and story download
 * - Proper file naming: {title} - {author}.{ext}
 * - Duplicate file handling
 */
export class FacebookDownloadService {
  /**
   * Create Facebook download job
   */
  async createDownloadJob(request: FacebookDownloadRequest): Promise<FacebookDownloadJob> {
    const jobId = uuidv4();
    
    // Normalize URL
    const normalizedUrl = this.normalizeFacebookUrl(request.url);
    
    // Analyze video/story để lấy title và author
    let videoTitle = 'video';
    let videoAuthor: string | undefined;
    let contentType: 'video' | 'story' = request.type || 'video';
    
    try {
      logger.info(`Analyzing Facebook content to get metadata: ${normalizedUrl}`);
      const videoInfo = await analyzeVideo(normalizedUrl);
      videoTitle = videoInfo.title || 'video';
      videoAuthor = videoInfo.channel || undefined;
      
      // Detect content type from URL
      if (!request.type) {
        contentType = normalizedUrl.includes('/stories/') || normalizedUrl.includes('story_fbid') 
          ? 'story' 
          : 'video';
      }
      
      // Validate title
      if (!videoTitle || videoTitle.trim().length === 0 || videoTitle.includes('http')) {
        videoTitle = contentType === 'story' ? 'story' : 'video';
      }
    } catch (error: any) {
      logger.warn(`Failed to analyze content: ${error.message}, using defaults`);
    }
    
    // Format yt-dlp format string cho Facebook
    const ytdlpFormat = this.formatYtdlpFormat(request);
    
    // Create output path với template yt-dlp chuẩn
    // KHÔNG dùng title trong output path để tránh lỗi "Fixed output name"
    // yt-dlp sẽ tự quản lý file tạm, sau đó rename sang tên mong muốn
    const outputPath = createOutputPath(jobId);
    
    // Đảm bảo thư mục tồn tại
    // KHÔNG xóa file cũ - chỉ tạo thư mục nếu chưa có
    if (!fs.existsSync(config.download.dir)) {
      fs.mkdirSync(config.download.dir, { recursive: true });
    }
    if (!fs.existsSync(config.download.completedDir)) {
      fs.mkdirSync(config.download.completedDir, { recursive: true });
    }
    if (!fs.existsSync(config.download.jobsDir)) {
      fs.mkdirSync(config.download.jobsDir, { recursive: true });
    }
    
    // Create job
    const job: FacebookDownloadJob = {
      id: jobId,
      url: normalizedUrl,
      title: videoTitle,
      author: videoAuthor,
      status: 'pending',
      format: ytdlpFormat,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Store job metadata
    facebookJobStore.set(jobId, {
      jobId,
      url: normalizedUrl,
      format: ytdlpFormat,
      outputPath,
      title: videoTitle,
      author: videoAuthor,
      formatType: request.format,
      audioFormat: request.audioFormat,
    });
    
    // Enqueue job
    const { isRedisAvailable, waitForRedis } = await import('../lib/redis');
    
    if (!isRedisAvailable()) {
      logger.info('[Redis] Not immediately available, waiting for connection...');
      const connected = await waitForRedis(3000);
      
      if (!connected) {
        logger.error('[Redis] Still not available after waiting');
        throw new Error('Redis is not available. Download queue is disabled. Please check Redis connection. You can try POST /api/health/redis/reconnect to reconnect.');
      }
      
      logger.info('[Redis] Connection established after waiting');
    }
    
    await facebookDownloadQueue.add('download-facebook', {
      jobId,
      url: normalizedUrl,
      format: ytdlpFormat,
      outputPath,
      title: videoTitle,
      author: videoAuthor,
      formatType: request.format,
      audioFormat: request.audioFormat,
    }, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    logger.info(`Created Facebook download job: ${jobId} for ${videoTitle}`);
    return job;
  }

  /**
   * Normalize Facebook URL by removing unnecessary query parameters
   */
  private normalizeFacebookUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep essential params only
      const essentialParams = ['v', 'story_fbid', 'id'];
      const newSearchParams = new URLSearchParams();
      
      urlObj.searchParams.forEach((value, key) => {
        if (essentialParams.includes(key)) {
          newSearchParams.set(key, value);
        }
      });
      
      urlObj.search = newSearchParams.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Format yt-dlp format string cho Facebook
   * Sử dụng format đơn giản với nhiều fallback options để đảm bảo luôn có format để download
   * Facebook thường không có nhiều format options, nên dùng format đơn giản hơn
   */
  private formatYtdlpFormat(request: FacebookDownloadRequest): string {
    if (request.format === 'audio') {
      // Audio only: format đơn giản với fallback
      // Không yêu cầu extension cụ thể vì Facebook có thể có nhiều format khác nhau
      return 'bestaudio/best';
    } else {
      // Video: format đơn giản với fallback
      if (request.quality === 'best') {
        // Best quality: thử merge video+audio, sau đó fallback sang best single file
        return 'bestvideo+bestaudio/best';
      } else {
        const height = request.quality === '720p' ? 720 : request.quality === '480p' ? 480 : 360;
        // Specific quality: thử với height limit, sau đó fallback sang best available
        return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/bestvideo+bestaudio/best`;
      }
    }
  }


  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<FacebookDownloadJob | null> {
    const jobData = facebookJobStore.get(jobId);
    if (!jobData) return null;
    
    return {
      id: jobId,
      url: jobData.url,
      title: jobData.title || 'video',
      author: jobData.author,
      status: 'pending',
      format: jobData.format,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Pause job
   */
  async pauseJob(jobId: string): Promise<void> {
    const killed = jobStore.killJob(jobId);
    if (killed) {
      jobStore.updateStatus(jobId, 'paused');
      logger.info(`Paused job: ${jobId}`);
    } else {
      throw new Error('Job không tồn tại hoặc không đang chạy');
    }
  }

  /**
   * Resume job
   */
  async resumeJob(jobId: string): Promise<void> {
    const jobData = facebookJobStore.get(jobId);
    if (!jobData) {
      throw new Error('Job không tồn tại');
    }
    
    const { isRedisAvailable } = await import('../lib/redis');
    if (!isRedisAvailable()) {
      throw new Error('Redis is not available. Download queue is disabled.');
    }
    
    await facebookDownloadQueue.add(
      `facebook-${jobId}`,
      jobData,
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
    
    logger.info(`Resumed job: ${jobId}`);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    const killed = jobStore.killJob(jobId);
    
    try {
      const jobDir = path.join(config.download.jobsDir, jobId);
      if (fs.existsSync(jobDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
        logger.info(`Cleaned up job directory: ${jobDir}`);
      }
    } catch (error: any) {
      logger.warn(`Failed to cleanup job directory: ${error.message}`);
    }
    
    facebookJobStore.remove(jobId);
    jobStore.removeJob(jobId);
    
    if (!killed) {
      logger.warn(`Job ${jobId} was not running, but cleaned up`);
    }
    
    logger.info(`Cancelled job: ${jobId}`);
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<FacebookDownloadJob> {
    const jobData = facebookJobStore.get(jobId);
    if (!jobData) {
      throw new Error('Job không tồn tại');
    }
    
    const { isRedisAvailable } = await import('../lib/redis');
    if (!isRedisAvailable()) {
      throw new Error('Redis is not available. Download queue is disabled.');
    }
    
    const newJobId = uuidv4();
    await facebookDownloadQueue.add(
      `facebook-${newJobId}`,
      { ...jobData, jobId: newJobId },
      {
        jobId: newJobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
    
    logger.info(`Retried job ${jobId} as new job ${newJobId}`);
    
    return {
      id: newJobId,
      url: jobData.url,
      title: jobData.title,
      author: jobData.author,
      status: 'pending',
      format: jobData.format,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

