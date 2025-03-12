const express = require('express');
const router = express.Router();
const ScraperController = require('../controllers/ScraperController');

// Ejecutar todos los scrapers
router.get('/run-all', ScraperController.runAll);

// Ejecutar scrapers individuales
router.get('/run-matches', ScraperController.runMatches);
router.get('/run-teams', ScraperController.runTeams);
router.get('/run-competitions', ScraperController.runCompetitions);
router.get('/run-players', ScraperController.runPlayers);

module.exports = router;