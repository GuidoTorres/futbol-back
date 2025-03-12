const { Event, Match, Player, Team } = require('../models');

// Get events by match ID
const getEventsByMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Check if match exists
    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    const events = await Event.findAll({
      where: { MatchId: matchId },
      include: [
        { model: Player, as: 'player', attributes: ['id', 'name', 'position'] },
        { model: Player, as: 'assistPlayer', attributes: ['id', 'name', 'position'] },
        { model: Team, attributes: ['id', 'name'] }
      ],
      order: [['minute', 'ASC'], ['extraMinute', 'ASC']]
    });
    
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events by match:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new event
const createEvent = async (req, res) => {
  try {
    const { 
      type, minute, extraMinute, detail, 
      MatchId, playerId, assistPlayerId, TeamId 
    } = req.body;
    
    if (!type || !minute || !MatchId || !TeamId) {
      return res.status(400).json({ 
        message: 'Event type, minute, match ID, and team ID are required' 
      });
    }
    
    // Validate match and team
    const match = await Match.findByPk(MatchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    const team = await Team.findByPk(TeamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Validate player if specified
    if (playerId) {
      const player = await Player.findByPk(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
    }
    
    // Validate assist player if specified
    if (assistPlayerId) {
      const assistPlayer = await Player.findByPk(assistPlayerId);
      if (!assistPlayer) {
        return res.status(404).json({ message: 'Assist player not found' });
      }
    }
    
    const newEvent = await Event.create({
      type,
      minute,
      extraMinute,
      detail,
      MatchId,
      playerId,
      assistPlayerId,
      TeamId
    });
    
    // Return the created event with associated entities
    const createdEvent = await Event.findByPk(newEvent.id, {
      include: [
        { model: Player, as: 'player', attributes: ['id', 'name', 'position'] },
        { model: Player, as: 'assistPlayer', attributes: ['id', 'name', 'position'] },
        { model: Team, attributes: ['id', 'name'] }
      ]
    });
    
    return res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, minute, extraMinute, detail, 
      MatchId, playerId, assistPlayerId, TeamId 
    } = req.body;
    
    const event = await Event.findByPk(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Validate referenced entities if they're being updated
    if (MatchId) {
      const match = await Match.findByPk(MatchId);
      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
    }
    
    if (TeamId) {
      const team = await Team.findByPk(TeamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
    }
    
    if (playerId) {
      const player = await Player.findByPk(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
    }
    
    if (assistPlayerId) {
      const assistPlayer = await Player.findByPk(assistPlayerId);
      if (!assistPlayer) {
        return res.status(404).json({ message: 'Assist player not found' });
      }
    }
    
    await event.update({
      type: type || event.type,
      minute: minute !== undefined ? minute : event.minute,
      extraMinute: extraMinute !== undefined ? extraMinute : event.extraMinute,
      detail: detail !== undefined ? detail : event.detail,
      MatchId: MatchId || event.MatchId,
      playerId: playerId !== undefined ? playerId : event.playerId,
      assistPlayerId: assistPlayerId !== undefined ? assistPlayerId : event.assistPlayerId,
      TeamId: TeamId || event.TeamId
    });
    
    // Return the updated event with associated entities
    const updatedEvent = await Event.findByPk(id, {
      include: [
        { model: Player, as: 'player', attributes: ['id', 'name', 'position'] },
        { model: Player, as: 'assistPlayer', attributes: ['id', 'name', 'position'] },
        { model: Team, attributes: ['id', 'name'] }
      ]
    });
    
    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    await event.destroy();
    
    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getEventsByMatch,
  createEvent,
  updateEvent,
  deleteEvent
};