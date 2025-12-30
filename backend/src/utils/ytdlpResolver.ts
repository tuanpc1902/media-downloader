import { spawn } from 'child_process';
import { config } from '../config';
import { logger } from './logger';

/**
 * Resolve yt-dlp command và arguments
 * Hỗ trợ cả executable và python module
 */
export function resolveYtdlpCommand(): { command: string; args: string[] } {
  const ytdlpPath = config.ytdlp.path;

  // Nếu là đường dẫn đầy đủ hoặc command đặc biệt, dùng trực tiếp
  if (ytdlpPath.includes('\\') || ytdlpPath.includes('/') || ytdlpPath.includes('python')) {
    // Nếu có python -m yt_dlp
    if (ytdlpPath.includes('python') && ytdlpPath.includes('yt_dlp')) {
      const parts = ytdlpPath.split(' ');
      return {
        command: parts[0],
        args: parts.slice(1),
      };
    }
    // Đường dẫn đầy đủ
    return {
      command: ytdlpPath,
      args: [],
    };
  }

  // Mặc định: thử yt-dlp trước, nếu không có thì dùng python -m yt_dlp
  return {
    command: ytdlpPath,
    args: [],
  };
}

/**
 * Kiểm tra và resolve yt-dlp command với fallback
 */
export async function resolveYtdlpWithFallback(): Promise<{ command: string; args: string[] }> {
  const resolved = resolveYtdlpCommand();

  // Kiểm tra command có hoạt động không
  const isAvailable = await checkCommand(resolved.command, resolved.args.length > 0 ? resolved.args : ['--version']);

  if (isAvailable) {
    return resolved;
  }

  // Fallback: thử python -m yt_dlp
  if (resolved.command === 'yt-dlp' || resolved.command === config.ytdlp.path) {
    logger.warn(`yt-dlp not found in PATH, trying python -m yt_dlp...`);
    const pythonAvailable = await checkCommand('python', ['-m', 'yt_dlp', '--version']);
    
    if (pythonAvailable) {
      logger.info('✅ Using python -m yt_dlp as fallback');
      return {
        command: 'python',
        args: ['-m', 'yt_dlp'],
      };
    }

    // Thử python3
    const python3Available = await checkCommand('python3', ['-m', 'yt_dlp', '--version']);
    if (python3Available) {
      logger.info('✅ Using python3 -m yt_dlp as fallback');
      return {
        command: 'python3',
        args: ['-m', 'yt_dlp'],
      };
    }
  }

  throw new Error(
    `yt-dlp not found. Please install yt-dlp:\n` +
    `  Windows: pip install yt-dlp\n` +
    `  Linux/Mac: pip3 install yt-dlp\n` +
    `Or set YTDLP_PATH in .env to full path or "python -m yt_dlp"`
  );
}

/**
 * Kiểm tra command có hoạt động không
 */
function checkCommand(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const isWindows = process.platform === 'win32';
    
    const childProcess = spawn(command, args, {
      shell: isWindows,
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr để tránh lỗi
    });

    // Consume output để tránh buffer đầy
    childProcess.stdout?.on('data', () => {});
    childProcess.stderr?.on('data', () => {});

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          childProcess.kill();
        } catch {}
        resolve(false);
      }
    }, 8000); // Tăng timeout lên 8 giây cho python module

    childProcess.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(code === 0);
      }
    });

    childProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
}

