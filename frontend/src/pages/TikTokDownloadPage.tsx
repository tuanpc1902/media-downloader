import { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { LegalDisclaimer } from '../components/tiktok/LegalDisclaimer';
import { TikTokInputSection } from '../components/tiktok/TikTokInputSection';
import { TikTokPreviewCard } from '../components/tiktok/TikTokPreviewCard';
import { DownloadQueuePanel } from '../components/download/DownloadQueuePanel';
import { useTikTokStore } from '../stores/tiktokStore';
import { AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { analyzeTikTokVideo } from '../services/api';

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

interface VideoWithUrl {
  video: TikTokVideoInfo;
  url: string;
}

/**
 * TikTok Downloader Page
 * 
 * Main page for TikTok video downloading
 * Features:
 * - Legal disclaimer (required)
 * - TikTok URL input
 * - Video preview
 * - Download queue
 */
export function TikTokDownloadPage() {
  const legalAccepted = useTikTokStore((state) => state.legalAccepted);
  const setLegalAccepted = useTikTokStore((state) => state.setLegalAccepted);
  
  const [showDisclaimer, setShowDisclaimer] = useState(!legalAccepted);
  const [analyzedVideos, setAnalyzedVideos] = useState<VideoWithUrl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Show disclaimer on mount if not accepted
  useEffect(() => {
    if (!legalAccepted) {
      setShowDisclaimer(true);
    }
  }, [legalAccepted]);

  const handleAcceptLegal = () => {
    setLegalAccepted(true);
    setShowDisclaimer(false);
  };

  const handleDeclineLegal = () => {
    // Redirect to home or show message
    window.location.href = '/';
  };

  const handleAnalyze = async (urls: string[]) => {
    setLoading(true);
    setError(null);
    const results: VideoWithUrl[] = [];
    const errors: string[] = [];

    try {
      // Analyze URLs in parallel (limit to 3 concurrent for TikTok)
      const batchSize = 3;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (url) => {
            const videoInfo = await analyzeTikTokVideo(url);
            return { video: videoInfo, url };
          })
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const url = batch[index]; // Get URL from batch array
            const errorMsg = result.reason?.message || 'Lỗi không xác định';
            if (errorMsg.includes(url) || errorMsg.length > 100) {
              errors.push(errorMsg);
            } else {
              errors.push(`${url}: ${errorMsg}`);
            }
          }
        });
      }

      if (results.length > 0) {
        setAnalyzedVideos(results);
      }

      if (errors.length > 0 && results.length === 0) {
        setError(errors.join('\n'));
      } else if (errors.length > 0) {
        setError(`Một số URL thất bại:\n${errors.join('\n')}`);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi phân tích URL');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAnalyzedVideos([]);
    setError(null);
  };

  // Show disclaimer if not accepted
  if (showDisclaimer) {
    return <LegalDisclaimer onAccept={handleAcceptLegal} onDecline={handleDeclineLegal} />;
  }

  return (
    <MainLayout showQueuePanel={true} showSidebar={false}>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-gray-800 rounded-full mb-4">
            <span className="text-2xl">🎵</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            TikTok Downloader
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Tải video TikTok không watermark - Chỉ hỗ trợ video public
          </p>
        </div>

        {/* Legal Notice Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Lưu ý pháp lý:</p>
              <p>
                Chỉ tải nội dung bạn sở hữu hoặc được phép sử dụng. 
                Tuân thủ Terms of Service của TikTok. 
                Ứng dụng chỉ hỗ trợ video public.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={cn(
            'p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl',
            'flex items-start gap-3 text-red-700 dark:text-red-400'
          )}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-1">Lỗi:</div>
              <div className="text-sm whitespace-pre-line">{error}</div>
            </div>
          </div>
        )}

        {/* URL Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <TikTokInputSection
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            loading={loading}
          />
        </div>

        {/* Analyzed Videos Preview Cards */}
        {analyzedVideos.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Kết quả phân tích ({analyzedVideos.length})
              </h2>
              <button
                onClick={() => setAnalyzedVideos([])}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analyzedVideos.map((item, index) => (
                <TikTokPreviewCard
                  key={item.video.id || index}
                  videoInfo={item.video}
                  videoUrl={item.url}
                  onDownloadStart={() => {
                    // Optional: Handle download start callback
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {analyzedVideos.length === 0 && !loading && !error && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">Chưa có video nào được phân tích</p>
            <p className="text-sm">Nhập URL TikTok ở trên để bắt đầu</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

