import { ReactNode, useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { DownloadQueuePanel } from '../download/DownloadQueuePanel';
import { YouTubeSearchSidebar } from '../search/YouTubeSearchSidebar';
import { RightSidebar } from '../sidebar/RightSidebar';
import { MediaInfo } from '../../types/api';
import { Menu, X, Plus, Download, Search, History, Sparkles, ArrowUp, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDownloadStore } from '../../stores/downloadStore';

interface MainLayoutProps {
  children: ReactNode;
  showQueuePanel?: boolean;
  showSidebar?: boolean;
  onVideoSelectFromSearch?: (video: MediaInfo, url: string) => void;
  onVideoSelect?: (video: MediaInfo | null) => void;
}

/**
 * Optimized Main Layout Component
 * - Performance: Memoized components, throttled scroll listeners
 * - Modern UI: Glassmorphism, smooth animations
 * - Responsive: Mobile-first design
 */
export const MainLayout = memo(function MainLayout({ 
  children, 
  showQueuePanel = true,
  showSidebar = true,
  onVideoSelectFromSearch,
  onVideoSelect
}: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaInfo | null>(null);
  const [showFAB, setShowFAB] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Memoized selectors for performance
  const jobs = useDownloadStore((state) => state.getAllJobs());
  const activeJobs = useMemo(() => 
    jobs.filter(j => 
      j.status === 'downloading' || j.status === 'processing' || j.status === 'pending'
    ).length,
    [jobs]
  );

  const completedJobs = useMemo(() => 
    jobs.filter(j => j.status === 'completed').length,
    [jobs]
  );

  // Memoized callbacks
  const handleVideoSelect = useCallback((video: MediaInfo, url: string) => {
    setSelectedVideo(video);
    onVideoSelectFromSearch?.(video, url);
    onVideoSelect?.(video);
  }, [onVideoSelectFromSearch, onVideoSelect]);

  const handleVideoSelectAnywhere = useCallback((video: MediaInfo | null) => {
    setSelectedVideo(video);
    onVideoSelect?.(video);
  }, [onVideoSelect]);

  // Expose handler to children via window
  useEffect(() => {
    (window as any).__selectVideoInRightSidebar = handleVideoSelectAnywhere;
    return () => {
      delete (window as any).__selectVideoInRightSidebar;
    };
  }, [handleVideoSelectAnywhere]);

  // Throttled scroll handler for performance
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const mainContent = document.querySelector('main');
          if (mainContent) {
            const scrollTop = mainContent.scrollTop;
            setShowScrollTop(scrollTop > 300);
            setShowFAB(scrollTop > 100);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleNewDownload = useCallback(() => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    searchInput?.focus();
  }, []);

  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light via-background-light to-secondary-50 dark:from-background-dark dark:via-background-dark dark:to-secondary-800 flex flex-col">
      {/* Header - Sticky with backdrop blur */}
      <div className="sticky top-0 z-50">
        <Header />
      </div>
      
      {/* Main Container - Flex layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Search */}
        {showSidebar && (
          <>
            {/* Desktop Sidebar Toggle */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="hidden lg:flex fixed z-50 left-[18rem] xl:left-[20rem] top-20 p-2.5 bg-background-surface/90 dark:bg-background-surfaceDark/90 backdrop-blur-md rounded-xl shadow-lg border border-border-light dark:border-border-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20 transition-all duration-200 group"
                aria-label="Collapse sidebar"
              >
                <X className="w-5 h-5 text-[#74B9FF] group-hover:rotate-90 transition-transform" />
              </button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:flex fixed z-50 left-4 top-20 p-2.5 bg-background-surface/90 dark:bg-background-surfaceDark/90 backdrop-blur-md rounded-xl shadow-lg border border-border-light dark:border-border-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20 transition-all duration-200 group"
                aria-label="Expand sidebar"
              >
                <Menu className="w-5 h-5 text-[#74B9FF] group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed top-20 left-4 z-40 p-2.5 bg-background-surface/90 dark:bg-background-surfaceDark/90 backdrop-blur-md rounded-xl shadow-lg border border-border-light dark:border-border-dark hover:shadow-xl transition-all duration-200"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-[#74B9FF]" />
              ) : (
                <Menu className="w-5 h-5 text-[#74B9FF]" />
              )}
            </button>

            {/* Sidebar */}
            <aside
              className={cn(
                'fixed lg:static inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                'lg:translate-x-0',
                sidebarCollapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-72 xl:w-80',
                'top-16 md:top-20 lg:top-0',
                'bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-xl border-r border-border-light dark:border-border-dark shadow-xl',
                'overflow-hidden',
                'lg:bottom-0'
              )}
            >
              <div className={cn(
                'h-full overflow-y-auto transition-opacity duration-300',
                sidebarCollapsed && 'lg:opacity-0 lg:pointer-events-none'
              )}>
                <YouTubeSearchSidebar onVideoSelect={handleVideoSelect} />
              </div>
            </aside>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </>
        )}
        
        {/* Main Content Area - Optimized */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content - Scrollable */}
            <main className={cn(
              'flex-1 overflow-y-auto scroll-smooth',
              'bg-transparent',
              showQueuePanel && 'pb-20 md:pb-16'
            )}>
              <div className={cn(
                'mx-auto px-3 sm:px-4 md:px-6 lg:px-8',
                'py-4 sm:py-6 md:py-8 lg:py-10',
                'max-w-6xl w-full'
              )}>
                {children}
              </div>
            </main>

            {/* Right Sidebar - Only on 2xl screens */}
            <aside className="hidden 2xl:block w-80 flex-shrink-0 border-l border-border-light dark:border-border-dark bg-background-surface/60 dark:bg-background-surfaceDark/60 backdrop-blur-md">
              <div className="h-full overflow-y-auto p-6 sticky top-0">
                <RightSidebar selectedVideo={selectedVideo} />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Download Queue Panel - Fixed bottom */}
      {showQueuePanel && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 border-t border-border-light dark:border-border-dark bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-xl shadow-2xl">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <DownloadQueuePanel />
          </div>
        </div>
      )}

      {/* Floating Action Buttons - Optimized */}
      <div className="fixed bottom-24 md:bottom-20 right-4 md:right-6 z-50 flex flex-col gap-3">
        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="p-3 bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] text-white rounded-full shadow-lg shadow-[#74B9FF]/50 hover:shadow-xl hover:shadow-[#74B9FF]/60 transition-all duration-300 hover:scale-110 group animate-in fade-in slide-in-from-bottom-2"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          </button>
        )}

        {/* Main FAB */}
        <div className="relative">
          <button
            onClick={handleNewDownload}
            className={cn(
              'p-4 bg-gradient-to-r from-[#74B9FF] to-[#A29BFE] text-white rounded-full shadow-lg shadow-[#74B9FF]/50 hover:shadow-xl hover:shadow-[#74B9FF]/60 transition-all duration-300 hover:scale-110 group',
              isHomePage && 'ring-4 ring-[#74B9FF]/30'
            )}
            aria-label="New download"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
          
          {/* Active Jobs Badge */}
          {activeJobs > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-error-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse border-2 border-background-surface dark:border-background-surfaceDark shadow-lg">
              {activeJobs > 9 ? '9+' : activeJobs}
            </span>
          )}
        </div>

        {/* Quick Actions - Animated */}
        {showFAB && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={() => navigate('/downloads')}
              className="p-3 bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-md text-text-primary-light dark:text-text-primary-dark rounded-full shadow-lg border border-border-light dark:border-border-dark hover:bg-[#74B9FF]/10 dark:hover:bg-[#74B9FF]/20 hover:border-[#74B9FF] transition-all duration-200 group"
              aria-label="Downloads"
            >
              <Download className="w-5 h-5 text-[#74B9FF] group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/history')}
              className="p-3 bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-md text-text-primary-light dark:text-text-primary-dark rounded-full shadow-lg border border-border-light dark:border-border-dark hover:bg-[#A29BFE]/10 dark:hover:bg-[#A29BFE]/20 hover:border-[#A29BFE] transition-all duration-200 group"
              aria-label="History"
            >
              <History className="w-5 h-5 text-[#A29BFE] group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleFocusSearch}
              className="p-3 bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-md text-text-primary-light dark:text-text-primary-dark rounded-full shadow-lg border border-border-light dark:border-border-dark hover:bg-success-500/10 dark:hover:bg-success-500/20 hover:border-success-500 transition-all duration-200 group"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-success-500 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* System Status Bar - Top Right - Optimized */}
      <div className="fixed top-16 md:top-20 right-4 md:right-6 z-40 flex flex-col gap-2">
        {/* Active Downloads Indicator */}
        {activeJobs > 0 && (
          <div className="px-3 py-2 bg-gradient-to-r from-warning-500/90 to-warning-500/80 dark:from-warning-500/80 dark:to-warning-500/70 text-white rounded-xl shadow-lg border border-warning-400/50 backdrop-blur-sm animate-pulse-soft">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-semibold whitespace-nowrap">
                {activeJobs} đang tải
              </span>
            </div>
          </div>
        )}

        {/* Quick Stats Card */}
        {isHomePage && completedJobs > 0 && (
          <div className="px-3 py-2 bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-md rounded-xl shadow-lg border border-border-light dark:border-border-dark animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#74B9FF]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Hoàn thành</span>
                <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
                  {completedJobs}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile only */}
      <BottomNav />

      {/* Footer */}
      {!showQueuePanel && <Footer />}
    </div>
  );
});
