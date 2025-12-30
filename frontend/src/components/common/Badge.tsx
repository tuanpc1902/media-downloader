import { cn } from '../../utils/cn';

export type BadgeVariant = 'status' | 'platform' | 'default';
export type StatusType = 'pending' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';
export type PlatformType = 'youtube' | 'soundcloud' | 'tiktok';

interface BadgeProps {
  variant?: BadgeVariant;
  status?: StatusType;
  platform?: PlatformType;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  downloading: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const platformStyles: Record<PlatformType, string> = {
  youtube: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  soundcloud: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  tiktok: 'bg-black text-white dark:bg-gray-800 dark:text-gray-200',
};

export function Badge({ variant = 'default', status, platform, children, className }: BadgeProps) {
  let variantClass = '';
  
  if (variant === 'status' && status) {
    variantClass = statusStyles[status];
  } else if (variant === 'platform' && platform) {
    variantClass = platformStyles[platform];
  } else {
    variantClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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

