import { Link, useLocation } from 'react-router-dom';
import { Home, Download, History, Settings } from 'lucide-react';
import { useDownloadStore } from '../../stores/downloadStore';
import { cn } from '../../utils/cn';
import { memo, useMemo } from 'react';

/**
 * Bottom Navigation Bar - Optimized mobile navigation
 * Only visible on mobile devices
 */
export const BottomNav = memo(function BottomNav() {
  const location = useLocation();
  const jobs = useDownloadStore((state) => state.getAllJobs());
  
  const activeJobs = useMemo(() => 
    jobs.filter(job => 
      job.status === 'downloading' || job.status === 'processing' || job.status === 'pending'
    ).length,
    [jobs]
  );

  const isActive = (path: string) => location.pathname === path;

  const navItems = useMemo(() => [
    { path: '/', icon: Home, label: 'Trang chủ' },
    { path: '/downloads', icon: Download, label: 'Downloads', badge: activeJobs },
    { path: '/history', icon: History, label: 'Lịch sử' },
    { path: '/settings', icon: Settings, label: 'Cài đặt' },
  ], [activeJobs]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-xl border-t border-border-light dark:border-border-dark shadow-2xl">
      <div className="flex items-center justify-around h-16 px-1 sm:px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-all duration-200 relative',
                active
                  ? 'text-[#74B9FF] dark:text-[#81CFE0]'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-[#74B9FF] dark:hover:text-[#81CFE0]'
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  'w-6 h-6 transition-transform duration-200',
                  active && 'scale-110'
                )} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-xs font-semibold transition-all duration-200',
                active ? 'opacity-100' : 'opacity-70'
              )}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#74B9FF] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

