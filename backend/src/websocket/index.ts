import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';

let io: SocketIOServer;

/**
 * Khởi tạo WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.server.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Join room cho job
    socket.on('join-job', (jobId: string) => {
      socket.join(`job-${jobId}`);
      logger.info(`Client ${socket.id} joined job room: ${jobId}`);
    });

    // Leave room
    socket.on('leave-job', (jobId: string) => {
      socket.leave(`job-${jobId}`);
      logger.info(`Client ${socket.id} left job room: ${jobId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server chưa được khởi tạo');
  }
  return io;
}

// Export io để worker có thể sử dụng
export { io };


