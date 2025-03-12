const express = require('express');
const router = express.Router();
const LeagueController = require('../controllers/LeagueController');

/**
 * @route GET /api/leagues
 * @desc Get all leagues
 */
router.get('/', LeagueController.getAllLeagues);

/**
 * @route GET /api/leagues/:id
 * @desc Get league by ID
 */
router.get('/:id', LeagueController.getLeagueById);

/**
 * @route GET /api/leagues/country/:country
 * @desc Get leagues by country
 */
router.get('/country/:country', LeagueController.getLeaguesByCountry);

/**
 * @route GET /api/leagues/:leagueId/standings
 * @desc Get league standings
 */
router.get('/:leagueId/standings', LeagueController.getLeagueStandings);

/**
 * @route POST /api/leagues
 * @desc Create a new league
 */
router.post('/', LeagueController.createLeague);

/**
 * @route PUT /api/leagues/:id
 * @desc Update league by ID
 */
router.put('/:id', LeagueController.updateLeague);

/**
 * @route DELETE /api/leagues/:id
 * @desc Delete league by ID
 */
router.delete('/:id', LeagueController.deleteLeague);

module.exports = router;