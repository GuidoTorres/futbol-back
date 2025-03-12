const express = require('express');
const router = express.Router();
const SofaScoreController = require('../controllers/SofaScoreController');
const { scrapeAndSaveTodayMatches } = require('../scrapers/SofaScoreScraper');

// Obtener partidos del día actual
router.get('/matches/today', scrapeAndSaveTodayMatches);

// Listar ligas disponibles
router.get('/leagues', SofaScoreController.getAvailableLeagues);

// Obtener temporadas disponibles para una liga
router.get('/leagues/:league/seasons', SofaScoreController.getAvailableSeasons);

// Obtener partidos de una liga en un año específico
router.get('/leagues/:league/matches/:year?', SofaScoreController.getLeagueMatches);

// Obtener detalles de un partido específico
router.get('/matches/:matchId', SofaScoreController.getMatchDetails);

module.exports = router;