import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { logger } from '../utils/logger';

const searchService = new SearchService();

export class SearchController {
  /**
   * POST /api/search/youtube
   * Search YouTube videos
   */
  async searchYouTube(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit, page } = req.body;

      if (!query) {
        res.status(400).json({ error: 'Query là bắt buộc' });
        return;
      }

      const results = await searchService.searchYouTube(query, limit || 50, page || 1);
      res.json({ results });
    } catch (error: any) {
      logger.error(`Search YouTube error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Lỗi tìm kiếm YouTube' });
    }
  }
}

