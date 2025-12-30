import { useState } from 'react';
import { URLInput } from '../components/URLInput';
import { BatchURLInput } from '../components/BatchURLInput';
import { VideoPreview } from '../components/VideoPreview';
import { FormatSelector } from '../components/FormatSelector';
import { DownloadList } from '../components/DownloadList';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { VideoInfo } from '../types';
import { AlertCircle } from 'lucide-react';

export function Home() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  const handleAnalyze = (info: VideoInfo, url: string) => {
    setVideoInfo(info);
    setVideoUrl(url);
    setError(null);
    setShowDownloads(false);
  };

  const handleError = (err: string) => {
    setError(err);
    setVideoInfo(null);
  };

  const handleDownloadStart = () => {
    setShowDownloads(true);
    setVideoInfo(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-end mb-4">
          <DarkModeToggle />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            YouTube Downloader
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Tải video và audio từ YouTube một cách dễ dàng
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/video"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Tải Video
            </a>
            <a
              href="/audio"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-semibold shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Tải Audio
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {!showDownloads && (
          <>
            {/* Mode Toggle */}
            <div className="mb-4 flex justify-center gap-4">
              <button
                onClick={() => setMode('single')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mode === 'single'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Tải đơn lẻ
              </button>
              <button
                onClick={() => setMode('batch')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mode === 'batch'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Tải hàng loạt
              </button>
            </div>

            <div className="mb-6">
              {mode === 'single' ? (
                <URLInput onAnalyze={(info, url) => handleAnalyze(info, url)} onError={handleError} />
              ) : (
                <BatchURLInput onDownloadStart={handleDownloadStart} />
              )}
            </div>

            {videoInfo && (
              <div className="space-y-6">
                <VideoPreview info={videoInfo} />
                <FormatSelector videoInfo={videoInfo} videoUrl={videoUrl} onDownloadStart={handleDownloadStart} />
              </div>
            )}
          </>
        )}

        {showDownloads || true && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Downloads
              </h2>
              <button
                onClick={() => setShowDownloads(false)}
                className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
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

