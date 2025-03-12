const { League, Team, Match } = require('../models');
const { Op } = require('sequelize');

// Get all leagues
const getAllLeagues = async (req, res) => {
  try {
    const leagues = await League.findAll();
    return res.status(200).json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get league by ID
const getLeagueById = async (req, res) => {
  try {
    const { id } = req.params;
    const league = await League.findByPk(id);
    
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    return res.status(200).json(league);
  } catch (error) {
    console.error('Error fetching league:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leagues by country
const getLeaguesByCountry = async (req, res) => {
  try {
    const { country } = req.params;
    
    const leagues = await League.findAll({
      where: { 
        country: {
          [Op.like]: `%${country}%`
        }
      }
    });
    
    return res.status(200).json(leagues);
  } catch (error) {
    console.error('Error fetching leagues by country:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new league
const createLeague = async (req, res) => {
  try {
    const { name, country, logo, season, startDate, endDate } = req.body;
    
    if (!name || !country || !season) {
      return res.status(400).json({ message: 'Name, country, and season are required' });
    }
    
    const newLeague = await League.create({
      name,
      country,
      logo,
      season,
      startDate,
      endDate
    });
    
    return res.status(201).json(newLeague);
  } catch (error) {
    console.error('Error creating league:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update league
const updateLeague = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, logo, season, startDate, endDate } = req.body;
    
    const league = await League.findByPk(id);
    
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    await league.update({
      name: name || league.name,
      country: country || league.country,
      logo: logo !== undefined ? logo : league.logo,
      season: season || league.season,
      startDate: startDate !== undefined ? startDate : league.startDate,
      endDate: endDate !== undefined ? endDate : league.endDate
    });
    
    return res.status(200).json(league);
  } catch (error) {
    console.error('Error updating league:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete league
const deleteLeague = async (req, res) => {
  try {
    const { id } = req.params;
    
    const league = await League.findByPk(id);
    
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    await league.destroy();
    
    return res.status(200).json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get league standings
const getLeagueStandings = async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    // First check if league exists
    const league = await League.findByPk(leagueId);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    // Get all matches for this league that are finished
    const matches = await Match.findAll({
      where: { 
        LeagueId: leagueId,
        status: 'FINISHED'
      },
      include: [
        { model: Team, as: 'homeTeam' },
        { model: Team, as: 'awayTeam' }
      ]
    });
    
    // Calculate standings
    const standings = {};
    
    // Process matches to build standings
    matches.forEach(match => {
      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;
      const homeScore = match.homeScore;
      const awayScore = match.awayScore;
      
      // Initialize team in standings if not exists
      if (!standings[homeTeam.id]) {
        standings[homeTeam.id] = {
          team: {
            id: homeTeam.id,
            name: homeTeam.name,
            logo: homeTeam.logo
          },
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      }
      
      if (!standings[awayTeam.id]) {
        standings[awayTeam.id] = {
          team: {
            id: awayTeam.id,
            name: awayTeam.name,
            logo: awayTeam.logo
          },
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      }
      
      // Update home team stats
      standings[homeTeam.id].played += 1;
      standings[homeTeam.id].goalsFor += homeScore;
      standings[homeTeam.id].goalsAgainst += awayScore;
      
      // Update away team stats
      standings[awayTeam.id].played += 1;
      standings[awayTeam.id].goalsFor += awayScore;
      standings[awayTeam.id].goalsAgainst += homeScore;
      
      // Determine match result
      if (homeScore > awayScore) {
        // Home team won
        standings[homeTeam.id].won += 1;
        standings[homeTeam.id].points += 3;
        standings[awayTeam.id].lost += 1;
      } else if (homeScore < awayScore) {
        // Away team won
        standings[awayTeam.id].won += 1;
        standings[awayTeam.id].points += 3;
        standings[homeTeam.id].lost += 1;
      } else {
        // Draw
        standings[homeTeam.id].drawn += 1;
        standings[homeTeam.id].points += 1;
        standings[awayTeam.id].drawn += 1;
        standings[awayTeam.id].points += 1;
      }
    });
    
    // Calculate goal difference and convert to array
    const standingsArray = Object.values(standings).map(team => {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
      return team;
    });
    
    // Sort by points (desc), goal difference (desc), goals for (desc)
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    
    return res.status(200).json({
      league: {
        id: league.id,
        name: league.name,
        country: league.country,
        season: league.season,
        logo: league.logo
      },
      standings: standingsArray
    });
  } catch (error) {
    console.error('Error getting league standings:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllLeagues,
  getLeagueById,
  getLeaguesByCountry,
  createLeague,
  updateLeague,
  deleteLeague,
  getLeagueStandings
};