import { useState } from 'react';
import { Link } from 'react-router-dom';
// import { URLInput } from '../components/URLInput'; // Unused for now
import { VideoPreview } from '../components/VideoPreview';
import { FormatSelector } from '../components/FormatSelector';
import { DownloadList } from '../components/DownloadList';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { VideoInfo, PlaylistInfo } from '../types';
import { AlertCircle, Video, Music, Home as HomeIcon, Play } from 'lucide-react';
import { analyzeVideo, analyzePlaylist } from '../services/api';
import { PlaylistPreview } from '../components/PlaylistPreview';
import { isPlaylistUrl } from '../utils/urlValidator';

export function VideoDownloadPage() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (url: string) => {
    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setPlaylistInfo(null);
    
    try {
      // Check if it's a playlist URL (only if it has playlist ID but no video ID)
      const isPlaylist = isPlaylistUrl(url);
      
      if (isPlaylist) {
        const playlist = await analyzePlaylist(url);
        setPlaylistInfo(playlist);
        setVideoUrl(url);
      } else {
        const info = await analyzeVideo(url);
        setVideoInfo(info);
        setVideoUrl(url);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi phân tích URL');
    } finally {
      setLoading(false);
    }
  };

  // const handleError = (err: string) => { // Unused for now
  //   setError(err);
  //   setVideoInfo(null);
  //   setPlaylistInfo(null);
  // };

  const handleDownloadStart = () => {
    setShowDownloads(true);
    setVideoInfo(null);
    setPlaylistInfo(null);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              <span>Trang chủ</span>
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <Link
              to="/audio"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Music className="w-5 h-5" />
              <span>Tải Audio</span>
            </Link>
          </div>
          <DarkModeToggle />
        </div>

        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
            <Video className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            Tải Video YouTube
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Tải video chất lượng cao từ YouTube - Hỗ trợ video đơn và playlist
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 shadow-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!showDownloads && (
          <div className="space-y-8">
            {/* URL Input */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nhập URL YouTube hoặc playlist..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      if (target.value.trim()) {
                        handleAnalyze(target.value.trim());
                      }
                    }
                  }}
                  className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input?.value.trim()) {
                      handleAnalyze(input.value.trim());
                    }
                  }}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Phân tích</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video/Playlist Preview */}
            {videoInfo && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                <VideoPreview info={videoInfo} />
                <FormatSelector 
                  videoInfo={videoInfo} 
                  videoUrl={videoUrl} 
                  onDownloadStart={handleDownloadStart}
                  defaultAudioOnly={false}
                />
              </div>
            )}

            {playlistInfo && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                <PlaylistPreview 
                  playlistInfo={playlistInfo}
                  playlistUrl={videoUrl}
                  onDownloadStart={handleDownloadStart}
                  defaultAudioOnly={false}
                />
              </div>
            )}
          </div>
        )}

        {showDownloads && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Video className="w-8 h-8 text-primary-600" />
                Danh sách Downloads
              </h2>
              <button
                onClick={() => setShowDownloads(false)}
                className="px-5 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
              >
                Tải video mới
              </button>
            </div>
            <DownloadList />
          </div>
        )}
      </div>
    </div>
  );
}

