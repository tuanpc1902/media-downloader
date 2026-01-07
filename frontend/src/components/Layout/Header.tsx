import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Download, Settings, History, Database, Search, Zap, TrendingUp, Menu, X, MoreVertical, Clock, Keyboard, Bell, Sparkles } from 'lucide-react';
import { DarkModeToggle } from '../DarkModeToggle';
import { useDownloadStore } from '../../stores/downloadStore';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { cn } from '../../utils/cn';
import { checkRedisHealth } from '../../services/api';
import { Logo } from '../common/Logo';

export const Header = memo(function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [redisConnected, setRedisConnected] = useState<boolean | null>(null);
  const [isCheckingRedis, setIsCheckingRedis] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  const jobs = useDownloadStore((state) => state.getAllJobs());
  
  // Memoized computations for performance
  const activeJobs = useMemo(() => 
    jobs.filter(job => 
      job.status === 'downloading' || job.status === 'processing' || job.status === 'pending'
    ).length,
    [jobs]
  );
  
  const completedToday = useMemo(() => {
    const today = new Date();
    return jobs.filter(job => {
      if (job.status !== 'completed') return false;
      const completedDate = new Date(job.updatedAt);
      return completedDate.toDateString() === today.toDateString();
    }).length;
  }, [jobs]);

  const recentDownloads = useMemo(() => 
    jobs
      .filter(job => job.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5),
    [jobs]
  );

  const totalDownloads = useMemo(() => 
    jobs.filter(job => job.status === 'completed').length,
    [jobs]
  );
  
  const totalSize = useMemo(() => 
    jobs
      .filter(job => job.status === 'completed' && job.fileSize)
      .reduce((sum, job) => sum + (job.fileSize || 0), 0),
    [jobs]
  );
  
  const formatSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }, []);

  // Check Redis status
  useEffect(() => {
    const checkRedis = async () => {
      try {
        const health = await checkRedisHealth();
        setRedisConnected(health.redis.connected);
        console.log('Redis connected:', health.redis.connected);
      } catch (error) {
        console.error('Failed to check Redis health:', error);
        setRedisConnected(false);
      } finally {
        setIsCheckingRedis(false);
      }
    };

    checkRedis();
    // Check every 3 seconds
    const interval = setInterval(checkRedis, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const isHomePage = location.pathname === '/';

  // Quick search handler - memoized
  const handleQuickSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/');
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  // Toggle search on mobile
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowQuickActions(false);
        setShowNotifications(false);
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background-surface/95 dark:bg-background-surfaceDark/95 border-b border-border-light dark:border-border-dark backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className={cn(
          'flex items-center justify-between',
          'h-14 md:h-16'
        )}>
          {/* Logo & Navigation */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0 flex-1">
            <Link 
              to="/" 
              className="flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-90 transition-all duration-300 group flex-shrink-0"
              onClick={() => setShowMobileMenu(false)}
            >
              <div className="relative">
                <Logo size="md" animated={true} />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-[#74B9FF]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
              <div className="hidden sm:flex flex-col min-w-0 max-w-[200px] md:max-w-none">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-[#74B9FF] via-[#A29BFE] to-[#00CEC9] bg-clip-text text-transparent truncate">
                    Media Downloader
                  </span>
                  {activeJobs > 0 && (
                    <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-[#74B9FF]/10 text-[#74B9FF] dark:text-[#81CFE0] rounded-full text-xs font-semibold animate-pulse-soft">
                      <Zap className="w-3 h-3" />
                      {activeJobs}
                    </span>
                  )}
                </div>
                {isHomePage && (
                  <span className="hidden md:block text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                    Tải video và audio từ YouTube, SoundCloud, TikTok, Facebook
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2 ml-4 xl:ml-6">
              <Link
                to="/"
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group',
                  isActive('/')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md shadow-[#74B9FF]/40'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Home className={cn('w-4 h-4 transition-transform duration-300 flex-shrink-0', isActive('/') ? 'fill-current' : 'group-hover:scale-110')} />
                  <span className="whitespace-nowrap">Trang chủ</span>
                </div>
                {isActive('/') && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </Link>
              
              <Link
                to="/downloads"
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group',
                  isActive('/downloads')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md shadow-[#74B9FF]/40'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Download className={cn('w-4 h-4 transition-transform duration-300 flex-shrink-0', isActive('/downloads') ? 'fill-current' : 'group-hover:scale-110')} />
                  <span className="whitespace-nowrap">Downloads</span>
                  {activeJobs > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/25 text-white text-xs rounded-full font-bold min-w-[20px] text-center whitespace-nowrap flex-shrink-0">
                      {activeJobs > 9 ? '9+' : activeJobs}
                    </span>
                  )}
                </div>
                {isActive('/downloads') && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </Link>

              <Link
                to="/history"
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group',
                  isActive('/history')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md shadow-[#74B9FF]/40'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <History className={cn('w-4 h-4 transition-transform duration-300 flex-shrink-0', isActive('/history') ? 'fill-current' : 'group-hover:scale-110')} />
                  <span className="whitespace-nowrap">Lịch sử</span>
                  {completedToday > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/25 text-white text-xs rounded-full font-bold whitespace-nowrap flex-shrink-0">
                      {completedToday}
                    </span>
                  )}
                </div>
                {isActive('/history') && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </Link>
            </nav>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-shrink-0">
            {/* Quick Search - Desktop */}
            <div className="hidden md:flex items-center relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  'p-2.5 rounded-xl text-text-secondary-light dark:text-text-secondary-dark transition-all duration-200',
                  'hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20',
                  showSearch && 'text-[#74B9FF] dark:text-[#81CFE0] bg-[#74B9FF]/10 dark:bg-[#74B9FF]/20'
                )}
                title="Tìm kiếm nhanh (Ctrl+K)"
              >
                <Search className="w-5 h-5" />
              </button>
              {showSearch && (
                <form
                  onSubmit={handleQuickSearch}
                  className="absolute top-full right-0 mt-2 w-96 bg-background-surface dark:bg-background-surfaceDark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark p-4 animate-in slide-in-from-top-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-[#74B9FF] flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm video, playlist..."
                      className="flex-1 bg-transparent text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                      className="p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Stats Badge - Desktop */}
            {completedToday > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-success-500/10 to-success-500/5 text-success-600 dark:text-success-400 border border-success-500/30 whitespace-nowrap">
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap">{completedToday} hôm nay</span>
              </div>
            )}

            {/* Redis Connection Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary-100 dark:bg-secondary-800/50 transition-all duration-200 hover:bg-secondary-200 dark:hover:bg-secondary-700/50 whitespace-nowrap">
              {isCheckingRedis ? (
                <>
                  <Database className="w-4 h-4 text-text-muted-light dark:text-text-muted-dark animate-pulse flex-shrink-0" />
                  <span className="hidden lg:inline text-xs text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">Đang kiểm tra...</span>
                </>
              ) : redisConnected ? (
                <>
                  <Database className="w-4 h-4 text-success-500 animate-pulse-soft flex-shrink-0" />
                  <span className="hidden lg:inline text-xs text-success-600 dark:text-success-400 font-medium whitespace-nowrap">Redis</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-error-500 flex-shrink-0" />
                  <span className="hidden lg:inline text-xs text-error-600 dark:text-error-400 font-medium whitespace-nowrap">Redis</span>
                </>
              )}
            </div>

            {/* Queue Count Badge */}
            {activeJobs > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] text-white shadow-md shadow-[#74B9FF]/40 whitespace-nowrap">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  <span className="hidden lg:inline">{activeJobs} đang tải</span>
                  <span className="lg:hidden">{activeJobs}</span>
                </span>
              </div>
            )}

            {/* Notifications */}
            <div className="hidden md:block relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  'p-2.5 rounded-xl text-text-secondary-light dark:text-text-secondary-dark transition-all duration-200 relative',
                  'hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20',
                  showNotifications && 'text-[#74B9FF] dark:text-[#81CFE0] bg-[#74B9FF]/10 dark:bg-[#74B9FF]/20'
                )}
                title="Thông báo"
              >
                <Bell className="w-5 h-5" />
                {activeJobs > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FD79A8] rounded-full animate-pulse border-2 border-background-surface dark:border-background-surfaceDark" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-background-surface dark:bg-background-surfaceDark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark p-4 animate-in slide-in-from-top-2 z-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Thông báo</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeJobs > 0 && (
                      <div className="p-3 bg-gradient-to-r from-[#74B9FF]/10 to-[#74B9FF]/5 dark:from-[#74B9FF]/20 dark:to-[#74B9FF]/10 rounded-xl border border-[#74B9FF]/30">
                        <div className="flex items-center gap-2.5">
                          <Zap className="w-4 h-4 text-[#74B9FF] flex-shrink-0" />
                          <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                            {activeJobs} download đang chạy
                          </span>
                        </div>
                      </div>
                    )}
                    {completedToday > 0 && (
                      <div className="p-3 bg-gradient-to-r from-success-500/10 to-success-500/5 dark:from-success-500/20 dark:to-success-500/10 rounded-xl border border-success-500/30">
                        <div className="flex items-center gap-2.5">
                          <TrendingUp className="w-4 h-4 text-success-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                            {completedToday} download hoàn thành hôm nay
                          </span>
                        </div>
                      </div>
                    )}
                    {recentDownloads.length === 0 && activeJobs === 0 && (
                      <div className="text-center py-8 text-text-muted-light dark:text-text-muted-dark text-sm">
                        Không có thông báo
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Menu */}
            <div className="hidden lg:block relative" ref={quickActionsRef}>
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className={cn(
                  'p-2.5 rounded-xl text-text-secondary-light dark:text-text-secondary-dark transition-all duration-200',
                  'hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20',
                  showQuickActions && 'text-[#74B9FF] dark:text-[#81CFE0] bg-[#74B9FF]/10 dark:bg-[#74B9FF]/20'
                )}
                title="Hành động nhanh"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showQuickActions && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-background-surface dark:bg-background-surfaceDark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark p-3 animate-in slide-in-from-top-2 z-50">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        navigate('/');
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20 transition-all text-left"
                    >
                      <Sparkles className="w-4 h-4 text-[#74B9FF] flex-shrink-0" />
                      <span className="whitespace-nowrap">Tải mới</span>
                    </button>
                    <Link
                      to="/history"
                      onClick={() => setShowQuickActions(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20 transition-all"
                    >
                      <Clock className="w-4 h-4 text-[#A29BFE] flex-shrink-0" />
                      <span className="whitespace-nowrap">Lịch sử gần đây</span>
                    </Link>
                    <div className="border-t border-border-light dark:border-border-dark my-2" />
                    <div className="px-3 py-2">
                      <div className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark mb-3">Thống kê</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary-light dark:text-text-secondary-dark">Tổng downloads:</span>
                          <span className="font-bold text-[#74B9FF]">{totalDownloads}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary-light dark:text-text-secondary-dark">Tổng dung lượng:</span>
                          <span className="font-bold text-text-primary-light dark:text-text-primary-dark">{formatSize(totalSize)}</span>
                        </div>
                        {completedToday > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary-light dark:text-text-secondary-dark">Hôm nay:</span>
                            <span className="font-bold text-success-500">{completedToday}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-border-light dark:border-border-dark my-2" />
                    <div className="px-3 py-2">
                      <div className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
                        <Keyboard className="w-3 h-3" />
                        Phím tắt
                      </div>
                      <div className="space-y-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        <div className="flex items-center justify-between">
                          <kbd className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-800 rounded text-[#74B9FF] font-mono text-xs">Ctrl + K</kbd>
                          <span className="text-text-muted-light dark:text-text-muted-dark">Tìm kiếm</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <kbd className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-800 rounded text-[#74B9FF] font-mono text-xs">Esc</kbd>
                          <span className="text-text-muted-light dark:text-text-muted-dark">Đóng menu</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <Link
              to="/settings"
              className={cn(
                'p-2.5 rounded-xl transition-all duration-300 relative group',
                isActive('/settings')
                  ? 'bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] text-white shadow-md shadow-[#74B9FF]/40'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
              )}
              title="Cài đặt"
            >
              <Settings className={cn('w-5 h-5 transition-transform duration-300', !isActive('/settings') && 'group-hover:rotate-90')} />
            </Link>

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2.5 rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:text-[#74B9FF] dark:hover:text-[#81CFE0] hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20 transition-all"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden px-3 pb-3 animate-in slide-in-from-top-2">
            <form onSubmit={handleQuickSearch} className="flex items-center gap-2 bg-secondary-100 dark:bg-secondary-800/50 rounded-lg p-2">
              <Search className="w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="flex-1 bg-transparent text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-border-light dark:border-border-dark bg-background-surface dark:bg-background-surfaceDark animate-in slide-in-from-top-2">
            <nav className="px-3 py-2 space-y-1">
              <Link
                to="/"
                onClick={() => setShowMobileMenu(false)}
                  className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive('/')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Trang chủ</span>
              </Link>
              
              <Link
                to="/downloads"
                onClick={() => setShowMobileMenu(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative',
                  isActive('/downloads')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <Download className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Downloads</span>
                {activeJobs > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-bold whitespace-nowrap flex-shrink-0">
                    {activeJobs}
                  </span>
                )}
              </Link>

              <Link
                to="/history"
                onClick={() => setShowMobileMenu(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive('/history')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <History className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Lịch sử</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setShowMobileMenu(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive('/settings')
                    ? 'text-white bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] shadow-md'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20'
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Cài đặt</span>
              </Link>

              <button
                onClick={() => {
                  setShowSearch(true);
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:bg-secondary-100 dark:hover:bg-secondary-800/50 w-full text-left transition-all duration-200"
              >
                <Search className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Tìm kiếm</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
});

