import { useDownloadStore } from '../stores/downloadStore';
import { DownloadItem } from './DownloadItem';

export function DownloadList() {
  const jobs = useDownloadStore((state) => state.getAllJobs());

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>Chưa có download nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <DownloadItem key={job.id} job={job} />
      ))}
    </div>
  );
}


