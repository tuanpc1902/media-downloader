/**
 * Utilities để validate và normalize YouTube URLs
 */
import { logger } from './logger';

/**
 * Extract playlist ID từ YouTube URL
 * Hỗ trợ format:
 * - https://www.youtube.com/playlist?list=PLAYLIST_ID
 * - https://youtube.com/playlist?list=PLAYLIST_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 * - youtube.com/playlist?list=PLAYLIST_ID (không có protocol)
 * - URLs có query parameters khác
 */
export function extractPlaylistId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  let trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  // Normalize URL trước khi parse
  trimmed = normalizeUrlForParsing(trimmed);

  // Pattern 1: playlist?list=PLAYLIST_ID hoặc &list=PLAYLIST_ID
  let match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (match) {
    return match[1];
  }

  // Pattern 2: /playlist/PLAYLIST_ID (less common)
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/playlist\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Kiểm tra xem URL có phải là playlist không
 */
export function isPlaylistUrl(url: string): boolean {
  return extractPlaylistId(url) !== null && !extractVideoId(url);
}

/**
 * Normalize URL - thêm protocol nếu thiếu, loại bỏ fragments, trailing slashes
 */
function normalizeUrlForParsing(url: string): string {
  let normalized = url.trim();
  
  // Loại bỏ fragments (#)
  const hashIndex = normalized.indexOf('#');
  if (hashIndex !== -1) {
    normalized = normalized.substring(0, hashIndex);
  }
  
  // Loại bỏ trailing slashes (trừ khi là root)
  normalized = normalized.replace(/\/+$/, '');
  
  // Thêm protocol nếu thiếu (giả định https)
  if (!normalized.match(/^https?:\/\//i)) {
    // Chỉ thêm nếu có vẻ là URL (có domain)
    if (normalized.includes('.') || normalized.includes('/')) {
      normalized = 'https://' + normalized;
    }
  }
  
  return normalized;
}

/**
 * Extract video ID từ YouTube URL
 * Hỗ trợ nhiều format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/embed/VIDEO_ID
 * - https://youtube.com/v/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 * - youtube.com/watch?v=VIDEO_ID (không có protocol)
 * - www.youtube.com/watch?v=VIDEO_ID
 * - VIDEO_ID (chỉ ID)
 * - URLs có query parameters khác (si=, t=, etc.)
 * - URLs có trailing slashes hoặc fragments
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  let trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  // Normalize URL trước khi parse
  trimmed = normalizeUrlForParsing(trimmed);

  // Pattern 1: youtu.be/VIDEO_ID (hỗ trợ cả m.youtu.be)
  // https://youtu.be/dQw4w9WgXcQ
  // https://m.youtu.be/dQw4w9WgXcQ
  // youtu.be/dQw4w9WgXcQ
  let match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 2: youtube.com/watch?v=VIDEO_ID (hỗ trợ www, m, không có protocol)
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtube.com/watch?v=dQw4w9WgXcQ&list=...
  // https://m.youtube.com/watch?v=dQw4w9WgXcQ
  // youtube.com/watch?v=dQw4w9WgXcQ
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID
  // https://www.youtube.com/embed/dQw4w9WgXcQ
  // https://m.youtube.com/embed/dQw4w9WgXcQ
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 4: youtube.com/v/VIDEO_ID
  // https://www.youtube.com/v/dQw4w9WgXcQ
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 5: youtube.com/shorts/VIDEO_ID
  // https://www.youtube.com/shorts/dQw4w9WgXcQ
  // https://m.youtube.com/shorts/dQw4w9WgXcQ
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 6: Chỉ có VIDEO_ID (11 ký tự alphanumeric + _ -)
  // dQw4w9WgXcQ
  // Chỉ match nếu không có dấu chấm hoặc dấu gạch chéo (để tránh match nhầm)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/')) {
    return trimmed;
  }

  return null;
}

/**
 * Validate và normalize YouTube URL
 * @param url - URL cần validate
 * @returns Object với { valid: boolean, normalized?: string, videoId?: string, error?: string }
 */
export function validateAndNormalizeYouTubeUrl(url: string): {
  valid: boolean;
  normalized?: string;
  videoId?: string;
  error?: string;
} {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL không hợp lệ' };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: 'URL trống' };
  }

  // Extract video ID (hàm này đã xử lý normalize)
  const videoId = extractVideoId(trimmed);
  if (!videoId) {
    // Kiểm tra xem có phải là URL YouTube không (nhưng không extract được ID)
    const normalizedForCheck = normalizeUrlForParsing(trimmed);
    const isYouTubeDomain = /(?:^https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)/i.test(normalizedForCheck);
    if (isYouTubeDomain) {
      return { valid: false, error: 'Không thể extract video ID từ URL. Vui lòng kiểm tra lại URL.' };
    }
    return { valid: false, error: 'Không phải URL YouTube hợp lệ' };
  }

  // Normalize URL về format chuẩn: https://www.youtube.com/watch?v=VIDEO_ID
  const normalized = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    valid: true,
    normalized,
    videoId,
  };
}

/**
 * Validate nhiều URLs cùng lúc
 * @param urls - Mảng URLs
 * @returns Object với { valid: Array<{url, normalized, videoId}>, invalid: Array<{url, error}> }
 */
export function validateYouTubeUrls(urls: string[]): {
  valid: Array<{ url: string; normalized: string; videoId: string }>;
  invalid: Array<{ url: string; error: string }>;
} {
  const valid: Array<{ url: string; normalized: string; videoId: string }> = [];
  const invalid: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    const result = validateAndNormalizeYouTubeUrl(url);
    if (result.valid && result.normalized && result.videoId) {
      valid.push({
        url,
        normalized: result.normalized,
        videoId: result.videoId,
      });
    } else {
      invalid.push({
        url,
        error: result.error || 'URL không hợp lệ',
      });
    }
  }

  return { valid, invalid };
}

/**
 * Parse URLs từ text (textarea input)
 * Hỗ trợ nhiều separator: newline, comma, semicolon, space
 * @param text - Text input từ textarea
 * @returns Mảng URLs đã parse và normalize
 */
export function parseUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split bằng nhiều separator: newline, comma, semicolon, hoặc nhiều spaces
  const urls = text
    .split(/[\n\r,;]+|\s{2,}/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  // Normalize và validate từng URL
  const normalizedUrls: string[] = [];
  for (const url of urls) {
    const result = validateAndNormalizeYouTubeUrl(url);
    if (result.valid && result.normalized) {
      normalizedUrls.push(result.normalized);
    } else {
      logger.warn(`Invalid URL skipped: ${url} - ${result.error}`);
    }
  }

  return normalizedUrls;
}

