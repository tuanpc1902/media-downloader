import { useState } from 'react';
import { useDownloadStore } from '../../stores/downloadStore';
import { DownloadItem } from '../DownloadItem';
import { DownloadStats } from './DownloadStats';
import type { JobStatus } from '../../types';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../common/Button';

interface DownloadQueuePanelProps {
  className?: string;
}

export function DownloadQueuePanel({ className }: DownloadQueuePanelProps) {
  const jobs = useDownloadStore((state) => state.getAllJobs());
  const [expanded, setExpanded] = useState(true);
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');
  
  const activeJobs = jobs.filter(job => 
    job.status === 'pending' || 
    job.status === 'downloading' || 
    job.status === 'processing'
  );
  
  const filteredJobs = filterStatus === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === filterStatus);

  const completedJobs = jobs.filter(job => job.status === 'completed');

  const clearCompleted = () => {
    completedJobs.forEach(job => {
      useDownloadStore.getState().removeJob(job.id);
    });
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700',
      'flex flex-col',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Download Queue
          </h2>
          {activeJobs.length > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
              {activeJobs.length} active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as JobStatus | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="text-gray-600 dark:text-gray-400"
            >
              <Trash2 className="w-4 h-4" />
              Clear Completed
            </Button>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <DownloadStats className="px-4 py-2 border-b border-gray-200 dark:border-gray-700" />

      {/* Queue List */}
      {expanded && (
        <div className="flex-1 overflow-y-auto max-h-[600px]">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No downloads</p>
              <p className="text-xs mt-1">Start a download to see it here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobs.map((job) => (
                <DownloadItem key={job.id} job={job} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

