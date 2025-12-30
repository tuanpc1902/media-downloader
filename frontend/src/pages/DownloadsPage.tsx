import { MainLayout } from '../components/Layout/MainLayout';
import { DownloadQueuePanel } from '../components/download/DownloadQueuePanel';

export function DownloadsPage() {
  return (
    <MainLayout showQueuePanel={false} showSidebar={false}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            Downloads
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Quản lý tất cả các downloads của bạn
          </p>
        </div>
        <DownloadQueuePanel />
      </div>
    </MainLayout>
  );
}

