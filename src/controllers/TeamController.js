const { Team } = require('../models');

// Get all teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.findAll();
    return res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get team by ID
const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findByPk(id);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    return res.status(200).json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new team
const createTeam = async (req, res) => {
  try {
    const { name, shortName, country, logo, founded, stadium } = req.body;
    
    if (!name || !country) {
      return res.status(400).json({ message: 'Name and country are required' });
    }
    
    const newTeam = await Team.create({
      name,
      shortName,
      country,
      logo,
      founded,
      stadium
    });
    
    return res.status(201).json(newTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update team
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortName, country, logo, founded, stadium } = req.body;
    
    const team = await Team.findByPk(id);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    await team.update({
      name: name || team.name,
      shortName: shortName !== undefined ? shortName : team.shortName,
      country: country || team.country,
      logo: logo !== undefined ? logo : team.logo,
      founded: founded !== undefined ? founded : team.founded,
      stadium: stadium !== undefined ? stadium : team.stadium
    });
    
    return res.status(200).json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    
    const team = await Team.findByPk(id);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    await team.destroy();
    
    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
};