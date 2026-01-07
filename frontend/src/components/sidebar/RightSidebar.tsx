import { MediaInfo } from '../../types/api';
import { Clock, Eye, User, Calendar, TrendingUp, Info, Download, FileVideo, Music, Zap, HardDrive, BarChart3, Layers, Search, Trash2, DownloadCloud, Activity, TrendingDown, Award, Sparkles, Globe, Youtube, Music2, Video, Lightbulb, HelpCircle, Rocket, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDownloadStore } from '../../stores/downloadStore';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface RightSidebarProps {
  selectedVideo?: MediaInfo | null;
  className?: string;
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

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Helper to extract platform from URL
function getPlatformFromUrl(url: string): 'youtube' | 'soundcloud' | 'tiktok' | 'all' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'all';
}

export function RightSidebar({ selectedVideo, className }: RightSidebarProps) {
  const jobs = useDownloadStore((state) => state.getAllJobs());
  const removeJob = useDownloadStore((state) => state.removeJob);
  const [activeTab, setActiveTab] = useState<'overview' | 'recent' | 'stats'>('overview');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'youtube' | 'soundcloud' | 'tiktok'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const filtered = platformFilter === 'all' 
      ? jobs 
      : jobs.filter(j => getPlatformFromUrl(j.url) === platformFilter);
    
    return {
      total: filtered.length,
      completed: filtered.filter(j => j.status === 'completed').length,
      downloading: filtered.filter(j => j.status === 'downloading' || j.status === 'processing').length,
      pending: filtered.filter(j => j.status === 'pending').length,
      failed: filtered.filter(j => j.status === 'error').length,
    };
  }, [jobs, platformFilter]);

  // Platform stats
  const platformStats = useMemo(() => {
    const platforms = {
      youtube: jobs.filter(j => getPlatformFromUrl(j.url) === 'youtube'),
      soundcloud: jobs.filter(j => getPlatformFromUrl(j.url) === 'soundcloud'),
      tiktok: jobs.filter(j => getPlatformFromUrl(j.url) === 'tiktok'),
    };
    return {
      youtube: {
        total: platforms.youtube.length,
        completed: platforms.youtube.filter(j => j.status === 'completed').length,
      },
      soundcloud: {
        total: platforms.soundcloud.length,
        completed: platforms.soundcloud.filter(j => j.status === 'completed').length,
      },
      tiktok: {
        total: platforms.tiktok.length,
        completed: platforms.tiktok.filter(j => j.status === 'completed').length,
      },
    };
  }, [jobs]);

  // Recent downloads
  const recentDownloads = useMemo(() => {
    let filtered = jobs
      .filter(j => j.status === 'completed')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);
    
    if (platformFilter !== 'all') {
      filtered = filtered.filter(j => getPlatformFromUrl(j.url) === platformFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(j => 
        j.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [jobs, platformFilter, searchQuery]);

  // Storage info
  const storageInfo = useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.fileSize);
    const totalSize = completedJobs.reduce((sum, job) => sum + (job.fileSize || 0), 0);
    const avgSize = completedJobs.length > 0 ? totalSize / completedJobs.length : 0;
    
    return {
      totalSize,
      fileCount: completedJobs.length,
      avgSize,
    };
  }, [jobs]);

  // Calculate success rate
  const successRate = stats.total > 0 
    ? ((stats.completed / stats.total) * 100).toFixed(0)
    : '0';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const clearCompleted = () => {
    jobs
      .filter(j => j.status === 'completed')
      .forEach(job => removeJob(job.id));
  };

  return (
    <div className={cn('h-full flex flex-col bg-background-surface dark:bg-background-surfaceDark border-l border-border-light dark:border-border-dark overflow-hidden', className)}>
      {/* Header with Tabs */}
      <div className="p-4 border-b border-border-light dark:border-border-dark bg-gradient-to-r from-[#74B9FF]/5 to-[#A29BFE]/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#74B9FF]" />
            Thông tin
          </h2>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200',
              activeTab === 'overview'
                ? 'bg-background-surface dark:bg-background-surfaceDark text-[#74B9FF] shadow-sm'
                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            )}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200',
              activeTab === 'recent'
                ? 'bg-background-surface dark:bg-background-surfaceDark text-[#74B9FF] shadow-sm'
                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            )}
          >
            Gần đây
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200',
              activeTab === 'stats'
                ? 'bg-background-surface dark:bg-background-surfaceDark text-[#74B9FF] shadow-sm'
                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            )}
          >
            Thống kê
          </button>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Selected Video Info */}
      {selectedVideo ? (
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
            <FileVideo className="w-4 h-4 text-[#74B9FF]" />
            Video đã chọn
          </h3>
          <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden group border border-border-light dark:border-border-dark">
              <img
                src={selectedVideo.thumbnail}
                alt={selectedVideo.title}
                className="w-full aspect-video object-cover transition-transform group-hover:scale-105"
              />
              {selectedVideo.platform && (
                <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-black/80 text-white rounded-lg capitalize backdrop-blur-sm">
                    {selectedVideo.platform}
                  </span>
                </div>
              )}
            </div>
            <div>
                <h4 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark line-clamp-2 mb-2">
                {selectedVideo.title}
              </h4>
                <div className="space-y-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {selectedVideo.channel && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 flex-shrink-0 text-[#74B9FF]" />
                    <span className="truncate">{selectedVideo.channel}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 text-[#74B9FF]" />
                  <span>{formatDuration(selectedVideo.duration)}</span>
                </div>
                {selectedVideo.views && (
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 flex-shrink-0 text-[#74B9FF]" />
                    <span>{formatNumber(selectedVideo.views)} lượt xem</span>
                  </div>
                )}
                {selectedVideo.uploadDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-[#74B9FF]" />
                    <span>{formatDate(selectedVideo.uploadDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
              <div className="p-4 border-b border-border-light dark:border-border-dark">
          <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#74B9FF]/20 to-[#A29BFE]/20 flex items-center justify-center mb-3">
                    <Info className="w-6 h-6 text-[#74B9FF]" />
            </div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Chọn video từ kết quả phân tích để xem thông tin chi tiết
            </p>
          </div>
        </div>
      )}

            {/* Quick Stats Card */}
            <div className="p-4 border-b border-border-light dark:border-border-dark">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#74B9FF]" />
                Thống kê nhanh
        </h3>
              <div className="space-y-3">
          {/* Success Rate */}
                <div className="p-3 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-xl border border-success-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">Tỷ lệ thành công</span>
                    <span className="text-xl font-bold text-success-500">{successRate}%</span>
            </div>
                  <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5 overflow-hidden">
              <div 
                      className="bg-gradient-to-r from-success-500 to-success-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>

                {/* Storage Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gradient-to-br from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-xl border border-[#74B9FF]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-[#74B9FF]" />
                      <span className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">Dung lượng</span>
                    </div>
                    <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">{formatSize(storageInfo.totalSize)}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-[#A29BFE]/10 to-[#A29BFE]/5 dark:from-[#A29BFE]/20 dark:to-[#A29BFE]/10 rounded-xl border border-[#A29BFE]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <FileVideo className="w-3.5 h-3.5 text-[#A29BFE]" />
                      <span className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">Số file</span>
                    </div>
                    <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">{storageInfo.fileCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-border-light dark:border-border-dark">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-[#74B9FF]" />
                Hành động nhanh
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/downloads"
                  className="p-3 bg-gradient-to-br from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-xl border border-[#74B9FF]/20 hover:border-[#74B9FF] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="w-4 h-4 text-[#74B9FF] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">Downloads</span>
                  </div>
                  <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Xem tất cả</p>
                </Link>
                <Link
                  to="/history"
                  className="p-3 bg-gradient-to-br from-[#A29BFE]/10 to-[#A29BFE]/5 dark:from-[#A29BFE]/20 dark:to-[#A29BFE]/10 rounded-xl border border-[#A29BFE]/20 hover:border-[#A29BFE] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-[#A29BFE] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">Lịch sử</span>
                  </div>
                  <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Xem gần đây</p>
                </Link>
              </div>
            </div>

            {/* Tips & Tricks */}
            <div className="p-4 border-b border-border-light dark:border-border-dark">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning-500" />
                Mẹo hữu ích
              </h3>
              <div className="space-y-2">
                <div className="p-2.5 bg-gradient-to-r from-warning-500/10 to-warning-500/5 dark:from-warning-500/20 dark:to-warning-500/10 rounded-lg border border-warning-500/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-warning-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-primary-light dark:text-text-primary-dark">
                      <span className="font-semibold">Tip:</span> Bạn có thể tải nhiều video cùng lúc bằng cách nhập nhiều URL, mỗi URL một dòng
                    </p>
                  </div>
                </div>
                <div className="p-2.5 bg-gradient-to-r from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-lg border border-[#74B9FF]/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#74B9FF] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-primary-light dark:text-text-primary-dark">
                      <span className="font-semibold">Tip:</span> Sử dụng Ctrl+K để tìm kiếm nhanh trong header
                    </p>
                  </div>
                </div>
                <div className="p-2.5 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-lg border border-success-500/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-primary-light dark:text-text-primary-dark">
                      <span className="font-semibold">Tip:</span> Chọn format phù hợp để tiết kiệm dung lượng
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Downloads Preview */}
            {stats.downloading > 0 && (
              <div className="p-4 border-b border-border-light dark:border-border-dark">
                <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning-500 animate-pulse" />
                  Đang tải ({stats.downloading})
                </h3>
                <div className="space-y-2">
                  {jobs
                    .filter(j => j.status === 'downloading' || j.status === 'processing')
                    .slice(0, 3)
                    .map((job) => (
                      <div
                        key={job.id}
                        className="p-2.5 bg-gradient-to-r from-warning-500/10 to-warning-500/5 dark:from-warning-500/20 dark:to-warning-500/10 rounded-lg border border-warning-500/20"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark line-clamp-1">
                            {job.title || 'Đang tải...'}
                          </p>
                          <span className="text-[10px] font-bold text-warning-500">
                            {job.progress ? `${Math.round(job.progress)}%` : '...'}
                          </span>
                        </div>
                        {job.progress !== undefined && (
                          <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-warning-500 to-warning-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  {stats.downloading > 3 && (
                    <Link
                      to="/downloads"
                      className="block text-center text-xs text-[#74B9FF] hover:text-[#81CFE0] font-semibold py-1"
                    >
                      Xem tất cả ({stats.downloading})
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Platform Quick Stats */}
            <div className="p-4 border-b border-border-light dark:border-border-dark">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#74B9FF]" />
                Nền tảng
              </h3>
              <div className="space-y-2">
                {platformStats.youtube.total > 0 && (
                  <div className="flex items-center justify-between p-2 bg-error-500/10 dark:bg-error-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-error-500" />
                      <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">YouTube</span>
                    </div>
                    <span className="text-xs font-bold text-error-500">{platformStats.youtube.total}</span>
                  </div>
                )}
                {platformStats.soundcloud.total > 0 && (
                  <div className="flex items-center justify-between p-2 bg-warning-500/10 dark:bg-warning-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-warning-500" />
                      <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">SoundCloud</span>
                    </div>
                    <span className="text-xs font-bold text-warning-500">{platformStats.soundcloud.total}</span>
                  </div>
                )}
                {platformStats.tiktok.total > 0 && (
                  <div className="flex items-center justify-between p-2 bg-secondary-500/10 dark:bg-secondary-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-secondary-700 dark:text-secondary-300" />
                      <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">TikTok</span>
                    </div>
                    <span className="text-xs font-bold text-secondary-700 dark:text-secondary-300">{platformStats.tiktok.total}</span>
                  </div>
                )}
                {platformStats.youtube.total === 0 && platformStats.soundcloud.total === 0 && platformStats.tiktok.total === 0 && (
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center py-2">
                    Chưa có downloads
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Recent Downloads Tab */}
        {activeTab === 'recent' && (
          <div className="p-4">
            {/* Search & Filter */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-10 pr-3 py-2 text-sm bg-secondary-100 dark:bg-secondary-800 border border-border-light dark:border-border-dark rounded-xl text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-[#74B9FF] focus:border-[#74B9FF] transition-all"
                />
              </div>
              
              {/* Platform Filter */}
              <div className="flex items-center gap-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                <button
                  onClick={() => setPlatformFilter('all')}
                  className={cn(
                    'flex-1 px-2 py-1 text-xs font-semibold rounded-md transition-all',
                    platformFilter === 'all'
                      ? 'bg-background-surface dark:bg-background-surfaceDark text-[#74B9FF] shadow-sm'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                  )}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setPlatformFilter('youtube')}
                  className={cn(
                    'flex-1 px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1',
                    platformFilter === 'youtube'
                      ? 'bg-background-surface dark:bg-background-surfaceDark text-error-500 shadow-sm'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                  )}
                >
                  <Youtube className="w-3 h-3" />
                  YT
                </button>
                <button
                  onClick={() => setPlatformFilter('soundcloud')}
                  className={cn(
                    'flex-1 px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1',
                    platformFilter === 'soundcloud'
                      ? 'bg-background-surface dark:bg-background-surfaceDark text-warning-500 shadow-sm'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                  )}
                >
                  <Music2 className="w-3 h-3" />
                  SC
                </button>
                <button
                  onClick={() => setPlatformFilter('tiktok')}
                  className={cn(
                    'flex-1 px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1',
                    platformFilter === 'tiktok'
                      ? 'bg-background-surface dark:bg-background-surfaceDark text-secondary-900 dark:text-secondary-100 shadow-sm'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                  )}
                >
                  <Video className="w-3 h-3" />
                  TT
                </button>
              </div>
            </div>

            {/* Recent Downloads List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#74B9FF]" />
                  Downloads gần đây ({recentDownloads.length})
                </h3>
                {recentDownloads.length > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="p-1.5 hover:bg-error-500/10 rounded-lg transition-colors"
                    title="Xóa tất cả đã hoàn thành"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-error-500" />
                  </button>
                )}
              </div>
              
              {recentDownloads.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {recentDownloads.map((job) => (
                    <Link
                      key={job.id}
                      to="/downloads"
                      className="block p-3 bg-background-surface dark:bg-background-surfaceDark rounded-xl border border-border-light dark:border-border-dark hover:border-[#74B9FF] hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          getPlatformFromUrl(job.url) === 'youtube' && 'bg-error-500/10',
                          getPlatformFromUrl(job.url) === 'soundcloud' && 'bg-warning-500/10',
                          getPlatformFromUrl(job.url) === 'tiktok' && 'bg-secondary-500/10'
                        )}>
                          {getPlatformFromUrl(job.url) === 'youtube' && <Youtube className="w-5 h-5 text-error-500" />}
                          {getPlatformFromUrl(job.url) === 'soundcloud' && <Music2 className="w-5 h-5 text-warning-500" />}
                          {getPlatformFromUrl(job.url) === 'tiktok' && <Video className="w-5 h-5 text-secondary-700 dark:text-secondary-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark line-clamp-1 mb-1 group-hover:text-[#74B9FF] transition-colors">
                            {job.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <span className="px-1.5 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 rounded text-[10px] font-semibold">
                              Hoàn thành
                            </span>
                            {job.fileSize && (
                              <span>{formatSize(job.fileSize)}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(job.updatedAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center mx-auto mb-3">
                    <DownloadCloud className="w-8 h-8 text-text-muted-light dark:text-text-muted-dark" />
                  </div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Chưa có downloads gần đây
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="p-4 space-y-4">
            {/* Overall Stats */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#74B9FF]" />
                Tổng quan
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-xl border border-[#74B9FF]/20">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#74B9FF]" />
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Tổng số:</span>
                  </div>
                  <span className="text-lg font-bold text-[#74B9FF]">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-xl border border-success-500/20">
                <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-success-500" />
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Hoàn thành:</span>
                  </div>
                  <span className="text-lg font-bold text-success-500">{stats.completed}</span>
                </div>
                {stats.downloading > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-warning-500/10 to-warning-500/5 dark:from-warning-500/20 dark:to-warning-500/10 rounded-xl border border-warning-500/20">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-warning-500 animate-pulse" />
                      <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Đang tải:</span>
                    </div>
                    <span className="text-lg font-bold text-warning-500">{stats.downloading}</span>
              </div>
            )}
            {stats.failed > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-error-500/10 to-error-500/5 dark:from-error-500/20 dark:to-error-500/10 rounded-xl border border-error-500/20">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-error-500" />
                      <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Thất bại:</span>
                    </div>
                    <span className="text-lg font-bold text-error-500">{stats.failed}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Platform Stats */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#74B9FF]" />
                Theo nền tảng
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-error-500/10 dark:bg-error-500/20 rounded-xl border border-error-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-error-500" />
                      <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">YouTube</span>
                    </div>
                    <span className="text-sm font-bold text-error-500">{platformStats.youtube.total}</span>
                  </div>
                  <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {platformStats.youtube.completed} hoàn thành
                  </div>
                </div>
                <div className="p-3 bg-warning-500/10 dark:bg-warning-500/20 rounded-xl border border-warning-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-warning-500" />
                      <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">SoundCloud</span>
                    </div>
                    <span className="text-sm font-bold text-warning-500">{platformStats.soundcloud.total}</span>
                  </div>
                  <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {platformStats.soundcloud.completed} hoàn thành
                  </div>
                </div>
                <div className="p-3 bg-secondary-500/10 dark:bg-secondary-500/20 rounded-xl border border-secondary-500/20">
                  <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-secondary-700 dark:text-secondary-300" />
                      <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">TikTok</span>
                    </div>
                    <span className="text-sm font-bold text-secondary-700 dark:text-secondary-300">{platformStats.tiktok.total}</span>
                  </div>
                  <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {platformStats.tiktok.completed} hoàn thành
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#74B9FF]" />
                Hiệu suất
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-r from-[#74B9FF]/10 to-[#A29BFE]/10 dark:from-[#74B9FF]/20 dark:to-[#A29BFE]/20 rounded-xl border border-[#74B9FF]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Dung lượng trung bình</span>
                    <span className="text-sm font-bold text-[#74B9FF]">{formatSize(storageInfo.avgSize)}</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-xl border border-success-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Tỷ lệ thành công</span>
                    <span className="text-sm font-bold text-success-500">{successRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="p-4 border-b border-border-light dark:border-border-dark">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#74B9FF]" />
                Phím tắt
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
                  <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Tìm kiếm</span>
                  <kbd className="px-2 py-0.5 bg-background-surface dark:bg-background-surfaceDark rounded text-[10px] font-mono text-[#74B9FF] border border-[#74B9FF]/20">Ctrl+K</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
                  <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Đóng menu</span>
                  <kbd className="px-2 py-0.5 bg-background-surface dark:bg-background-surfaceDark rounded text-[10px] font-mono text-[#74B9FF] border border-[#74B9FF]/20">Esc</kbd>
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            {recentDownloads.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#74B9FF]" />
                  Hoạt động gần đây
                </h3>
                <div className="space-y-2">
                  {recentDownloads.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="p-2 bg-gradient-to-r from-success-500/5 to-success-500/0 dark:from-success-500/10 dark:to-success-500/0 rounded-lg border border-success-500/10"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-success-500 flex-shrink-0" />
                        <p className="text-xs font-medium text-text-primary-light dark:text-text-primary-dark line-clamp-1">
                          {job.title}
                        </p>
                      </div>
                      <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">
                        {new Date(job.updatedAt).toLocaleString('vi-VN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Video Details - Only show in Overview */}
        {activeTab === 'overview' && selectedVideo && (
        <>
          {/* Format Information - Enhanced */}
          {selectedVideo.formats && selectedVideo.formats.length > 0 && (() => {
            // Phân loại formats thành video và audio
            const videoFormats = selectedVideo.formats.filter(f => f.vcodec && f.vcodec !== 'none');
            const audioFormats = selectedVideo.formats.filter(f => !f.vcodec || f.vcodec === 'none');
            
            const formatFileSize = (bytes?: number): string => {
              if (!bytes) return 'N/A';
              if (bytes >= 1024 * 1024 * 1024) {
                return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
              }
              if (bytes >= 1024 * 1024) {
                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
              }
              return `${(bytes / 1024).toFixed(1)} KB`;
            };

            const getFormatLabel = (format: typeof selectedVideo.formats[0]): string => {
              if (format.resolution) return format.resolution;
              if (format.quality) return format.quality;
              if (format.height) return `${format.height}p`;
              return format.ext?.toUpperCase() || 'Unknown';
            };

            return (
              <div className="p-4 border-b border-border-light dark:border-border-dark">
                <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#74B9FF]" />
                  Định dạng có sẵn
                </h3>
                <div className="space-y-4">
                  {/* Video Formats */}
                  {videoFormats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileVideo className="w-3.5 h-3.5 text-[#74B9FF]" />
                        <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark uppercase tracking-wide">
                          Video ({videoFormats.length})
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {videoFormats.slice(0, 8).map((format, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-gradient-to-r from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-xl border border-[#74B9FF]/20"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">
                                  {getFormatLabel(format)}
                                </span>
                                {format.ext && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#74B9FF]/20 text-[#74B9FF] dark:text-[#81CFE0] rounded-lg uppercase">
                                    {format.ext}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                                {formatFileSize(format.filesize)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-text-secondary-light dark:text-text-secondary-dark">
                              {format.vcodec && (
                                <span>Video: {format.vcodec}</span>
                              )}
                              {format.acodec && (
                                <span>Audio: {format.acodec}</span>
                              )}
                              {format.fps && (
                                <span>{format.fps} fps</span>
                              )}
                              {format.vbr && (
                                <span>VBR: {Math.round(format.vbr / 1000)}k</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {videoFormats.length > 8 && (
                        <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark text-center mt-1.5">
                          +{videoFormats.length - 8} định dạng video khác
                        </p>
                      )}
                    </div>
                  )}

                  {/* Audio Formats */}
                  {audioFormats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark uppercase tracking-wide">
                          Audio ({audioFormats.length})
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {audioFormats.slice(0, 6).map((format, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-xl border border-success-500/20"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">
                                  {format.abr ? `${Math.round(format.abr / 1000)}kbps` : 'Best Quality'}
                                </span>
                                {format.ext && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-success-500/20 text-success-600 dark:text-success-400 rounded-lg uppercase">
                                    {format.ext}
                                  </span>
                                )}
                                {format.acodec && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-secondary-100 dark:bg-secondary-800 text-text-secondary-light dark:text-text-secondary-dark rounded-lg">
                                    {format.acodec}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                                {formatFileSize(format.filesize)}
                              </span>
                            </div>
                            {format.abr && (
                              <div className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">
                                Bitrate: {format.abr} bps
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {audioFormats.length > 6 && (
                        <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark text-center mt-1.5">
                          +{audioFormats.length - 6} định dạng audio khác
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Video Statistics */}
                <div className="p-4 border-b border-border-light dark:border-border-dark">
                  <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#74B9FF]" />
              Thống kê video
            </h3>
            <div className="space-y-2.5">
              {selectedVideo.duration && (
                      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-xl border border-[#74B9FF]/20">
                        <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">Tỷ lệ khung hình</span>
                        <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">16:9</span>
                </div>
              )}
              {selectedVideo.estimatedSize && (
                      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-[#A29BFE]/10 to-[#A29BFE]/5 dark:from-[#A29BFE]/20 dark:to-[#A29BFE]/10 rounded-xl border border-[#A29BFE]/20">
                        <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">Dung lượng ước tính</span>
                        <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
                    {selectedVideo.estimatedSize >= 1024 * 1024 * 1024
                      ? `${(selectedVideo.estimatedSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
                      : selectedVideo.estimatedSize >= 1024 * 1024
                      ? `${(selectedVideo.estimatedSize / (1024 * 1024)).toFixed(1)} MB`
                      : `${(selectedVideo.estimatedSize / 1024).toFixed(1)} KB`}
                  </span>
                </div>
              )}
              {selectedVideo.platform && (
                      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-xl border border-success-500/20">
                        <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">Nền tảng</span>
                        <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark capitalize">
                    {selectedVideo.platform}
                  </span>
                </div>
              )}
              {selectedVideo.views && (
                      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-warning-500/10 to-warning-500/5 dark:from-warning-500/20 dark:to-warning-500/10 rounded-xl border border-warning-500/20">
                        <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">Engagement rate</span>
                        <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
                    {selectedVideo.duration
                      ? ((selectedVideo.views / (selectedVideo.duration / 60)) * 1000).toFixed(0)
                      : 'N/A'} /phút
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Download History for this video */}
          {selectedVideo.id && (
                  <div className="p-4 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[#74B9FF]" />
                Lịch sử tải
              </h3>
                    {jobs.filter(j => j.title === selectedVideo.title || j.url.includes(selectedVideo.id || '')).length > 0 ? (
                <div className="space-y-2">
                  {jobs
                          .filter(j => j.title === selectedVideo.title || j.url.includes(selectedVideo.id || ''))
                    .slice(0, 3)
                    .map((job) => (
                      <div
                        key={job.id}
                              className="p-2.5 bg-gradient-to-r from-secondary-100 to-secondary-50 dark:from-secondary-800 dark:to-secondary-700 rounded-xl border border-border-light dark:border-border-dark text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                            {job.format || 'Video'}
                          </span>
                          <span
                            className={cn(
                                    'px-1.5 py-0.5 rounded-lg text-[10px] font-semibold',
                              job.status === 'completed'
                                      ? 'bg-success-500/20 text-success-600 dark:text-success-400'
                                : job.status === 'error'
                                      ? 'bg-error-500/20 text-error-600 dark:text-error-400'
                                      : 'bg-[#74B9FF]/20 text-[#74B9FF] dark:text-[#81CFE0]'
                            )}
                          >
                            {job.status === 'completed' ? 'Hoàn thành' : job.status === 'error' ? 'Lỗi' : 'Đang xử lý'}
                          </span>
                        </div>
                        {job.createdAt && (
                                <div className="text-text-secondary-light dark:text-text-secondary-dark">
                            {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center py-2">
                  Chưa có lịch sử tải cho video này
                </p>
              )}
            </div>
          )}
        </>
            )}
        </div>
    </div>
  );
}

