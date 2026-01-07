/**
 * Utilities để validate và detect YouTube URLs
 * Frontend version - matches backend logic
 */

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
  let match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 2: youtube.com/watch?v=VIDEO_ID (hỗ trợ www, m, không có protocol)
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 4: youtube.com/v/VIDEO_ID
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 5: youtube.com/shorts/VIDEO_ID
  match = trimmed.match(/(?:^https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (match) {
    return match[1];
  }

  // Pattern 6: Chỉ có VIDEO_ID (11 ký tự)
  // Chỉ match nếu không có dấu chấm hoặc dấu gạch chéo (để tránh match nhầm)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/')) {
    return trimmed;
  }

  return null;
}

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
 * Một URL là playlist CHỈ KHI:
 * - Có playlist ID VÀ
 * - KHÔNG có video ID
 * 
 * Nếu URL có cả video ID và playlist ID, đó là một video (không phải playlist)
 */
export function isPlaylistUrl(url: string): boolean {
  const playlistId = extractPlaylistId(url);
  const videoId = extractVideoId(url);
  
  // Chỉ là playlist nếu có playlist ID nhưng KHÔNG có video ID
  return playlistId !== null && videoId === null;
}

/**
 * Kiểm tra xem URL có phải là video không
 */
export function isVideoUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

