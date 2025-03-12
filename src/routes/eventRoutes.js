const express = require('express');
const router = express.Router();
const EventController = require('../controllers/EventController');

/**
 * @route GET /api/events/match/:matchId
 * @desc Get events by match ID
 */
router.get('/match/:matchId', EventController.getEventsByMatch);

/**
 * @route POST /api/events
 * @desc Create a new event
 */
router.post('/', EventController.createEvent);

/**
 * @route PUT /api/events/:id
 * @desc Update event by ID
 */
router.put('/:id', EventController.updateEvent);

/**
 * @route DELETE /api/events/:id
 * @desc Delete event by ID
 */
router.delete('/:id', EventController.deleteEvent);

module.exports = router;