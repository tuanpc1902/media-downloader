import { useState } from 'react';
import { MediaInfo } from '../../types/api';
import { Badge } from '../common/Badge';
import { Clock, User, Eye, AlertTriangle, Lock, Globe, Play } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FormatSelector } from '../FormatSelector';
import { VideoInfo } from '../../types';
import { VideoPreviewModal } from '../modal/VideoPreviewModal';

interface MediaPreviewCardProps {
  media: MediaInfo;
  mediaUrl: string; // URL gốc để download
  onDownload?: () => void;
  onCancel?: () => void;
  defaultAudioOnly?: boolean;
  compact?: boolean; // Compact mode for grid layout
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

export function MediaPreviewCard({ media, mediaUrl, onDownload, onCancel, defaultAudioOnly = false, compact = false }: MediaPreviewCardProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
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

  // Get YouTube video ID for preview
  const youtubeId = media.platform === 'youtube' ? extractYouTubeId(mediaUrl) : null;
  const canPreview = youtubeId !== null;

  if (compact) {
    // Compact mode - smaller card for grid layout
    return (
      <>
        <div className={cn(
          'bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700',
          'hover:shadow-lg transition-shadow cursor-pointer'
        )}>
          {/* Thumbnail */}
          <div className="relative aspect-video">
            <img
              src={media.thumbnail}
              alt={media.title}
              className="w-full h-full object-cover"
            />
            {canPreview && (
              <button
                onClick={() => setShowPreviewModal(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
                title="Xem trước video"
              >
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors shadow-lg">
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                </div>
              </button>
            )}
            
            {/* Platform Badge */}
            <div className="absolute top-2 right-2">
              <Badge variant="platform" platform={media.platform}>
                {media.platform}
              </Badge>
            </div>

            {/* Duration Overlay */}
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white rounded text-xs font-medium">
              {formatDuration(media.duration)}
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Title */}
            <h3 className={cn(
              'font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2',
              'text-sm'
            )}>
              {media.title}
            </h3>

            {/* Metadata */}
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {media.channel && (
                <div className="flex items-center gap-1 truncate">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{media.channel}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {media.views && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{formatNumber(media.views)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(media.duration)}</span>
                </div>
              </div>
            </div>

            {/* Download Options - Ultra Compact */}
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <FormatSelector
                videoInfo={videoInfo}
                videoUrl={mediaUrl}
                videoId={media.id}
                onDownloadStart={onDownload || (() => {})}
                defaultAudioOnly={defaultAudioOnly}
                ultraCompact
              />
            </div>
          </div>
        </div>

        {/* Video Preview Modal */}
        <VideoPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          media={media}
          mediaUrl={mediaUrl}
        />
      </>
    );
  }

  // Full mode - original larger card
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Thumbnail */}
        <div className="relative">
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-full h-72 object-cover"
          />
          {canPreview && (
            <button
              onClick={() => setShowPreviewModal(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
              title="Xem trước video"
            >
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors shadow-lg">
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </div>
            </button>
          )}
          
          {/* Platform Badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="platform" platform={media.platform}>
              {media.platform}
            </Badge>
          </div>

          {/* Warnings */}
          {(media.isPrivate || media.isAgeRestricted || media.isGeoBlocked) && (
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {media.isPrivate && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/90 text-white rounded-lg text-xs font-medium">
                  <Lock className="w-3 h-3" />
                  Private
                </div>
              )}
              {media.isAgeRestricted && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/90 text-white rounded-lg text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  18+
                </div>
              )}
              {media.isGeoBlocked && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/90 text-white rounded-lg text-xs font-medium">
                  <Globe className="w-3 h-3" />
                  Geo-blocked
                </div>
              )}
            </div>
          )}

          {/* Duration Overlay */}
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white rounded text-sm font-medium">
            {formatDuration(media.duration)}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
            {media.title}
          </h2>

          {/* Metadata */}
          <div className="mb-4">
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300 flex-wrap">
              {(media.channel || media.author) && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{media.channel || media.author}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{formatDuration(media.duration)}</span>
              </div>
              {media.views && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatNumber(media.views)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Download Options */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <FormatSelector
              videoInfo={videoInfo}
              videoUrl={mediaUrl}
              videoId={media.id}
              onDownloadStart={onDownload || (() => {})}
              defaultAudioOnly={defaultAudioOnly}
              compact
            />
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      <VideoPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        media={media}
        mediaUrl={mediaUrl}
      />
    </>
  );
}
