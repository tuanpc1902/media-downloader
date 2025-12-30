import { DownloadJob } from '../types';
import { Download, X, CheckCircle, AlertCircle, Loader2, FileDown } from 'lucide-react';
import { downloadFile, cancelDownload } from '../services/api';
import { useDownloadStore } from '../stores/downloadStore';
import { showToast } from './Toast';
import { useEffect, useRef } from 'react';

interface DownloadItemProps {
  job: DownloadJob;
  compact?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getStatusIcon(status: DownloadJob['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'downloading':
    case 'processing':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return <Loader2 className="w-5 h-5 text-gray-500 animate-pulse" />;
  }
}

function getStatusText(status: DownloadJob['status']): string {
  switch (status) {
    case 'pending':
      return 'Đang chờ';
    case 'downloading':
      return 'Đang tải';
    case 'processing':
      return 'Đang xử lý';
    case 'completed':
      return 'Hoàn thành';
    case 'error':
      return 'Lỗi';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function DownloadItem({ job, compact = false }: DownloadItemProps) {
  const removeJob = useDownloadStore((state) => state.removeJob);
  const prevStatusRef = useRef<DownloadJob['status']>(job.status);
  const hasShownSuccessRef = useRef(false);
  
  // Debug: Log progress changes
  useEffect(() => {
    if (job.status === 'downloading' || job.status === 'processing') {
      console.log(`Job ${job.id} progress: ${job.progress}%`, {
        speed: job.speed,
        eta: job.eta,
        downloadedBytes: job.downloadedBytes,
        totalBytes: job.totalBytes,
      });
    }
  }, [job.progress, job.status, job.id, job.speed, job.eta]);

  // Show success notification
  useEffect(() => {
    if (job.status === 'completed' && prevStatusRef.current !== 'completed' && !hasShownSuccessRef.current) {
      showToast(
        `✅ Download thành công: ${job.title || 'File'}`,
        'success'
      );
      hasShownSuccessRef.current = true;
    }
    prevStatusRef.current = job.status;
  }, [job.status, job.title]);

  // Show error notification
  useEffect(() => {
    if (job.status === 'error' && prevStatusRef.current !== 'error') {
      showToast(
        `❌ Download thất bại: ${job.error || 'Lỗi không xác định'}`,
        'error'
      );
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

  if (compact) {
    return (
      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon(job.status)}
          </div>

          {/* Title & Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {job.title || job.url}
              </h4>
              {job.status === 'completed' && (
                <button
                  onClick={handleDownload}
                  className="flex-shrink-0 p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                  title="Tải file"
                >
                  <FileDown className="w-4 h-4" />
                </button>
              )}
              {job.status !== 'completed' && job.status !== 'error' && (
                <button
                  onClick={handleCancel}
                  className="flex-shrink-0 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Hủy"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {(job.status === 'downloading' || job.status === 'processing' || job.status === 'pending') && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      job.status === 'processing' 
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                  {job.progress}%
                </span>
              </div>
            )}

            {/* Status Text */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getStatusText(job.status)}
                {job.speed && ` • ${job.speed}`}
              </span>
              {job.status === 'completed' && job.fileSize && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(job.fileSize)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {job.title || job.url}
          </h4>
        </div>
        {job.status === 'completed' && (
          <button
            onClick={handleDownload}
            className="ml-2 p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900 rounded transition-colors"
            title="Tải file"
          >
            <Download className="w-5 h-5" />
          </button>
        )}
        {job.status !== 'completed' && job.status !== 'error' && (
          <button
            onClick={handleCancel}
            className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
            title="Hủy"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Bar - Tối giản: progress bar + % rõ ràng + 1 dòng text */}
      {/* Progress bar hiển thị xuyên suốt job lifecycle */}
      {(job.status === 'downloading' || job.status === 'processing' || job.status === 'pending' || job.status === 'completed') && (
        <div className="mt-3 space-y-2">
          {/* Progress Bar với % hiển thị rõ ràng */}
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className={`
                  h-2.5 rounded-full transition-all duration-500 ease-out
                  ${job.status === 'completed'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : job.status === 'processing' 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500'
                  }
                `}
                style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
              />
            </div>
            {/* % hiển thị ngay trên progress bar - rõ ràng và nổi bật */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 drop-shadow-sm">
                {job.progress}%
              </span>
            </div>
          </div>
          
          {/* Status text với phần trăm nổi bật cho convert/merge */}
          <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
            {job.status === 'completed'
              ? 'Hoàn thành'
              : job.status === 'processing' 
              ? (job.phase === 'renaming' 
                  ? 'Đang đổi tên file...'
                  : job.phase === 'postprocessing'
                  ? (
                      // Hiển thị message với phần trăm nổi bật nếu có
                      job.message && job.message.includes('%')
                        ? (
                            <span>
                              {job.message.split('(')[0]}
                              <span className="font-bold text-yellow-600 dark:text-yellow-400 ml-1">
                                ({job.progress}%)
                              </span>
                            </span>
                          )
                        : (job.message || `Đang xử lý sau tải... (${job.progress}%)`)
                    )
                  : 'Đang xử lý sau tải...')
              : job.status === 'pending'
              ? 'Đang chờ...'
              : job.progress === 0
              ? 'Đang khởi tạo...'
              : job.status === 'downloading'
              ? `Đang tải dữ liệu (${job.progress}%)`
              : 'Đang tải...'
            }
          </div>
          
          {/* Progress indicator riêng cho convert/merge - hiển thị nổi bật */}
          {job.status === 'processing' && job.phase === 'postprocessing' && (
            <div className="mt-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1 flex items-center gap-2">
                    {job.message?.includes('chuyển đổi') 
                      ? 'Đang chuyển đổi audio'
                      : job.message?.includes('ghép') || job.message?.includes('merge')
                      ? 'Đang ghép audio/video'
                      : 'Đang xử lý sau tải'}
                    {/* Spinner khi indeterminate */}
                    {job.indeterminate && (
                      <Loader2 className="w-3 h-3 animate-spin text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  {/* Progress bar nhỏ cho convert/merge - chỉ hiển thị khi không indeterminate */}
                  {!job.indeterminate && (
                    <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300"
                        style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                {/* Phần trăm lớn, nổi bật - chỉ hiển thị khi không indeterminate */}
                {!job.indeterminate && (
                  <div className="ml-3 text-right">
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {job.progress}%
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                      {job.progress < 100 ? 'Đang xử lý...' : 'Hoàn tất'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Thông tin chi tiết - Expandable (ẩn mặc định) */}
          {(job.status === 'downloading' || job.status === 'processing') && 
           (job.speed || job.eta || job.downloadedBytes || job.fragmentIndex) && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 select-none">
                Chi tiết
              </summary>
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5 text-xs">
                {job.speed && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tốc độ:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{job.speed}</span>
                  </div>
                )}
                {job.eta && job.eta > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Còn lại:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDuration(job.eta)}</span>
                  </div>
                )}
                {job.downloadedBytes && job.totalBytes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Đã tải:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatFileSize(job.downloadedBytes)} / {formatFileSize(job.totalBytes)}
                    </span>
                  </div>
                )}
                {job.fragmentIndex && job.fragmentCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fragment:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {job.fragmentIndex}/{job.fragmentCount}
                    </span>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Completed - Tối giản */}
      {job.status === 'completed' && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-green-600 dark:text-green-400 font-medium">
            ✅ Hoàn thành
          </span>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Tải file
          </button>
        </div>
      )}

      {job.error && (
        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium mb-1">Lỗi download:</div>
              <div className="break-words">{job.error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



