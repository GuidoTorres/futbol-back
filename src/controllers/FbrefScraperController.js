const { scrapeFbrefMatches, saveMatchesToDatabase, scrapeAndSaveMatches } = require('../scrapers/MatchesScraper');

/**
 * Controller for direct access to FBref scrapers
 */
class FbrefScraperController {
  /**
   * Obtener y guardar partidos para una fecha específica
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async scrapeMatchesByDate(req, res, next) {
    try {
      const { date } = req.params;
      
      // Validate date format (YYYY-MM-DD)
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ 
          error: 'Invalid date format. Please use YYYY-MM-DD format.' 
        });
      }
      
      const { matches, savedCount } = await scrapeAndSaveMatches(date);
      
      res.status(200).json({
        message: `Successfully scraped and saved matches for ${date || 'today'}`,
        matchCount: matches.length,
        savedCount,
        date: date || new Date().toISOString().split('T')[0],
        matches
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Obtener y guardar partidos para hoy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async scrapeMatchesToday(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { matches, savedCount } = await scrapeAndSaveMatches(today);
      
      res.status(200).json({
        message: `Successfully scraped and saved matches for today`,
        matchCount: matches.length,
        savedCount,
        date: today,
        matches
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Obtener y guardar partidos para un rango de fechas
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async scrapeMatchesDateRange(req, res, next) {
    try {
      const { startDate, endDate } = req.params;
      
      // Validate date formats
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({ 
          error: 'Invalid date format. Please use YYYY-MM-DD format for both dates.' 
        });
      }
      
      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return res.status(400).json({
          error: 'Start date must be before or equal to end date.'
        });
      }
      
      // Limit range to max 31 days to prevent abuse
      const daysDiff = Math.round((end - start) / (24 * 60 * 60 * 1000));
      if (daysDiff > 31) {
        return res.status(400).json({
          error: 'Date range too large. Maximum range is 31 days.'
        });
      }
      
      const results = [];
      const currentDate = new Date(start);
      let allMatches = [];
      let totalSaved = 0;
      
      // Loop through each day in the range
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        try {
          const { matches, savedCount } = await scrapeAndSaveMatches(dateStr);
          allMatches = [...allMatches, ...matches];
          totalSaved += savedCount;
          results.push({
            date: dateStr,
            matchCount: matches.length,
            savedCount
          });
        } catch (error) {
          console.error(`Error scraping ${dateStr}:`, error);
          results.push({
            date: dateStr,
            error: error.message,
            matchCount: 0,
            savedCount: 0
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      res.status(200).json({
        message: `Completed scraping and saving matches from ${startDate} to ${endDate}`,
        totalMatches: allMatches.length,
        totalSaved,
        results,
        matches: allMatches
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Solo obtener partidos sin guardarlos
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async fetchMatchesByDate(req, res, next) {
    try {
      const { date } = req.params;
      
      // Validate date format (YYYY-MM-DD)
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ 
          error: 'Invalid date format. Please use YYYY-MM-DD format.' 
        });
      }
      
      const matches = await scrapeFbrefMatches(date);
      
      res.status(200).json({
        message: `Successfully fetched matches for ${date || 'today'}`,
        matchCount: matches.length,
        date: date || new Date().toISOString().split('T')[0],
        matches
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FbrefScraperController;