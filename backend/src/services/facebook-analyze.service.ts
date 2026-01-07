import { analyzeVideo } from '../utils/downloader';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface FacebookVideoInfo {
  id: string;
  title: string;
  author?: string;
  authorId?: string;
  thumbnail: string;
  duration: number;
  viewCount?: number;
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
  type: 'video' | 'story';
}

/**
 * Facebook-specific analyze service
 * 
 * Features:
 * - Validate Facebook URLs (video and story)
 * - Extract Facebook-specific metadata
 * - Format response for Facebook UI
 */
export class FacebookAnalyzeService {
  /**
   * Analyze Facebook video/story URL
   */
  async analyze(url: string): Promise<FacebookVideoInfo> {
    try {
      // Validate Facebook URL
      this.validateFacebookUrl(url);

      // Normalize URL
      const normalizedUrl = this.normalizeFacebookUrl(url);

      // Detect if it's a story or video
      const isStory = this.isStoryUrl(normalizedUrl);

      // Analyze với yt-dlp
      const videoInfo = await analyzeVideo(normalizedUrl);

      // Extract Facebook-specific metadata
      const facebookInfo: FacebookVideoInfo = {
        id: videoInfo.id,
        title: videoInfo.title || 'Untitled',
        author: videoInfo.channel || undefined,
        authorId: videoInfo.channelId || videoInfo.id,
        thumbnail: videoInfo.thumbnail || '',
        duration: videoInfo.duration || 0,
        viewCount: videoInfo.viewCount,
        isPublic: true, // If analyzeVideo succeeds, content is accessible
        formats: videoInfo.formats.map(f => ({
          formatId: f.formatId,
          ext: f.ext,
          resolution: f.resolution,
          filesize: f.filesize,
          vcodec: f.vcodec,
          acodec: f.acodec,
        })),
        estimatedSize: videoInfo.estimatedSize || 0,
        type: isStory ? 'story' : 'video',
      };

      // Validate duration
      if (facebookInfo.duration > config.download.maxDurationSeconds) {
        throw new Error(
          `Video quá dài (${Math.floor(facebookInfo.duration / 60)} phút). ` +
          `Giới hạn: ${Math.floor(config.download.maxDurationSeconds / 60)} phút`
        );
      }

      // Validate file size
      const maxSizeBytes = config.download.maxFileSizeMB * 1024 * 1024;
      if (facebookInfo.estimatedSize > maxSizeBytes) {
        throw new Error(
          `File quá lớn (${Math.round(facebookInfo.estimatedSize / 1024 / 1024)} MB). ` +
          `Giới hạn: ${config.download.maxFileSizeMB} MB`
        );
      }

      logger.info(`Analyzed Facebook ${isStory ? 'story' : 'video'}: ${facebookInfo.title} (${facebookInfo.id})`);
      return facebookInfo;
    } catch (error: any) {
      logger.error(`Facebook analyze error: ${error.message}`);
      
      // Check for unsupported URL error (especially for stories)
      // Need to detect story from original url since normalizedUrl might not be available in catch block
      const isStoryUrl = url.includes('/stories/') || url.includes('story_fbid') || url.includes('stories.php');
      if (error.message.includes('Unsupported URL') || error.message.includes('ERROR: Unsupported URL')) {
        if (isStoryUrl) {
          throw new Error(
            'Facebook Stories không được hỗ trợ bởi yt-dlp.\n\n' +
            'Lý do:\n' +
            '- Facebook Stories có các hạn chế bảo mật nghiêm ngặt\n' +
            '- Stories chỉ tồn tại trong 24 giờ\n' +
            '- yt-dlp chưa hỗ trợ download Facebook Stories\n\n' +
            'Giải pháp:\n' +
            '- Chỉ có thể tải Facebook Videos (không phải Stories)\n' +
            '- URL video có dạng: https://www.facebook.com/username/videos/...\n' +
            '- Hoặc: https://www.facebook.com/watch?v=...'
          );
        } else {
          throw new Error(
            'URL Facebook không được hỗ trợ.\n\n' +
            'Có thể:\n' +
            '1. URL không hợp lệ hoặc không phải video\n' +
            '2. yt-dlp chưa hỗ trợ loại URL này\n' +
            '3. Cần update yt-dlp: pip install -U yt-dlp\n\n' +
            'Vui lòng thử với URL video Facebook thông thường.'
          );
        }
      }
      
      // Provide user-friendly error messages
      if (error.message.includes('private') || error.message.includes('not accessible')) {
        throw new Error('Nội dung này không thể truy cập. Chỉ có thể tải nội dung public.');
      }
      
      if (error.message.includes('Unable to extract')) {
        throw new Error(
          'Không thể truy cập nội dung. Có thể:\n' +
          '1. Nội dung đã bị xóa hoặc private\n' +
          '2. Facebook đã thay đổi API\n' +
          '3. Cần update yt-dlp: pip install -U yt-dlp'
        );
      }
      
      throw error;
    }
  }

  /**
   * Normalize Facebook URL by removing unnecessary query parameters
   */
  private normalizeFacebookUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep only essential query params if needed
      // Remove tracking parameters
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
   * Check if URL is a Facebook story
   */
  private isStoryUrl(url: string): boolean {
    return url.includes('/stories/') || url.includes('story_fbid') || url.includes('stories.php');
  }

  /**
   * Validate Facebook URL format
   */
  private validateFacebookUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('URL không hợp lệ');
    }

    const trimmed = url.trim();
    if (!trimmed) {
      throw new Error('URL không được để trống');
    }

    // Check if it's a Facebook URL
    if (!trimmed.includes('facebook.com') && !trimmed.includes('fb.com') && !trimmed.includes('m.facebook.com')) {
      throw new Error('Chỉ hỗ trợ URL Facebook. Ví dụ: https://www.facebook.com/username/videos/1234567890');
    }

    // Basic URL format validation
    try {
      new URL(trimmed);
    } catch {
      throw new Error('URL không hợp lệ');
    }
  }
}

