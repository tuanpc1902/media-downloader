import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DownloadJob, ProgressUpdate } from '../types';
import { wsService } from '../services/websocket';

interface DownloadState {
  jobsArray: DownloadJob[]; // Store as array for persistence
  addJob: (job: DownloadJob) => void;
  updateJob: (jobId: string, update: Partial<DownloadJob>) => void;
  updateProgress: (update: ProgressUpdate) => void;
  removeJob: (jobId: string) => void;
  getJob: (jobId: string) => DownloadJob | undefined;
  getAllJobs: () => DownloadJob[];
  // Helper để get jobs as Map
  getJobsMap: () => Map<string, DownloadJob>;
}

// Helper để convert array to Map
const arrayToMap = (jobs: DownloadJob[]): Map<string, DownloadJob> => {
  const map = new Map<string, DownloadJob>();
  jobs.forEach(job => {
    // Convert date strings back to Date objects
    map.set(job.id, {
      ...job,
      createdAt: job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt),
      updatedAt: job.updatedAt instanceof Date ? job.updatedAt : new Date(job.updatedAt),
    });
  });
  return map;
};

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => {
      // Initialize WebSocket và register progress callback
      const socket = wsService.connect();
      
      // Register progress callback
      const progressCallback = (update: ProgressUpdate) => {
        console.log('Received progress update:', update);
        get().updateProgress(update);
      };
      
      wsService.onProgress(progressCallback);
      
      // Re-register callback khi socket reconnect
      socket.on('connect', () => {
        console.log('WebSocket connected, re-registering progress callback');
        wsService.onProgress(progressCallback);
        
        // Re-join tất cả jobs hiện có
        const jobs = get().jobsArray;
        jobs.forEach(job => {
          wsService.joinJob(job.id);
        });
      });

      return {
        jobsArray: [],
        
        getJobsMap: () => {
          return arrayToMap(get().jobsArray);
        },

    addJob: (job: DownloadJob) => {
      set((state) => {
        const jobsMap = arrayToMap(state.jobsArray);
        jobsMap.set(job.id, job);
        wsService.joinJob(job.id);
        return { jobsArray: Array.from(jobsMap.values()) };
      });
    },

    updateJob: (jobId: string, update: Partial<DownloadJob>) => {
      set((state) => {
        const jobsMap = arrayToMap(state.jobsArray);
        const existing = jobsMap.get(jobId);
        if (existing) {
          jobsMap.set(jobId, { ...existing, ...update, updatedAt: new Date() });
        }
        return { jobsArray: Array.from(jobsMap.values()) };
      });
    },

    updateProgress: (update: ProgressUpdate) => {
      console.log('Updating progress for job:', update.jobId, 'progress:', update.progress);
      set((state) => {
        const jobsMap = arrayToMap(state.jobsArray);
        const existing = jobsMap.get(update.jobId);
        if (existing) {
          const updatedJob = {
            ...existing,
            status: update.status,
            progress: update.progress !== undefined ? update.progress : existing.progress,
            phase: update.phase, // Lưu phase để UI hiển thị
            speed: update.speed,
            eta: update.eta,
            message: update.message, // Lưu message để hiển thị
            downloadedBytes: update.downloadedBytes,
            totalBytes: update.totalBytes,
            fragmentIndex: update.fragmentIndex,
            fragmentCount: update.fragmentCount,
            indeterminate: update.indeterminate, // Lưu indeterminate flag
            error: update.status === 'error' ? update.message : existing.error,
            updatedAt: new Date(),
          };
          jobsMap.set(update.jobId, updatedJob);
          console.log('Updated job progress:', updatedJob.progress, '%');
        } else {
          console.warn('Job not found for progress update:', update.jobId);
        }
        return { jobsArray: Array.from(jobsMap.values()) };
      });
    },

    removeJob: (jobId: string) => {
      set((state) => {
        const jobsMap = arrayToMap(state.jobsArray);
        jobsMap.delete(jobId);
        wsService.leaveJob(jobId);
        return { jobsArray: Array.from(jobsMap.values()) };
      });
    },

    getJob: (jobId: string) => {
      const jobsMap = get().getJobsMap();
      return jobsMap.get(jobId);
    },

    getAllJobs: () => {
      return get().jobsArray
        .map(job => ({
          ...job,
          createdAt: job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt),
          updatedAt: job.updatedAt instanceof Date ? job.updatedAt : new Date(job.updatedAt),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
      };
    },
    {
      name: 'download-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ jobsArray: state.jobsArray }),
    }
  )
);


