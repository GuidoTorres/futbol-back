const express = require('express');
const router = express.Router();
const TeamController = require('../controllers/TeamController');

/**
 * @route GET /api/teams
 * @desc Get all teams
 */
router.get('/', TeamController.getAllTeams);

/**
 * @route GET /api/teams/:id
 * @desc Get team by ID
 */
router.get('/:id', TeamController.getTeamById);

/**
 * @route POST /api/teams
 * @desc Create a new team
 */
router.post('/', TeamController.createTeam);

/**
 * @route PUT /api/teams/:id
 * @desc Update team by ID
 */
router.put('/:id', TeamController.updateTeam);

/**
 * @route DELETE /api/teams/:id
 * @desc Delete team by ID
 */
router.delete('/:id', TeamController.deleteTeam);

module.exports = router;