import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, User, Eye, Calendar, FileVideo, ExternalLink, TrendingUp } from 'lucide-react';
import { MediaInfo } from '../../types/api';
import { cn } from '../../utils/cn';
import { FormatSelector } from '../FormatSelector';
import { VideoInfo } from '../../types';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaInfo | null;
  mediaUrl: string;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
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

export function VideoPreviewModal({ isOpen, onClose, media, mediaUrl }: VideoPreviewModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !media) return null;

  const youtubeId = media.platform === 'youtube' ? extractYouTubeId(mediaUrl) : null;
  const canPreview = youtubeId !== null;

  // Convert MediaInfo to VideoInfo format for FormatSelector
  const videoInfo: VideoInfo = {
    id: media.id,
    title: media.title,
    thumbnail: media.thumbnail,
    channel: media.channel || media.author || '',
    duration: media.duration,
    viewCount: media.views,
    uploadDate: media.uploadDate,
    description: media.description,
    formats: media.formats,
    estimatedSize: media.estimatedSize,
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          'relative w-full max-w-7xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800',
          'rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700',
          'transform transition-all my-8',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Improved */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 bg-black/80 hover:bg-black text-white rounded-full transition-all hover:scale-110 shadow-lg"
          title="Đóng (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Preview - Enhanced with gradient overlay */}
        <div className="relative w-full flex-shrink-0 bg-black" style={{ paddingBottom: '56.25%' }}>
          {canPreview ? (
            <>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-t-2xl"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={media.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Gradient overlay for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none rounded-t-2xl" />
            </>
          ) : (
            <>
              <img
                src={media.thumbnail}
                alt={media.title}
                className="absolute top-0 left-0 w-full h-full object-cover rounded-t-2xl"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-t-2xl">
                <div className="text-center">
                  <FileVideo className="w-16 h-16 text-white/80 mx-auto mb-3" />
                  <p className="text-white text-lg font-medium">Preview không khả dụng cho platform này</p>
                  <p className="text-white/70 text-sm mt-1">{media.platform}</p>
                </div>
              </div>
            </>
          )}
          {/* Platform badge */}
          {media.platform && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 bg-black/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                {media.platform}
              </span>
            </div>
          )}
        </div>

        {/* Video Info & Download Options - Enhanced */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h2 id="modal-title" className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                  {media.title}
                </h2>
                {media.channel && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{media.channel}</span>
                  </div>
                )}
              </div>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Mở video trong tab mới"
              >
                <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </a>
            </div>
            
            {/* Enhanced Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {media.views && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Lượt xem</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatNumber(media.views)}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Thời lượng</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatDuration(media.duration)}</div>
                </div>
              </div>
              {media.uploadDate && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-lg">
                    <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Ngày đăng</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {media.uploadDate.length === 8 
                        ? `${media.uploadDate.substring(6, 8)}/${media.uploadDate.substring(4, 6)}/${media.uploadDate.substring(0, 4)}`
                        : media.uploadDate}
                    </div>
                  </div>
                </div>
              )}
              {media.estimatedSize && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="p-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Dung lượng</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {media.estimatedSize >= 1024 * 1024 * 1024
                        ? `${(media.estimatedSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
                        : media.estimatedSize >= 1024 * 1024
                        ? `${(media.estimatedSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${(media.estimatedSize / 1024).toFixed(1)} KB`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {media.description && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Mô tả</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 whitespace-pre-wrap">
                  {media.description}
                </p>
              </div>
            )}
          </div>

          {/* Download Options with all features */}
          <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Tùy chọn tải xuống</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chọn định dạng và chất lượng mong muốn</p>
            </div>
            <FormatSelector
              videoInfo={videoInfo}
              videoUrl={mediaUrl}
              videoId={media.id}
              onDownloadStart={onClose}
              defaultAudioOnly={false}
              compact={false}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal via portal to ensure it's at the document root
  return createPortal(modalContent, document.body);
}

