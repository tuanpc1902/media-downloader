/**
 * TikTok Job Store - Store TikTok job metadata
 * Separate from jobStore which tracks processes
 */
interface TikTokJobData {
  jobId: string;
  url: string;
  format: string;
  outputPath: string;
  title: string;
  author: string;
  formatType: 'video' | 'audio';
  audioFormat?: 'mp3' | 'm4a';
}

class TikTokJobStore {
  private jobs: Map<string, TikTokJobData> = new Map();

  set(jobId: string, data: TikTokJobData): void {
    this.jobs.set(jobId, data);
  }

  get(jobId: string): TikTokJobData | undefined {
    return this.jobs.get(jobId);
  }

  remove(jobId: string): void {
    this.jobs.delete(jobId);
  }

  getAll(): TikTokJobData[] {
    return Array.from(this.jobs.values());
  }
}

export const tiktokJobStore = new TikTokJobStore();

