/**
 * Utilities để sanitize filename từ video title
 */
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from './logger';

/**
 * Sanitize filename: loại bỏ ký tự không hợp lệ cho filesystem
 * Giữ nguyên tối đa tiêu đề gốc, chỉ thay thế ký tự không hợp lệ theo OS
 * @param title - Video title từ yt-dlp
 * @param platform - Platform (win32, linux, darwin). Nếu không có, tự detect
 * @returns Sanitized filename
 */
export function sanitizeFilename(title: string, platform?: string): string {
  if (!title) return 'video';
  
  // Validate: không được là URL
  if (title.includes('http://') || title.includes('https://') || title.includes('youtube.com') || title.includes('youtu.be')) {
    logger.warn(`Title appears to be URL, using default: ${title}`);
    return 'video';
  }
  
  // Detect platform nếu không có
  const currentPlatform = platform || process.platform;
  const isWindows = currentPlatform === 'win32';
  
  // KHÔNG normalize Unicode - giữ nguyên dấu tiếng Việt
  // Chỉ loại bỏ ký tự control (0x00-0x1F, 0x7F) - không thể hiển thị
  let sanitized = title
    .replace(/[\x00-\x1F\x7F]/g, '') // Loại bỏ control characters
    .replace(/\s+/g, ' ') // Thay thế nhiều khoảng trắng bằng 1 khoảng
    .trim();
  
  // Ký tự không hợp lệ theo OS:
  // Windows: < > : " / \ | ? *
  // Linux/Mac: / và null byte
  if (isWindows) {
    // Windows: Thay thế ký tự không hợp lệ
    sanitized = sanitized
      .replace(/[<>:"/\\?*\x00]/g, '') // Loại bỏ ký tự không hợp lệ (trừ |)
      .replace(/\|/g, ' - ') // | → " - " (giữ ý nghĩa, dễ đọc)
      .replace(/[&]/g, ' and ') // & → " and "
      .replace(/[+]/g, ' plus '); // + → " plus "
  } else {
    // Linux/Mac: Chỉ loại bỏ / và null byte
    sanitized = sanitized
      .replace(/[/\x00]/g, '') // Loại bỏ / và null byte
      .replace(/[&]/g, ' and ') // & → " and " (tùy chọn, để dễ đọc)
      .replace(/[+]/g, ' plus '); // + → " plus " (tùy chọn)
    // Giữ nguyên: | ? * < > : " \ (hợp lệ trên Linux/Mac)
  }
  
  // Cleanup: Loại bỏ nhiều khoảng trắng liên tiếp
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Giới hạn độ dài filename
  // Windows: 255 chars, Linux: 255 bytes (UTF-8 có thể ngắn hơn)
  const maxLength = isWindows ? 200 : 200; // An toàn cho cả 2
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }
  
  // Nếu sau khi sanitize trống, dùng tên mặc định
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'video';
  }
  
  return sanitized;
}

/**
 * Tạo filename an toàn với title và đảm bảo không trùng
 * @param title - Video title
 * @param extension - File extension (mp4, mp3, etc.)
 * @param jobId - Job ID để đảm bảo unique
 * @returns Full file path
 */
export function createSafeFilename(
  title: string,
  extension: string,
  jobId: string
): string {
  const sanitizedTitle = sanitizeFilename(title);
  
  // Tạo base filename: title + jobId (để đảm bảo unique)
  // Format: "Title - [jobId].ext"
  const baseFilename = `${sanitizedTitle} - [${jobId}]`;
  const filename = `${baseFilename}.${extension}`;
  
  const filePath = path.join(config.download.dir, filename);
  
  // Kiểm tra xem file đã tồn tại chưa
  if (fs.existsSync(filePath)) {
    // Nếu trùng, thêm timestamp
    const timestamp = Date.now();
    const uniqueFilename = `${sanitizedTitle} - [${jobId}] - ${timestamp}.${extension}`;
    return path.join(config.download.dir, uniqueFilename);
  }
  
  return filePath;
}

/**
 * Tạo output path cho yt-dlp - DÙNG TEMPLATE CHUẨN
 * QUAN TRỌNG: Không dùng fixed base name để tránh lỗi "Fixed output name but more than one file to download"
 * yt-dlp cần tạo nhiều file tạm (video + audio riêng biệt) nên phải dùng template với %(id)s
 * 
 * Storage Strategy (BẮT BUỘC):
 * - downloads/jobs/<jobId>/ - File tạm của yt-dlp và ffmpeg (CHỈ cleanup khi job finish/cancel)
 * - downloads/completed/ - File đã hoàn thành (KHÔNG BAO GIỜ XÓA)
 * 
 * @param jobId - Job ID (dùng làm unique identifier)
 * @returns Output path template cho yt-dlp (trong jobs/<jobId>/)
 */
export function createOutputPath(jobId: string): string {
  // Đảm bảo thư mục jobs/<jobId> tồn tại
  const jobDir = path.join(config.download.jobsDir, jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }
  
  // Dùng template yt-dlp chuẩn: %(id)s.%(ext)s
  // %(id)s = video ID từ YouTube (unique)
  // %(ext)s = extension tự động từ yt-dlp
  // Template này cho phép yt-dlp tạo nhiều file tạm với tên unique
  const filename = `%(id)s.%(ext)s`;
  
  return path.join(jobDir, filename);
}

/**
 * Tìm số suffix nhỏ nhất chưa dùng cho filename
 * Ví dụ: "Video.mp3" → tìm "Video (1).mp3", "Video (2).mp3", ...
 * @param baseName - Base filename (không có extension)
 * @param extension - File extension
 * @param completedDir - Thư mục completed
 * @returns Số suffix nhỏ nhất chưa dùng (0 nếu file gốc chưa tồn tại)
 */
function findAvailableSuffix(baseName: string, extension: string, completedDir: string): number {
  // Kiểm tra file gốc
  const originalPath = path.join(completedDir, `${baseName}.${extension}`);
  if (!fs.existsSync(originalPath)) {
    return 0; // File gốc chưa tồn tại
  }
  
  // Tìm số suffix nhỏ nhất chưa dùng
  let suffix = 1;
  while (true) {
    const testPath = path.join(completedDir, `${baseName} (${suffix}).${extension}`);
    if (!fs.existsSync(testPath)) {
      return suffix;
    }
    suffix++;
    
    // Giới hạn để tránh vòng lặp vô hạn
    if (suffix > 10000) {
      logger.warn(`Too many files with same name, using suffix ${suffix}`);
      return suffix;
    }
  }
}

/**
 * Tạo final filename sau khi download xong
 * KHÔNG dùng jobId trong tên file - dùng (1), (2), (3)... nếu trùng
 * @param title - Video title
 * @param extension - File extension (mp3, mp4, webm, etc.)
 * @returns Final filename path trong completed/
 */
export function createFinalFilename(title: string, extension: string): string {
  // Đảm bảo thư mục completed tồn tại
  if (!fs.existsSync(config.download.completedDir)) {
    fs.mkdirSync(config.download.completedDir, { recursive: true });
  }
  
  const sanitizedTitle = sanitizeFilename(title);
  const baseName = sanitizedTitle; // KHÔNG thêm jobId
  
  // Tìm số suffix nhỏ nhất chưa dùng
  const suffix = findAvailableSuffix(baseName, extension, config.download.completedDir);
  
  // Tạo filename
  let filename: string;
  if (suffix === 0) {
    // File gốc chưa tồn tại
    filename = `${baseName}.${extension}`;
  } else {
    // File đã tồn tại, thêm suffix
    filename = `${baseName} (${suffix}).${extension}`;
  }
  
  return path.join(config.download.completedDir, filename);
}

