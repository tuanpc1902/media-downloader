import { v4 as uuidv4 } from 'uuid';
import { tiktokDownloadQueue } from '../queue';
import { logger } from '../utils/logger';
// import { config } from '../config'; // Unused for now
import { createOutputPath } from '../utils/filename';
import { analyzeVideo } from '../utils/downloader';
import { tiktokJobStore } from './tiktok-job-store';
import path from 'path';
import fs from 'fs';

export interface TikTokDownloadRequest {
  url: string;
  format: 'video' | 'audio';
  audioFormat?: 'mp3' | 'm4a';
  quality?: 'best' | '720p' | '480p' | '360p';
}

export interface TikTokDownloadJob {
  id: string;
  url: string;
  title: string;
  author: string;
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
 * TikTok-specific download service
 * 
 * Features:
 * - TikTok-optimized format selection (no watermark)
 * - Proper file naming: {title} - {author}.{ext}
 * - Duplicate file handling
 */
export class TikTokDownloadService {
  /**
   * Create TikTok download job
   */
  async createDownloadJob(request: TikTokDownloadRequest): Promise<TikTokDownloadJob> {
    const jobId = uuidv4();
    
    // Normalize URL: Remove query parameters
    const normalizedUrl = this.normalizeTikTokUrl(request.url);
    
    // Analyze video để lấy title và author
    let videoTitle = 'video';
    let videoAuthor = 'unknown';
    
    try {
      logger.info(`Analyzing TikTok video to get metadata: ${normalizedUrl}`);
      const videoInfo = await analyzeVideo(normalizedUrl);
      videoTitle = videoInfo.title || 'video';
      videoAuthor = videoInfo.channel || 'unknown';
      
      // Validate title
      if (!videoTitle || videoTitle.trim().length === 0 || videoTitle.includes('http')) {
        videoTitle = 'video';
      }
    } catch (error: any) {
      logger.warn(`Failed to analyze video: ${error.message}, using defaults`);
    }
    
    // Format yt-dlp format string cho TikTok (no watermark)
    const ytdlpFormat = this.formatYtdlpFormat(request);
    
    // Create output path
    const outputDir = createOutputPath(jobId);
    const extension = request.format === 'video' ? 'mp4' : (request.audioFormat === 'mp3' ? 'mp3' : 'm4a');
    const filename = this.createFilename(videoTitle, videoAuthor, extension, outputDir);
    const outputPath = path.join(outputDir, `${filename}.${extension}`);
    
    // Create job
    const job: TikTokDownloadJob = {
      id: jobId,
      url: normalizedUrl, // Use normalized URL
      title: videoTitle,
      author: videoAuthor,
      status: 'pending',
      format: ytdlpFormat,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Store job metadata
    tiktokJobStore.set(jobId, {
      jobId,
      url: normalizedUrl, // Use normalized URL
      format: ytdlpFormat,
      outputPath,
      title: videoTitle,
      author: videoAuthor,
      formatType: request.format,
      audioFormat: request.audioFormat,
    });
    
    // Enqueue job
    await tiktokDownloadQueue.add('download-tiktok', {
      jobId,
      url: normalizedUrl, // Use normalized URL
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
    
    logger.info(`Created TikTok download job: ${jobId} for ${videoTitle}`);
    return job;
  }

  /**
   * Normalize TikTok URL by removing unnecessary query parameters
   */
  private normalizeTikTokUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove all query parameters - yt-dlp doesn't need them
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Format yt-dlp format string cho TikTok (no watermark)
   */
  private formatYtdlpFormat(request: TikTokDownloadRequest): string {
    if (request.format === 'audio') {
      // Audio only: bestaudio
      if (request.audioFormat === 'mp3') {
        return 'bestaudio[ext=m4a]/bestaudio'; // Will convert to MP3 with ffmpeg
      } else {
        return 'bestaudio[ext=m4a]/bestaudio';
      }
    } else {
      // Video: best quality, no watermark
      // TikTok format: bestvideo+bestaudio hoặc best
      if (request.quality === 'best') {
        return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
      } else {
        // Quality-specific format
        const height = request.quality === '720p' ? 720 : request.quality === '480p' ? 480 : 360;
        return `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`;
      }
    }
  }

  /**
   * Create filename theo template: {title} - {author}.{ext}
   * Handle duplicates: {title} - {author} (1).{ext}
   */
  private createFilename(title: string, author: string, extension: string, outputDir: string): string {
    // Sanitize title and author
    const sanitize = (str: string): string => {
      return str
        .replace(/[<>:"/\\|?*\x00]/g, '') // Remove invalid chars
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Limit length
    };
    
    const safeTitle = sanitize(title) || 'video';
    const safeAuthor = sanitize(author) || 'unknown';
    
    let filename = `${safeTitle} - ${safeAuthor}`;
    let counter = 0;
    let fullPath = path.join(outputDir, `${filename}.${extension}`);
    
    // Check for duplicates
    while (fs.existsSync(fullPath)) {
      counter++;
      filename = `${safeTitle} - ${safeAuthor} (${counter})`;
      fullPath = path.join(outputDir, `${filename}.${extension}`);
    }
    
    return filename;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<TikTokDownloadJob | null> {
    // Get job metadata from store
    const jobData = tiktokJobStore.get(jobId);
    if (!jobData) return null;
    
    // Convert to TikTokDownloadJob format
    // This is a simplified version - in production, should query from database
    return {
      id: jobId,
      url: jobData.url,
      title: jobData.title || 'video',
      author: jobData.author || 'unknown',
      status: 'pending', // Should get from actual job status
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
    // Implementation: pause the download process
    // This requires tracking active processes
    logger.info(`Pausing job: ${jobId}`);
    // TODO: Implement pause logic
  }

  /**
   * Resume job
   */
  async resumeJob(jobId: string): Promise<void> {
    // Implementation: resume the download process
    logger.info(`Resuming job: ${jobId}`);
    // TODO: Implement resume logic
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    // Implementation: cancel and cleanup
    logger.info(`Cancelling job: ${jobId}`);
    // TODO: Implement cancel logic with cleanup
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<TikTokDownloadJob> {
    // Implementation: retry the job
    logger.info(`Retrying job: ${jobId}`);
    // TODO: Implement retry logic
    throw new Error('Retry not implemented yet');
  }
}

