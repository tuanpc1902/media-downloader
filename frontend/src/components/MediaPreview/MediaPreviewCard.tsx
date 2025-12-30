import { useState } from 'react';
import { Download, Clock, Eye, Calendar, User, List, Play } from 'lucide-react';
import { VideoInfo, PlaylistInfo } from '../../types';
import { FormatSelector } from '../FormatSelector';
import { PlaylistPreview } from '../PlaylistPreview';

interface MediaPreviewCardProps {
  media: VideoInfo | PlaylistInfo;
  url: string;
  onDownloadStart: (options: {
    audioOnly: boolean;
    audioFormat?: 'mp3' | 'webm';
    audioBitrate?: number;
    quality?: string;
    downloadSubtitles?: boolean;
    downloadThumbnail?: boolean;
  }) => void;
  defaultAudioOnly?: boolean;
}

export function MediaPreviewCard({ 
  media, 
  url, 
  onDownloadStart,
  defaultAudioOnly = false 
}: MediaPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPlaylist = 'videoCount' in media;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num?: number): string => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isPlaylist) {
    const playlist = media as PlaylistInfo;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <PlaylistPreview 
          playlistInfo={playlist}
          playlistUrl={url}
          onDownloadStart={onDownloadStart}
          defaultAudioOnly={defaultAudioOnly}
        />
      </div>
    );
  }

  const video = media as VideoInfo;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header Section */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-48 h-36 object-cover rounded-lg shadow-md"
              loading="lazy"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 
              className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2"
              title={video.title}
            >
              {video.title}
            </h3>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="truncate" title={video.channel}>
                  {video.channel}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(video.duration)}</span>
              </div>

              {video.viewCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(video.viewCount)} views</span>
                </div>
              )}

              {video.uploadDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{video.uploadDate}</span>
                </div>
              )}

              {video.estimatedSize && (
                <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                  <Download className="w-4 h-4" />
                  <span>
                    ~{(video.estimatedSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              )}
            </div>

            {/* Platform Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full">
                YouTube
              </span>
            </div>

            {/* Description (collapsible) */}
            {video.description && (
              <div className="mt-4">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isExpanded ? 'Ẩn' : 'Hiển thị'} mô tả
                </button>
                {isExpanded && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                    {video.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Options */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-6">
        <FormatSelector
          videoInfo={video}
          videoUrl={url}
          onDownloadStart={() => onDownloadStart({
            audioOnly: defaultAudioOnly,
            quality: '720p',
            downloadSubtitles: false,
            downloadThumbnail: false,
          })}
          defaultAudioOnly={defaultAudioOnly}
        />
      </div>
    </div>
  );
}

