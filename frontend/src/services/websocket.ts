import { io, Socket } from 'socket.io-client';
import { ProgressUpdate } from '../types';

// In development, use empty string to go through Vite proxy
// In production, use the configured WS_URL or default to current origin
const WS_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.DEV ? '' : 'http://localhost:3001');

class WebSocketService {
  private socket: Socket | null = null;
  private progressCallbacks: ((update: ProgressUpdate) => void)[] = [];

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      // Re-register all progress callbacks
      this.progressCallbacks.forEach(callback => {
        this.socket?.on('progress', callback);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      console.error('Attempting to connect to:', WS_URL || 'current origin (via proxy)');
    });

    // Register existing callbacks if socket is already connected
    if (this.socket.connected) {
      this.progressCallbacks.forEach(callback => {
        this.socket?.on('progress', callback);
      });
    }

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinJob(jobId: string): void {
    if (this.socket?.connected) {
      console.log('Joining job room:', jobId);
      this.socket.emit('join-job', jobId);
    } else {
      console.warn('Socket not connected, cannot join job:', jobId);
      // Queue join request for when socket connects
      this.socket?.once('connect', () => {
        console.log('Socket connected, joining job:', jobId);
        this.socket?.emit('join-job', jobId);
      });
    }
  }

  leaveJob(jobId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-job', jobId);
    }
  }

  onProgress(callback: (update: ProgressUpdate) => void): void {
    // Store callback
    this.progressCallbacks.push(callback);
    
    // Register immediately if socket exists and is connected
    if (this.socket?.connected) {
      console.log('Registering progress callback (socket connected)');
      this.socket.on('progress', callback);
    } else {
      console.log('Progress callback registered, will be active when socket connects');
      // Will be registered when socket connects (see connect() method)
    }
  }

  offProgress(callback?: (update: ProgressUpdate) => void): void {
    if (callback) {
      // Remove from callbacks array
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    } else {
      this.progressCallbacks = [];
    }
    
    if (this.socket) {
      if (callback) {
        this.socket.off('progress', callback);
      } else {
        this.socket.off('progress');
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();


