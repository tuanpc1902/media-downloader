import { cn } from '../../utils/cn';

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
  indeterminate?: boolean;
}

const variantStyles = {
  default: 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500',
  success: 'bg-gradient-to-r from-green-500 to-green-600',
  warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
  error: 'bg-gradient-to-r from-red-500 to-red-600',
};

export function ProgressBar({
  progress,
  variant = 'default',
  showLabel = false,
  label,
  className,
  indeterminate = false,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('relative w-full', className)}>
      {/* Progress Track */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        {indeterminate ? (
          <div className="h-2.5 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 rounded-full animate-pulse" />
        ) : (
          <div
            className={cn(
              'h-2.5 rounded-full transition-all duration-500 ease-out',
              variantStyles[variant]
            )}
            style={{ width: `${clampedProgress}%` }}
          />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 drop-shadow-sm">
            {label || `${Math.round(clampedProgress)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

