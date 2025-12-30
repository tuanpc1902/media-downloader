import { analyzeVideo, analyzePlaylist as analyzePlaylistUtil } from '../utils/downloader';
import { VideoInfo, PlaylistInfo } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';
import { validateAndNormalizeYouTubeUrl, isPlaylistUrl } from '../utils/urlValidator';

export class AnalyzeService {
  /**
   * Phân tích video từ URL
   */
  async analyze(url: string): Promise<VideoInfo> {
    try {
      // Check if it's a playlist URL first
      if (isPlaylistUrl(url)) {
        throw new Error('URL này là playlist. Vui lòng sử dụng endpoint /analyze/playlist');
      }

      // Validate URL format (basic validation, yt-dlp will handle platform detection)
      const normalizedUrl = this.validateUrl(url);

      // Analyze với yt-dlp (dùng normalized URL)
      // yt-dlp hỗ trợ nhiều platforms: YouTube, TikTok, SoundCloud, etc.
      const videoInfo = await analyzeVideo(normalizedUrl);

      // Validate duration
      if (videoInfo.duration > config.download.maxDurationSeconds) {
        const videoHours = Math.floor(videoInfo.duration / 3600);
        const videoMinutes = Math.floor((videoInfo.duration % 3600) / 60);
        const maxHours = Math.floor(config.download.maxDurationSeconds / 3600);
        const maxMinutes = Math.floor((config.download.maxDurationSeconds % 3600) / 60);
        
        const videoDurationStr = videoHours > 0 
          ? `${videoHours} giờ ${videoMinutes} phút`
          : `${videoMinutes} phút`;
        const maxDurationStr = maxHours > 0
          ? `${maxHours} giờ ${maxMinutes} phút`
          : `${maxMinutes} phút`;
        
        throw new Error(
          `Video quá dài (${videoDurationStr}). ` +
          `Giới hạn: ${maxDurationStr}`
        );
      }

      // Validate file size
      const maxSizeBytes = config.download.maxFileSizeMB * 1024 * 1024;
      if (videoInfo.estimatedSize > maxSizeBytes) {
        const videoSizeMB = Math.round(videoInfo.estimatedSize / 1024 / 1024);
        const videoSizeGB = (videoInfo.estimatedSize / 1024 / 1024 / 1024).toFixed(2);
        const maxSizeGB = (config.download.maxFileSizeMB / 1024).toFixed(2);
        
        const videoSizeStr = videoSizeMB >= 1024 
          ? `${videoSizeGB} GB`
          : `${videoSizeMB} MB`;
        const maxSizeStr = config.download.maxFileSizeMB >= 1024
          ? `${maxSizeGB} GB`
          : `${config.download.maxFileSizeMB} MB`;
        
        throw new Error(
          `File quá lớn (${videoSizeStr}). ` +
          `Giới hạn: ${maxSizeStr}`
        );
      }

      logger.info(`Analyzed video: ${videoInfo.title} (${videoInfo.id})`);
      return videoInfo;
    } catch (error) {
      logger.error(`Analyze error: ${error}`);
      throw error;
    }
  }

  /**
   * Phân tích playlist từ URL
   */
  async analyzePlaylist(url: string): Promise<PlaylistInfo> {
    try {
      // Validate URL là playlist
      if (!isPlaylistUrl(url)) {
        throw new Error('URL không phải là playlist hợp lệ');
      }

      // Analyze playlist với yt-dlp
      const playlistInfo = await analyzePlaylistUtil(url);

      logger.info(`Analyzed playlist: ${playlistInfo.title} (${playlistInfo.videoCount} videos)`);
      return playlistInfo;
    } catch (error) {
      logger.error(`Analyze playlist error: ${error}`);
      throw error;
    }
  }

  /**
   * Validate URL format (hỗ trợ YouTube, TikTok, SoundCloud)
   * Normalize YouTube URLs, nhưng cho phép các platform khác pass through
   */
  private validateUrl(url: string): string {
    // Basic URL format validation
    try {
      new URL(url);
    } catch {
      throw new Error('URL không hợp lệ. Vui lòng nhập URL hợp lệ.');
    }

    // Nếu là YouTube URL, normalize nó
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const result = validateAndNormalizeYouTubeUrl(url);
      if (!result.valid) {
        throw new Error(result.error || 'URL YouTube không hợp lệ.');
      }
      return result.normalized || url;
    }

    // Các platform khác (TikTok, SoundCloud, etc.) - yt-dlp sẽ tự xử lý
    // Chỉ validate format URL cơ bản
    if (url.includes('tiktok.com') || url.includes('soundcloud.com')) {
      return url; // Pass through để yt-dlp xử lý
    }

    // Cho phép các URL khác để yt-dlp tự detect platform
    // yt-dlp hỗ trợ rất nhiều platforms
    return url;
  }
}


