import { useState } from 'react';
import { Search, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import { searchYouTube } from '../../services/api';
import { MediaInfo } from '../../types/api';

interface YouTubeSearchSidebarProps {
  onVideoSelect: (video: MediaInfo, url: string) => void;
  className?: string;
}

const RESULTS_PER_PAGE = 10;

export function YouTubeSearchSidebar({ onVideoSelect, className }: YouTubeSearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<Array<{ video: MediaInfo; url: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  const handleSearch = async (e?: React.FormEvent, page: number = 1) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Search with pagination - get more results (50) and sort by views
      const searchResults = await searchYouTube(query.trim(), 50, page);
      
      // Sort by views (most popular first)
      const sortedResults = [...searchResults].sort((a, b) => {
        const viewsA = a.video.views || 0;
        const viewsB = b.video.views || 0;
        return viewsB - viewsA; // Descending order
      });
      
      setAllResults(sortedResults);
      setTotalResults(sortedResults.length);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Lỗi tìm kiếm');
      setAllResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(allResults.length / RESULTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const endIndex = startIndex + RESULTS_PER_PAGE;
  const currentResults = allResults.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Scroll to top of results
      const resultsContainer = document.querySelector('[data-results-container]');
      resultsContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Scroll to top of results
      const resultsContainer = document.querySelector('[data-results-container]');
      resultsContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClear = () => {
    setQuery('');
    setAllResults([]);
    setCurrentPage(1);
    setTotalResults(0);
    setError(null);
  };

  return (
    <div className={cn('h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tìm kiếm YouTube
        </h2>
        
        {/* Search Input */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
              className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            loading={loading}
            className="w-full"
            size="sm"
          >
            <Search className="w-4 h-4" />
            Tìm kiếm
          </Button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div 
          data-results-container
          className="flex-1 overflow-y-auto p-4"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          )}

          {!loading && currentResults.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kết quả ({totalResults} total, trang {currentPage}/{totalPages})
              </div>
              {currentResults.map((item, index) => {
              // Get thumbnail URL - yt-dlp search may return different thumbnail formats
              const thumbnailUrl = item.video.thumbnail || 
                `https://img.youtube.com/vi/${item.video.id}/mqdefault.jpg`;
              
              return (
                <button
                  key={item.video.id || index}
                  onClick={() => onVideoSelect(item.video, item.url)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex gap-3">
                    <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                      <img
                        src={thumbnailUrl}
                        alt={item.video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to default YouTube thumbnail if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = `https://img.youtube.com/vi/${item.video.id}/mqdefault.jpg`;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-1">
                        {item.video.title}
                      </h3>
                      {item.video.channel && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {item.video.channel}
                        </p>
                      )}
                      {item.video.duration > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {Math.floor(item.video.duration / 60)}:{(item.video.duration % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

          {!loading && currentResults.length === 0 && allResults.length === 0 && query && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              Không tìm thấy kết quả
            </div>
          )}

          {!loading && !query && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              Nhập từ khóa để tìm kiếm video YouTube
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && allResults.length > RESULTS_PER_PAGE && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  currentPage === 1
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Trang {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  currentPage === totalPages
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

