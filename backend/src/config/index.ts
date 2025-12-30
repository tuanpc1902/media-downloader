import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  download: {
    dir: process.env.DOWNLOAD_DIR || './downloads',
    completedDir: process.env.DOWNLOAD_COMPLETED_DIR || './downloads/completed',
    jobsDir: process.env.DOWNLOAD_JOBS_DIR || './downloads/jobs', // Thư mục chứa job-specific temp files
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '3', 10),
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50000', 10), // 50 GB - phù hợp với video 15 giờ
    maxDurationSeconds: parseInt(process.env.MAX_DURATION_SECONDS || '54000', 10), // 15 giờ = 900 phút
    chunkSizeMB: parseInt(process.env.CHUNK_SIZE_MB || '100', 10),
  },
  ytdlp: {
    path: process.env.YTDLP_PATH || 'yt-dlp',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    // TikTok/User agent configuration
    userAgent: process.env.YTDLP_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    cookieFile: process.env.YTDLP_COOKIE_FILE || undefined, // Optional cookie file path
    referer: process.env.YTDLP_REFERER || undefined, // Optional referer
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};


