import { analyzeVideo } from '../utils/downloader';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface TikTokVideoInfo {
  id: string;
  title: string;
  author: string;
  authorId: string;
  thumbnail: string;
  duration: number;
  viewCount?: number;
  likeCount?: number;
  isPublic: boolean;
  formats: Array<{
    formatId: string;
    ext: string;
    resolution?: string;
    filesize?: number;
    vcodec?: string;
    acodec?: string;
  }>;
  estimatedSize: number;
}

/**
 * TikTok-specific analyze service
 * 
 * Features:
 * - Validate TikTok URLs only
 * - Check if video is public
 * - Extract TikTok-specific metadata
 * - Format response for TikTok UI
 */
export class TikTokAnalyzeService {
  /**
   * Analyze TikTok video URL
   */
  async analyze(url: string): Promise<TikTokVideoInfo> {
    try {
      // Validate TikTok URL
      this.validateTikTokUrl(url);

      // Normalize URL: Remove query parameters that might cause issues
      // TikTok URLs often have ?is_from_webapp=1&sender_device=pc which yt-dlp doesn't need
      const normalizedUrl = this.normalizeTikTokUrl(url);

      // Analyze với yt-dlp (dùng normalized URL)
      const videoInfo = await analyzeVideo(normalizedUrl);

      // Check if video is accessible (public)
      // yt-dlp will fail if video is private, so if we get here, it's public
      const isPublic = true; // If analyzeVideo succeeds, video is accessible

      // Extract TikTok-specific metadata
      const tiktokInfo: TikTokVideoInfo = {
        id: videoInfo.id,
        title: videoInfo.title || 'Untitled',
        author: videoInfo.channel || 'Unknown',
        authorId: videoInfo.channelId || videoInfo.id,
        thumbnail: videoInfo.thumbnail || '',
        duration: videoInfo.duration || 0,
        viewCount: videoInfo.viewCount,
        likeCount: undefined, // yt-dlp may not provide this
        isPublic,
        formats: videoInfo.formats.map(f => ({
          formatId: f.formatId,
          ext: f.ext,
          resolution: f.resolution,
          filesize: f.filesize,
          vcodec: f.vcodec,
          acodec: f.acodec,
        })),
        estimatedSize: videoInfo.estimatedSize || 0,
      };

      // Validate duration
      if (tiktokInfo.duration > config.download.maxDurationSeconds) {
        throw new Error(
          `Video quá dài (${Math.floor(tiktokInfo.duration / 60)} phút). ` +
          `Giới hạn: ${Math.floor(config.download.maxDurationSeconds / 60)} phút`
        );
      }

      // Validate file size
      const maxSizeBytes = config.download.maxFileSizeMB * 1024 * 1024;
      if (tiktokInfo.estimatedSize > maxSizeBytes) {
        throw new Error(
          `File quá lớn (${Math.round(tiktokInfo.estimatedSize / 1024 / 1024)} MB). ` +
          `Giới hạn: ${config.download.maxFileSizeMB} MB`
        );
      }

      logger.info(`Analyzed TikTok video: ${tiktokInfo.title} (${tiktokInfo.id})`);
      return tiktokInfo;
    } catch (error: any) {
      logger.error(`TikTok analyze error: ${error.message}`);
      
      // Provide user-friendly error messages
      if (error.message.includes('private') || error.message.includes('not accessible')) {
        throw new Error('Video này không phải là public. Chỉ có thể tải video public.');
      }
      
      if (error.message.includes('Unable to extract')) {
        throw new Error(
          'Không thể truy cập video. Có thể:\n' +
          '1. Video đã bị xóa hoặc private\n' +
          '2. TikTok đã thay đổi API\n' +
          '3. Cần update yt-dlp: pip install -U yt-dlp'
        );
      }
      
      throw error;
    }
  }

  /**
   * Normalize TikTok URL by removing unnecessary query parameters
   * TikTok URLs often have query params like ?is_from_webapp=1&sender_device=pc
   * These are not needed for yt-dlp and might cause issues
   */
  private normalizeTikTokUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove all query parameters - yt-dlp doesn't need them
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original (will be caught by validateTikTokUrl)
      return url;
    }
  }

  /**
   * Validate TikTok URL format
   */
  private validateTikTokUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('URL không hợp lệ');
    }

    const trimmed = url.trim();
    if (!trimmed) {
      throw new Error('URL không được để trống');
    }

    // Check if it's a TikTok URL
    if (!trimmed.includes('tiktok.com')) {
      throw new Error('Chỉ hỗ trợ URL TikTok. Ví dụ: https://www.tiktok.com/@username/video/1234567890');
    }

    // Check if it's a video URL (not user profile, etc.)
    if (!trimmed.includes('/video/')) {
      throw new Error('URL phải là link video TikTok. Ví dụ: https://www.tiktok.com/@username/video/1234567890');
    }

    // Basic URL format validation
    try {
      new URL(trimmed);
    } catch {
      throw new Error('URL không hợp lệ');
    }
  }
}

