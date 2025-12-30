import { MainLayout } from '../components/Layout/MainLayout';

export function SettingsPage() {
  return (
    <MainLayout showQueuePanel={true} showSidebar={false}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            Cài đặt
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Cấu hình ứng dụng
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-center text-gray-500 dark:text-gray-400">
            Tính năng đang phát triển...
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

