import { useState } from 'react';
import { MediaInfo } from '../../types/api';
import { Clock, Eye, User, Calendar, TrendingUp, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDownloadStore } from '../../stores/downloadStore';

interface RightSidebarProps {
  selectedVideo?: MediaInfo | null;
  className?: string;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num?: number): string {
  if (!num) return 'N/A';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function RightSidebar({ selectedVideo, className }: RightSidebarProps) {
  const jobs = useDownloadStore((state) => state.getAllJobs());
  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    downloading: jobs.filter(j => j.status === 'downloading' || j.status === 'processing').length,
    failed: jobs.filter(j => j.status === 'error').length,
  };

  return (
    <div className={cn('h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700', className)}>
      {/* Selected Video Info */}
      {selectedVideo ? (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Video đã chọn
          </h3>
          <div className="space-y-3">
            <img
              src={selectedVideo.thumbnail}
              alt={selectedVideo.title}
              className="w-full rounded-lg"
            />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
              {selectedVideo.title}
            </h4>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              {selectedVideo.channel && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{selectedVideo.channel}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{formatDuration(selectedVideo.duration)}</span>
              </div>
              {selectedVideo.views && (
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatNumber(selectedVideo.views)} lượt xem</span>
                </div>
              )}
              {selectedVideo.uploadDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatDate(selectedVideo.uploadDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Info className="w-4 h-4" />
            <span>Chọn video để xem thông tin</span>
          </div>
        </div>
      )}

      {/* Download Stats */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Thống kê
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tổng số:</span>
            <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Đang tải:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{stats.downloading}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Hoàn thành:</span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats.completed}</span>
          </div>
          {stats.failed > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Thất bại:</span>
              <span className="font-medium text-red-600 dark:text-red-400">{stats.failed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Mẹo sử dụng
        </h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Tìm kiếm nhanh</p>
            <p>Nhập từ khóa vào sidebar bên trái để tìm video YouTube</p>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="font-medium text-green-900 dark:text-green-200 mb-1">Tải nhiều video</p>
            <p>Phân tích nhiều URL cùng lúc, sau đó dùng "Tải tất cả"</p>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="font-medium text-purple-900 dark:text-purple-200 mb-1">Xem trước</p>
            <p>Click vào nút Play trên thumbnail để xem trước video</p>
          </div>
        </div>
      </div>
    </div>
  );
}

