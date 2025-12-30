import { useState } from 'react';
import { Download, Play, Clock, User, List } from 'lucide-react';
import { PlaylistInfo, PlaylistDownloadRequest } from '../types';
import { createPlaylistDownload } from '../services/api';
import { useDownloadStore } from '../stores/downloadStore';

interface PlaylistPreviewProps {
  playlistInfo: PlaylistInfo;
  playlistUrl: string;
  onDownloadStart: () => void;
  defaultAudioOnly?: boolean;
}

export function PlaylistPreview({ 
  playlistInfo, 
  playlistUrl, 
  onDownloadStart,
  defaultAudioOnly = false 
}: PlaylistPreviewProps) {
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'webm'>('mp3');
  const [audioBitrate, setAudioBitrate] = useState<number>(128);
  const [quality, setQuality] = useState<string>('720p');
  const [downloadSubtitles, setDownloadSubtitles] = useState(false);
  const [downloadThumbnail, setDownloadThumbnail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const addJob = useDownloadStore((state) => state.addJob);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const request: PlaylistDownloadRequest = {
        url: playlistUrl,
        audioOnly: defaultAudioOnly,
        audioFormat: defaultAudioOnly ? audioFormat : undefined,
        audioBitrate: defaultAudioOnly ? audioBitrate : undefined,
        quality: defaultAudioOnly ? undefined : quality,
        downloadSubtitles,
        downloadThumbnail,
      };

      const response = await createPlaylistDownload(request);
      
      // Add all jobs to store
      response.jobs.forEach((job) => {
        // Find video info for this job
        const video = playlistInfo.videos.find(v => v.url === job.url);
        addJob({
          id: job.jobId,
          url: job.url,
          title: video?.title || 'Unknown',
          status: job.status,
          format: defaultAudioOnly ? audioFormat : quality,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      onDownloadStart();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Lỗi tạo download jobs cho playlist');
    } finally {
      setLoading(false);
    }
  };

  const totalDuration = playlistInfo.videos.reduce((sum, video) => sum + video.duration, 0);

  return (
    <div className="space-y-6">
      {/* Playlist Header */}
      <div className="flex gap-6">
        <img
          src={playlistInfo.thumbnail}
          alt={playlistInfo.title}
          className="w-48 h-32 object-cover rounded-xl shadow-lg"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {playlistInfo.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{playlistInfo.channel}</span>
            </div>
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span>{playlistInfo.videoCount} videos</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>
          {playlistInfo.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {playlistInfo.description}
            </p>
          )}
        </div>
      </div>

      {/* Format Options */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
        {defaultAudioOnly ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Định dạng Audio
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setAudioFormat('mp3')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    audioFormat === 'mp3'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                >
                  MP3
                </button>
                <button
                  onClick={() => setAudioFormat('webm')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    audioFormat === 'webm'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                >
                  WebM Opus
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Chất lượng Audio (kbps)
              </label>
              <div className="flex gap-2">
                {[64, 96, 128, 192].map((bitrate) => (
                  <button
                    key={bitrate}
                    onClick={() => setAudioBitrate(bitrate)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      audioBitrate === bitrate
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                    }`}
                  >
                    {bitrate}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Chất lượng Video
            </label>
            <div className="flex gap-2">
              {['360p', '720p', '1080p', 'best'].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    quality === q
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                >
                  {q === 'best' ? 'Tốt nhất' : q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Additional Options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={downloadSubtitles}
              onChange={(e) => setDownloadSubtitles(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Tải phụ đề</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={downloadThumbnail}
              onChange={(e) => setDownloadThumbnail(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Tải thumbnail</span>
          </label>
        </div>
      </div>

      {/* Video List Toggle */}
      <button
        onClick={() => setShowVideos(!showVideos)}
        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {showVideos ? 'Ẩn' : 'Hiển thị'} danh sách videos ({playlistInfo.videoCount})
      </button>

      {/* Video List */}
      {showVideos && (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {playlistInfo.videos.map((video, index) => (
            <div
              key={video.id}
              className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                {index + 1}
              </span>
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-20 h-14 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {video.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Đang tạo jobs...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Tải {playlistInfo.videoCount} videos</span>
          </>
        )}
      </button>
    </div>
  );
}

