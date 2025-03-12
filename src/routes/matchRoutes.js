const express = require('express');
const router = express.Router();
const MatchController = require('../controllers/MatchController');

/**
 * @route GET /api/matches
 * @desc Get all matches
 */
router.get('/', MatchController.getAllMatches);

/**
 * @route GET /api/matches/live
 * @desc Get all live matches
 */
router.get('/live', MatchController.getLiveMatches);

/**
 * @route GET /api/matches/:id
 * @desc Get match by ID
 */
router.get('/:id', MatchController.getMatchById);

/**
 * @route GET /api/matches/league/:leagueId
 * @desc Get matches by league ID
 */
router.get('/league/:leagueId', MatchController.getMatchesByLeague);

/**
 * @route GET /api/matches/team/:teamId
 * @desc Get matches by team ID
 */
router.get('/team/:teamId', MatchController.getMatchesByTeam);

/**
 * @route POST /api/matches
 * @desc Create a new match
 */
router.post('/', MatchController.createMatch);

/**
 * @route PUT /api/matches/:id
 * @desc Update match by ID
 */
router.put('/:id', MatchController.updateMatch);

/**
 * @route DELETE /api/matches/:id
 * @desc Delete match by ID
 */
router.delete('/:id', MatchController.deleteMatch);

module.exports = router;