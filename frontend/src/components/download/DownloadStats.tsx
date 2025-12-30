import { useDownloadStore } from '../../stores/downloadStore';
import { cn } from '../../utils/cn';
import { Download, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DownloadStatsProps {
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
  return formatBytes(bytesPerSec) + '/s';
}

export function DownloadStats({ className }: DownloadStatsProps) {
  const jobs = useDownloadStore((state) => state.getAllJobs());
  
  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    downloading: jobs.filter(j => j.status === 'downloading').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'error').length,
    totalDownloaded: jobs
      .filter(j => j.status === 'completed' && j.fileSize)
      .reduce((sum, j) => sum + (j.fileSize || 0), 0),
    totalSpeed: jobs
      .filter(j => j.status === 'downloading' && j.speed)
      .reduce((sum, j) => {
        // Parse speed string like "2.5 MB/s"
        const speedStr = j.speed || '0 B/s';
        const match = speedStr.match(/([\d.]+)\s*([KMGT]?B)\/s/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          const multipliers: Record<string, number> = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024,
          };
          return sum + (value * (multipliers[unit] || 1));
        }
        return sum;
      }, 0),
  };

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-4 text-xs', className)}>
      <div className="flex items-center gap-1.5">
        <Download className="w-4 h-4 text-blue-500" />
        <span className="text-gray-600 dark:text-gray-400">
          {stats.downloading + stats.processing} active
        </span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-gray-600 dark:text-gray-400">
          {stats.completed} completed
        </span>
      </div>
      
      {stats.failed > 0 && (
        <div className="flex items-center gap-1.5">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-gray-600 dark:text-gray-400">
            {stats.failed} failed
          </span>
        </div>
      )}
      
      {stats.totalDownloaded > 0 && (
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-gray-600 dark:text-gray-400">
            {formatBytes(stats.totalDownloaded)} downloaded
          </span>
        </div>
      )}
      
      {stats.totalSpeed > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 dark:text-gray-400">
            {formatSpeed(stats.totalSpeed)}
          </span>
        </div>
      )}
    </div>
  );
}

