import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { wsService } from './services/websocket';
import { ToastContainer } from './components/Toast';

// Lazy load routes for code splitting
const HomePageNew = lazy(() => import('./pages/HomePageNew').then(m => ({ default: m.HomePageNew })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const VideoDownloadPage = lazy(() => import('./pages/VideoDownloadPage').then(m => ({ default: m.VideoDownloadPage })));
const AudioDownloadPage = lazy(() => import('./pages/AudioDownloadPage').then(m => ({ default: m.AudioDownloadPage })));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const TikTokDownloadPage = lazy(() => import('./pages/TikTokDownloadPage').then(m => ({ default: m.TikTokDownloadPage })));
const FacebookDownloadPage = lazy(() => import('./pages/FacebookDownloadPage').then(m => ({ default: m.FacebookDownloadPage })));

// Loading fallback component with better UX
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
    <div className="text-center animate-in fade-in zoom-in">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Đang tải...</p>
      <p className="text-sm text-gray-500 dark:text-gray-500">Vui lòng đợi trong giây lát</p>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    // Connect WebSocket on mount
    wsService.connect();

    return () => {
      // Disconnect on unmount
      wsService.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* New home page with improved UI/UX */}
          <Route path="/" element={<HomePageNew />} />
          {/* Legacy pages (can be deprecated later) */}
          <Route path="/old" element={<Home />} />
          <Route path="/video" element={<VideoDownloadPage />} />
          <Route path="/audio" element={<AudioDownloadPage />} />
          {/* New routes for header navigation */}
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* TikTok Downloader */}
          <Route path="/tiktok" element={<TikTokDownloadPage />} />
          {/* Facebook Downloader */}
          <Route path="/facebook" element={<FacebookDownloadPage />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;


