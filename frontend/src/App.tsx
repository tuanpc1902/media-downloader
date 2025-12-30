import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { HomePageNew } from './pages/HomePageNew';
import { VideoDownloadPage } from './pages/VideoDownloadPage';
import { AudioDownloadPage } from './pages/AudioDownloadPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { TikTokDownloadPage } from './pages/TikTokDownloadPage';
import { useEffect } from 'react';
import { wsService } from './services/websocket';
import { ToastContainer } from './components/Toast';

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
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;


