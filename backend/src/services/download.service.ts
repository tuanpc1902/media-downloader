import { v4 as uuidv4 } from 'uuid';
import { DownloadRequest, DownloadJob } from '../types';
import { downloadQueue } from '../queue';
import { logger } from '../utils/logger';
import { config } from '../config';
import { createOutputPath } from '../utils/filename';
import { analyzeVideo } from '../utils/downloader';
// import path from 'path'; // Unused for now
import fs from 'fs';

export class DownloadService {
  /**
   * Tạo download job và đưa vào queue
   */
  async createDownloadJob(request: DownloadRequest): Promise<DownloadJob> {
    const jobId = uuidv4();
    
    // Lấy title và duration từ request hoặc analyze video
    let videoTitle = request.title;
    let videoDuration: number | undefined;
    
    // Validate title: không được là URL hoặc rỗng
    const isUrl = videoTitle && (videoTitle.includes('http://') || videoTitle.includes('https://') || videoTitle.includes('youtube.com') || videoTitle.includes('youtu.be'));
    
    // Nếu không có title hoặc title là URL, analyze video để lấy cả title và duration
    if (!videoTitle || isUrl) {
      try {
        logger.info(`Analyzing video to get title and duration: ${request.url}${isUrl ? ' (title was URL, re-analyzing)' : ''}`);
        const videoInfo = await analyzeVideo(request.url);
        videoTitle = videoInfo.title;
        videoDuration = videoInfo.duration;
        
        // Validate title sau khi analyze
        if (!videoTitle || videoTitle.trim().length === 0) {
          logger.warn(`Analyzed title is empty, using default`);
          videoTitle = 'video';
        } else if (videoTitle.includes('http://') || videoTitle.includes('https://')) {
          logger.warn(`Analyzed title appears to be URL: ${videoTitle}, using default`);
          videoTitle = 'video';
        }
      } catch (error: any) {
        logger.warn(`Failed to analyze video: ${error.message}, using default`);
        videoTitle = 'video';
      }
    }
    
    // Final validation: đảm bảo title không phải URL
    if (videoTitle && (videoTitle.includes('http://') || videoTitle.includes('https://') || videoTitle.includes('youtube.com') || videoTitle.includes('youtu.be'))) {
      logger.warn(`Title is still URL after processing: ${videoTitle}, using default`);
      videoTitle = 'video';
    }
    
    // Log final title để debug
    logger.info(`Final title for job ${jobId}: "${videoTitle}" (URL: ${request.url})`);
    
    // Tạo output path với template yt-dlp chuẩn
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

    const job: DownloadJob = {
      id: jobId,
      url: request.url,
      title: videoTitle, // Lưu title vào job
      status: 'pending',
      format: request.format || 'best',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Format yt-dlp format string
    const ytdlpFormat = this.formatYtdlpFormat(request);

    // Thêm job vào queue
    await downloadQueue.add(
      `download-${jobId}`,
      {
        jobId,
        url: request.url,
        title: videoTitle, // Pass title vào job data (đã validate)
        format: ytdlpFormat,
        outputPath,
        outputFormat: request.outputFormat,
        audioOnly: request.audioOnly,
        audioFormat: request.audioFormat,
        audioBitrate: request.audioBitrate,
        downloadSubtitles: request.downloadSubtitles,
        downloadThumbnail: request.downloadThumbnail,
        downloadDescription: request.downloadDescription,
        videoDuration, // Pass duration để tính convert progress
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 1000,
        },
      }
    );

    logger.info(`Created download job: ${jobId} for URL: ${request.url}`);
    return job;
  }

  /**
   * Lấy extension từ output format
   */
  // private getExtension(format: string): string { // Unused for now
  //   const formatMap: Record<string, string> = {
  //     'mp4': 'mp4',
  //     'webm': 'webm',
  //     'mp3': 'mp3',
  //     'webm-opus': 'webm',
  //   };
  //   return formatMap[format] || 'mp4';
  // }

  /**
   * Format yt-dlp format string
   * Trả về format string cho yt-dlp --format option
   */
  formatYtdlpFormat(request: DownloadRequest): string {
    if (request.audioOnly) {
      // Audio only - dùng audioFormat mới hoặc fallback outputFormat
      const audioFormat = request.audioFormat || 
        (request.outputFormat === 'mp3' ? 'mp3' : 
         request.outputFormat === 'webm-opus' ? 'webm' : 'mp3');
      
      logger.info(`Format request: audioOnly=true, audioFormat=${audioFormat}, bitrate=${request.audioBitrate || 'best'}`);
      
      if (audioFormat === 'mp3') {
        // MP3: yt-dlp sẽ extract audio và convert sang mp3
        // Format string không quan trọng, sẽ dùng --extract-audio
        // Nhưng vẫn cần format string để yt-dlp chọn bestaudio
        return 'bestaudio/best';
      } else if (audioFormat === 'webm') {
        // WebM Opus: Lấy bestaudio có ext=webm, KHÔNG fallback
        // Format: ba[ext=webm] - chỉ lấy webm
        // Nếu không có webm, yt-dlp sẽ fail rõ ràng thay vì fallback
        // KHÔNG dùng /ba/worst vì có thể fallback về format khác
        return 'ba[ext=webm]'; // Chỉ lấy webm, không fallback
      } else {
        // Fallback: MP3
        logger.warn(`Unknown audio format: ${audioFormat}, defaulting to MP3`);
        return 'bestaudio/best';
      }
    }

    // Video + Audio
    if (request.quality && request.quality !== 'best') {
      // Specific quality: bestvideo[height<=720]+bestaudio/best[height<=720]
      const height = request.quality.replace('p', '');
      return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
    }

    // Best quality
    return 'bestvideo+bestaudio/best';
  }

  /**
   * Convert audio bitrate (kbps) sang yt-dlp audio quality value
   * yt-dlp --audio-quality: 0 (best) to 9 (worst)
   * Hoặc có thể dùng bitrate trực tiếp với ffmpeg
   */
  convertBitrateToQuality(bitrate?: number): string {
    if (!bitrate) return '0'; // Best quality
    
    // Map bitrate to quality (approximate)
    // 192 kbps = quality 0-2 (best)
    // 128 kbps = quality 3-5 (medium)
    // 96 kbps = quality 6-7 (low)
    // 64 kbps = quality 8-9 (lowest)
    if (bitrate >= 192) return '0';
    if (bitrate >= 128) return '3';
    if (bitrate >= 96) return '6';
    return '9';
  }
}



