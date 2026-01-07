import { useState, useMemo } from 'react';
import { useDownloadStore } from '../../stores/downloadStore';
import { DownloadItem } from '../DownloadItem';
import { DownloadStats } from './DownloadStats';
import type { JobStatus } from '../../types';
import { ChevronDown, ChevronUp, Trash2, Download } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../common/Button';

interface DownloadQueuePanelProps {
  className?: string;
}

export function DownloadQueuePanel({ className }: DownloadQueuePanelProps) {
  // Use selector to avoid unnecessary re-renders
  const jobs = useDownloadStore((state) => state.getAllJobs());
  const [expanded, setExpanded] = useState(false); // Default collapsed
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');
  
  // Memoize filtered jobs to avoid recalculation on every render
  const activeJobs = useMemo(() => 
    jobs.filter(job => 
      job.status === 'pending' || 
      job.status === 'downloading' || 
      job.status === 'processing'
    ), [jobs]
  );
  
  const filteredJobs = useMemo(() => 
    filterStatus === 'all' 
      ? jobs 
      : jobs.filter(job => job.status === filterStatus),
    [jobs, filterStatus]
  );

  const completedJobs = useMemo(() => 
    jobs.filter(job => job.status === 'completed'),
    [jobs]
  );

  const clearCompleted = () => {
    completedJobs.forEach(job => {
      useDownloadStore.getState().removeJob(job.id);
    });
  };

  return (
    <div className={cn(
      'bg-transparent',
      'flex flex-col transition-all duration-300',
      className
    )}>
      {/* Header - Always visible, compact */}
      <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 bg-background-surface dark:bg-background-surfaceDark gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
            Download Queue
          </h2>
          {activeJobs.length > 0 && (
            <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium flex-shrink-0">
              {activeJobs.length} active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as JobStatus | 'all')}
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-surface dark:bg-background-surfaceDark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-w-0"
          >
            <option value="all">All ({jobs.length})</option>
            <option value="pending">Pending</option>
            <option value="downloading">Downloading</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed ({completedJobs.length})</option>
            <option value="error">Error</option>
          </select>
          
          {completedJobs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="text-text-secondary-light dark:text-text-secondary-dark hover:text-error-600 dark:hover:text-error-400 transition-colors"
              title="Xóa các download đã hoàn thành"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Clear</span>
            </Button>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-all duration-200"
            aria-label={expanded ? 'Collapse queue' : 'Expand queue'}
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark transition-transform duration-200" />
            ) : (
              <ChevronUp className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark transition-transform duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {expanded && (
        <div className="animate-in slide-in-from-top-2 duration-300 bg-background-surface dark:bg-background-surfaceDark border-t border-border-light dark:border-border-dark">
          <DownloadStats className="px-3 sm:px-4 py-2" />
        </div>
      )}

      {/* Queue List */}
      <div className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out bg-background-surface dark:bg-background-surfaceDark',
        expanded ? 'max-h-[300px]' : 'max-h-0'
      )}>
        <div className="overflow-y-auto max-h-[300px]">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted-light dark:text-text-muted-dark animate-in fade-in duration-300">
              <Download className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Không có download</p>
              <p className="text-xs mt-1">Bắt đầu tải để xem ở đây</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {filteredJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <DownloadItem job={job} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

