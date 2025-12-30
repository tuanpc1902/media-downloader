/**
 * JobStore - In-memory store để track download jobs và processes
 * Lưu mapping: jobId → { pid, process, status }
 */
import { ChildProcess } from 'child_process';
import { logger } from '../utils/logger';

interface JobProcess {
  jobId: string;
  pid: number;
  process: ChildProcess;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled' | 'paused';
  createdAt: Date;
}

class JobStore {
  private jobs: Map<string, JobProcess> = new Map();

  /**
   * Thêm job process vào store
   */
  addJob(jobId: string, process: ChildProcess): void {
    const pid = process.pid;
    if (!pid) {
      logger.warn(`Process không có PID cho job ${jobId}`);
      return;
    }

    this.jobs.set(jobId, {
      jobId,
      pid,
      process,
      status: 'downloading',
      createdAt: new Date(),
    });

    logger.info(`Tracked job ${jobId} with PID ${pid}`);

    // Cleanup khi process exit
    process.on('exit', () => {
      this.removeJob(jobId);
    });
  }

  /**
   * Lấy job process
   */
  getJob(jobId: string): JobProcess | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Lấy PID của job
   */
  getPid(jobId: string): number | undefined {
    return this.jobs.get(jobId)?.pid;
  }

  /**
   * Lấy process của job
   */
  getProcess(jobId: string): ChildProcess | undefined {
    return this.jobs.get(jobId)?.process;
  }

  /**
   * Update job status
   */
  updateStatus(jobId: string, status: JobProcess['status']): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
    }
  }

  /**
   * Xóa job khỏi store
   */
  removeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      logger.info(`Removed job ${jobId} from store`);
      this.jobs.delete(jobId);
    }
  }

  /**
   * Kill process của job
   */
  killJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn(`Job ${jobId} không tồn tại trong store`);
      return false;
    }

    try {
      // Kill process tree (Windows và Unix)
      if (process.platform === 'win32') {
        // Windows: dùng taskkill để kill process tree
        const { spawn } = require('child_process');
        spawn('taskkill', ['/F', '/T', '/PID', job.pid.toString()], {
          stdio: 'ignore',
        });
      } else {
        // Unix: kill process group
        process.kill(-job.pid, 'SIGTERM');
      }

      // Fallback: kill process trực tiếp
      if (job.process && !job.process.killed) {
        job.process.kill('SIGTERM');
        // Force kill sau 2 giây nếu chưa exit
        setTimeout(() => {
          if (job.process && !job.process.killed) {
            job.process.kill('SIGKILL');
          }
        }, 2000);
      }

      job.status = 'cancelled';
      logger.info(`Killed process ${job.pid} for job ${jobId}`);
      return true;
    } catch (error: any) {
      logger.error(`Error killing job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Lấy tất cả jobs
   */
  getAllJobs(): JobProcess[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Cleanup jobs cũ (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt.getTime() < oneHourAgo && 
          (job.status === 'completed' || job.status === 'error' || job.status === 'cancelled')) {
        this.removeJob(jobId);
      }
    }
  }
}

// Singleton instance
export const jobStore = new JobStore();

// Cleanup mỗi 30 phút
setInterval(() => {
  jobStore.cleanup();
}, 30 * 60 * 1000);

