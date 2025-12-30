import { searchYouTubeVideos } from '../utils/youtubeSearch';
import { logger } from '../utils/logger';

export class SearchService {
  /**
   * Search YouTube videos
   */
  async searchYouTube(query: string, limit: number = 10, page: number = 1): Promise<Array<{ video: any; url: string }>> {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('Query không được để trống');
      }

      // Allow up to 50 results for pagination
      const searchLimit = Math.min(Math.max(1, limit), 50);
      const searchPage = Math.max(1, page);

      logger.info(`Searching YouTube: "${query}" (limit: ${searchLimit}, page: ${searchPage})`);
      
      // Get more results than requested to allow sorting and pagination
      const maxResults = Math.max(searchLimit, 50); // Get at least 50 for better sorting
      const results = await searchYouTubeVideos(query.trim(), maxResults);
      
      // Sort by views (most popular first)
      const sortedResults = results.sort((a, b) => {
        const viewsA = a.video.views || 0;
        const viewsB = b.video.views || 0;
        return viewsB - viewsA; // Descending order
      });
      
      logger.info(`Found ${sortedResults.length} results for: "${query}" (sorted by popularity)`);
      return sortedResults;
    } catch (error: any) {
      logger.error(`YouTube search error: ${error.message}`);
      throw error;
    }
  }
}

