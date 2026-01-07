/**
 * API Types - Contract between Frontend and Backend
 */

export type Platform = 'youtube' | 'soundcloud' | 'tiktok' | 'facebook';
export type JobStatus = 'pending' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled' | 'paused';
export type ProcessingPhase = 'downloading' | 'postprocessing' | 'renaming' | 'finished';
export type FormatType = 'mp4' | 'webm' | 'mkv' | 'mp3' | 'm4a' | 'wav' | 'opus';
export type Quality = '144p' | '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p' | 'best';
export type Codec = 'h264' | 'h265' | 'av1';

export interface Format {
  formatId: string;
  ext: string;
  resolution?: string;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  fps?: number;
  abr?: number; // audio bitrate
  vbr?: number; // video bitrate
  tbr?: number; // total bitrate
  width?: number;
  height?: number;
  quality?: string;
}

export interface MediaInfo {
  id: string;
  platform: Platform;
  title: string;
  thumbnail: string;
  channel?: string;
  author?: string;
  duration: number; // seconds
  views?: number;
  likes?: number;
  uploadDate?: string;
  description?: string;
  formats: Format[];
  estimatedSize: number; // bytes
  isPrivate?: boolean;
  isAgeRestricted?: boolean;
  isGeoBlocked?: boolean;
  warnings?: string[];
}

export interface PlaylistInfo {
  id: string;
  platform: Platform;
  title: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  videoCount: number;
  videos: Array<{
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    url: string;
  }>;
  description?: string;
  viewCount?: number;
  uploadDate?: string;
  totalDuration: number;
}

export interface DownloadRequest {
  url: string;
  platform: Platform;
  
  // Format Options
  mode: 'video' | 'audio';
  format?: FormatType;
  quality?: Quality;
  fps?: number;
  codec?: Codec;
  audioBitrate?: number; // kbps
  
  // Advanced Options
  embedThumbnail?: boolean;
  embedMetadata?: boolean;
  normalizeAudio?: boolean;
  removeSilence?: boolean;
  splitChapters?: boolean;
  downloadSubtitles?: boolean;
  subtitleLanguages?: string[];
  autoTranslateSubtitles?: boolean;
  
  // File Naming
  filenameTemplate?: string;
  outputPath?: string;
  
  // Metadata (from analyze, for validation)
  mediaId?: string;
  expectedDuration?: number;
}

export interface DownloadJob {
  id: string;
  url: string;
  platform: Platform;
  title?: string;
  status: JobStatus;
  format: string;
  progress: number;
  phase?: ProcessingPhase;
  speed?: string;
  eta?: number;
  message?: string;
  filePath?: string;
  fileSize?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  fragmentIndex?: number;
  fragmentCount?: number;
  error?: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface ProgressUpdate {
  jobId: string;
  status: JobStatus;
  progress: number;
  phase?: ProcessingPhase;
  speed?: string;
  eta?: number;
  message?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  fragmentIndex?: number;
  fragmentCount?: number;
  indeterminate?: boolean;
}

export interface BatchDownloadRequest {
  urls: string[];
  options: DownloadRequest;
}

export interface BatchDownloadResponse {
  jobs: DownloadJob[];
  errors?: Array<{ url: string; error: string }>;
}

export interface PlaylistDownloadRequest {
  url: string;
  options: DownloadRequest;
}

export interface QueueStats {
  total: number;
  pending: number;
  downloading: number;
  processing: number;
  completed: number;
  failed: number;
  totalDownloaded: number; // bytes
  totalSpeed: number; // bytes/sec
}

export interface QueueResponse {
  jobs: DownloadJob[];
  stats: QueueStats;
}

export interface Settings {
  // Download Settings
  defaultDownloadPath: string;
  defaultFormat: FormatType;
  defaultQuality: Quality;
  maxConcurrentDownloads: number;
  retryCount: number;
  timeout: number;
  
  // File Naming
  filenameTemplate: string;
  filenameTemplateVideo: string;
  filenameTemplateAudio: string;
  filenameTemplatePlaylist: string;
  
  // Advanced Settings
  proxy?: string;
  cookieFile?: string;
  customHeaders?: Record<string, string>;
  
  // UI Settings
  theme: 'light' | 'dark' | 'auto';
  language: string;
  compactMode: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  options: Partial<DownloadRequest>;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: 'ytdlp' | 'ffmpeg' | 'system';
}

export interface DownloadLogs {
  ytdlp: LogEntry[];
  ffmpeg: LogEntry[];
}

