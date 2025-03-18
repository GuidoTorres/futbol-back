const { Op } = require('sequelize');
const Player = require('../models/Player');
const Team = require('../models/Team');
const League = require('../models/League');

const search = async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'El parámetro "q" es requerido.' });
  }

  try {
    // Búsqueda en jugadores (Player)
    const players = await Player.findAll({
      where: {
        name: {
          [Op.like]: `%${query}%`
        }
      },
      attributes: ['id', 'name', 'photo'],
      raw: true
    });

    // Búsqueda en equipos (Team)
    const teams = await Team.findAll({
      where: {
        name: {
          [Op.like]: `%${query}%`
        }
      },
      attributes: ['id', 'name', 'logo'],
      raw: true
    });

    // Búsqueda en ligas (League)
    const leagues = await League.findAll({
      where: {
        name: {
          [Op.like]: `%${query}%`
        }
      },
      attributes: ['id', 'name', 'logo'],
      raw: true
    });

    // Mapear resultados a un formato unificado
    const mappedPlayers = players.map(player => ({
      id: player.id,
      title: player.name,
      image: player.photo,  // Foto del jugador
      type: 'player'
    }));

    const mappedTeams = teams.map(team => ({
      id: team.id,
      title: team.name,
      image: team.logo,  // Logo del equipo
      type: 'team'
    }));

    const mappedLeagues = leagues.map(league => ({
      id: league.id,
      title: league.name,
      image: league.logo,  // Logo de la liga
      type: 'league'
    }));

    // Combinar todos los resultados en una sola lista
    const results = [...mappedPlayers, ...mappedTeams, ...mappedLeagues];

    // Opcional: ordenar los resultados, por ejemplo, por título
    results.sort((a, b) => a.title.localeCompare(b.title));

    return res.json({ results });
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { search };
