import { Request, Response } from 'express';
import { AnalyzeService } from '../services/analyze.service';
import { logger } from '../utils/logger';

const analyzeService = new AnalyzeService();

export class AnalyzeController {
  /**
   * POST /api/analyze
   * Phân tích video từ URL
   */
  async analyze(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }

      const videoInfo = await analyzeService.analyze(url);
      res.json(videoInfo);
    } catch (error: any) {
      logger.error(`Analyze error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi phân tích video' });
    }
  }

  /**
   * POST /api/analyze/playlist
   * Phân tích playlist từ URL
   */
  async analyzePlaylist(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL là bắt buộc' });
        return;
      }

      const playlistInfo = await analyzeService.analyzePlaylist(url);
      res.json(playlistInfo);
    } catch (error: any) {
      logger.error(`Analyze playlist error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi phân tích playlist' });
    }
  }
}


