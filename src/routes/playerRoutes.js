const express = require('express');
const router = express.Router();
const PlayerController = require('../controllers/PlayerController');

/**
 * @route GET /api/players
 * @desc Get all players
 */
router.get('/', PlayerController.getAllPlayers);

/**
 * @route GET /api/players/:id
 * @desc Get player by ID
 */
router.get('/:id', PlayerController.getPlayerById);

/**
 * @route GET /api/players/team/:teamId
 * @desc Get players by team ID
 */
router.get('/team/:teamId', PlayerController.getPlayersByTeam);

/**
 * @route POST /api/players
 * @desc Create a new player
 */
router.post('/', PlayerController.createPlayer);

/**
 * @route PUT /api/players/:id
 * @desc Update player by ID
 */
router.put('/:id', PlayerController.updatePlayer);

/**
 * @route DELETE /api/players/:id
 * @desc Delete player by ID
 */
router.delete('/:id', PlayerController.deletePlayer);

module.exports = router;