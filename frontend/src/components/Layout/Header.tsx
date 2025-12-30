import { Link, useLocation } from 'react-router-dom';
import { Home, Download, Settings, History, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { DarkModeToggle } from '../DarkModeToggle';
import { useDownloadStore } from '../../stores/downloadStore';
import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

export function Header() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const jobs = useDownloadStore((state) => state.getAllJobs());
  const activeJobs = jobs.filter(job => 
    job.status === 'downloading' || job.status === 'processing' || job.status === 'pending'
  ).length;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const isHomePage = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className={cn(
          'flex items-center justify-between',
          isHomePage ? 'py-3' : 'h-16'
        )}>
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Media Downloader
                </span>
                {isHomePage && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Tải video và audio từ YouTube, SoundCloud, TikTok
                  </span>
                )}
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span>Trang chủ</span>
                </div>
              </Link>
              
              <Link
                to="/downloads"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive('/downloads')
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Downloads</span>
                  {activeJobs > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {activeJobs > 9 ? '9+' : activeJobs}
                    </span>
                  )}
                </div>
              </Link>

              <Link
                to="/history"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/history')
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span>Lịch sử</span>
                </div>
              </Link>
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Đã kết nối</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600 dark:text-red-400">Mất kết nối</span>
                </>
              )}
            </div>

            {/* Queue Count Badge */}
            {activeJobs > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {activeJobs} đang tải
                </span>
              </div>
            )}

            {/* Settings */}
            <Link
              to="/settings"
              className={`p-2 rounded-lg transition-colors ${
                isActive('/settings')
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Cài đặt"
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* Dark Mode Toggle */}
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

