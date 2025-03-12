const { Player, Team } = require('../models');

// Get all players
const getAllPlayers = async (req, res) => {
  try {
    const players = await Player.findAll({
      include: {
        model: Team,
        attributes: ['id', 'name', 'country']
      }
    });
    return res.status(200).json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get player by ID
const getPlayerById = async (req, res) => {
  try {
    const { id } = req.params;
    const player = await Player.findByPk(id, {
      include: {
        model: Team,
        attributes: ['id', 'name', 'country', 'logo']
      }
    });
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    return res.status(200).json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get players by team ID
const getPlayersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findByPk(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const players = await Player.findAll({
      where: { TeamId: teamId },
      include: {
        model: Team,
        attributes: ['id', 'name', 'country']
      }
    });
    
    return res.status(200).json(players);
  } catch (error) {
    console.error('Error fetching players by team:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new player
const createPlayer = async (req, res) => {
  try {
    const { 
      name, position, nationality, birthDate, 
      height, weight, shirtNumber, photo, TeamId 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    if (TeamId) {
      const team = await Team.findByPk(TeamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
    }
    
    const newPlayer = await Player.create({
      name,
      position,
      nationality,
      birthDate,
      height,
      weight,
      shirtNumber,
      photo,
      TeamId
    });
    
    return res.status(201).json(newPlayer);
  } catch (error) {
    console.error('Error creating player:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update player
const updatePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, position, nationality, birthDate, 
      height, weight, shirtNumber, photo, TeamId 
    } = req.body;
    
    const player = await Player.findByPk(id);
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    if (TeamId) {
      const team = await Team.findByPk(TeamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
    }
    
    await player.update({
      name: name || player.name,
      position: position !== undefined ? position : player.position,
      nationality: nationality !== undefined ? nationality : player.nationality,
      birthDate: birthDate !== undefined ? birthDate : player.birthDate,
      height: height !== undefined ? height : player.height,
      weight: weight !== undefined ? weight : player.weight,
      shirtNumber: shirtNumber !== undefined ? shirtNumber : player.shirtNumber,
      photo: photo !== undefined ? photo : player.photo,
      TeamId: TeamId !== undefined ? TeamId : player.TeamId
    });
    
    return res.status(200).json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete player
const deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const player = await Player.findByPk(id);
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    await player.destroy();
    
    return res.status(200).json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  createPlayer,
  updatePlayer,
  deletePlayer
};