import { useState, useMemo } from 'react';
import { Download, Filter, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useDownloadStore } from '../../stores/downloadStore';
import { DownloadItem } from '../DownloadItem';
import { DownloadJob, JobStatus } from '../../types';

export function DownloadQueuePanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const jobs = useDownloadStore((state) => state.getAllJobs());

  const filteredJobs = useMemo(() => {
    if (filter === 'all') return jobs;
    return jobs.filter(job => job.status === filter);
  }, [jobs, filter]);

  const activeJobs = jobs.filter(job => 
    job.status === 'downloading' || job.status === 'processing' || job.status === 'pending'
  );

  const statistics = useMemo(() => {
    return {
      total: jobs.length,
      downloading: jobs.filter(j => j.status === 'downloading').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'error').length,
      pending: jobs.filter(j => j.status === 'pending').length,
    };
  }, [jobs]);

  if (jobs.length === 0) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Download className="w-4 h-4" />
            <span>Chưa có download nào</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div 
        className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Download Queue
              </span>
              {activeJobs.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                  {activeJobs.length} đang tải
                </span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="hidden sm:inline">
              Tổng: <span className="font-semibold">{statistics.total}</span>
            </span>
            {statistics.downloading > 0 && (
              <span className="hidden md:inline text-blue-600 dark:text-blue-400">
                Đang tải: <span className="font-semibold">{statistics.downloading}</span>
              </span>
            )}
            {statistics.processing > 0 && (
              <span className="hidden md:inline text-yellow-600 dark:text-yellow-400">
                Đang xử lý: <span className="font-semibold">{statistics.processing}</span>
              </span>
            )}
            {statistics.completed > 0 && (
              <span className="hidden md:inline text-green-600 dark:text-green-400">
                Hoàn thành: <span className="font-semibold">{statistics.completed}</span>
              </span>
            )}
            {statistics.failed > 0 && (
              <span className="hidden md:inline text-red-600 dark:text-red-400">
                Lỗi: <span className="font-semibold">{statistics.failed}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      {isExpanded && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Tất cả ({statistics.total})
            </button>
            {statistics.downloading > 0 && (
              <button
                onClick={() => setFilter('downloading')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filter === 'downloading'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Đang tải ({statistics.downloading})
              </button>
            )}
            {statistics.processing > 0 && (
              <button
                onClick={() => setFilter('processing')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filter === 'processing'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Đang xử lý ({statistics.processing})
              </button>
            )}
            {statistics.pending > 0 && (
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filter === 'pending'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Chờ ({statistics.pending})
              </button>
            )}
            {statistics.completed > 0 && (
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filter === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Hoàn thành ({statistics.completed})
              </button>
            )}
            {statistics.failed > 0 && (
              <button
                onClick={() => setFilter('error')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filter === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Lỗi ({statistics.failed})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Jobs List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {filteredJobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Không có download nào trong danh mục này
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredJobs.map((job) => (
                <DownloadItem key={job.id} job={job} compact={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

