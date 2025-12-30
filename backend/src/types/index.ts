export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // seconds
  channel: string;
  channelId?: string;
  formats: Format[];
  estimatedSize: number; // bytes
  viewCount?: number;
  uploadDate?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
}

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

export interface DownloadRequest {
  url: string;
  format?: string;
  quality?: string;
  audioOnly?: boolean;
  audioFormat?: 'mp3' | 'webm'; // Format audio: mp3 hoặc webm (opus)
  audioBitrate?: number; // Bitrate: 64, 96, 128, 192 kbps
  outputFormat?: 'mp4' | 'webm' | 'mp3' | 'webm-opus'; // Deprecated, dùng audioFormat thay thế
  downloadSubtitles?: boolean;
  downloadThumbnail?: boolean;
  downloadDescription?: boolean;
  title?: string; // Video title (optional, sẽ được analyze nếu không có)
}

export interface BatchDownloadRequest {
  urls: string[];
  options: {
    type: 'audio' | 'video';
    format?: 'mp3' | 'webm' | 'mp4';
    bitrate?: number;
    quality?: string;
    audioFormat?: 'mp3' | 'webm';
    audioBitrate?: number;
    downloadSubtitles?: boolean;
    downloadThumbnail?: boolean;
  };
}

export interface BatchDownloadResponse {
  jobs: Array<{
    jobId: string;
    url: string;
    status: JobStatus;
    error?: string;
  }>;
}

export interface DownloadJob {
  id: string;
  url: string;
  title?: string;
  status: JobStatus;
  format: string;
  progress: number;
  phase?: ProcessingPhase; // Phase hiện tại trong quá trình xử lý
  speed?: string;
  eta?: number;
  message?: string; // Message từ backend (đang merge, đang convert, etc.)
  filePath?: string;
  fileSize?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus = 'pending' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled' | 'paused';

export type ProcessingPhase = 'downloading' | 'postprocessing' | 'renaming' | 'finished';

export interface ProgressUpdate {
  jobId: string;
  status: JobStatus;
  progress: number;
  phase?: ProcessingPhase; // Phase hiện tại trong quá trình xử lý
  speed?: string;
  eta?: number;
  message?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  fragmentIndex?: number;
  fragmentCount?: number;
  indeterminate?: boolean; // Nếu true, không có progress % chính xác (hiển thị spinner)
}

export interface DownloadOptions {
  format: string;
  outputPath: string;
  mergeAudioVideo?: boolean;
  convertFormat?: string;
}

export interface PlaylistInfo {
  id: string;
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
}

export interface PlaylistDownloadRequest {
  url: string;
  audioOnly?: boolean;
  audioFormat?: 'mp3' | 'webm';
  audioBitrate?: number;
  quality?: string;
  downloadSubtitles?: boolean;
  downloadThumbnail?: boolean;
}


