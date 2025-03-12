const { runAllScrapers } = require('../scrapers');

/**
 * Controlador para ejecutar todos los scrapers
 */
class ScraperController {
  /**
   * Ejecuta todos los scrapers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async runAll(req, res, next) {
    try {
      const options = {
        date: req.query.date,
        skipMatches: req.query.skipMatches === 'true',
        skipTeams: req.query.skipTeams === 'true',
        skipCompetitions: req.query.skipCompetitions === 'true',
        skipPlayers: req.query.skipPlayers === 'true'
      };

      const results = await runAllScrapers(options);
      
      res.status(200).json({
        message: 'Proceso de scraping completado',
        results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ejecuta scraper de partidos y los guarda en la base de datos
   */
  static async runMatches(req, res, next) {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      
      const results = await runAllScrapers({
        date,
        skipTeams: true,
        skipCompetitions: true,
        skipPlayers: true
      });
      
      res.status(200).json({
        message: `Scraping de partidos completado para la fecha ${date}`,
        results: results.matches
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ejecuta scraper de equipos y los guarda en la base de datos
   */
  static async runTeams(req, res, next) {
    try {
      const results = await runAllScrapers({
        skipMatches: true,
        skipCompetitions: true,
        skipPlayers: true
      });
      
      res.status(200).json({
        message: 'Scraping de equipos completado',
        results: results.teams
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ejecuta scraper de competiciones y los guarda en la base de datos
   */
  static async runCompetitions(req, res, next) {
    try {
      const results = await runAllScrapers({
        skipMatches: true,
        skipTeams: true,
        skipPlayers: true
      });
      
      res.status(200).json({
        message: 'Scraping de competiciones completado',
        results: results.competitions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ejecuta scraper de jugadores y los guarda en la base de datos
   */
  static async runPlayers(req, res, next) {
    try {
      const results = await runAllScrapers({
        skipMatches: true,
        skipTeams: true,
        skipCompetitions: true
      });
      
      res.status(200).json({
        message: 'Scraping de jugadores completado',
        results: results.players
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ScraperController;