import axios from 'axios';
import { VideoInfo, DownloadJob, DownloadRequest, BatchDownloadRequest, BatchDownloadResponse, PlaylistInfo, PlaylistDownloadRequest } from '../types';
import { MediaInfo } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeVideo = async (url: string): Promise<VideoInfo> => {
  try {
    const response = await api.post<VideoInfo>('/analyze', { url });
    return response.data;
  } catch (error: any) {
    // Extract error message từ response
    const errorMessage = error.response?.data?.error || error.message || 'Lỗi phân tích video';
    // Không include URL trong error message để tránh làm message dài
    throw new Error(errorMessage);
  }
};

// Helper to convert VideoInfo to MediaInfo
export const analyzeVideoAsMedia = async (url: string): Promise<MediaInfo> => {
  const videoInfo = await analyzeVideo(url);
  // Convert VideoInfo to MediaInfo format
  return {
    id: videoInfo.id,
    platform: 'youtube', // Default, can be detected from URL
    title: videoInfo.title,
    thumbnail: videoInfo.thumbnail,
    channel: videoInfo.channel,
    duration: videoInfo.duration,
    views: videoInfo.viewCount, // Use 'views' instead of 'viewCount'
    uploadDate: videoInfo.uploadDate,
    description: videoInfo.description,
    formats: videoInfo.formats,
    estimatedSize: videoInfo.estimatedSize,
  };
};

export const createDownload = async (request: DownloadRequest): Promise<DownloadJob> => {
  const response = await api.post<DownloadJob>('/download', request);
  return response.data;
};

export const getDownloadStatus = async (id: string): Promise<any> => {
  const response = await api.get(`/download/${id}/status`);
  return response.data;
};

export const downloadFile = (id: string): string => {
  return `${API_BASE_URL}/download/${id}/file`;
};

export const cancelDownload = async (id: string): Promise<void> => {
  await api.delete(`/download/${id}`);
};

export const createBatchDownload = async (request: BatchDownloadRequest): Promise<BatchDownloadResponse> => {
  const response = await api.post<BatchDownloadResponse>('/download/batch', request);
  return response.data;
};

export const analyzePlaylist = async (url: string): Promise<PlaylistInfo> => {
  const response = await api.post<PlaylistInfo>('/analyze/playlist', { url });
  return response.data;
};

export const createPlaylistDownload = async (request: PlaylistDownloadRequest): Promise<BatchDownloadResponse> => {
  const response = await api.post<BatchDownloadResponse>('/download/playlist', request);
  return response.data;
};

// TikTok-specific APIs
export interface TikTokVideoInfo {
  id: string;
  title: string;
  author: string;
  authorId: string;
  thumbnail: string;
  duration: number;
  viewCount?: number;
  likeCount?: number;
  isPublic: boolean;
  formats: Array<{
    formatId: string;
    ext: string;
    resolution?: string;
    filesize?: number;
  }>;
  estimatedSize: number;
}

export interface TikTokDownloadRequest {
  url: string;
  format: 'video' | 'audio';
  audioFormat?: 'mp3' | 'm4a';
  quality?: 'best' | '720p' | '480p' | '360p';
}

export const analyzeTikTokVideo = async (url: string): Promise<TikTokVideoInfo> => {
  try {
    const response = await api.post<TikTokVideoInfo>('/tiktok/analyze', { url });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Lỗi phân tích video TikTok';
    throw new Error(errorMessage);
  }
};

export const createTikTokDownload = async (request: TikTokDownloadRequest): Promise<{ jobId: string; status: string; createdAt: string }> => {
  try {
    const response = await api.post<{ jobId: string; status: string; createdAt: string }>('/tiktok/download', request);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Lỗi tạo download job';
    throw new Error(errorMessage);
  }
};

// YouTube Search
export interface YouTubeSearchResult {
  video: MediaInfo;
  url: string;
}

export const searchYouTube = async (query: string, limit: number = 10, page: number = 1): Promise<YouTubeSearchResult[]> => {
  try {
    const response = await api.post<{ results: Array<{ video: MediaInfo; url: string }> }>('/search/youtube', { 
      query,
      limit,
      page
    });
    return response.data.results;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Lỗi tìm kiếm YouTube';
    throw new Error(errorMessage);
  }
};


