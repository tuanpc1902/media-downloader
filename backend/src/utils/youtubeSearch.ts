import { spawn } from 'child_process';
import { getYtdlpCommand } from './downloader';
import { logger } from './logger';
// import { VideoInfo } from '../types'; // Unused for now

// MediaInfo interface for search results
interface MediaInfo {
  id: string;
  platform: 'youtube' | 'soundcloud' | 'tiktok';
  title: string;
  thumbnail: string;
  channel?: string;
  duration: number;
  views?: number;
  uploadDate?: string;
  description?: string;
  formats: any[];
  estimatedSize: number;
}

/**
 * Search YouTube videos using yt-dlp
 * Format: ytsearch:query or ytsearch10:query
 */
export async function searchYouTubeVideos(query: string, limit: number = 10): Promise<Array<{ video: MediaInfo; url: string }>> {
  return new Promise(async (resolve, reject) => {
    const ytdlp = await getYtdlpCommand();
    // yt-dlp search format: ytsearch:query or ytsearch10:query for 10 results
    // Note: yt-dlp has a limit, but we can make multiple calls if needed
    // For now, limit to 50 which is reasonable
    const searchLimit = Math.min(Math.max(1, limit), 50); // Limit between 1-50
    const searchQuery = searchLimit === 1 
      ? `ytsearch:${query}`
      : `ytsearch${searchLimit}:${query}`;
    
    logger.info(`Searching YouTube with query: ${searchQuery} (limit: ${searchLimit})`);
    
    const args = [
      ...ytdlp.args,
      '--dump-json',
      '--no-warnings',
      '--flat-playlist',
      '--no-playlist', // Only get individual videos, not playlists
    ];
    args.push(searchQuery);

    const needsShell = ytdlp.command.includes(' ');
    const childProcess = spawn(ytdlp.command, args, {
      shell: needsShell,
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      if (code !== 0) {
        // Filter out Windows shell parsing errors
        const errorLines = stderr
          .split('\n')
          .filter(line => 
            line.trim() && 
            !line.includes("is not recognized") &&
            !line.includes("'") &&
            line.includes('ERROR')
          );
        
        const errorMessage = errorLines.length > 0 
          ? errorLines[errorLines.length - 1].replace(/^ERROR:\s*/, '')
          : 'Lỗi tìm kiếm YouTube';
        
        logger.error(`YouTube search error: ${errorMessage}`);
        reject(new Error(errorMessage));
        return;
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        const results: Array<{ video: MediaInfo; url: string }> = [];

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.id && data.title) {
              const videoUrl = `https://www.youtube.com/watch?v=${data.id}`;
              
              // Get thumbnail - yt-dlp may return different thumbnail formats
              // Try multiple thumbnail sources
              let thumbnail = data.thumbnail || '';
              if (!thumbnail && data.id) {
                // Fallback to YouTube thumbnail API
                thumbnail = `https://img.youtube.com/vi/${data.id}/mqdefault.jpg`;
              }
              
              const media: MediaInfo = {
                id: data.id,
                platform: 'youtube',
                title: data.title,
                thumbnail: thumbnail,
                channel: data.channel || data.uploader || data.channel_name || 'Unknown',
                duration: data.duration || 0,
                views: data.view_count,
                uploadDate: data.upload_date,
                description: data.description,
                formats: [],
                estimatedSize: data.filesize || 0,
              };
              results.push({ video: media, url: videoUrl });
            }
          } catch (parseError) {
            logger.warn(`Failed to parse search result: ${parseError}`);
          }
        }

        // Limit results if needed
        const limitedResults = results.slice(0, limit);
        resolve(limitedResults);
      } catch (error) {
        logger.error(`Failed to parse search results: ${error}`);
        reject(new Error('Failed to parse search results'));
      }
    });

    childProcess.on('error', (error) => {
      logger.error(`yt-dlp spawn error: ${error.message}`);
      reject(error);
    });
  });
}

