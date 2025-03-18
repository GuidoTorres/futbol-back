const express = require('express');
const router = express.Router();
const SofaScoreController = require('../controllers/SofaScoreController');
const SofaScoreScraper = require('../scrapers/SofaScoreScraper');
const DatabasePopulator = require('../utils/databasePopulator');

/* ===== RUTAS PARA JUGADORES ===== */

/**
 * @route   GET /api/sofascore/players/:playerId
 * @desc    Obtener y guardar información de un jugador por ID
 */
router.get('/players/:playerId', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { completeInfo = 'false', save = 'false' } = req.query;
    
    if (!playerId) {
      return res.status(400).json({
        error: 'Se requiere ID de jugador'
      });
    }
    
    const scraper = new SofaScoreScraper();
    
    // Determinar si se solicita información completa o básica
    let playerData;
    if (completeInfo === 'true') {
      playerData = await scraper.getCompletePlayerData(playerId);
    } else {
      playerData = await scraper.scrapePlayerById(playerId);
    }
    
    // Guardar en la base de datos si se solicita
    let result = { saved: 0, updated: 0 };
    if (save === 'true') {
      result = await scraper.savePlayersToDatabase([playerData]);
    }
    
    res.status(200).json({
      message: `Información del jugador ${playerId} obtenida`,
      player: playerData,
      hasTransferHistory: playerData.hasTransferHistory || false,
      hasStatistics: playerData.hasStatistics || false,
      completeInfo: completeInfo === 'true',
      saved: save === 'true' && result.saved > 0,
      updated: save === 'true' && result.updated > 0
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/players/search/:query
 * @desc    Buscar jugadores por nombre o término
 */
router.get('/players/search/:query', async (req, res, next) => {
  try {
    const { query } = req.params;
    const { save } = req.query;
    
    if (!query || query.length < 3) {
      return res.status(400).json({
        error: 'La búsqueda debe tener al menos 3 caracteres'
      });
    }
    
    const scraper = new SofaScoreScraper();
    const players = await scraper.searchPlayersByName(query);
    
    // Guardar en la base de datos si se solicita
    let dbResult = { saved: 0, updated: 0 };
    if (save === 'true') {
      dbResult = await scraper.savePlayersToDatabase(players);
    }
    
    res.status(200).json({
      message: `Búsqueda de jugadores para: ${query}`,
      players,
      count: players.length,
      dbResult: save === 'true' ? dbResult : 'No se guardó en la base de datos'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/teams/:teamId/players
 * @desc    Obtener todos los jugadores de un equipo
 */
router.get('/teams/:teamId/players', async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { save } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        error: 'Se requiere ID del equipo'
      });
    }
    
    const scraper = new SofaScoreScraper();
    const players = await scraper.getTeamPlayers(teamId);
    
    // Guardar en la base de datos si se solicita
    let dbResult = { saved: 0, updated: 0 };
    if (save === 'true') {
      dbResult = await scraper.savePlayersToDatabase(players);
    }
    
    res.status(200).json({
      message: `Jugadores del equipo ${teamId}`,
      players,
      count: players.length,
      dbResult: save === 'true' ? dbResult : 'No se guardó en la base de datos'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/teams/:teamId/details
 * @desc    Obtener detalles completos de un equipo incluyendo plantilla
 */
router.get('/teams/:teamId/details', async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { save } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        error: 'Se requiere ID del equipo'
      });
    }
    
    const scraper = new SofaScoreScraper();
    const teamDetails = await scraper.getTeamDetails(teamId);
    
    // Guardar en la base de datos si se solicita
    let dbResult = { saved: 0, updated: 0 };
    if (save === 'true' && teamDetails.players.length > 0) {
      // Primero crear/actualizar el equipo
      // Código para guardar el equipo en la base de datos
      
      // Luego guardar los jugadores
      dbResult = await scraper.savePlayersToDatabase(teamDetails.players);
    }
    
    res.status(200).json({
      message: `Detalles del equipo ${teamDetails.name}`,
      team: teamDetails,
      playersCount: teamDetails.players.length,
      dbResult: save === 'true' ? dbResult : 'No se guardó en la base de datos'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/players/all
 * @desc    Obtener jugadores de todas las ligas principales
 */
router.get('/players/all', async (req, res, next) => {
  try {
    const { maxTeamsPerLeague = '3', save = 'false' } = req.query;
    const maxTeams = parseInt(maxTeamsPerLeague, 10);
    
    // Lista de ligas principales
    const mainLeagues = [
      'La Liga',
      'EPL',
      'Bundesliga',
      'Serie A',
      'Ligue 1'
    ];
    
    console.log(`🌍 Obteniendo jugadores de ${mainLeagues.length} ligas principales`);
    
    const scraper = new SofaScoreScraper();
    const allPlayers = [];
    const results = {};
    
    // Procesar cada liga en paralelo
    const leaguePromises = mainLeagues.map(async (leagueName) => {
      try {
        console.log(`🏆 Iniciando procesamiento de ${leagueName}...`);
        
        // Obtener temporadas y usar la más reciente
        const seasons = await scraper.getValidSeasons(leagueName);
        const availableYears = Object.keys(seasons).sort((a, b) => b - a);
        
        if (availableYears.length === 0) {
          console.warn(`⚠️ No hay temporadas disponibles para ${leagueName}`);
          return {
            league: leagueName,
            error: 'No hay temporadas disponibles',
            players: []
          };
        }
        
        const year = availableYears[0];
        
        // Obtener jugadores para esta liga
        const result = await scraper.getAndSavePlayersByLeague(leagueName, year, {
          save: save === 'true',
          maxTeams: maxTeams
        });
        
        console.log(`✅ Completado ${leagueName}: ${result.players.length} jugadores`);
        
        return {
          league: leagueName,
          year,
          players: result.players,
          count: result.players.length,
          processedTeams: result.processedTeams
        };
      } catch (error) {
        console.error(`❌ Error procesando ${leagueName}:`, error.message);
        return {
          league: leagueName,
          error: error.message,
          players: []
        };
      }
    });
    
    // Esperar a que se completen todas las ligas
    const leagueResults = await Promise.all(leaguePromises);
    
    // Combinar resultados
    let totalPlayers = 0;
    let totalTeams = 0;
    
    for (const result of leagueResults) {
      results[result.league] = {
        year: result.year,
        playersCount: result.players.length,
        processedTeams: result.processedTeams,
        error: result.error
      };
      
      // Agregar jugadores al array global
      allPlayers.push(...result.players);
      
      // Actualizar contadores
      if (!result.error) {
        totalPlayers += result.players.length;
        totalTeams += result.processedTeams || 0;
      }
    }
    
    // Eliminar duplicados por ID
    const uniqueIds = new Set();
    const uniquePlayers = allPlayers.filter(player => {
      if (!player.id || uniqueIds.has(player.id)) return false;
      uniqueIds.add(player.id);
      return true;
    });
    
    console.log(`✅ Proceso completo: ${uniquePlayers.length} jugadores únicos de ${totalTeams} equipos`);
    
    // Enviar respuesta
    res.status(200).json({
      message: 'Jugadores de todas las ligas principales',
      players: uniquePlayers,
      count: uniquePlayers.length,
      leagues: Object.keys(results),
      leagueResults: results,
      totalTeams,
      saveEnabled: save === 'true'
    });
  } catch (error) {
    console.error('Error obteniendo jugadores de todas las ligas:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/sofascore/leagues
 * @desc    Listar todas las ligas disponibles
 */
router.get('/leagues', async (req, res, next) => {
  try {
    const scraper = SofaScoreScraper();
    const leagues = await scraper.getAllLeagues();
    
    res.status(200).json({
      message: 'Ligas disponibles en SofaScore',
      leagues,
      count: leagues.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/countries
 * @desc    Obtener todos los países disponibles
 */
router.get('/countries', async (req, res, next) => {
  try {
    const scraper = new SofaScoreScraper();
    const countries = await scraper.getAllCountries();
    
    res.status(200).json({
      message: 'Países disponibles en SofaScore',
      countries,
      count: countries.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/structure
 * @desc    Obtener estructura completa de países, ligas y equipos
 */
router.get('/structure', async (req, res, next) => {
  try {
    const scraper = new SofaScoreScraper();
    const structure = await scraper.getCountriesWithLeaguesAndTeams();
    
    res.status(200).json({
      message: 'Estructura jerárquica de países, ligas y equipos',
      structure,
      countriesCount: structure.length,
      info: 'Esta estructura muestra los principales países del fútbol con sus ligas asociadas y equipos representativos'
    });
  } catch (error) {
    console.error('Error obteniendo estructura jerárquica:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/sofascore/leagues/:leagueId/details
 * @desc    Obtener detalles completos de una liga específica
 */
router.get('/leagues/:leagueId/details', async (req, res, next) => {
  try {
    const { leagueId } = req.params;
    
    if (!leagueId) {
      return res.status(400).json({
        error: 'Se requiere ID de liga'
      });
    }
    
    const scraper = new SofaScoreScraper();
    const leagueDetails = await scraper.getLeagueDetails(leagueId);
    
    res.status(200).json({
      message: `Detalles de la liga ${leagueDetails.name}`,
      league: leagueDetails
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/leagues/:league/teams/:year?
 * @desc    Obtener todos los equipos de una liga
 */
router.get('/leagues/:league/teams/:year?', async (req, res, next) => {
  try {
    const { league } = req.params;
    const year = req.params.year || new Date().getFullYear().toString();
    
    if (!league) {
      return res.status(400).json({
        error: 'Se requiere nombre de liga'
      });
    }
    
    const scraper = new SofaScoreScraper();
    
    // Verificar si la liga es válida y obtener su ID
    if (!scraper.COMPETITIONS[league]) {
      return res.status(400).json({
        error: `Liga no soportada: ${league}`,
        availableLeagues: Object.keys(scraper.COMPETITIONS)
      });
    }
    
    // Obtener temporadas y validar el año
    const seasons = await scraper.getValidSeasons(league);
    if (!seasons[year]) {
      return res.status(400).json({
        error: `Año no disponible: ${year}`,
        availableYears: Object.keys(seasons).sort((a, b) => b - a)
      });
    }
    
    // Obtener equipos de la liga
    const leagueId = scraper.COMPETITIONS[league];
    const seasonId = seasons[year];
    const teams = await scraper.getLeagueTeams(leagueId, seasonId);
    
    res.status(200).json({
      message: `Equipos de ${league} (${year})`,
      teams,
      count: teams.length,
      league,
      year
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/leagues/:league/players/:year?
 * @desc    Obtener todos los jugadores de una liga completa
 */
router.get('/leagues/:league/players/:year?', async (req, res, next) => {
  try {
    const { league } = req.params;
    let year = req.params.year || new Date().getFullYear().toString();
    const { save = 'false', maxTeams } = req.query;
    
    if (!league) {
      return res.status(400).json({
        error: 'Se requiere nombre de liga'
      });
    }
    
    const scraper = new SofaScoreScraper();
    
    // Verificar si la liga es válida
    if (!scraper.COMPETITIONS[league]) {
      return res.status(400).json({
        error: `Liga no soportada: ${league}`,
        availableLeagues: Object.keys(scraper.COMPETITIONS)
      });
    }
    
    // Obtener temporadas disponibles
    const seasons = await scraper.getValidSeasons(league);
    const availableYears = Object.keys(seasons).sort((a, b) => b - a);
    
    if (!seasons[year]) {
      // Si el año no está disponible, usar el más reciente automáticamente
      const mostRecentYear = availableYears[0];
      console.log(`Año ${year} no disponible para ${league}, usando ${mostRecentYear} automáticamente`);
      year = mostRecentYear;
    }
    
    // Usar el valor de maxTeams proporcionado o el valor por defecto
    const defaultMaxTeams = 20; // Aumentado para obtener plantillas completas
    
    // Configuración
    const options = {
      save: save === 'true',
      maxTeams: maxTeams ? parseInt(maxTeams, 10) : defaultMaxTeams
    };
    
    // Función para reportar progreso
    let lastUpdate = Date.now();
    let progressUpdates = [];
    
    options.progressCallback = (progress) => {
      const now = Date.now();
      if (now - lastUpdate > 2000) { // Actualizar cada 2 segundos
        progressUpdates.push(progress);
        lastUpdate = now;
      }
    };
    
    console.log(`🔍 Obteniendo jugadores de ${league} (${year}) con guardado=${options.save}, maxTeams=${options.maxTeams}`);
    
    // Obtener jugadores por liga
    const result = await scraper.getAndSavePlayersByLeague(league, year, options);
    
    // Procesar y enriquecer los datos para incluir el equipo en cada jugador
    const playersWithTeam = result.players.map(player => {
      // Si el jugador ya tiene un campo de equipo, usarlo
      if (!player.team || player.team === 'Unknown') {
        // Buscar el equipo basado en teamId si está disponible
        const teamName = player.teamName || 'Unknown';
        return { ...player, team: teamName };
      }
      return player;
    });
    
    // Enviar respuesta
    res.status(200).json({
      message: `Jugadores de ${league} (${year})`,
      league,
      year,
      players: playersWithTeam, // Enviar jugadores con información de equipo
      count: playersWithTeam.length,
      processedTeams: result.processedTeams,
      totalTeams: result.totalTeams,
      dbResult: result.dbResult,
      progress: progressUpdates,
      errors: result.errors,
      saveEnabled: options.save
    });
  } catch (error) {
    console.error('Error obteniendo jugadores por liga:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/sofascore/batch/players/all-leagues
 * @desc    Obtener todos los jugadores de múltiples ligas (proceso masivo en segundo plano)
 */
let batchProcessStatus = {
  isRunning: false,
  progress: [],
  startTime: null,
  endTime: null,
  results: {}
};

router.get('/batch/players/all-leagues', async (req, res, next) => {
  try {
    // Verificar si ya hay un proceso en curso
    if (batchProcessStatus.isRunning) {
      return res.status(200).json({
        message: 'Ya hay un proceso en ejecución',
        inProgress: true,
        status: batchProcessStatus
      });
    }
    
    // Obtener parámetros
    const { leagues } = req.query;
    const year = req.query.year || new Date().getFullYear().toString();
    const maxTeamsPerLeague = req.query.maxTeams ? parseInt(req.query.maxTeams, 10) : 20;
    
    // Iniciar proceso en segundo plano
    batchProcessStatus = {
      isRunning: true,
      progress: [],
      startTime: new Date(),
      endTime: null,
      leagues: leagues ? leagues.split(',') : ['La Liga', 'EPL', 'Bundesliga', 'Serie A', 'Ligue 1'],
      year,
      maxTeamsPerLeague,
      results: {},
      totalPlayers: 0,
      totalTeams: 0,
      errors: []
    };
    
    // Responder de inmediato
    res.status(202).json({
      message: 'Proceso de obtención masiva de jugadores iniciado',
      status: batchProcessStatus,
      statusEndpoint: '/api/sofascore/batch/players/status'
    });
    
    // Ejecutar en segundo plano
    const scraper = new SofaScoreScraper();
    
    // Procesar cada liga secuencialmente
    for (const leagueName of batchProcessStatus.leagues) {
      try {
        console.log(`🏆 Iniciando procesamiento de ${leagueName} (${year})...`);
        
        batchProcessStatus.currentLeague = leagueName;
        const leagueStart = Date.now();
        
        // Función para reportar progreso
        const progressCallback = (progress) => {
          batchProcessStatus.progress.push({
            timestamp: new Date(),
            league: leagueName,
            ...progress
          });
          
          // Mantener solo las últimas 20 actualizaciones
          if (batchProcessStatus.progress.length > 20) {
            batchProcessStatus.progress.shift();
          }
        };
        
        // Obtener jugadores
        const result = await scraper.getAndSavePlayersByLeague(leagueName, year, {
          save: true,
          maxTeams: maxTeamsPerLeague,
          progressCallback
        });
        
        // Guardar resultados
        batchProcessStatus.results[leagueName] = {
          playersCount: result.players.length,
          teamsProcessed: result.processedTeams,
          totalTeams: result.totalTeams,
          dbResult: result.dbResult,
          timeMs: Date.now() - leagueStart
        };
        
        batchProcessStatus.totalPlayers += result.players.length;
        batchProcessStatus.totalTeams += result.processedTeams;
        console.log(`✅ Completado ${leagueName}: ${result.players.length} jugadores`);
        
        // Esperar unos segundos entre ligas
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`❌ Error en liga ${leagueName}:`, error);
        batchProcessStatus.errors.push({
          league: leagueName,
          error: error.message
        });
      }
    }
    
    // Finalizar proceso
    batchProcessStatus.isRunning = false;
    batchProcessStatus.endTime = new Date();
    batchProcessStatus.totalTimeMs = batchProcessStatus.endTime - batchProcessStatus.startTime;
    console.log(`✅ Proceso completo en ${batchProcessStatus.totalTimeMs}ms`);
    
  } catch (error) {
    batchProcessStatus.isRunning = false;
    batchProcessStatus.error = error.message;
    batchProcessStatus.endTime = new Date();
    next(error);
  }
});

/**
 * @route   GET /api/sofascore/batch/players/status
 * @desc    Obtener estado del proceso masivo
 */
router.get('/batch/players/status', (req, res) => {
  res.status(200).json({
    message: batchProcessStatus.isRunning ? 'Proceso en ejecución' : 'Proceso finalizado',
    status: batchProcessStatus
  });
});

/* ===== RUTAS PARA PRUEBAS ===== */

/**
 * @route   GET /api/sofascore/test/puppeteer
 * @desc    Probar funcionamiento de Puppeteer con SofaScore
 */
router.get('/test/puppeteer', async (req, res, next) => {
  try {
    const scraper = new SofaScoreScraper();
    const matches = await scraper.scrapeTodayMatchesWithPuppeteer();
    
    res.status(200).json({
      message: 'Prueba de Puppeteer completada',
      matches,
      count: matches.length
    });
  } catch (error) {
    next(error);
  }
});

/* ===== OTRAS RUTAS ===== */

/**
 * @route   GET /api/sofascore/matches/today
 * @desc    Obtener y guardar partidos del día actual
 */
router.get('/matches/today', SofaScoreController.getTodayMatches);

/**
 * @route   GET /api/sofascore/leagues/:league/seasons
 * @desc    Obtener temporadas disponibles para una liga
 */
router.get('/leagues/:league/seasons', SofaScoreController.getAvailableSeasons);

/**
 * @route   GET /api/sofascore/leagues/:league/matches/:year?
 * @desc    Obtener partidos de una liga en un año específico
 */
router.get('/leagues/:league/matches/:year?', SofaScoreController.getLeagueMatches);

/**
 * @route   GET /api/sofascore/matches/:matchId
 * @desc    Obtener detalles de un partido específico
 */
router.get('/matches/:matchId', SofaScoreController.getMatchDetails);

/**
 * @route   GET /api/sofascore/matches/date/:date
 * @desc    Obtener partidos para una fecha específica
 */
router.get('/matches/date/:date', SofaScoreController.getMatchesByDate);

/**
 * @route   GET /api/sofascore/matches/range/:startDate/:endDate
 * @desc    Obtener partidos para un rango de fechas
 */
router.get('/matches/range/:startDate/:endDate', SofaScoreController.getMatchesByDateRange);

/**
 * @route   GET /api/sofascore/matches/week
 * @desc    Obtener partidos de la semana actual
 */
router.get('/matches/week', SofaScoreController.getCurrentWeekMatches);

/**
 * @route   GET /api/sofascore/fixtures/season/:season
 * @desc    Obtener todos los partidos de una temporada completa
 */
router.get('/fixtures/season/:season', SofaScoreController.getSeasonFixture);

/**
 * @route   GET /api/sofascore/fixtures/status
 * @desc    Obtener estado del proceso de obtención de fixture
 */
router.get('/fixtures/status', SofaScoreController.getFixtureStatus);

/**
 * @route   GET /api/sofascore/teams/update-info
 * @desc    Completar información de todos los equipos en la base de datos
 */
router.get('/teams/update-info', SofaScoreController.completeTeamsInfo);
router.post('/teams/:teamId/update-info', SofaScoreController.updateTeamInfo);

/**
 * @route   GET /api/sofascore/teams/update-status
 * @desc    Obtener estado del proceso de actualización de equipos
 */
router.get('/teams/update-status', SofaScoreController.getTeamsUpdateStatus);

/**
 * @route   GET /api/sofascore/enrich
 * @desc    Enriquecer la base de datos con clasificaciones, estadísticas, etc.
 */
router.get('/enrich', SofaScoreController.enrichDatabase);

/**
 * @route   GET /api/sofascore/enrich/status
 * @desc    Obtener estado del proceso de enriquecimiento
 */
router.get('/enrich/status', SofaScoreController.getEnrichStatus);

/**
 * @route   GET /api/sofascore/enrich/team/:teamId
 * @desc    Enriquecer la base de datos a partir de un equipo específico
 */
router.get('/enrich/team/:teamId', SofaScoreController.enrichFromTeam);

/**
 * @route   GET /api/sofascore/enrich/team/status/:teamId
 * @desc    Obtener estado del proceso de enriquecimiento por equipo
 */
router.get('/enrich/team/status/:teamId', SofaScoreController.getTeamEnrichStatus);

/**
 * @route   GET /api/sofascore/enrich/all
 * @desc    Enriquecer la base de datos a partir de todos los equipos disponibles
 */
router.get('/enrich/all', SofaScoreController.enrichAllTeams);

/**
 * @route   GET /api/sofascore/enrich/all/status
 * @desc    Obtener estado del proceso de enriquecimiento de todos los equipos
 */
router.get('/enrich/all/status', SofaScoreController.getAllTeamsEnrichStatus);

/* ===== RUTAS PARA POBLAR BASE DE DATOS ===== */

/**
 * @route   GET /api/sofascore/populate/initialize
 * @desc    Inicializar la base de datos con datos básicos
 */
router.get('/populate/initialize', async (req, res) => {
  try {
    const populator = new DatabasePopulator();
    const startTime = Date.now();
    
    // Iniciar el proceso en segundo plano
    res.status(202).json({
      message: 'Inicializando población de la base de datos...',
      info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos'
    });
    
    // Ejecutar la inicialización
    await populator.initialize();
    
    // Calcular tiempo total
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Proceso completado en ${totalTime.toFixed(2)} segundos`);
  } catch (error) {
    console.error('❌ Error iniciando población:', error);
    // No se envía respuesta de error ya que ya se envió la respuesta inicial
  }
});

/**
 * @route   GET /api/sofascore/populate/league/:leagueId
 * @desc    Poblar los equipos y jugadores de una liga
 */
router.get('/populate/league/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    if (!leagueId) {
      return res.status(400).json({
        error: 'Se requiere ID de liga'
      });
    }
    
    const populator = new DatabasePopulator();
    
    // Iniciar el proceso en segundo plano
    res.status(202).json({
      message: `Iniciando población de equipos y jugadores para liga ${leagueId}...`,
      info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos'
    });
    
    // Poblar la liga
    await populator.populateTeamsForLeague(leagueId);
    
  } catch (error) {
    console.error(`❌ Error poblando liga:`, error);
    // No se envía respuesta de error ya que ya se envió la respuesta inicial
  }
});

/**
 * @route   GET /api/sofascore/populate/team/:teamId
 * @desc    Poblar los jugadores de un equipo
 */
router.get('/populate/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        error: 'Se requiere ID de equipo'
      });
    }
    
    const populator = new DatabasePopulator();
    
    // Iniciar el proceso
    const startTime = Date.now();
    const result = await populator.populatePlayersForTeam(teamId);
    const totalTime = (Date.now() - startTime) / 1000;
    
    res.status(200).json({
      message: `Población de jugadores ${result ? 'completada' : 'falló'} en ${totalTime.toFixed(2)} segundos`,
      success: result
    });
  } catch (error) {
    console.error(`❌ Error poblando equipo:`, error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;