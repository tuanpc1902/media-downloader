import { useState } from 'react';
import { Download } from 'lucide-react';
import { VideoInfo, DownloadRequest } from '../types';
import { createDownload } from '../services/api';
import { useDownloadStore } from '../stores/downloadStore';
import { showToast } from './Toast';
import { cn } from '../utils/cn';

interface FormatSelectorProps {
  videoInfo: VideoInfo;
  videoUrl: string;
  videoId?: string; // Unique ID for radio button groups
  onDownloadStart: () => void;
  defaultAudioOnly?: boolean;
  compact?: boolean; // Compact mode for smaller cards
  ultraCompact?: boolean; // Ultra compact - only format type and quality
}

export function FormatSelector({ videoInfo, videoUrl, videoId, onDownloadStart, defaultAudioOnly = false, compact = false, ultraCompact = false }: FormatSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<'video' | 'audio'>(defaultAudioOnly ? 'audio' : 'video');
  const [quality, setQuality] = useState<string>('720p');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'webm'>('mp3');
  const [audioBitrate, setAudioBitrate] = useState<number>(128);
  const [downloadSubtitles, setDownloadSubtitles] = useState(false);
  const [downloadThumbnail, setDownloadThumbnail] = useState(false);
  const [loading, setLoading] = useState(false);
  const addJob = useDownloadStore((state) => state.addJob);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const request: DownloadRequest = {
        url: videoUrl,
        audioOnly: selectedFormat === 'audio',
        quality: selectedFormat === 'video' ? quality : undefined,
        audioFormat: selectedFormat === 'audio' ? audioFormat : undefined,
        audioBitrate: selectedFormat === 'audio' ? audioBitrate : undefined,
        outputFormat: selectedFormat === 'video' ? 'mp4' : undefined, // Deprecated
        downloadSubtitles,
        downloadThumbnail,
      };

      const job = await createDownload(request);
      addJob({
        ...job,
        title: videoInfo.title,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      });
      showToast(`Đã bắt đầu tải: ${videoInfo.title}`, 'success');
      onDownloadStart();
    } catch (error: any) {
      showToast(
        error.response?.data?.error || error.message || 'Lỗi tạo download job',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Use videoId or fallback to videoUrl for unique radio button groups
  const uniqueId = videoId || videoUrl.replace(/[^a-zA-Z0-9]/g, '_');
  const formatGroupName = `format-${uniqueId}`;
  const audioFormatGroupName = `audioFormat-${uniqueId}`;

  return (
    <div className={cn(compact ? 'space-y-3' : 'bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6')}>
      {!compact && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Chọn định dạng
        </h3>
      )}

      {/* Format Type */}
      <div className={cn(ultraCompact ? 'mb-2' : 'mb-3')}>
        {!ultraCompact && (
          <label className={cn('block font-medium text-gray-700 dark:text-gray-300 mb-2', compact ? 'text-xs' : 'text-sm')}>
            Loại tải
          </label>
        )}
        <div className={cn('flex gap-2', ultraCompact && 'gap-1')}>
          <label className={cn('flex items-center gap-1.5 cursor-pointer flex-1', ultraCompact && 'justify-center px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600', selectedFormat === 'video' && ultraCompact && 'bg-primary-600 border-primary-600 text-white')}>
            <input
              type="radio"
              name={formatGroupName}
              value="video"
              checked={selectedFormat === 'video'}
              onChange={() => setSelectedFormat('video')}
              className="w-3.5 h-3.5 text-primary-600"
            />
            <span className={cn('text-gray-700 dark:text-gray-300', ultraCompact ? 'text-xs font-medium' : compact ? 'text-sm' : 'text-base', selectedFormat === 'video' && ultraCompact && 'text-white')}>Video</span>
          </label>
          <label className={cn('flex items-center gap-1.5 cursor-pointer flex-1', ultraCompact && 'justify-center px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600', selectedFormat === 'audio' && ultraCompact && 'bg-primary-600 border-primary-600 text-white')}>
            <input
              type="radio"
              name={formatGroupName}
              value="audio"
              checked={selectedFormat === 'audio'}
              onChange={() => setSelectedFormat('audio')}
              className="w-3.5 h-3.5 text-primary-600"
            />
            <span className={cn('text-gray-700 dark:text-gray-300', ultraCompact ? 'text-xs font-medium' : compact ? 'text-sm' : 'text-base', selectedFormat === 'audio' && ultraCompact && 'text-white')}>Audio</span>
          </label>
        </div>
      </div>

      {/* Video Quality */}
      {selectedFormat === 'video' && (
        <div className={cn(ultraCompact ? 'mb-2' : 'mb-3')}>
          {!ultraCompact && (
            <label className={cn('block font-medium text-gray-700 dark:text-gray-300 mb-2', compact ? 'text-xs' : 'text-sm')}>
              Chất lượng video
            </label>
          )}
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className={cn(
              'w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
              ultraCompact ? 'px-2 py-1.5 text-xs' : compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'
            )}
          >
            <option value="best">Tốt nhất</option>
            <option value="2160p">2160p (4K)</option>
            <option value="1440p">1440p (2K)</option>
            <option value="1080p">1080p (Full HD)</option>
            <option value="720p">720p (HD)</option>
            <option value="480p">480p (SD)</option>
            <option value="360p">360p</option>
            <option value="240p">240p</option>
            <option value="144p">144p</option>
          </select>
        </div>
      )}

      {/* Audio Format Selection */}
      {selectedFormat === 'audio' && (
        <>
          {!ultraCompact && (
            <div className="mb-3">
              <label className={cn('block font-medium text-gray-700 dark:text-gray-300 mb-2', compact ? 'text-xs' : 'text-sm')}>
                Định dạng audio
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    name={audioFormatGroupName}
                    value="mp3"
                    checked={audioFormat === 'mp3'}
                    onChange={() => setAudioFormat('mp3')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className={cn('text-gray-700 dark:text-gray-300', compact ? 'text-sm' : 'text-base')}>MP3</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    name={audioFormatGroupName}
                    value="webm"
                    checked={audioFormat === 'webm'}
                    onChange={() => setAudioFormat('webm')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className={cn('text-gray-700 dark:text-gray-300', compact ? 'text-sm' : 'text-base')}>WebM (Opus)</span>
                </label>
              </div>
            </div>
          )}

          {/* Audio Bitrate */}
          <div className={cn(ultraCompact ? 'mb-2' : 'mb-3')}>
            {!ultraCompact && (
              <label className={cn('block font-medium text-gray-700 dark:text-gray-300 mb-2', compact ? 'text-xs' : 'text-sm')}>
                Chất lượng audio (bitrate)
              </label>
            )}
            <select
              value={audioBitrate}
              onChange={(e) => setAudioBitrate(parseInt(e.target.value))}
              className={cn(
                'w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
                ultraCompact ? 'px-2 py-1.5 text-xs' : compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'
              )}
            >
              <option value={32}>32 kbps (Rất thấp)</option>
              <option value={64}>64 kbps (Thấp)</option>
              <option value={96}>96 kbps (Trung bình)</option>
              <option value={128}>128 kbps (Tốt - Mặc định)</option>
              <option value={160}>160 kbps (Tốt)</option>
              <option value={192}>192 kbps (Rất tốt)</option>
              <option value={256}>256 kbps (Xuất sắc)</option>
              <option value={320}>320 kbps (Tốt nhất)</option>
            </select>
          </div>
        </>
      )}

      {/* Additional Options - Hidden in ultraCompact mode */}
      {!ultraCompact && (
        <div className="mb-3 space-y-2">
          <label className={cn('block font-medium text-gray-700 dark:text-gray-300 mb-2', compact ? 'text-xs' : 'text-sm')}>
            Tùy chọn bổ sung
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={downloadSubtitles}
              onChange={(e) => setDownloadSubtitles(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className={cn('text-gray-700 dark:text-gray-300', compact ? 'text-sm' : 'text-base')}>Tải phụ đề (nếu có)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={downloadThumbnail}
              onChange={(e) => setDownloadThumbnail(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className={cn('text-gray-700 dark:text-gray-300', compact ? 'text-sm' : 'text-base')}>Tải thumbnail</span>
          </label>
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={loading}
        className={cn(
          'w-full bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium',
          ultraCompact ? 'px-3 py-1.5 text-xs' : compact ? 'px-4 py-2.5 text-sm' : 'px-6 py-3 text-base'
        )}
      >
        {loading ? (
          <>
            <div className={cn('border-2 border-white border-t-transparent rounded-full animate-spin', ultraCompact ? 'w-3 h-3' : compact ? 'w-4 h-4' : 'w-5 h-5')} />
            <span>Đang tạo...</span>
          </>
        ) : (
          <>
            <Download className={ultraCompact ? 'w-3 h-3' : compact ? 'w-4 h-4' : 'w-5 h-5'} />
            <span>{ultraCompact ? 'Tải' : 'Bắt đầu tải'}</span>
          </>
        )}
      </button>
    </div>
  );
}

