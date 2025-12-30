import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { DownloadQueuePanel } from '../download/DownloadQueuePanel';
import { YouTubeSearchSidebar } from '../search/YouTubeSearchSidebar';
import { RightSidebar } from '../sidebar/RightSidebar';
import { MediaInfo } from '../../types/api';
import { Menu, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MainLayoutProps {
  children: ReactNode;
  showQueuePanel?: boolean;
  showSidebar?: boolean;
  onVideoSelectFromSearch?: (video: MediaInfo, url: string) => void;
}

/**
 * Main Layout Component (SPA)
 * - Header at top
 * - Sidebar on left (YouTube Search)
 * - Content area in middle (scrollable)
 * - Download Queue Panel at bottom (always visible, fixed height)
 * - Footer at bottom
 */
export function MainLayout({ 
  children, 
  showQueuePanel = true,
  showSidebar = true,
  onVideoSelectFromSearch
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MediaInfo | null>(null);

  const handleVideoSelect = (video: MediaInfo, url: string) => {
    setSelectedVideo(video);
    if (onVideoSelectFromSearch) {
      onVideoSelectFromSearch(video, url);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - YouTube Search */}
        {showSidebar && (
          <>
            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed top-20 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* Sidebar */}
            <aside
              className={cn(
                'fixed lg:static inset-y-0 left-0 z-30 w-96 transform transition-transform duration-300 ease-in-out',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                'lg:block',
                'top-16 lg:top-0' // Account for header height on mobile
              )}
            >
              <YouTubeSearchSidebar onVideoSelect={handleVideoSelect} />
            </aside>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black/50 z-20"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
              <div className={cn(
                'container mx-auto px-4 py-6',
                showSidebar && 'lg:ml-0'
              )}>
                {children}
              </div>
            </main>

            {/* Right Sidebar */}
            <aside className="hidden xl:block w-80 flex-shrink-0">
              <RightSidebar selectedVideo={selectedVideo} />
            </aside>
          </div>
          
          {/* Download Queue Panel - Always visible at bottom, fixed height */}
          {showQueuePanel && (
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="container mx-auto px-4 py-3">
                <DownloadQueuePanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
