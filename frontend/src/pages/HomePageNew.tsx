import { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { URLInputSection } from '../components/input/URLInputSection';
import { MediaPreviewCard } from '../components/media/MediaPreviewCard';
import { AlertCircle, DownloadCloud, X } from 'lucide-react';
import { MediaInfo } from '../types/api';
import { analyzeVideo, analyzePlaylist, createDownload, createFacebookDownload, FacebookDownloadRequest } from '../services/api';
import { cn } from '../utils/cn';
import { useDownloadStore } from '../stores/downloadStore';
import { showToast } from '../components/Toast';
import { Button } from '../components/common/Button';
import { isPlaylistUrl } from '../utils/urlValidator';

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
  const [batchQuality, setBatchQuality] = useState<string>('720p');
  const [batchAudioOnly, setBatchAudioOnly] = useState<boolean>(false);
  const [batchAudioFormat, setBatchAudioFormat] = useState<'mp3' | 'webm'>('mp3');
  const [batchAudioBitrate, setBatchAudioBitrate] = useState<number>(128);
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
            // Check if it's a playlist URL (only if it has playlist ID but no video ID)
            const isPlaylist = isPlaylistUrl(url);
            
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
              // Detect platform from URL (auto-detect, backend đã xử lý)
              const urlLower = url.toLowerCase();
              let platform: 'youtube' | 'soundcloud' | 'tiktok' | 'facebook' = 'youtube';
              if (urlLower.includes('tiktok.com')) platform = 'tiktok';
              else if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('m.facebook.com')) platform = 'facebook';
              else if (urlLower.includes('soundcloud.com')) platform = 'soundcloud';
              else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) platform = 'youtube';
              
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
          // Route to correct endpoint based on platform
          if (item.media.platform === 'facebook') {
            // Facebook uses separate endpoint
            const facebookRequest: FacebookDownloadRequest = {
              url: item.url,
              format: batchAudioOnly ? 'audio' : 'video',
              audioFormat: batchAudioOnly ? (batchAudioFormat === 'mp3' ? 'mp3' : 'm4a') : undefined,
              quality: batchAudioOnly ? undefined : (batchQuality as 'best' | '720p' | '480p' | '360p'),
            };
            const facebookJob = await createFacebookDownload(facebookRequest);
            addJob({
              id: facebookJob.jobId,
              url: item.url,
              title: item.media.title,
              status: facebookJob.status as any,
              format: batchAudioOnly ? 'audio' : 'video',
              progress: 0,
              createdAt: new Date(facebookJob.createdAt),
              updatedAt: new Date(facebookJob.createdAt),
            });
            successCount++;
          } else {
            // Other platforms use general download endpoint
            const request = {
              url: item.url,
              audioOnly: batchAudioOnly,
              quality: batchAudioOnly ? undefined : batchQuality, // Quality only for video
              audioFormat: batchAudioOnly ? batchAudioFormat : undefined,
              audioBitrate: batchAudioOnly ? batchAudioBitrate : undefined,
            };

            const job = await createDownload(request);
            addJob({
              ...job,
              title: item.media.title,
              createdAt: new Date(job.createdAt),
              updatedAt: new Date(job.updatedAt),
            });
            successCount++;
          }
        } catch (error: any) {
          errors.push(`${item.media.title}: ${error.message || 'Lỗi tạo download job'}`);
        }
      }

      if (successCount > 0) {
        const formatText = batchAudioOnly ? 'audio' : `video (${batchQuality})`;
        showToast(`Đã bắt đầu tải ${successCount} ${formatText}`, 'success');
      }
      if (errors.length > 0) {
        const formatText = batchAudioOnly ? 'audio' : 'video';
        showToast(`${errors.length} ${formatText} thất bại. Xem console để biết chi tiết.`, 'error');
        console.error('Download errors:', errors);
      }
    } catch (err: any) {
      const formatText = batchAudioOnly ? 'audio' : 'video';
      showToast(`Lỗi khi tải tất cả ${formatText}`, 'error');
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
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Hero Section */}
        {analyzedMedia.length === 0 && !loading && !error && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-accent-500 to-primary-600 p-8 sm:p-12 text-white shadow-lg">
            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-md">
                <DownloadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Media Downloader
              </h1>
              <p className="text-base sm:text-lg text-white/90 max-w-[38rem] mx-auto mb-6">
                Tải video và audio từ YouTube, SoundCloud, TikTok, Facebook với chất lượng cao
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-medium">YouTube</span>
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-medium">SoundCloud</span>
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-medium">TikTok</span>
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 font-medium">Facebook</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={cn(
            'p-4 sm:p-5 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800/50 rounded-xl shadow-sm',
            'flex items-start gap-3 text-error-700 dark:text-error-400',
            'animate-in slide-in-from-top-2 duration-300'
          )}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold mb-1 break-words">Lỗi:</div>
              <div className="text-sm whitespace-pre-line break-words">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-error-500 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* URL Input Section */}
        <div className="bg-background-surface dark:bg-background-surfaceDark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden transition-shadow hover:shadow-md">
          <div className="p-4 sm:p-6 md:p-8">
            <URLInputSection
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              loading={loading}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-background-surface dark:bg-background-surfaceDark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden animate-pulse">
                <div className="aspect-video bg-secondary-200 dark:bg-secondary-800" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-800 rounded w-3/4" />
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analyzed Media Preview Cards */}
        {analyzedMedia.length > 0 && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with Actions */}
            <div className="bg-background-surface dark:bg-background-surfaceDark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-4 sm:p-5 md:p-6 overflow-hidden">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 sm:gap-4 xl:gap-6">
                <div className="flex-shrink-0 min-w-0">
                  <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark mb-1">
                    Kết quả phân tích
                  </h2>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                    {analyzedMedia.length} {analyzedMedia.length === 1 ? 'video' : 'videos'} đã sẵn sàng
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto xl:flex-nowrap min-w-0 max-w-full">
                  {/* Audio/Video Toggle */}
                  <div className="flex items-center gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1 flex-shrink-0">
                    <button
                      onClick={() => setBatchAudioOnly(false)}
                      disabled={downloadingAll}
                      className={cn(
                        'px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap',
                        !batchAudioOnly
                          ? 'bg-background-surface dark:bg-background-surfaceDark text-text-primary-light dark:text-text-primary-dark shadow-sm'
                          : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                      )}
                    >
                      Video
                    </button>
                    <button
                      onClick={() => setBatchAudioOnly(true)}
                      disabled={downloadingAll}
                      className={cn(
                        'px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap',
                        batchAudioOnly
                          ? 'bg-background-surface dark:bg-background-surfaceDark text-text-primary-light dark:text-text-primary-dark shadow-sm'
                          : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                      )}
                    >
                      Audio
                    </button>
                  </div>

                  {/* Quality Selector - Video */}
                  {!batchAudioOnly && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <label className="text-xs sm:text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap flex-shrink-0">
                        Chất lượng:
                      </label>
                      <select
                        value={batchQuality}
                        onChange={(e) => setBatchQuality(e.target.value)}
                        className="px-2.5 py-1.5 text-xs sm:text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-surface dark:bg-background-surfaceDark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-[120px] sm:w-[140px] flex-shrink-0"
                        disabled={downloadingAll}
                      >
                        <option value="best">Tốt nhất</option>
                        <option value="2160p">2160p (4K)</option>
                        <option value="1440p">1440p (2K)</option>
                        <option value="1080p">1080p (Full HD)</option>
                        <option value="720p">720p (HD)</option>
                        <option value="480p">480p (SD)</option>
                        <option value="360p">360p</option>
                        <option value="240p">240p</option>
                        <option value="144p">144p</option>
                      </select>
                    </div>
                  )}

                  {/* Audio Format & Quality Selector - Compact layout to prevent wrapping */}
                  {batchAudioOnly && (
                    <>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <label className="text-xs sm:text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap flex-shrink-0">
                          Định dạng:
                        </label>
                        <select
                          value={batchAudioFormat}
                          onChange={(e) => setBatchAudioFormat(e.target.value as 'mp3' | 'webm')}
                          className="px-2.5 py-1.5 text-xs sm:text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-surface dark:bg-background-surfaceDark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-[75px] sm:w-[85px] flex-shrink-0"
                          disabled={downloadingAll}
                        >
                          <option value="mp3">MP3</option>
                          <option value="webm">WebM</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <label className="text-xs sm:text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap flex-shrink-0">
                          Chất lượng:
                        </label>
                        <select
                          value={batchAudioBitrate}
                          onChange={(e) => setBatchAudioBitrate(parseInt(e.target.value))}
                          className="px-2.5 py-1.5 text-xs sm:text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-surface dark:bg-background-surfaceDark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-[110px] sm:w-[125px] flex-shrink-0"
                          disabled={downloadingAll}
                        >
                          <option value={32}>32 kbps</option>
                          <option value={64}>64 kbps</option>
                          <option value={96}>96 kbps</option>
                          <option value={128}>128 kbps</option>
                          <option value={160}>160 kbps</option>
                          <option value={192}>192 kbps</option>
                          <option value={256}>256 kbps</option>
                          <option value={320}>320 kbps</option>
                        </select>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll || analyzedMedia.length === 0}
                    loading={downloadingAll}
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    <DownloadCloud className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden md:inline truncate whitespace-nowrap">
                      {batchAudioOnly 
                        ? `Tải tất cả (${batchAudioFormat.toUpperCase()} ${batchAudioBitrate}kbps)`
                        : `Tải tất cả (${batchQuality})`
                      }
                    </span>
                    <span className="md:hidden whitespace-nowrap">
                      Tải tất cả
                    </span>
                  </Button>
                  <button
                    onClick={() => setAnalyzedMedia([])}
                    className="px-3 py-2 text-xs sm:text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800/50 transition-all border border-border-light dark:border-border-dark whitespace-nowrap flex-shrink-0"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {analyzedMedia.map((item, index) => (
                <div
                  key={item.media.id || `media-${index}`}
                  className="animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MediaPreviewCard
                    media={item.media}
                    mediaUrl={item.url}
                    onDownload={() => {}}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {analyzedMedia.length === 0 && !loading && !error && (
          <div className="text-center py-16 sm:py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-primary-100 dark:bg-primary-900/30 rounded-2xl mb-6">
              <DownloadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
              Bắt đầu tải media
            </h3>
            <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-md mx-auto mb-6">
              Nhập URL YouTube, SoundCloud, TikTok hoặc Facebook ở trên để phân tích và tải về
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-full text-text-secondary-light dark:text-text-secondary-dark">YouTube</span>
              <span className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-full text-text-secondary-light dark:text-text-secondary-dark">SoundCloud</span>
              <span className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-full text-text-secondary-light dark:text-text-secondary-dark">TikTok</span>
              <span className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-full text-text-secondary-light dark:text-text-secondary-dark">Facebook</span>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
