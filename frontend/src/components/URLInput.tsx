import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { analyzeVideo } from '../services/api';
import { VideoInfo } from '../types';

interface URLInputProps {
  onAnalyze: (info: VideoInfo, url: string) => void;
  onError: (error: string) => void;
}

export function URLInput({ onAnalyze, onError }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      onError('Vui lòng nhập URL YouTube');
      return;
    }

    setLoading(true);
    try {
      const info = await analyzeVideo(url);
      onAnalyze(info, url);
    } catch (error: any) {
      onError(error.response?.data?.error || error.message || 'Lỗi phân tích video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Nhập URL YouTube..."
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang phân tích...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Phân tích</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

