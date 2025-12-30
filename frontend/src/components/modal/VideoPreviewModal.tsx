import { useEffect } from 'react';
import { X, Clock, User, Eye } from 'lucide-react';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden',
          'transform transition-all my-8',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
          title="Đóng"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video Preview - Fixed at top */}
        <div className="relative w-full flex-shrink-0" style={{ paddingBottom: '56.25%' }}>
          {canPreview ? (
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title={media.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={media.thumbnail}
                alt={media.title}
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-lg">Preview không khả dụng cho platform này</p>
              </div>
            </>
          )}
        </div>

        {/* Video Info & Download Options - Scrollable */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {media.title}
          </h2>
          {media.channel && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
              <User className="w-4 h-4" />
              <span>{media.channel}</span>
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
            {media.views && (
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{formatNumber(media.views)} lượt xem</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(media.duration)}</span>
            </div>
          </div>

          {/* Download Options with all features */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
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
}

