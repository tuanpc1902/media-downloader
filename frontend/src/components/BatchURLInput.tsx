import { useState } from 'react';
import { Download, Loader2, X, AlertCircle } from 'lucide-react';
import { createBatchDownload } from '../services/api';
import { useDownloadStore } from '../stores/downloadStore';
import { BatchDownloadRequest } from '../types';
import { showToast } from './Toast';

interface BatchURLInputProps {
  onDownloadStart: () => void;
}

export function BatchURLInput({ onDownloadStart }: BatchURLInputProps) {
  const [urls, setUrls] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [urlList, setUrlList] = useState<Array<{ url: string; valid: boolean; error?: string; videoId?: string; normalized?: string }>>([]);
  const [downloadType, setDownloadType] = useState<'audio' | 'video'>('audio');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'webm'>('mp3');
  const [audioBitrate, setAudioBitrate] = useState<number>(128);
  const [quality, setQuality] = useState<string>('720p');
  const addJob = useDownloadStore((state) => state.addJob);

  // Parse URLs từ textarea - hỗ trợ nhiều separator
  const parseUrls = (text: string): string[] => {
    // Split bằng nhiều separator: newline, comma, semicolon, hoặc nhiều spaces
    return text
      .split(/[\n\r,;]+|\s{2,}/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  };

  // Extract video ID từ YouTube URL
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const trimmed = url.trim();
    
    // Pattern 1: youtu.be/VIDEO_ID
    let match = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    
    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    match = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    
    // Pattern 3: youtube.com/embed/VIDEO_ID
    match = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    
    // Pattern 4: youtube.com/v/VIDEO_ID
    match = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    
    // Pattern 5: youtube.com/shorts/VIDEO_ID
    match = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    
    // Pattern 6: Chỉ có VIDEO_ID (11 ký tự)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    
    return null;
  };

  // Validate URL và normalize
  const validateUrl = (url: string): { valid: boolean; error?: string; videoId?: string; normalized?: string } => {
    if (!url) {
      return { valid: false, error: 'URL trống' };
    }
    
    const videoId = extractVideoId(url);
    if (videoId) {
      // Normalize về format chuẩn
      const normalized = `https://www.youtube.com/watch?v=${videoId}`;
      return { valid: true, videoId, normalized };
    }
    
    // Kiểm tra xem có phải là URL YouTube không (nhưng không extract được ID)
    const isYouTubeDomain = /youtube\.com|youtu\.be/.test(url);
    if (isYouTubeDomain) {
      return { valid: false, error: 'Không thể extract video ID' };
    }
    
    return { valid: false, error: 'Không phải URL YouTube hợp lệ' };
  };

  // Parse và validate URLs khi textarea thay đổi
  const handleUrlsChange = (text: string) => {
    setUrls(text);
    const parsed = parseUrls(text);
    const validated = parsed.map((url) => {
      const validation = validateUrl(url);
      return {
        url,
        valid: validation.valid,
        error: validation.error,
        videoId: validation.videoId,
        normalized: validation.normalized,
      };
    });
    setUrlList(validated);
  };

  // Remove URL khỏi danh sách
  const removeUrl = (index: number) => {
    const lines = urls.split('\n');
    lines.splice(index, 1);
    handleUrlsChange(lines.join('\n'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize URLs: dùng normalized URL nếu có, hoặc URL gốc
    const validUrls = urlList
      .filter((item) => item.valid && item.normalized)
      .map((item) => item.normalized || item.url);
    
    if (validUrls.length === 0) {
      showToast('Vui lòng nhập ít nhất một URL hợp lệ', 'error');
      return;
    }

    setLoading(true);
    try {
      const request: BatchDownloadRequest = {
        urls: validUrls,
        options: {
          type: downloadType,
          format: downloadType === 'audio' ? audioFormat : 'mp4',
          bitrate: downloadType === 'audio' ? audioBitrate : undefined,
          quality: downloadType === 'video' ? quality : undefined,
          audioFormat: downloadType === 'audio' ? audioFormat : undefined,
          audioBitrate: downloadType === 'audio' ? audioBitrate : undefined,
        },
      };

      const response = await createBatchDownload(request);
      
      // Thêm jobs vào store
      for (const jobResult of response.jobs) {
        addJob({
          id: jobResult.jobId,
          url: jobResult.url,
          status: jobResult.status,
          format: downloadType === 'audio' ? audioFormat : 'mp4',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Hiển thị thông báo
      if (response.errors && response.errors.length > 0) {
        showToast(
          `Đã tạo ${response.jobs.length} jobs, ${response.errors.length} lỗi`,
          'warning'
        );
      } else {
        showToast(`Đã tạo ${response.jobs.length} download jobs`, 'success');
      }

      // Reset form
      setUrls('');
      setUrlList([]);
      onDownloadStart();
    } catch (error: any) {
      showToast(
        error.response?.data?.error || error.message || 'Lỗi tạo batch download',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const validCount = urlList.filter((item) => item.valid).length;
  const invalidCount = urlList.filter((item) => !item.valid).length;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nhập URLs (mỗi URL một dòng hoặc cách nhau bởi dấu phẩy)
        </label>
        <textarea
          value={urls}
          onChange={(e) => handleUrlsChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=AAA&#10;https://youtu.be/BBB&#10;dQw4w9WgXcQ&#10;https://m.youtube.com/watch?v=DDD"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          rows={6}
          disabled={loading}
        />
        {urlList.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {validCount > 0 && <span className="text-green-600 dark:text-green-400">{validCount} URL hợp lệ</span>}
            {validCount > 0 && invalidCount > 0 && <span className="mx-2">•</span>}
            {invalidCount > 0 && <span className="text-red-600 dark:text-red-400">{invalidCount} URL không hợp lệ</span>}
          </div>
        )}
      </div>

      {/* URL List với validation */}
      {urlList.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {urlList.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                item.valid
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {item.valid ? (
                <div className="flex-1">
                  <div className="text-green-800 dark:text-green-200 truncate">
                    {item.normalized || item.url}
                  </div>
                  {item.videoId && (
                    <div className="text-xs text-green-600 dark:text-green-400">ID: {item.videoId}</div>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <div className="text-red-800 dark:text-red-200 truncate">{item.url}</div>
                  {item.error && (
                    <div className="text-xs text-red-600 dark:text-red-400">{item.error}</div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeUrl(index)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Format Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loại tải
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="downloadType"
                value="audio"
                checked={downloadType === 'audio'}
                onChange={() => setDownloadType('audio')}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700 dark:text-gray-300">Audio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="downloadType"
                value="video"
                checked={downloadType === 'video'}
                onChange={() => setDownloadType('video')}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700 dark:text-gray-300">Video</span>
            </label>
          </div>
        </div>

        {/* Audio Format (nếu chọn audio) */}
        {downloadType === 'audio' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Định dạng audio
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audioFormat"
                  value="mp3"
                  checked={audioFormat === 'mp3'}
                  onChange={() => setAudioFormat('mp3')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-700 dark:text-gray-300">MP3</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audioFormat"
                  value="webm"
                  checked={audioFormat === 'webm'}
                  onChange={() => setAudioFormat('webm')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-700 dark:text-gray-300">WebM</span>
              </label>
            </div>
          </div>
        )}

        {/* Audio Bitrate (nếu chọn audio) */}
        {downloadType === 'audio' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chất lượng audio (bitrate)
            </label>
            <select
              value={audioBitrate}
              onChange={(e) => setAudioBitrate(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value={128}>128 kbps (Mặc định)</option>
              <option value={192}>192 kbps</option>
              <option value={256}>256 kbps</option>
              <option value={320}>320 kbps</option>
            </select>
          </div>
        )}

        {/* Video Quality (nếu chọn video) */}
        {downloadType === 'video' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chất lượng video
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="720p">720p (HD)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="best">Tốt nhất</option>
            </select>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || validCount === 0}
        className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Đang tạo jobs...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Tải {validCount > 0 ? `${validCount} ` : ''}video{validCount !== 1 ? 's' : ''}</span>
          </>
        )}
      </button>
    </form>
  );
}

