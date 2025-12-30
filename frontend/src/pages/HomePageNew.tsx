import { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { URLInputSection } from '../components/input/URLInputSection';
import { MediaPreviewCard } from '../components/media/MediaPreviewCard';
import { AlertCircle, DownloadCloud } from 'lucide-react';
import { MediaInfo } from '../types/api';
import { analyzeVideo, analyzePlaylist, createDownload } from '../services/api';
import { cn } from '../utils/cn';
import { useDownloadStore } from '../stores/downloadStore';
import { showToast } from '../components/Toast';
import { Button } from '../components/common/Button';

/**
 * HomePage Component - Main Input & Analyze Page
 * Features:
 * - URL Input with drag-drop, multi-line, paste support
 * - Real-time URL validation
 * - Platform detection
 * - Media Preview Cards
 * - Download Queue Panel always visible at bottom
 */
interface MediaWithUrl {
  media: MediaInfo;
  url: string;
}

export function HomePageNew() {
  const [analyzedMedia, setAnalyzedMedia] = useState<MediaWithUrl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const addJob = useDownloadStore((state) => state.addJob);

  // Handle video selection from search sidebar
  const handleVideoSelectFromSearch = (video: MediaInfo, url: string) => {
    // Check if video already exists
    const exists = analyzedMedia.some(item => item.media.id === video.id);
    if (!exists) {
      setAnalyzedMedia([...analyzedMedia, { media: video, url }]);
    }
  };

  const handleAnalyze = async (urls: string[]) => {
    setLoading(true);
    setError(null);
    const results: MediaWithUrl[] = [];
    const errors: string[] = [];

    try {
      // Analyze URLs in parallel (limit to 5 concurrent)
      const batchSize = 5;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (url) => {
            // Check if it's a playlist URL
            const isPlaylist = url.includes('list=') || url.includes('/playlist');
            
            if (isPlaylist) {
              const playlist = await analyzePlaylist(url);
              // Convert PlaylistInfo to MediaInfo format
              const totalDuration = playlist.videos.reduce((sum, video) => sum + video.duration, 0);
              const media: MediaInfo = {
                id: playlist.id,
                platform: (playlist as any).platform || 'youtube',
                title: playlist.title,
                thumbnail: playlist.thumbnail,
                channel: playlist.channel,
                duration: totalDuration,
                views: playlist.viewCount,
                uploadDate: playlist.uploadDate,
                description: playlist.description,
                formats: [],
                estimatedSize: 0,
              };
              return { media, url };
            } else {
              const videoInfo = await analyzeVideo(url);
              // Detect platform from URL
              let platform: 'youtube' | 'soundcloud' | 'tiktok' = 'youtube';
              if (url.includes('soundcloud.com')) platform = 'soundcloud';
              else if (url.includes('tiktok.com')) platform = 'tiktok';
              
              // Convert VideoInfo to MediaInfo format
              const media: MediaInfo = {
                id: videoInfo.id,
                platform,
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                channel: videoInfo.channel,
                duration: videoInfo.duration,
                views: videoInfo.viewCount,
                uploadDate: videoInfo.uploadDate,
                description: videoInfo.description,
                formats: videoInfo.formats,
                estimatedSize: videoInfo.estimatedSize,
              };
              return { media, url };
            }
          })
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // Extract error message, không include URL nếu error message đã rõ ràng
            const errorMsg = result.reason?.message || 'Lỗi không xác định';
            const url = batch[index];
            
            // Nếu error message đã chứa URL hoặc đủ rõ ràng, chỉ hiển thị error
            // Nếu không, thêm URL vào
            if (errorMsg.includes(url) || errorMsg.length > 100) {
              errors.push(errorMsg);
            } else {
              errors.push(`${url}: ${errorMsg}`);
            }
          }
        });
      }

      if (results.length > 0) {
        setAnalyzedMedia(results);
      }

      if (errors.length > 0 && results.length === 0) {
        setError(errors.join('\n'));
      } else if (errors.length > 0) {
        // Show warning but continue with successful results
        console.warn('Some URLs failed:', errors);
        setError(`Một số URL thất bại:\n${errors.join('\n')}`);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi phân tích URL');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAnalyzedMedia([]);
    setError(null);
  };

  const handleDownloadAll = async () => {
    if (analyzedMedia.length === 0) return;
    
    setDownloadingAll(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const item of analyzedMedia) {
        try {
          // Default format: video 720p
          const request = {
            url: item.url,
            audioOnly: false,
            quality: '720p',
          };

          const job = await createDownload(request);
          addJob({
            ...job,
            title: item.media.title,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
          });
          successCount++;
        } catch (error: any) {
          errors.push(`${item.media.title}: ${error.message || 'Lỗi tạo download job'}`);
        }
      }

      if (successCount > 0) {
        showToast(`Đã bắt đầu tải ${successCount} video`, 'success');
      }
      if (errors.length > 0) {
        showToast(`${errors.length} video thất bại. Xem console để biết chi tiết.`, 'error');
        console.error('Download errors:', errors);
      }
    } catch (err: any) {
      showToast('Lỗi khi tải tất cả video', 'error');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <MainLayout 
      showQueuePanel={true}
      showSidebar={true}
      onVideoSelectFromSearch={handleVideoSelectFromSearch}
    >
      <div className="space-y-6">
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
          <URLInputSection
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            loading={loading}
          />
        </div>

        {/* Analyzed Media Preview Cards */}
        {analyzedMedia.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Kết quả phân tích ({analyzedMedia.length})
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  loading={downloadingAll}
                  variant="primary"
                  size="sm"
                >
                  <DownloadCloud className="w-4 h-4" />
                  Tải tất cả (720p)
                </Button>
                <button
                  onClick={() => setAnalyzedMedia([])}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Xóa tất cả
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {analyzedMedia.map((item, index) => (
                <MediaPreviewCard
                  key={item.media.id || index}
                  media={item.media}
                  mediaUrl={item.url}
                  onDownload={() => {
                    // Optional: Handle download callback
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {analyzedMedia.length === 0 && !loading && !error && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">Chưa có media nào được phân tích</p>
            <p className="text-sm">Nhập URL ở trên để bắt đầu</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
