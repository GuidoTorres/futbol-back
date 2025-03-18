const { Match, Team, League, Event, Player } = require('../models');
const { Op, Sequelize } = require('sequelize');
const dayjs = require('dayjs');

// Get all matches
const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.findAll({
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] },
        { model: League, attributes: ['id', 'name', 'country'] }
      ],
      order: [['date', 'DESC']]
    });
    return res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get match by ID
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await Match.findByPk(id, {
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] },
        { model: League, attributes: ['id', 'name', 'country'] },
        { 
          model: Event,
          include: [
            { model: Team, attributes: ['id', 'name'] },
            { model: Player, as: 'player', attributes: ['id', 'name'] },
            { model: Player, as: 'assistPlayer', attributes: ['id', 'name'] }
          ]
        }
      ]
    });
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    return res.status(200).json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get matches by league ID
const getMatchesByLeague = async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const league = await League.findByPk(leagueId);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    const matches = await Match.findAll({
      where: { LeagueId: leagueId },
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] }
      ],
      order: [['date', 'DESC']]
    });
    
    return res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches by league:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get matches by team ID
const getMatchesByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findByPk(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const matches = await Match.findAll({
      where: {
        [Op.or]: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] },
        { model: League, attributes: ['id', 'name', 'country'] }
      ],
      order: [['date', 'DESC']]
    });
    
    return res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches by team:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get live matches
const getLiveMatches = async (req, res) => {
  try {
    const matches = await Match.findAll({
      where: { status: 'LIVE' },
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] },
        { model: League, attributes: ['id', 'name', 'country'] }
      ]
    });
    
    return res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new match
const createMatch = async (req, res) => {
  try {
    const { 
      date, status, matchday, stage, homeTeamId, awayTeamId, 
      homeScore, awayScore, stadium, referee, LeagueId 
    } = req.body;
    
    if (!date || !homeTeamId || !awayTeamId || !LeagueId) {
      return res.status(400).json({ 
        message: 'Date, home team ID, away team ID, and league ID are required' 
      });
    }
    
    // Validate teams and league
    const homeTeam = await Team.findByPk(homeTeamId);
    if (!homeTeam) {
      return res.status(404).json({ message: 'Home team not found' });
    }
    
    const awayTeam = await Team.findByPk(awayTeamId);
    if (!awayTeam) {
      return res.status(404).json({ message: 'Away team not found' });
    }
    
    const league = await League.findByPk(LeagueId);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    const newMatch = await Match.create({
      date,
      status: status || 'SCHEDULED',
      matchday,
      stage,
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      stadium,
      referee,
      LeagueId
    });
    
    return res.status(201).json(newMatch);
  } catch (error) {
    console.error('Error creating match:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update match
const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      date, status, matchday, stage, homeTeamId, awayTeamId, 
      homeScore, awayScore, stadium, referee, LeagueId 
    } = req.body;
    
    const match = await Match.findByPk(id);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    // Validate referenced entities if they're being updated
    if (homeTeamId) {
      const homeTeam = await Team.findByPk(homeTeamId);
      if (!homeTeam) {
        return res.status(404).json({ message: 'Home team not found' });
      }
    }
    
    if (awayTeamId) {
      const awayTeam = await Team.findByPk(awayTeamId);
      if (!awayTeam) {
        return res.status(404).json({ message: 'Away team not found' });
      }
    }
    
    if (LeagueId) {
      const league = await League.findByPk(LeagueId);
      if (!league) {
        return res.status(404).json({ message: 'League not found' });
      }
    }
    
    await match.update({
      date: date !== undefined ? date : match.date,
      status: status !== undefined ? status : match.status,
      matchday: matchday !== undefined ? matchday : match.matchday,
      stage: stage !== undefined ? stage : match.stage,
      homeTeamId: homeTeamId !== undefined ? homeTeamId : match.homeTeamId,
      awayTeamId: awayTeamId !== undefined ? awayTeamId : match.awayTeamId,
      homeScore: homeScore !== undefined ? homeScore : match.homeScore,
      awayScore: awayScore !== undefined ? awayScore : match.awayScore,
      stadium: stadium !== undefined ? stadium : match.stadium,
      referee: referee !== undefined ? referee : match.referee,
      LeagueId: LeagueId !== undefined ? LeagueId : match.LeagueId
    });
    
    return res.status(200).json(match);
  } catch (error) {
    console.error('Error updating match:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete match
const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const match = await Match.findByPk(id);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    await match.destroy();
    
    return res.status(200).json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMatchesByDate = async (req, res) => {
  try {
    const { startDate, limit = 100, page = 1 } = req.query;
    
    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }
    
    // Usar dayjs para parsear y formatear la fecha
    const date = dayjs(startDate);
    
    if (!date.isValid()) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Formatear como YYYY-MM-DD
    const formattedDate = date.format('YYYY-MM-DD');
    console.log('Fecha de búsqueda:', formattedDate);
    
    // Parse pagination parameters
    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;
    
    // Usar Sequelize.where y Sequelize.fn para trabajar con la función DATE de SQL
    const dateFilter = Sequelize.where(
      Sequelize.fn('DATE', Sequelize.col('date')),
      '>=',
      formattedDate
    );
    
    // Obtener conteo total
    const matchCount = await Match.count({ where: dateFilter });
    console.log(`Se encontraron ${matchCount} partidos para fecha >= ${formattedDate}`);
    
    // Obtener resultados paginados
    const matches = await Match.findAndCountAll({
      attributes: ['id', 'status', 'date', 'homeScore', 'awayScore'],
      where: dateFilter,
      include: [
        { 
          model: Team, 
          as: 'homeTeam', 
          attributes: ['id', 'name', 'logo'],
          required: false
        },
        { 
          model: Team, 
          as: 'awayTeam', 
          attributes: ['id', 'name', 'logo'],
          required: false
        },
        { 
          model: League, 
          attributes: ['id', 'name', 'country'],
          required: false
        }
      ],
      order: [['date', 'ASC']],
      limit: pageSize,
      offset: offset
    });
    
    // Respuesta con paginación
    return res.status(200).json({
      matches: matches.rows,
      pagination: {
        total: matches.count,
        page: parseInt(page),
        pageSize,
        pages: Math.ceil(matches.count / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching matches by date:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllMatches,
  getMatchById,
  getMatchesByLeague,
  getMatchesByTeam,
  getLiveMatches,
  getMatchesByDate,
  createMatch,
  updateMatch,
  deleteMatch
};