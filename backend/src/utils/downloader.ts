import { spawn, ChildProcess } from 'child_process';
import { config } from '../config';
import { logger } from './logger';
import { VideoInfo, Format, ProgressUpdate, PlaylistInfo } from '../types';
import { resolveYtdlpWithFallback } from './ytdlpResolver';
import { extractPlaylistId } from './urlValidator';
import fs from 'fs';
import path from 'path';

// Cache resolved command
let cachedYtdlpCommand: { command: string; args: string[] } | null = null;

/**
 * Get yt-dlp command (with caching)
 */
export async function getYtdlpCommand(): Promise<{ command: string; args: string[] }> {
  if (!cachedYtdlpCommand) {
    cachedYtdlpCommand = await resolveYtdlpWithFallback();
  }
  return cachedYtdlpCommand;
}

/**
 * Wrapper cho yt-dlp để phân tích playlist metadata
 * Sử dụng --flat-playlist để lấy danh sách videos nhanh
 */
export async function analyzePlaylist(url: string): Promise<PlaylistInfo> {
  return new Promise(async (resolve, reject) => {
    const ytdlp = await getYtdlpCommand();
    const args = buildYtdlpArgs([
      ...ytdlp.args,
      '--dump-json',
      '--no-warnings',
      '--flat-playlist', // Chỉ lấy thông tin cơ bản, không download
      '--playlist-end', '500', // Giới hạn 500 videos để tránh timeout
    ], url);
    args.push(url);

    // Don't use shell mode to avoid argument splitting issues with spaces
    // Node.js spawn will properly escape arguments automatically when shell=false
    // Only use shell if command itself contains spaces (like "python -m yt_dlp")
    // When shell=false, Node.js will properly pass args array to process, so user-agent string won't be split
    const needsShell = ytdlp.command.includes(' '); // Only if command has spaces
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
        // Extract error message từ stderr, loại bỏ các dòng không cần thiết
        const errorLines = stderr.split('\n').filter(line => {
          const trimmed = line.trim();
          if (!trimmed) return false;
          if (trimmed.includes("is not recognized as an internal or external command")) return false;
          if (trimmed.includes("operable program or batch file")) return false;
          if (/^['"]\w+['"]$/.test(trimmed) && trimmed.length < 30) return false;
          if (/^[0-9'",.\s]+$/.test(trimmed) && trimmed.length < 30) return false;
          return true;
        });
        
        let errorMessage = errorLines
          .join(' ')
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\s*operable\s+program\s+or\s+batch\s+file\.?\s*$/i, '')
          .trim();
        
        if (!errorMessage) {
          errorMessage = 'Failed to analyze playlist';
        }
        
        logger.error(`yt-dlp playlist analyze failed: ${errorMessage}`);
        reject(new Error(`Failed to analyze playlist: ${errorMessage}`));
        return;
      }

      try {
        // Parse multiple JSON objects (one per line)
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        const videos: PlaylistInfo['videos'] = [];
        
        // Parse each line as JSON (flat playlist format)
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // Flat playlist entries have: id, title, duration, url (optional), thumbnail (optional)
            if (data.id && data.title) {
              videos.push({
                id: data.id,
                title: data.title || 'Untitled',
                thumbnail: data.thumbnail || '',
                duration: data.duration || 0,
                url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
              });
            }
          } catch (parseError) {
            logger.warn(`Failed to parse playlist line: ${parseError}`);
          }
        }

        // Get playlist metadata separately (without --flat-playlist)
        // Use first video's URL to get playlist info
        let playlistInfo: any = null;
        try {
          // Try to get playlist page info by using yt-dlp without --flat-playlist on first video
          // Actually, better approach: use yt-dlp --flat-playlist --dump-json with playlist URL
          // The first entry sometimes contains playlist metadata
          const firstLine = lines[0];
          if (firstLine) {
            const firstData = JSON.parse(firstLine);
            if (firstData.playlist || firstData.playlist_id) {
              playlistInfo = firstData;
            }
          }
        } catch (error) {
          logger.warn(`Failed to get playlist metadata: ${error}`);
        }

        // If no playlist metadata, extract from URL
        const playlistId = extractPlaylistId(url) || 'unknown';
        const playlist: PlaylistInfo = {
          id: playlistId,
          title: playlistInfo?.playlist || playlistInfo?.title || `Playlist (${videos.length} videos)`,
          thumbnail: playlistInfo?.thumbnail || videos[0]?.thumbnail || '',
          channel: playlistInfo?.channel || playlistInfo?.uploader || playlistInfo?.channel_name || 'Unknown',
          channelId: playlistInfo?.channel_id || playlistInfo?.uploader_id || undefined,
          videoCount: videos.length,
          videos,
          description: playlistInfo?.description || undefined,
          viewCount: playlistInfo?.view_count || undefined,
          uploadDate: playlistInfo?.upload_date || undefined,
        };

        resolve(playlist);
      } catch (error) {
        logger.error(`Failed to parse playlist information: ${error}`);
        reject(new Error('Failed to parse playlist information'));
      }
    });

    childProcess.on('error', (error) => {
      logger.error(`yt-dlp spawn error: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Build yt-dlp args với platform-specific options
 * Thêm user agent, referer, cookies cho TikTok và các platforms khác nếu cần
 */
function buildYtdlpArgs(baseArgs: string[], url: string): string[] {
  const args = [...baseArgs];
  
  // Detect platform từ URL
  const isTikTok = url.includes('tiktok.com');
  const isSoundCloud = url.includes('soundcloud.com');
  
  // Apply platform-specific options
  if (isTikTok) {
    // TikTok thường cần user agent và referer để bypass restrictions
    if (config.ytdlp.userAgent) {
      args.push('--user-agent', config.ytdlp.userAgent);
    }
    // Set referer to TikTok
    args.push('--referer', config.ytdlp.referer || 'https://www.tiktok.com/');
    
    // TikTok-specific options để improve success rate
    // Add headers to mimic browser request
    args.push('--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');
    
    // TikTok extractor args - thử nhiều phương pháp extract
    // Note: extractor args format có thể thay đổi theo version yt-dlp
    // Nếu không work, có thể bỏ qua và để yt-dlp tự detect
    try {
      // Try multiple extractor methods for better compatibility
      args.push('--extractor-args', 'tiktok:webpage_download');
    } catch (e) {
      // Ignore nếu extractor args không hợp lệ
      logger.warn('TikTok extractor args may not be supported in this yt-dlp version');
    }
    
    // Add timeout để tránh hang
    args.push('--socket-timeout', '30');
  } else if (isSoundCloud) {
    // SoundCloud options
    if (config.ytdlp.userAgent) {
      args.push('--user-agent', config.ytdlp.userAgent);
    }
    if (config.ytdlp.referer) {
      args.push('--referer', config.ytdlp.referer);
    }
  }
  
  // Cookie file (optional, áp dụng cho tất cả platforms nếu có)
  // Cookies có thể giúp bypass rate limits hoặc access restricted content
  if (config.ytdlp.cookieFile) {
    args.push('--cookies', config.ytdlp.cookieFile);
  }
  
  return args;
}

export async function analyzeVideo(url: string): Promise<VideoInfo> {
  return new Promise(async (resolve, reject) => {
    const ytdlp = await getYtdlpCommand();
    const args = buildYtdlpArgs([
      ...ytdlp.args,
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
    ], url);
    args.push(url);

    // Don't use shell mode to avoid argument splitting issues with spaces
    // Node.js spawn will properly escape arguments automatically when shell=false
    // Only use shell if command itself contains spaces (like "python -m yt_dlp")
    // When shell=false, Node.js will properly pass args array to process, so user-agent string won't be split
    const needsShell = ytdlp.command.includes(' '); // Only if command has spaces
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
        // Extract error message từ stderr, loại bỏ các dòng không cần thiết
        const errorLines = stderr.split('\n').filter(line => {
          const trimmed = line.trim();
          // Bỏ qua các dòng trống
          if (!trimmed) return false;
          // Bỏ qua các dòng có dạng "'xxx' is not recognized" - đây là lỗi Windows shell parsing
          if (trimmed.includes("is not recognized as an internal or external command")) return false;
          // Bỏ qua các dòng có "operable program or batch file"
          if (trimmed.includes("operable program or batch file")) return false;
          // Bỏ qua các dòng chỉ có dấu nháy đơn hoặc ký tự đặc biệt ngắn
          if (/^['"]\w+['"]$/.test(trimmed) && trimmed.length < 30) return false;
          // Bỏ qua các dòng chỉ là số hoặc ký tự đặc biệt
          if (/^[0-9'",.\s]+$/.test(trimmed) && trimmed.length < 30) return false;
          return true;
        });
        
        // Join và clean up error message
        let errorMessage = errorLines
          .join(' ')
          .trim()
          // Remove duplicate spaces
          .replace(/\s+/g, ' ')
          // Remove trailing "operable program or batch file" if still present
          .replace(/\s*operable\s+program\s+or\s+batch\s+file\.?\s*$/i, '')
          .trim();
        
        if (!errorMessage) {
          errorMessage = 'Failed to analyze video';
        }
        
        logger.error(`yt-dlp analyze failed: ${errorMessage}`);
        
        // Xử lý lỗi TikTok đặc biệt
        if (errorMessage.includes('[TikTok]') && errorMessage.includes('Unable to extract')) {
          reject(new Error(
            'TikTok video không thể truy cập.\n\n' +
            'Giải pháp:\n' +
            '1. Update yt-dlp: pip install -U yt-dlp\n' +
            '2. TikTok có thể đã thay đổi API\n' +
            '3. Một số video TikTok cần cookies để truy cập\n' +
            '4. Thử lại sau vài phút (có thể bị rate limit)'
          ));
          return;
        }
        
        // Clean up error message - loại bỏ URL nếu có trong error message
        let cleanErrorMessage = errorMessage;
        // Remove URL patterns từ error message
        cleanErrorMessage = cleanErrorMessage.replace(/https?:\/\/[^\s]+/g, '');
        cleanErrorMessage = cleanErrorMessage.replace(/\s+/g, ' ').trim();
        
        if (!cleanErrorMessage) {
          cleanErrorMessage = 'Failed to analyze video';
        }
        
        reject(new Error(cleanErrorMessage));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const formats: Format[] = data.formats
          .filter((f: any) => f.vcodec !== 'none' || f.acodec !== 'none')
          .map((f: any) => ({
            formatId: f.format_id,
            ext: f.ext,
            resolution: f.resolution || undefined,
            vcodec: f.vcodec || undefined,
            acodec: f.acodec || undefined,
            filesize: f.filesize || undefined,
            fps: f.fps || undefined,
            abr: f.abr || undefined,
            vbr: f.vbr || undefined,
            tbr: f.tbr || undefined,
            width: f.width || undefined,
            height: f.height || undefined,
            quality: f.quality || undefined,
          }));

        const videoInfo: VideoInfo = {
          id: data.id,
          title: data.title,
          thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
          duration: data.duration || 0,
          channel: data.channel || data.uploader || 'Unknown',
          channelId: data.channel_id || undefined,
          formats,
          estimatedSize: data.filesize || estimateFileSize(data, formats),
          viewCount: data.view_count || undefined,
          uploadDate: data.upload_date || undefined,
          description: data.description || undefined,
          tags: data.tags || undefined,
          categories: data.categories || undefined,
        };

        resolve(videoInfo);
      } catch (error) {
        logger.error(`Failed to parse yt-dlp output: ${error}`);
        reject(new Error('Failed to parse video information'));
      }
    });

    childProcess.on('error', (error) => {
      logger.error(`yt-dlp spawn error: ${error.message}`);
      const installCmd = process.platform === 'win32'
        ? 'pip install yt-dlp' 
        : 'pip3 install yt-dlp';
      reject(new Error(
        `yt-dlp not found. Please install yt-dlp: ${installCmd}\n` +
        `Or set YTDLP_PATH in .env to the full path of yt-dlp executable.\n` +
        `Current path: ${config.ytdlp.path}`
      ));
    });
  });
}

/**
 * Download video với progress callback
 * @returns Promise<string> - File path của file đã download
 * @returns ChildProcess - Process để có thể cancel
 */
export function downloadVideo(
  url: string,
  options: {
    format: string;
    outputPath: string;
    onProgress?: (update: ProgressUpdate) => void;
    audioOnly?: boolean;
    audioFormat?: 'mp3' | 'webm';
    audioBitrate?: number;
    downloadSubtitles?: boolean;
    downloadThumbnail?: boolean;
    resume?: boolean; // Resume download từ file .part
    expectedExtension?: string; // Extension mong đợi (mp3, webm, mp4) để validate
    finalTitle?: string; // Title để rename file cuối cùng
    jobId?: string; // Job ID để rename file cuối cùng
    videoDuration?: number; // Video duration (seconds) để tính convert progress
  }
): Promise<{ promise: Promise<string>; process: ChildProcess }> {
  return new Promise(async (resolveReturn) => {
    const ytdlp = await getYtdlpCommand();
    
    // Build args với platform-specific options
    const baseArgs = [
      ...ytdlp.args,
      '--format', options.format,
      '--output', options.outputPath,
      '--newline',
      '--progress',
      '--no-warnings',
      '--no-playlist',
      '--verbose', // Enable verbose để xem ffmpeg output
      '--no-quiet', // Không suppress output
    ];
    
    // Apply platform-specific options (TikTok, SoundCloud, etc.)
    const args = buildYtdlpArgs(baseArgs, url);

    // Audio extraction - Xử lý MP3 và WebM
    if (options.audioOnly) {
      if (options.audioFormat === 'mp3') {
        // MP3: Extract audio và convert sang MP3
        args.push('--extract-audio', '--audio-format', 'mp3');
        // Set audio quality dựa trên bitrate
        // yt-dlp --audio-quality: 0 (best) to 9 (worst)
        // Mapping: 320kbps=0, 256kbps=1, 224kbps=2, 192kbps=3, 160kbps=4, 128kbps=5, 112kbps=6, 96kbps=7, 80kbps=8, 64kbps=9, 48kbps=9, 32kbps=9
        if (options.audioBitrate) {
          let quality = '9'; // Default worst
          if (options.audioBitrate >= 320) quality = '0';
          else if (options.audioBitrate >= 256) quality = '1';
          else if (options.audioBitrate >= 224) quality = '2';
          else if (options.audioBitrate >= 192) quality = '3';
          else if (options.audioBitrate >= 160) quality = '4';
          else if (options.audioBitrate >= 128) quality = '5';
          else if (options.audioBitrate >= 112) quality = '6';
          else if (options.audioBitrate >= 96) quality = '7';
          else if (options.audioBitrate >= 80) quality = '8';
          else quality = '9'; // 64, 48, 32 kbps
          args.push('--audio-quality', quality);
          logger.info(`MP3 audio quality set to ${quality} (bitrate: ${options.audioBitrate} kbps)`);
        } else {
          args.push('--audio-quality', '0'); // Best quality
        }
        logger.info(`Audio format: MP3, bitrate: ${options.audioBitrate || 'best'} kbps`);
      } else if (options.audioFormat === 'webm') {
        // WebM Opus: Lấy bestaudio có ext=webm, KHÔNG fallback
        // Format string đã được set trong formatYtdlpFormat()
        // Thêm --no-playlist để đảm bảo chỉ lấy 1 file
        logger.info(`Audio format: WebM Opus, bitrate: ${options.audioBitrate || 'best'} kbps`);
        // Note: Format string sẽ force webm, không cần thêm flags
      } else {
        // Fallback: Nếu không có audioFormat, dùng MP3
        logger.warn(`Audio format not specified, defaulting to MP3`);
        args.push('--extract-audio', '--audio-format', 'mp3');
        args.push('--audio-quality', '0');
      }
    }

    // Chỉ merge khi không phải audio only và format có dấu + (video+audio)
    // QUAN TRỌNG: Không merge cho audio-only MP3/WebM
    if (!options.audioOnly && options.format.includes('+')) {
      args.push('--merge-output-format', 'mp4');
    }

    // Download subtitles
    // QUAN TRỌNG: yt-dlp sẽ tự động tạo file subtitle với tên tương tự file chính
    // Output path phải có template %(ext)s để yt-dlp biết nơi lưu file chính
    // Subtitle sẽ được lưu với tên tương tự (chỉ khác extension: .vtt, .srt)
    if (options.downloadSubtitles) {
      args.push('--write-subs', '--write-auto-subs', '--sub-lang', 'vi,en');
      // Không cần --sub-format, yt-dlp sẽ tự động chọn format tốt nhất
    }

    // Download thumbnail
    // QUAN TRỌNG: yt-dlp sẽ tự động tạo file thumbnail với tên tương tự file chính
    // Thumbnail sẽ được lưu với tên tương tự (chỉ khác extension: .jpg, .webp)
    if (options.downloadThumbnail) {
      args.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
    }

    args.push(url);
    
    // Log command để debug
    logger.info(`Downloading with: ${ytdlp.command} ${args.join(' ')}`);

    // Don't use shell mode to avoid argument splitting issues with spaces
    // Node.js spawn will properly escape arguments automatically when shell=false
    // Only use shell if command itself contains spaces (like "python -m yt_dlp")
    const needsShell = ytdlp.command.includes(' '); // Only if command has spaces
    const childProcess = spawn(ytdlp.command, args, {
      shell: needsShell,
    });
    
    let resolvePromise: ((value: string) => void) | null = null;
    let rejectPromise: ((reason?: any) => void) | null = null;
    
    const promise = new Promise<string>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
      
      let lastProgress = -1; // Dùng -1 để luôn emit progress đầu tiên
      let downloadCompleted = false; // Flag để track khi download đã đạt 100%
      let stderrOutput = '';
      let stdoutOutput = '';
      const jobStartTime = Date.now(); // Track thời gian bắt đầu để tìm file mới nhất

      // Parse progress từ stderr và stdout
    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutOutput += output;
      // yt-dlp có thể output progress vào stdout
      parseProgressLines(output);
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrOutput += output; // Lưu để log lỗi
      // Parse progress từ stderr
      parseProgressLines(output);
    });

    function parseProgressLines(output: string) {
      const lines = output.split('\n').filter((line: string) => line.trim());

      for (const line of lines) {
        // Parse progress: [download]  45.2% of   50.00MiB at   2.50MiB/s ETA 00:02
        // Hoặc: [download] 100% of 123.45MiB in 00:05 at 2.50MiB/s
        const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          // Emit progress mỗi lần có update (không có threshold để tránh jump)
          // Chỉ skip nếu progress không thay đổi
          if (progress !== lastProgress && options.onProgress) {
            lastProgress = progress;

            // Parse downloaded/total size: 45.2% of   50.00MiB hoặc 100% of 123.45MiB
            const sizeMatch = line.match(/(\d+\.?\d*[KMGT]?i?B)\s+of\s+(\d+\.?\d*[KMGT]?i?B)/i);
            let downloadedBytes: number | undefined;
            let totalBytes: number | undefined;
            if (sizeMatch) {
              downloadedBytes = parseSize(sizeMatch[1]);
              totalBytes = parseSize(sizeMatch[2]);
            } else {
              // Nếu không có "of", có thể là 100% of total
              const singleSizeMatch = line.match(/(\d+\.?\d*[KMGT]?i?B)/i);
              if (singleSizeMatch && progress >= 99) {
                totalBytes = parseSize(singleSizeMatch[1]);
                downloadedBytes = totalBytes;
              }
            }

            // Parse speed: at 2.50MiB/s hoặc at 2.50MiB/s
            const speedMatch = line.match(/at\s+([\d.]+[KMGT]?i?B\/s)/i);
            const speed = speedMatch ? speedMatch[1] : undefined;

            // Parse ETA: ETA 00:02 hoặc ETA 00:00:05
            const etaMatch = line.match(/ETA\s+(\d+):(\d+)(?::(\d+))?/);
            let eta: number | undefined;
            if (etaMatch) {
              const hours = etaMatch[3] ? parseInt(etaMatch[1]) : 0;
              const minutes = etaMatch[3] ? parseInt(etaMatch[2]) : parseInt(etaMatch[1]);
              const seconds = etaMatch[3] ? parseInt(etaMatch[3]) : parseInt(etaMatch[2]);
              eta = hours * 3600 + minutes * 60 + seconds;
            }

            // Parse fragment: [download] Fragment 5/10
            const fragmentMatch = line.match(/Fragment\s+(\d+)\/(\d+)/i);
            const fragmentIndex = fragmentMatch ? parseInt(fragmentMatch[1]) : undefined;
            const fragmentCount = fragmentMatch ? parseInt(fragmentMatch[2]) : undefined;

            options.onProgress({
              jobId: options.jobId || '', // Sẽ được set bởi worker
              status: 'downloading',
              progress: Math.round(progress),
              phase: 'downloading',
              speed,
              eta,
              downloadedBytes,
              totalBytes,
              fragmentIndex,
              fragmentCount,
            });
          }
        }

        // Parse download complete: [download] 100% of ...
        // Có thể có format: [download] 100% of 123.45MiB in 00:05 at 2.50MiB/s
        // QUAN TRỌNG: Parse 100% TRƯỚC các post-processing messages
        const completeMatch = line.match(/\[download\]\s+100%/);
        if (completeMatch && options.onProgress) {
          // Emit 100% ngay lập tức khi parse được 100%
          downloadCompleted = true; // Đánh dấu download đã hoàn thành
          lastProgress = 100; // Đảm bảo không emit lại
          options.onProgress({
            jobId: options.jobId || '',
            status: 'downloading', // Vẫn là downloading khi đạt 100%
            progress: 100,
            phase: 'downloading',
            message: 'Download hoàn tất',
          });
          logger.debug(`Download completed, lastProgress set to 100%`);
        }

        // Parse merge progress: [Merger] Merging formats into "..."
        // Chỉ emit message, không set progress = 100 mặc định
        // Progress sẽ được update từ ffmpeg time parsing
        const mergeStartMatch = line.match(/\[Merger\]\s+Merging/);
        if (mergeStartMatch && options.onProgress && downloadCompleted) {
          // Nếu lastProgress = 100 (download vừa xong), set 95 để có chỗ cho merge progress
          // Nếu đã có progress từ ffmpeg, giữ nguyên
          const currentProgress = lastProgress >= 100 ? 95 : lastProgress;
          lastProgress = currentProgress; // Update để ffmpeg progress có thể tăng từ đây
          options.onProgress({
            jobId: options.jobId || '',
            status: 'processing',
            progress: currentProgress,
            phase: 'postprocessing',
            message: 'Đang merge audio và video...',
          });
          logger.debug(`Merge started, progress set to ${currentProgress}%`);
        }

        // Parse ffmpeg progress khi convert/merge
        // Format: time=00:01:23.45 bitrate=... hoặc frame=1234 fps=... time=...
        // yt-dlp với --verbose sẽ output ffmpeg progress vào stderr
        // Pattern 1: time=HH:MM:SS.ms (standard ffmpeg output)
        const ffmpegTimeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        // Pattern 2: frame=1234 fps=... time=... (ffmpeg verbose)
        const ffmpegFrameMatch = line.match(/frame=\s*(\d+).*time=(\d+):(\d+):(\d+\.\d+)/);
        
        // Chỉ parse nếu đang trong post-processing phase (downloadCompleted = true)
        // Và line không phải là download progress
        if ((ffmpegTimeMatch || ffmpegFrameMatch) && options.onProgress && downloadCompleted && !line.includes('[download]')) {
          let hours: number, minutes: number, seconds: number;
          
          if (ffmpegFrameMatch) {
            // Parse từ frame output
            hours = parseInt(ffmpegFrameMatch[2]);
            minutes = parseInt(ffmpegFrameMatch[3]);
            seconds = parseFloat(ffmpegFrameMatch[4]);
          } else if (ffmpegTimeMatch) {
            // Parse từ time output
            hours = parseInt(ffmpegTimeMatch[1]);
            minutes = parseInt(ffmpegTimeMatch[2]);
            seconds = parseFloat(ffmpegTimeMatch[3]);
          } else {
            return; // Không match pattern nào
          }
          
          const processedTime = hours * 3600 + minutes * 60 + seconds;
          
          // Tính % progress nếu có duration
          let convertProgress: number;
          let message = 'Đang chuyển đổi...';
          
          if (options.videoDuration && options.videoDuration > 0) {
            convertProgress = Math.min(100, Math.max(0, Math.round((processedTime / options.videoDuration) * 100)));
            message = `Đang chuyển đổi audio (${convertProgress}%)`;
            lastProgress = convertProgress; // Update lastProgress để giữ progress
            logger.debug(`FFmpeg convert progress: ${convertProgress}% (${processedTime}s / ${options.videoDuration}s)`);
          } else {
            // Nếu không có duration, dùng heuristic
            // Giả sử convert mất ~30% thời gian video (conservative estimate)
            // Nếu đã xử lý 30s, estimate total = 100s
            const estimatedConvertDuration = (processedTime / 0.3);
            convertProgress = Math.min(100, Math.max(95, Math.round((processedTime / estimatedConvertDuration) * 100)));
            message = `Đang chuyển đổi audio (${convertProgress}%)`;
            lastProgress = convertProgress;
            logger.debug(`FFmpeg convert progress (estimated): ${convertProgress}% (${processedTime}s processed)`);
          }
          
          // Emit progress với % thực tế (không indeterminate vì đã có progress)
          options.onProgress({
            jobId: options.jobId || '',
            status: 'processing',
            progress: convertProgress, // Progress thực tế từ ffmpeg
            phase: 'postprocessing',
            message,
            indeterminate: false, // Có progress chính xác
          });
        }
        
        // Parse merge progress với ffmpeg time
        // Pattern: [Merger] Merging... time=... hoặc chỉ time=... trong merge phase
        const mergeTimeMatch = line.match(/\[Merger\].*time=(\d+):(\d+):(\d+\.\d+)/);
        const mergeTimeMatch2 = line.match(/\[Muxer\].*time=(\d+):(\d+):(\d+\.\d+)/);
        const mergeTimeMatch3 = line.match(/Merging.*time=(\d+):(\d+):(\d+\.\d+)/);
        
        const mergeMatch = mergeTimeMatch || mergeTimeMatch2 || mergeTimeMatch3;
        if (mergeMatch && options.onProgress && downloadCompleted) {
          const hours = parseInt(mergeMatch[1]);
          const minutes = parseInt(mergeMatch[2]);
          const seconds = parseFloat(mergeMatch[3]);
          const processedTime = hours * 3600 + minutes * 60 + seconds;
          
          let mergeProgress: number;
          let message = 'Đang merge audio và video...';
          
          if (options.videoDuration && options.videoDuration > 0) {
            mergeProgress = Math.min(100, Math.max(0, Math.round((processedTime / options.videoDuration) * 100)));
            message = `Đang ghép audio/video (${mergeProgress}%)`;
            lastProgress = mergeProgress; // Update lastProgress
            logger.debug(`FFmpeg merge progress: ${mergeProgress}% (${processedTime}s / ${options.videoDuration}s)`);
          } else {
            // Heuristic: merge thường nhanh hơn convert (~20% thời gian video)
            const estimatedMergeDuration = (processedTime / 0.2);
            mergeProgress = Math.min(100, Math.max(95, Math.round((processedTime / estimatedMergeDuration) * 100)));
            message = `Đang ghép audio/video (${mergeProgress}%)`;
            lastProgress = mergeProgress;
            logger.debug(`FFmpeg merge progress (estimated): ${mergeProgress}% (${processedTime}s processed)`);
          }
          
          options.onProgress({
            jobId: options.jobId || '',
            status: 'processing',
            progress: mergeProgress,
            phase: 'postprocessing',
            message,
          });
        }
        
        // Parse post-processing (ExtractAudio, ConvertFormat, EmbedSubtitle)
        // QUAN TRỌNG: Chỉ emit khi bắt đầu post-processing, không set progress = 100 mặc định
        // Progress sẽ được update từ ffmpeg time parsing ở trên
        const postProcessMatch = line.match(/\[(ExtractAudio|ConvertFormat|EmbedSubtitle)\]/);
        if (postProcessMatch && options.onProgress && downloadCompleted) {
          const processType = postProcessMatch[1];
          let message = 'Đang xử lý sau tải...';
          if (processType === 'ExtractAudio') {
            message = 'Đang extract audio...';
          } else if (processType === 'ConvertFormat') {
            message = 'Đang convert format...';
          } else if (processType === 'EmbedSubtitle') {
            message = 'Đang embed subtitle...';
          }
          
          // Nếu lastProgress = 100 (download vừa xong), set 95 để có chỗ cho convert progress
          // Nếu đã có progress từ ffmpeg, giữ nguyên
          const currentProgress = lastProgress >= 100 ? 95 : lastProgress;
          lastProgress = currentProgress; // Update để ffmpeg progress có thể tăng từ đây
          
          // Emit với indeterminate flag nếu không có progress chính xác
          // (sẽ được update khi có ffmpeg output)
          options.onProgress({
            jobId: options.jobId || '',
            status: 'processing',
            progress: currentProgress, // 95% nếu vừa đạt 100%, hoặc giữ progress hiện tại
            phase: 'postprocessing',
            message,
            indeterminate: true, // Chưa có progress chính xác từ ffmpeg
          });
          logger.debug(`Post-processing started: ${processType}, progress set to ${currentProgress}%, indeterminate: true`);
        }
        
        // Parse các message khác cho thấy download đã xong
        // Ví dụ: "Deleting original file", "Post-processing", etc.
        const finalProcessMatch = line.match(/\[(Post|Extract|Convert|Embed|Mux)/);
        if (finalProcessMatch && options.onProgress) {
          // Nếu chưa đạt 100%, set 100%. Nếu đã đạt, giữ 100%
          if (!downloadCompleted) {
            downloadCompleted = true;
            lastProgress = 100;
          }
          options.onProgress({
            jobId: options.jobId || '',
            status: 'processing',
            progress: 100,
            phase: 'postprocessing',
            message: 'Đang xử lý sau tải...',
          });
        }

        // Parse error messages
        const errorMatch = line.match(/ERROR:\s*(.+)/i);
        if (errorMatch) {
          logger.error(`yt-dlp error: ${errorMatch[1]}`);
        }
      }
    }

      childProcess.on('close', async (code) => {
      if (code === 0) {
        // Emit 100% nếu chưa emit (backup)
        if (lastProgress < 100 && options.onProgress) {
          options.onProgress({
            jobId: options.jobId || '',
            status: 'processing',
            progress: 100,
            phase: 'postprocessing',
            message: 'Download hoàn tất, đang xử lý...',
          });
        }
        
        // Tìm file đã download (yt-dlp dùng template %(id)s.%(ext)s)
        const downloadedPath = await findDownloadedFile(options.outputPath, jobStartTime || Date.now());
        if (downloadedPath && fs.existsSync(downloadedPath)) {
          let finalPath = downloadedPath;
          // Validate output file extension nếu có expectedExtension
          if (options.expectedExtension) {
            const actualExt = path.extname(finalPath).toLowerCase().replace('.', '');
            const expectedExt = options.expectedExtension.toLowerCase();
            
            logger.info(`Validating output file: expected=${expectedExt}, actual=${actualExt}`);
            
            if (actualExt !== expectedExt) {
              // Nếu extension không đúng, có thể là file tạm hoặc convert fail
              logger.error(`Output file extension mismatch: expected ${expectedExt}, got ${actualExt}`);
              
              // Nếu là audio-only và extension không đúng, có thể là file tạm
              if (options.audioOnly) {
                // Tìm file đúng extension trong cùng thư mục
                const dir = path.dirname(finalPath);
                const baseName = path.basename(finalPath, path.extname(finalPath));
                const correctPath = path.join(dir, `${baseName}.${expectedExt}`);
                
                if (fs.existsSync(correctPath)) {
                  // File đúng extension tồn tại, xóa file sai
                  logger.info(`Found correct file: ${correctPath}, removing incorrect: ${finalPath}`);
                  try {
                    fs.unlinkSync(finalPath);
                  } catch (error: any) {
                    logger.warn(`Failed to remove incorrect file: ${error.message}`);
                  }
                  if (resolvePromise) resolvePromise(correctPath);
                  return;
                } else {
                  // File đúng extension không tồn tại → convert fail
                  logger.error(`Expected file not found: ${correctPath}`);
                  if (rejectPromise) {
                    rejectPromise(new Error(`File output không đúng định dạng: mong đợi ${expectedExt}, nhận được ${actualExt}`));
                  }
                  return;
                }
              } else {
                // Video: có thể chấp nhận extension khác (mp4, webm, mkv)
                logger.warn(`Video extension mismatch, but continuing: ${actualExt}`);
              }
            } else {
              logger.info(`Output file extension validated: ${actualExt}`);
            }
          }
          
          // Rename file sang tên mong muốn nếu có finalTitle
          // Move từ temp/<jobId>/ sang completed/ với tên thân thiện
          if (options.finalTitle) {
            // Emit phase: renaming
            if (options.onProgress) {
              options.onProgress({
                jobId: options.jobId || '',
                status: 'processing',
                progress: 100,
                phase: 'renaming',
                message: 'Đang đổi tên file...',
              });
            }
            
            try {
              const { createFinalFilename } = await import('./filename');
              const actualExt = path.extname(finalPath).toLowerCase().replace('.', '');
              
              // Validate finalTitle: không được là URL hoặc rỗng
              let finalTitle = options.finalTitle;
              if (!finalTitle || finalTitle.trim().length === 0) {
                logger.warn(`finalTitle is empty, using default`);
                finalTitle = 'video';
              } else if (finalTitle.includes('http://') || finalTitle.includes('https://') || finalTitle.includes('youtube.com') || finalTitle.includes('youtu.be')) {
                logger.warn(`finalTitle is URL: ${finalTitle}, using default`);
                finalTitle = 'video';
              }
              
              const finalFilename = createFinalFilename(finalTitle, actualExt);
              logger.info(`Renaming file: title="${finalTitle}", ext="${actualExt}", final="${path.basename(finalFilename)}"`);
              
              // Move file từ temp sang completed
              if (finalFilename !== finalPath) {
                // Đảm bảo thư mục completed tồn tại
                const completedDir = path.dirname(finalFilename);
                if (!fs.existsSync(completedDir)) {
                  fs.mkdirSync(completedDir, { recursive: true });
                }
                
                // Move file (rename = move nếu khác thư mục)
                fs.renameSync(finalPath, finalFilename);
                logger.info(`Moved from ${path.basename(finalPath)} to ${path.basename(finalFilename)}`);
                finalPath = finalFilename;
              } else {
                logger.info(`File already has final name: ${path.basename(finalPath)}`);
              }
            } catch (error: any) {
              logger.warn(`Failed to rename file: ${error.message}, using original name`);
            }
          }
          
          // Cleanup job directory (jobs/<jobId>/) - CHỈ cleanup trong job directory
          // QUAN TRỌNG: finalPath đã được move sang completed/, nên phải cleanup jobDir riêng
          if (options.jobId) {
            try {
              const jobDir = path.join(config.download.jobsDir, options.jobId);
              if (fs.existsSync(jobDir)) {
                // Cleanup file tạm trong job directory TRƯỚC khi xóa thư mục
                await cleanupTempFiles(jobDir, path.basename(finalPath));
                
                // Xóa toàn bộ thư mục jobs/<jobId> sau khi cleanup
                fs.rmSync(jobDir, { recursive: true, force: true });
                logger.info(`Cleaned up job directory: ${jobDir}`);
              }
            } catch (error: any) {
              logger.warn(`Failed to cleanup job directory: ${error.message}`);
            }
          }
          
          // Emit phase: finished
          if (options.onProgress) {
            options.onProgress({
              jobId: options.jobId || '',
              status: 'completed',
              progress: 100,
              phase: 'finished',
              message: 'Hoàn thành',
            });
          }
          
          logger.info(`Download completed: ${finalPath}`);
          if (resolvePromise) resolvePromise(finalPath);
        } else {
          logger.error(`File not found after download: ${options.outputPath}`);
          if (rejectPromise) rejectPromise(new Error('File không tồn tại sau khi download'));
        }
      } else {
        // Extract error message từ stderr
        const errorLines = stderrOutput.split('\n').filter((line: string) => 
          line.includes('ERROR') || 
          line.includes('error') || 
          line.includes('WARNING') ||
          line.trim().length > 0
        );
        
        const errorMessage = errorLines.length > 0 
          ? errorLines.slice(-3).join(' ').trim() // Lấy 3 dòng cuối
          : `Download failed with exit code ${code}`;
        
        logger.error(`yt-dlp download failed (code ${code}): ${errorMessage}`);
        logger.error(`Full stderr: ${stderrOutput.substring(0, 500)}`); // Log 500 ký tự đầu
        
        if (rejectPromise) rejectPromise(new Error(`Download failed: ${errorMessage}`));
      }
    });

      childProcess.on('error', (error) => {
        logger.error(`Download process error: ${error.message}`);
        if (rejectPromise) rejectPromise(error);
      });
    });
    
    // Return ngay sau khi spawn (spawn là sync)
    resolveReturn({ promise, process: childProcess });
  });
}

/**
 * Ước tính kích thước file
 */
function estimateFileSize(data: any, formats: Format[]): number {
  // Nếu có filesize từ yt-dlp
  if (data.filesize) return data.filesize;
  if (data.filesize_approx) return data.filesize_approx;

  // Ước tính dựa trên duration và bitrate
  const duration = data.duration || 0;
  const videoFormat = formats.find(f => f.vcodec && f.vcodec !== 'none');
  const audioFormat = formats.find(f => f.acodec && f.acodec !== 'none');

  let estimatedSize = 0;

  // Video bitrate estimation (rough)
  if (videoFormat) {
    const resolution = videoFormat.resolution || '720p';
    const bitrateMap: Record<string, number> = {
      '360p': 1 * 1024 * 1024, // 1 Mbps
      '720p': 2.5 * 1024 * 1024, // 2.5 Mbps
      '1080p': 5 * 1024 * 1024, // 5 Mbps
      '1440p': 8 * 1024 * 1024, // 8 Mbps
      '2160p': 15 * 1024 * 1024, // 15 Mbps
    };
    const bitrate = bitrateMap[resolution] || 2.5 * 1024 * 1024;
    estimatedSize += (bitrate * duration) / 8;
  }

  // Audio bitrate
  if (audioFormat && audioFormat.abr) {
    estimatedSize += (audioFormat.abr * 1000 * duration) / 8;
  } else if (audioFormat) {
    estimatedSize += (128 * 1000 * duration) / 8; // Default 128 kbps
  }

  return Math.round(estimatedSize);
}

/**
 * Parse size string to bytes
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+\.?\d*)\s*([KMGT]?i?)B?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers: Record<string, number> = {
    '': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024,
    'KI': 1024,
    'MI': 1024 * 1024,
    'GI': 1024 * 1024 * 1024,
    'TI': 1024 * 1024 * 1024 * 1024,
  };
  
  return Math.round(value * (multipliers[unit] || 1));
}

/**
 * Tìm file đã download từ yt-dlp output
 * yt-dlp dùng template %(id)s.%(ext)s nên file sẽ có tên dạng: <video_id>.<ext>
 * Tìm file mới nhất trong thư mục download (không có .part, .temp, .frag)
 */
async function findDownloadedFile(outputPath: string, jobStartTime: number): Promise<string | null> {
  const dir = path.dirname(outputPath);
  
  try {
    if (!fs.existsSync(dir)) {
      logger.error(`Download directory does not exist: ${dir}`);
      return null;
    }

    const files = fs.readdirSync(dir);
    
    // Lọc file hợp lệ (không phải file tạm)
    const validFiles = files
      .filter(file => {
        // Loại bỏ file tạm
        if (file.endsWith('.part') || 
            file.endsWith('.temp') || 
            file.endsWith('.tmp') ||
            file.endsWith('.frag') ||
            file.includes('.f') && /\.f\d+\./.test(file)) { // .f248.webm, etc.
          return false;
        }
        
        // Chỉ lấy file được tạo sau khi job bắt đầu
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          return stats.mtimeMs >= jobStartTime;
        } catch {
          return false;
        }
      })
      .map(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        return { file, path: filePath, mtime: stats.mtimeMs, size: stats.size };
      })
      .filter(f => f.size > 0) // Loại bỏ file rỗng
      .sort((a, b) => b.mtime - a.mtime); // Sắp xếp theo thời gian mới nhất
    
    if (validFiles.length === 0) {
      logger.warn(`No valid downloaded file found in ${dir}`);
      return null;
    }
    
    // Lấy file mới nhất (file chính, không phải subtitle/thumbnail)
    // Subtitle/thumbnail thường có extension .vtt, .srt, .jpg, .webp
    const mainExtensions = ['.mp4', '.webm', '.mp3', '.m4a', '.opus', '.mkv', '.flv', '.avi'];
    const mainFile = validFiles.find(f => {
      const ext = path.extname(f.file).toLowerCase();
      return mainExtensions.includes(ext);
    });
    
    if (mainFile) {
      logger.info(`Found downloaded file: ${mainFile.path}`);
      return mainFile.path;
    }
    
    // Nếu không tìm thấy file chính, lấy file mới nhất (có thể là format khác)
    const latestFile = validFiles[0];
    logger.info(`Found downloaded file (latest): ${latestFile.path}`);
    return latestFile.path;
  } catch (error: any) {
    logger.error(`Error finding downloaded file: ${error.message}`);
    return null;
  }
}

/**
 * Cleanup file tạm (.part, .temp, etc.) trong job directory
 * QUAN TRỌNG: CHỈ cleanup trong jobs/<jobId>/, KHÔNG BAO GIỜ động vào completed/
 * 
 * @param jobDir - Thư mục job (jobs/<jobId>/)
 * @param finalFileName - Tên file cuối cùng (để tránh xóa nhầm)
 */
async function cleanupTempFiles(jobDir: string, finalFileName: string): Promise<void> {
  try {
    // BẢO VỆ: Không bao giờ cleanup trong completed/
    if (jobDir.includes('completed') || jobDir.includes('\\completed') || jobDir.includes('/completed')) {
      logger.error(`SECURITY: Attempted to cleanup in completed directory: ${jobDir}`);
      return;
    }
    
    if (!fs.existsSync(jobDir)) return;
    
    const files = fs.readdirSync(jobDir);
    const finalBaseName = path.basename(finalFileName, path.extname(finalFileName));
    
    for (const file of files) {
      const filePath = path.join(jobDir, file);
      const fileBaseName = path.basename(file, path.extname(file));
      
      // Xóa file tạm:
      // 1. File .part, .temp, .tmp
      // 2. File format-specific (.f248.webm, etc.)
      // 3. File có base name khác final file (file tạm từ yt-dlp)
      const isTempFile = 
        file.endsWith('.part') || 
        file.endsWith('.temp') || 
        file.endsWith('.tmp') ||
        file.endsWith('.frag') ||
        /\.f\d+\./.test(file) || // .f248.webm, etc.
        (fileBaseName !== finalBaseName && 
         !file.endsWith('.vtt') && 
         !file.endsWith('.srt') && 
         !file.endsWith('.jpg') && 
         !file.endsWith('.webp')); // Giữ subtitle và thumbnail
      
      if (isTempFile) {
        try {
          // Kiểm tra xem file có đang được sử dụng không
          const stats = fs.statSync(filePath);
          const now = Date.now();
          const fileAge = now - stats.mtimeMs;
          
          // Chỉ xóa file tạm cũ hơn 1 phút (đảm bảo không xóa file đang được sử dụng)
          if (fileAge > 60000) {
            fs.unlinkSync(filePath);
            logger.info(`Cleaned up temp file: ${file}`);
          }
        } catch (error: any) {
          logger.warn(`Failed to cleanup temp file ${file}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    logger.warn(`Error during temp file cleanup: ${error.message}`);
  }
}


