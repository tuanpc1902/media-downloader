import { DownloadJob, JobStatus } from '../../types';
import { Download, X, CheckCircle, AlertCircle, Loader2, FileDown, Clock, Pause, Play, RotateCcw, Copy, FolderOpen, MoreVertical } from 'lucide-react';
import { downloadFile, cancelDownload } from '../../services/api';
import { useDownloadStore } from '../../stores/downloadStore';
import { showToast } from '../Toast';
import { useEffect, useRef, useState } from 'react';
import { ProgressBar } from '../common/ProgressBar';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface DownloadItemProps {
  job: DownloadJob;
  compact?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getStatusVariant(status: JobStatus): 'pending' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled' {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'downloading':
      return 'downloading';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'error':
      return 'error';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function DownloadItem({ job, compact = false }: DownloadItemProps) {
  const removeJob = useDownloadStore((state) => state.removeJob);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const prevStatusRef = useRef<JobStatus>(job.status);
  const hasShownSuccessRef = useRef(false);

  // Show success notification
  useEffect(() => {
    if (job.status === 'completed' && prevStatusRef.current !== 'completed' && !hasShownSuccessRef.current) {
      showToast(`✅ Download thành công: ${job.title || 'File'}`, 'success');
      hasShownSuccessRef.current = true;
    }
    prevStatusRef.current = job.status;
  }, [job.status, job.title]);

  // Show error notification
  useEffect(() => {
    if (job.status === 'error' && prevStatusRef.current !== 'error') {
      showToast(`❌ Download thất bại: ${job.error || 'Lỗi không xác định'}`, 'error');
    }
  }, [job.status, job.error]);

  const handleDownload = () => {
    window.open(downloadFile(job.id), '_blank');
  };

  const handleCancel = async () => {
    try {
      await cancelDownload(job.id);
      removeJob(job.id);
      showToast('Đã hủy download', 'info');
    } catch (error) {
      console.error('Cancel error:', error);
      showToast('Lỗi khi hủy download', 'error');
    }
  };

  const handleCopyPath = () => {
    if (job.filePath) {
      navigator.clipboard.writeText(job.filePath);
      showToast('Đã copy đường dẫn file', 'success');
      setShowMenu(false);
    }
  };

  const handleOpenFolder = () => {
    if (job.filePath) {
      // This would need backend support to open folder
      showToast('Tính năng đang phát triển', 'info');
      setShowMenu(false);
    }
  };

  if (compact) {
    return (
      <div className={cn(
        'px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        'flex items-center gap-3'
      )}>
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
          {/* Thumbnail image would go here */}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {job.title || job.url}
            </h4>
            <Badge variant="status" status={getStatusVariant(job.status)}>
              {job.status}
            </Badge>
          </div>

          {/* Progress Bar */}
          {(job.status === 'downloading' || job.status === 'processing' || job.status === 'pending') && (
            <div className="space-y-1">
              <ProgressBar 
                progress={job.progress} 
                variant={job.status === 'processing' ? 'warning' : 'default'}
              />
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {job.status === 'processing' ? job.message || 'Processing...' : `${job.progress}%`}
                </span>
                {job.speed && <span>{job.speed}</span>}
              </div>
            </div>
          )}

          {/* Completed */}
          {job.status === 'completed' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-600 dark:text-green-400">Completed</span>
              {job.fileSize && <span className="text-gray-500 dark:text-gray-400">{formatFileSize(job.fileSize)}</span>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {job.status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="p-1.5"
            >
              <FileDown className="w-4 h-4" />
            </Button>
          )}
          {job.status !== 'completed' && job.status !== 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="p-1.5 text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Full version (for detailed view)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {job.title || job.url}
            </h4>
            <Badge variant="status" status={getStatusVariant(job.status)}>
              {job.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{job.url}</p>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
              {job.status === 'completed' && (
                <>
                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download File
                  </button>
                  <button
                    onClick={handleOpenFolder}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Open Folder
                  </button>
                  <button
                    onClick={handleCopyPath}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Path
                  </button>
                </>
              )}
              {job.status === 'error' && (
                <button
                  onClick={() => {/* retry logic */}}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              )}
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {(job.status === 'downloading' || job.status === 'processing' || job.status === 'pending') && (
        <div className="space-y-3 mt-4">
          <ProgressBar 
            progress={job.progress} 
            variant={job.status === 'processing' ? 'warning' : 'default'}
            showLabel
          />

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {job.speed && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Speed:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{job.speed}</span>
              </div>
            )}
            {job.eta && job.eta > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">ETA:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDuration(job.eta)}</span>
              </div>
            )}
            {job.downloadedBytes && job.totalBytes && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Downloaded:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatFileSize(job.downloadedBytes)} / {formatFileSize(job.totalBytes)}
                </span>
              </div>
            )}
            {job.fileSize && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Size:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatFileSize(job.fileSize)}</span>
              </div>
            )}
          </div>

          {job.message && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {job.message}
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {job.status === 'completed' && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Completed</span>
            {job.fileSize && <span className="text-sm text-gray-500 dark:text-gray-400">({formatFileSize(job.fileSize)})</span>}
          </div>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4" />
            Download File
          </Button>
        </div>
      )}

      {/* Error */}
      {job.error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium mb-1">Error:</div>
              <div className="break-words">{job.error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

