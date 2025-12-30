import { spawn } from 'child_process';
import { config } from '../config';
import { logger } from './logger';
import { resolveYtdlpWithFallback } from './ytdlpResolver';

/**
 * Kiểm tra yt-dlp có sẵn không (với fallback)
 */
export async function checkYtdlp(): Promise<boolean> {
  try {
    await resolveYtdlpWithFallback();
    return true;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra FFmpeg có sẵn không
 */
export async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const childProcess = spawn(config.ytdlp.ffmpegPath, ['-version'], {
      shell: process.platform === 'win32',
    });

    childProcess.on('close', (code) => {
      resolve(code === 0);
    });

    childProcess.on('error', () => {
      resolve(false);
    });

    // Timeout sau 5 giây
    setTimeout(() => {
      childProcess.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Kiểm tra tất cả dependencies
 */
export async function checkDependencies(): Promise<void> {
  logger.info('Checking dependencies...');

  try {
    const ytdlpAvailable = await checkYtdlp();
    const ffmpegAvailable = await checkFFmpeg();

    if (!ytdlpAvailable) {
      logger.error('❌ yt-dlp not found!');
      logger.error('Please install yt-dlp:');
      logger.error('  Windows: pip install yt-dlp');
      logger.error('  Linux/Mac: pip3 install yt-dlp');
      logger.error(`  Or set YTDLP_PATH in .env to full path or "python -m yt_dlp" (current: ${config.ytdlp.path})`);
      throw new Error('yt-dlp is required but not found');
    } else {
      logger.info('✅ yt-dlp is available');
    }

    if (!ffmpegAvailable) {
      logger.warn('⚠️  FFmpeg not found!');
      logger.warn('FFmpeg is recommended for merging audio/video');
      logger.warn('Please install FFmpeg:');
      logger.warn('  Windows: Download from https://ffmpeg.org/download.html');
      logger.warn('  Linux: sudo apt-get install ffmpeg');
      logger.warn('  Mac: brew install ffmpeg');
      logger.warn(`  Or set FFMPEG_PATH in .env to full path (current: ${config.ytdlp.ffmpegPath})`);
    } else {
      logger.info('✅ FFmpeg is available');
    }
  } catch (error: any) {
    logger.error('Error checking dependencies:', error.message);
    throw error;
  }
}

