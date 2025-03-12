const express = require('express');
const router = express.Router();
const FbrefScraperController = require('../controllers/FbrefScraperController');

/**
 * @route GET /api/fbref/matches/today
 * @desc Scrape and save today's matches
 * @access Public
 */
router.get('/matches/today', FbrefScraperController.scrapeMatchesToday);

/**
 * @route GET /api/fbref/matches/:date
 * @desc Scrape and save matches for a specific date
 * @access Public
 */
router.get('/matches/:date', FbrefScraperController.scrapeMatchesByDate);

/**
 * @route GET /api/fbref/matches/:startDate/:endDate
 * @desc Scrape and save matches for a date range
 * @access Public
 */
router.get('/matches/:startDate/:endDate', FbrefScraperController.scrapeMatchesDateRange);

/**
 * @route GET /api/fbref/fetch/matches/today
 * @desc Only fetch today's matches without saving
 * @access Public
 */
router.get('/fetch/matches/today', (req, res, next) => {
  req.params.date = new Date().toISOString().split('T')[0];
  FbrefScraperController.fetchMatchesByDate(req, res, next);
});

/**
 * @route GET /api/fbref/fetch/matches/:date
 * @desc Only fetch matches for a specific date without saving
 * @access Public
 */
router.get('/fetch/matches/:date', FbrefScraperController.fetchMatchesByDate);

module.exports = router;