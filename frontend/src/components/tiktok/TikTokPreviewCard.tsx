import { useState } from 'react';
import { Clock, User, Eye, Heart, Download, Music, Video } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
// import { cn } from '../../utils/cn'; // Unused for now
import { createTikTokDownload } from '../../services/api';
import { useDownloadStore } from '../../stores/downloadStore';
import { showToast } from '../Toast';

export interface TikTokVideoInfo {
  id: string;
  title: string;
  author: string;
  authorId: string;
  thumbnail: string;
  duration: number;
  viewCount?: number;
  likeCount?: number;
  isPublic: boolean;
  formats: Array<{
    formatId: string;
    ext: string;
    resolution?: string;
    filesize?: number;
  }>;
  estimatedSize: number;
}

interface TikTokPreviewCardProps {
  videoInfo: TikTokVideoInfo;
  videoUrl: string;
  onDownloadStart?: () => void;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num?: number): string {
  if (!num) return 'N/A';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * TikTok Video Preview Card
 * 
 * Displays video metadata and download options
 */
export function TikTokPreviewCard({ videoInfo, videoUrl, onDownloadStart }: TikTokPreviewCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<'video' | 'audio'>('video');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'm4a'>('mp3');
  const [quality, setQuality] = useState<'best' | '720p' | '480p' | '360p'>('best');
  const [loading, setLoading] = useState(false);
  const addJob = useDownloadStore((state) => state.addJob);

  const handleDownload = async () => {
    if (!videoInfo.isPublic) {
      showToast('Video này không phải là public. Chỉ có thể tải video public.', 'error');
      return;
    }

    setLoading(true);
    try {
      const request = {
        url: videoUrl,
        format: selectedFormat,
        audioFormat: selectedFormat === 'audio' ? audioFormat : undefined,
        quality: selectedFormat === 'video' ? quality : undefined,
      };

      const result = await createTikTokDownload(request);
      
      // Convert to DownloadJob format for store
      const job = {
        id: result.jobId,
        url: videoUrl,
        platform: 'tiktok' as const,
        title: videoInfo.title,
        status: result.status as any,
        format: selectedFormat === 'video' ? 'mp4' : (audioFormat === 'mp3' ? 'mp3' : 'm4a'),
        progress: 0,
        createdAt: result.createdAt,
        updatedAt: result.createdAt,
      };
      addJob({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      });

      showToast(`Đã bắt đầu tải: ${videoInfo.title}`, 'success');
      onDownloadStart?.();
    } catch (error: any) {
      showToast(
        error.response?.data?.error || error.message || 'Lỗi tạo download job',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Thumbnail */}
      <div className="relative">
        <img
          src={videoInfo.thumbnail}
          alt={videoInfo.title}
          className="w-full h-64 object-cover"
        />
        
        {/* Platform Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="platform" platform="tiktok">
            TikTok
          </Badge>
        </div>

        {/* Duration Overlay */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white rounded text-sm font-medium">
          {formatDuration(videoInfo.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 line-clamp-2">
          {videoInfo.title}
        </h2>

        {/* Metadata */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{videoInfo.author}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatDuration(videoInfo.duration)}</span>
          </div>

          {videoInfo.viewCount && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>{formatNumber(videoInfo.viewCount)} lượt xem</span>
            </div>
          )}

          {videoInfo.likeCount && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span>{formatNumber(videoInfo.likeCount)} lượt thích</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Kích thước ước tính:</span>
            <span>{formatFileSize(videoInfo.estimatedSize)}</span>
          </div>
        </div>

        {/* Download Options */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tùy chọn tải
          </h3>

          {/* Format Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Định dạng
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="video"
                  checked={selectedFormat === 'video'}
                  onChange={() => setSelectedFormat('video')}
                  className="w-4 h-4 text-blue-600"
                />
                <Video className="w-4 h-4" />
                <span className="text-gray-700 dark:text-gray-300">Video MP4</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="audio"
                  checked={selectedFormat === 'audio'}
                  onChange={() => setSelectedFormat('audio')}
                  className="w-4 h-4 text-blue-600"
                />
                <Music className="w-4 h-4" />
                <span className="text-gray-700 dark:text-gray-300">Audio only</span>
              </label>
            </div>
          </div>

          {/* Video Quality */}
          {selectedFormat === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chất lượng video
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="best">Tốt nhất (Best)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (SD)</option>
                <option value="360p">360p</option>
              </select>
            </div>
          )}

          {/* Audio Format */}
          {selectedFormat === 'audio' && (
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
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">MP3</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audioFormat"
                    value="m4a"
                    checked={audioFormat === 'm4a'}
                    onChange={() => setAudioFormat('m4a')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">M4A</span>
                </label>
              </div>
            </div>
          )}

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={loading || !videoInfo.isPublic}
            variant="primary"
            className="w-full"
            loading={loading}
          >
            <Download className="w-5 h-5 mr-2" />
            {loading ? 'Đang tạo job...' : 'Bắt đầu tải'}
          </Button>

          {!videoInfo.isPublic && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              ⚠️ Video này không phải là public. Chỉ có thể tải video public.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

