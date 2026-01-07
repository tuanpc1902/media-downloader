import { cn } from '../../utils/cn';

export type BadgeVariant = 'status' | 'platform' | 'default';
export type StatusType = 'pending' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';
export type PlatformType = 'youtube' | 'soundcloud' | 'tiktok' | 'facebook';

interface BadgeProps {
  variant?: BadgeVariant;
  status?: StatusType;
  platform?: PlatformType;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300',
  downloading: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
  processing: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
  completed: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
  error: 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300',
  cancelled: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400',
};

const platformStyles: Record<PlatformType, string> = {
  youtube: 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300',
  soundcloud: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
  tiktok: 'bg-secondary-900 text-white dark:bg-secondary-800 dark:text-secondary-200',
  facebook: 'bg-blue-600 text-white dark:bg-blue-700 dark:text-blue-100',
};

export function Badge({ variant = 'default', status, platform, children, className }: BadgeProps) {
  let variantClass = '';
  
  if (variant === 'status' && status) {
    variantClass = statusStyles[status];
  } else if (variant === 'platform' && platform) {
    variantClass = platformStyles[platform];
  } else {
    variantClass = 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClass,
        className
      )}
    >
      {children}
    </span>
  );
}

