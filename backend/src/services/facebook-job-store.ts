/**
 * Facebook Job Store - Store Facebook job metadata
 * Separate from jobStore which tracks processes
 */
interface FacebookJobData {
  jobId: string;
  url: string;
  format: string;
  outputPath: string;
  title: string;
  author?: string;
  formatType: 'video' | 'audio' | 'story';
  audioFormat?: 'mp3' | 'm4a';
}

class FacebookJobStore {
  private jobs: Map<string, FacebookJobData> = new Map();

  set(jobId: string, data: FacebookJobData): void {
    this.jobs.set(jobId, data);
  }

  get(jobId: string): FacebookJobData | undefined {
    return this.jobs.get(jobId);
  }

  remove(jobId: string): void {
    this.jobs.delete(jobId);
  }

  getAll(): FacebookJobData[] {
    return Array.from(this.jobs.values());
  }
}

export const facebookJobStore = new FacebookJobStore();

