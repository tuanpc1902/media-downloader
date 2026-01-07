import { VideoInfo } from '../types';
import { Clock, User, HardDrive, Eye, Calendar } from 'lucide-react';

interface VideoPreviewProps {
  info: VideoInfo;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatNumber(num?: number): string {
  if (!num) return 'N/A';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  // Format: YYYYMMDD
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function VideoPreview({ info }: VideoPreviewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="relative">
        <img
          src={info.thumbnail}
          alt={info.title}
          className="w-full h-64 object-cover"
        />
      </div>
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 line-clamp-2">
          {info.title}
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{info.channel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(info.duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            <span>Kích thước ước tính: {formatFileSize(info.estimatedSize)}</span>
          </div>
          {info.viewCount && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{formatNumber(info.viewCount)} lượt xem</span>
            </div>
          )}
          {info.uploadDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Đăng tải: {formatDate(info.uploadDate)}</span>
            </div>
          )}
          {info.formats && info.formats.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Có {info.formats.length} định dạng khả dụng
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


