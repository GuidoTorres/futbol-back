const SofaScoreScraper = require('../scrapers/SofaScoreScraper');

/**
 * Controlador para manejar operaciones de scraping con SofaScore
 */
class SofaScoreController {
  /**
   * Obtener y guardar los partidos del día actual
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTodayMatches(req, res, next) {
    try {
      const scraper = new SofaScoreScraper();
      const result = await scraper.scrapeAndSaveTodayMatches();
      
      res.status(200).json({
        message: 'Partidos del día obtenidos y guardados exitosamente',
        stats: result.stats,
        total: result.matches.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener y guardar partidos de una liga específica
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getLeagueMatches(req, res, next) {
    try {
      const { league, year } = req.params;
      
      if (!league) {
        return res.status(400).json({
          error: 'Se requiere especificar una liga'
        });
      }
      
      // Usar el año actual si no se proporciona
      const validYear = year || new Date().getFullYear().toString();
      
      const scraper = new SofaScoreScraper();
      const result = await scraper.scrapeAndSaveMatches(validYear, league);
      
      res.status(200).json({
        message: `Partidos de ${league} ${validYear} obtenidos y guardados exitosamente`,
        stats: result.stats,
        league,
        year: validYear
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener detalles de un partido específico
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMatchDetails(req, res, next) {
    try {
      const { matchId } = req.params;
      
      if (!matchId) {
        return res.status(400).json({
          error: 'Se requiere ID de partido'
        });
      }
      
      const scraper = new SofaScoreScraper();
      const matchDetails = await scraper.getMatchDetails(matchId);
      const result = await scraper.saveMatchToDatabase(matchDetails);
      
      res.status(200).json({
        message: `Detalles del partido ${matchId} obtenidos y guardados`,
        match: matchDetails.match,
        created: result.created
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar ligas disponibles en SofaScore
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getAvailableLeagues(req, res) {
    // Obtener del objeto de mapeo de competiciones
    const leagues = Object.keys(require('../scrapers/SofaScoreScraper').SOFASCORE_COMPETITIONS || {});
    
    res.status(200).json({
      message: 'Ligas disponibles en SofaScore',
      leagues
    });
  }

  /**
   * Obtener las temporadas disponibles para una liga
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getAvailableSeasons(req, res, next) {
    try {
      const { league } = req.params;
      
      if (!league) {
        return res.status(400).json({
          error: 'Se requiere especificar una liga'
        });
      }
      
      const scraper = new SofaScoreScraper();
      const seasons = await scraper.getValidSeasons(league);
      
      res.status(200).json({
        message: `Temporadas disponibles para ${league}`,
        league,
        seasons: Object.keys(seasons).sort((a, b) => b - a) // Ordenar por año descendente
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SofaScoreController;