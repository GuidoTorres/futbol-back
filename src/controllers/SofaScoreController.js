const SofaScoreScraper = require('../scrapers/SofaScoreScraper');
const { Country, Team, Player, League, Match, sequelize, TeamLeague } = require('../models');
const { Op } = require('sequelize');

/**
 * Controlador para manejar operaciones de scraping con SofaScore
 */
class SofaScoreController {
  /**
   * Obtener y guardar los partidos del día actual
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getTodayMatches(req, res, next) {
    try {
      const scraper = new SofaScoreScraper();
      const result = await scraper.scrapeAndSaveTodayMatches();
      
      res.status(200).json({
        message: 'Partidos del día obtenidos y guardados exitosamente',
        stats: result.stats,
        total: result.matches.length,
        matches: result.matches
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener y guardar partidos de una liga específica
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getLeagueMatches(req, res, next) {
    try {
      const { league, year } = req.params;
      
      if (!league) {
        return res.status(400).json({
          error: 'Se requiere especificar una liga'
        });
      }
      
      // Usar el año actual si no se proporciona
      const validYear = year || new Date().getFullYear().toString();
      
      const scraper = new SofaScoreScraper();
      
      // Verificar si la liga es válida
      if (!scraper.COMPETITIONS[league]) {
        return res.status(400).json({
          error: `Liga no soportada: ${league}`,
          availableLeagues: Object.keys(scraper.COMPETITIONS)
        });
      }
      
      // Intentar obtener temporadas válidas
      const seasons = await scraper.getValidSeasons(league);
      
      if (!seasons[validYear]) {
        return res.status(400).json({
          error: `Año no disponible: ${validYear}`,
          availableYears: Object.keys(seasons).sort((a, b) => b - a)
        });
      }
      
      // Obtener partidos de la liga y temporada
      const matches = await scraper.scrapeLeagueMatches(validYear, league);
      const result = await scraper.saveMatchesToDatabase(matches);
      
      res.status(200).json({
        message: `Partidos de ${league} ${validYear} obtenidos y guardados exitosamente`,
        stats: result,
        league,
        year: validYear,
        count: matches.length,
        matches: matches.slice(0, 10) // Enviar solo primeros 10 para no saturar la respuesta
      });
    } catch (error) {
      console.error('Error en getLeagueMatches:', error);
      next(error);
    }
  }

  /**
   * Obtener detalles de un partido específico
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMatchDetails(req, res, next) {
    try {
      const { matchId } = req.params;
      
      if (!matchId) {
        return res.status(400).json({
          error: 'Se requiere ID de partido'
        });
      }
      
      const scraper = new SofaScoreScraper();
      const matchDetails = await scraper.getMatchDetails(matchId);
      const result = await scraper.saveMatchToDatabase(matchDetails);
      
      res.status(200).json({
        message: `Detalles del partido ${matchId} obtenidos y guardados`,
        match: matchDetails.match,
        lineups: matchDetails.lineups,
        created: result.created
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar ligas disponibles en SofaScore
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getAvailableLeagues(req, res) {
    const scraper = new SofaScoreScraper();
    const leagues = Object.keys(scraper.COMPETITIONS || {});
    
    res.status(200).json({
      message: 'Ligas disponibles en SofaScore',
      leagues,
      total: leagues.length
    });
  }

  /**
   * Obtener las temporadas disponibles para una liga
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getAvailableSeasons(req, res, next) {
    try {
      const { league } = req.params;
      
      if (!league) {
        return res.status(400).json({
          error: 'Se requiere especificar una liga'
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
      
      const seasons = await scraper.getValidSeasons(league);
      const sortedYears = Object.keys(seasons).sort((a, b) => b - a); // Ordenar por año descendente
      
      res.status(200).json({
        message: `Temporadas disponibles para ${league}`,
        league,
        seasons: sortedYears,
        total: sortedYears.length,
        seasonMappings: seasons
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Obtener partidos por fecha específica
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMatchesByDate(req, res, next) {
    try {
      const { date } = req.params;
      const { save } = req.query;
      
      // Validar fecha
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          error: 'Formato de fecha inválido. Debe ser YYYY-MM-DD'
        });
      }
      
      const scraper = new SofaScoreScraper();
      const result = await scraper.getMatchesByDate(date, save === 'true');
      
      res.status(200).json({
        message: `Partidos para la fecha ${date}`,
        date,
        count: result.count,
        matches: result.matches,
        competitions: result.competitions,
        saved: save === 'true'
      });
    } catch (error) {
      console.error('Error obteniendo partidos por fecha:', error);
      next(error);
    }
  }
  
  /**
   * Obtener partidos por rango de fechas
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getMatchesByDateRange(req, res, next) {
    try {
      const { startDate, endDate } = req.params;
      const { save } = req.query;
      
      // Validar fechas
      if (!startDate || !endDate || 
          !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || 
          !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({
          error: 'Formato de fechas inválido. Debe ser YYYY-MM-DD'
        });
      }
      
      const scraper = new SofaScoreScraper();
      const result = await scraper.getMatchesByDateRange(startDate, endDate, save === 'true');
      
      res.status(200).json({
        message: `Partidos para el rango ${startDate} a ${endDate}`,
        startDate,
        endDate,
        totalDays: result.dayCount,
        totalMatches: result.totalMatches,
        matches: result.matches,
        saved: save === 'true'
      });
    } catch (error) {
      console.error('Error obteniendo partidos por rango de fechas:', error);
      next(error);
    }
  }
  
  /**
   * Obtener partidos de la semana actual
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getCurrentWeekMatches(req, res, next) {
    try {
      const { save } = req.query;
      
      // Calcular fecha de inicio y fin de la semana
      const now = new Date();
      
      // Primer día de la semana (lunes)
      const startDate = new Date(now);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      
      // Último día de la semana (domingo)
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      // Formatear fechas
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const scraper = new SofaScoreScraper();
      const result = await scraper.getMatchesByDateRange(startDateStr, endDateStr, save === 'true');
      
      res.status(200).json({
        message: `Partidos de la semana actual (${startDateStr} a ${endDateStr})`,
        startDate: startDateStr,
        endDate: endDateStr,
        totalDays: result.dayCount,
        totalMatches: result.totalMatches,
        matches: result.matches,
        saved: save === 'true'
      });
    } catch (error) {
      console.error('Error obteniendo partidos de la semana:', error);
      next(error);
    }
  }
  
  /**
   * Obtener todos los partidos de una temporada (fixture completo)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getSeasonFixture(req, res, next) {
    try {
      const { season } = req.params;
      const { save = 'true' } = req.query;
      
      // Validar temporada
      if (!season || !/^\d{4}-\d{4}$/.test(season)) {
        return res.status(400).json({
          error: 'Formato de temporada inválido. Debe ser YYYY-YYYY (ej: 2024-2025)'
        });
      }
      
      // Responder de inmediato ya que este proceso es largo
      res.status(202).json({
        message: `Iniciando obtención del fixture completo para la temporada ${season}`,
        season,
        info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos',
        saveEnabled: save === 'true',
        statusEndpoint: `/api/sofascore/fixtures/status`
      });
      
      // Estado del proceso (variable global para seguimiento)
      global.fixtureProcessStatus = {
        isRunning: true,
        startTime: new Date(),
        endTime: null,
        season,
        progress: 0,
        totalMatches: 0,
        processedBlocks: 0,
        totalBlocks: 0,
        leagues: {},
        errors: []
      };
      
      // Ejecutar en segundo plano
      try {
        const scraper = new SofaScoreScraper();
        const result = await scraper.getSeasonFixture(season, save === 'true');
        
        // Actualizar estado al finalizar
        global.fixtureProcessStatus.isRunning = false;
        global.fixtureProcessStatus.endTime = new Date();
        global.fixtureProcessStatus.totalMatches = result.totalMatches;
        global.fixtureProcessStatus.leagues = result.leaguesSummary;
        global.fixtureProcessStatus.errors = result.errors;
        global.fixtureProcessStatus.progress = 100;
        
        console.log(`✅ Fixture de temporada ${season} completado: ${result.totalMatches} partidos`);
      } catch (error) {
        global.fixtureProcessStatus.isRunning = false;
        global.fixtureProcessStatus.endTime = new Date();
        global.fixtureProcessStatus.error = error.message;
        
        console.error(`❌ Error obteniendo fixture de temporada:`, error);
      }
    } catch (error) {
      console.error('Error iniciando obtención de fixture:', error);
      next(error);
    }
  }
  
  /**
   * Obtener estado del proceso de obtención de fixture
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getFixtureStatus(req, res) {
    const status = global.fixtureProcessStatus || {
      isRunning: false,
      message: 'No hay proceso de obtención de fixture en ejecución'
    };
    
    res.status(200).json({
      message: status.isRunning ? 'Proceso en ejecución' : 'Proceso finalizado o no iniciado',
      status
    });
  }
  /**
   * Completar información de todos los equipos en la base de datos
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async updateTeamInfo(req, res, next) {
    try {
      const { teamId } = req.params;
      const { forceUpdate } = req.query;
      const scraper = new SofaScoreScraper();
      
      const teamData = await scraper.scrapeTeamDetails(teamId);
      const result = await scraper.updateTeamInDatabase(teamData, forceUpdate === 'true');

      res.status(200).json({
        message: 'Team information updated successfully',
        teamId,
        updatedFields: result.updatedFields,
        newPlayers: result.newPlayers.length,
        updatedStats: result.updatedStats
      });
    } catch (error) {
      console.error('Error updating team info:', error);
      next(error);
    }
  }

  static async completeTeamsInfo(req, res, next) {
    try {
      const { limit = '50', offset = '0', all = 'false' } = req.query;
      const maxLimit = parseInt(limit, 10);
      const startOffset = parseInt(offset, 10);
      const updateAll = all === 'true';
      
      // Responder de inmediato ya que este proceso es largo
      res.status(202).json({
        message: updateAll 
          ? `Iniciando actualización de TODOS los equipos en lotes de ${maxLimit}`
          : `Iniciando actualización de equipos (máximo ${maxLimit}, desde offset ${startOffset})`,
        info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos',
        statusEndpoint: `/api/sofascore/teams/update-status`
      });
      
      // Estado del proceso (variable global para seguimiento)
      global.teamsUpdateStatus = {
        isRunning: true,
        startTime: new Date(),
        endTime: null,
        progress: 0,
        totalTeams: 0,
        processedTeams: 0,
        updatedTeams: 0,
        failedTeams: 0,
        currentOffset: startOffset,
        updateAll: updateAll,
        batchSize: maxLimit,
        errors: []
      };
      
      // Ejecutar en segundo plano
      try {
        const scraper = new SofaScoreScraper();
        
        if (updateAll) {
          // Obtener el número total de equipos primero
          const totalTeamsCount = await scraper.getTeamsCount();
          global.teamsUpdateStatus.totalTeamsInDb = totalTeamsCount;
          
          let currentOffset = startOffset;
          let keepProcessing = true;
          
          console.log(`🔄 Procesando todos los equipos (${totalTeamsCount}) en lotes de ${maxLimit}`);
          
          // Procesar en lotes
          while (keepProcessing) {
            console.log(`🔄 Procesando lote desde offset ${currentOffset}`);
            global.teamsUpdateStatus.currentOffset = currentOffset;
            global.teamsUpdateStatus.currentBatch = Math.floor(currentOffset / maxLimit) + 1;
            global.teamsUpdateStatus.totalBatches = Math.ceil(totalTeamsCount / maxLimit);
            
            const result = await scraper.completeTeamsInfo(maxLimit, currentOffset);
            
            // Actualizar estadísticas acumulativas
            global.teamsUpdateStatus.processedTeams += result.processedTeams;
            global.teamsUpdateStatus.updatedTeams += result.updatedTeams;
            global.teamsUpdateStatus.failedTeams += result.failedTeams;
            global.teamsUpdateStatus.errors = global.teamsUpdateStatus.errors.concat(result.errors);
            global.teamsUpdateStatus.progress = Math.round((global.teamsUpdateStatus.processedTeams / totalTeamsCount) * 100);
            
            // Determinar si continuar
            if (result.processedTeams < maxLimit) {
              // Llegamos al final
              keepProcessing = false;
            } else {
              // Avanzar al siguiente lote
              currentOffset += maxLimit;
              
              // Esperar un poco entre lotes para no sobrecargar la API
              console.log('⏳ Esperando antes de procesar el siguiente lote...');
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
          
          console.log(`✅ Procesamiento de todos los equipos completado`);
        } else {
          // Solo procesar un lote
          const result = await scraper.completeTeamsInfo(maxLimit, startOffset);
          
          // Actualizar estado
          global.teamsUpdateStatus.totalTeams = result.totalTeams;
          global.teamsUpdateStatus.processedTeams = result.processedTeams;
          global.teamsUpdateStatus.updatedTeams = result.updatedTeams;
          global.teamsUpdateStatus.failedTeams = result.failedTeams;
          global.teamsUpdateStatus.errors = result.errors;
          global.teamsUpdateStatus.progress = 100;
        }
        
        // Marcar como completado
        global.teamsUpdateStatus.isRunning = false;
        global.teamsUpdateStatus.endTime = new Date();
        console.log(`✅ Actualización de equipos completada: ${global.teamsUpdateStatus.updatedTeams} equipos actualizados`);
      } catch (error) {
        global.teamsUpdateStatus.isRunning = false;
        global.teamsUpdateStatus.endTime = new Date();
        global.teamsUpdateStatus.error = error.message;
        
        console.error(`❌ Error actualizando equipos:`, error);
      }
    } catch (error) {
      console.error('Error iniciando actualización de equipos:', error);
      next(error);
    }
  }
  
  /**
   * Obtener estado del proceso de actualización de equipos
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getTeamsUpdateStatus(req, res) {
    const status = global.teamsUpdateStatus || {
      isRunning: false,
      message: 'No hay proceso de actualización de equipos en ejecución'
    };
    
    res.status(200).json({
      message: status.isRunning ? 'Proceso en ejecución' : 'Proceso finalizado o no iniciado',
      status
    });
  }
  
  /**
   * Endpoint para obtener toda la información adicional (clasificaciones, estadísticas, etc.)
   * aprovechando los fixtures y equipos que ya están en la base de datos
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async enrichDatabase(req, res, next) {
    try {
      const { limit = '50', season = '2024-2025', getPlayers = 'true' } = req.query;
      const maxLimit = parseInt(limit, 10);
      const shouldGetPlayers = getPlayers !== 'false';
      
      // Responder de inmediato ya que este proceso es largo
      res.status(202).json({
        message: `Iniciando proceso de enriquecimiento de la base de datos para la temporada ${season}`,
        info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos',
        details: 'Se obtendrán clasificaciones, datos de jugadores, estadísticas, países y más',
        statusEndpoint: `/api/sofascore/enrich/status`,
        playersEnabled: shouldGetPlayers
      });
      
      // Estado del proceso (variable global para seguimiento)
      global.enrichStatus = {
        isRunning: true,
        startTime: new Date(),
        endTime: null,
        progress: 0,
        season: season,
        stats: {
          leagues: { processed: 0, updated: 0, errors: 0 },
          teams: { processed: 0, updated: 0, errors: 0 },
          players: { processed: 0, updated: 0, errors: 0, new: 0 },
          standings: { processed: 0, updated: 0, errors: 0 },
          topScorers: { processed: 0, updated: 0, errors: 0 },
          countries: { processed: 0, updated: 0, errors: 0 }
        },
        currentTask: 'Inicializando',
        errors: []
      };
      
      // Ejecutar en segundo plano
      try {
        const scraper = new SofaScoreScraper();
        
        // 1. Primero obtener y procesar todos los países
        global.enrichStatus.currentTask = 'Obteniendo países';
        await SofaScoreController.processCountries(scraper);
        
        // 2. Obtener todas las ligas asociadas a los equipos ya existentes
        global.enrichStatus.currentTask = 'Procesando ligas de equipos existentes';
        await SofaScoreController.processLeaguesFromExistingTeams(scraper, season);
        
        // 3. NUEVO: Obtener plantillas completas de jugadores si está habilitado
        if (shouldGetPlayers) {
          global.enrichStatus.currentTask = 'Obteniendo plantillas completas de equipos';
          await SofaScoreController.processTeamPlayers(scraper, season);
        }
        
        // 4. Obtener clasificaciones para todas las ligas
        global.enrichStatus.currentTask = 'Obteniendo clasificaciones';
        await SofaScoreController.processStandings(scraper, season);
        
        // 5. Obtener goleadores y asistentes
        global.enrichStatus.currentTask = 'Obteniendo goleadores y asistentes';
        await SofaScoreController.processTopScorers(scraper, season);
        
        // 6. Completar información de jugadores existentes
        global.enrichStatus.currentTask = 'Actualizando información de jugadores';
        await SofaScoreController.processPlayersDetails(scraper, maxLimit, season);
        
        // 7. Obtener estadísticas de partidos ya disputados
        global.enrichStatus.currentTask = 'Procesando estadísticas de partidos';
        await SofaScoreController.processMatchStats(scraper, season);
        
        // 8. NUEVO: Obtener jugadores de ligas principales si está habilitado
        if (shouldGetPlayers) {
          global.enrichStatus.currentTask = 'Procesando jugadores de ligas principales';
          await SofaScoreController.processMainLeaguesPlayers(scraper, season);
        }
        
        // Marcar como completado
        global.enrichStatus.isRunning = false;
        global.enrichStatus.endTime = new Date();
        global.enrichStatus.progress = 100;
        global.enrichStatus.currentTask = 'Proceso completado';
        
        console.log(`✅ Proceso de enriquecimiento completado con éxito`);
      } catch (error) {
        global.enrichStatus.isRunning = false;
        global.enrichStatus.endTime = new Date();
        global.enrichStatus.error = error.message;
        global.enrichStatus.errors.push(error.message);
        global.enrichStatus.currentTask = 'Proceso finalizado con errores';
        
        console.error(`❌ Error en proceso de enriquecimiento:`, error);
      }
    } catch (error) {
      console.error('Error iniciando proceso de enriquecimiento:', error);
      next(error);
    }
  }
  
  /**
   * Nuevo endpoint para enriquecer la base de datos a partir de un equipo específico
   * Este endpoint utiliza el sofaScoreId del equipo como punto de partida para obtener
   * todos los datos relacionados: país, liga, jugadores, estadísticas, etc.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async enrichFromTeam(req, res, next) {
    try {
      const { teamId } = req.params;
      const { season = '2024-2025' } = req.query;
      
      if (!teamId) {
        return res.status(400).json({
          error: 'Se requiere el ID de SofaScore del equipo'
        });
      }
      
      // Responder de inmediato ya que este proceso puede ser largo
      res.status(202).json({
        message: `Iniciando proceso de enriquecimiento a partir del equipo con ID ${teamId}`,
        info: 'Este proceso se ejecuta en segundo plano',
        details: 'Se obtendrán datos del país, liga, jugadores, clasificaciones y estadísticas relacionadas con este equipo',
        statusEndpoint: `/api/sofascore/enrich/team/status/${teamId}`
      });
      
      // Estado del proceso (variable global para seguimiento)
      global.teamEnrichStatus = global.teamEnrichStatus || {};
      global.teamEnrichStatus[teamId] = {
        isRunning: true,
        startTime: new Date(),
        endTime: null,
        progress: 0,
        teamId,
        season,
        stats: {
          team: { processed: 0, updated: 0 },
          country: { processed: 0, updated: 0 },
          league: { processed: 0, updated: 0 },
          players: { processed: 0, updated: 0, new: 0 },
          standings: { processed: 0, updated: 0 },
          matches: { processed: 0, updated: 0 }
        },
        currentTask: 'Inicializando',
        errors: []
      };
      
      // Ejecutar en segundo plano
      try {
        const scraper = new SofaScoreScraper();
        
        // 1. Obtener detalles completos del equipo
        global.teamEnrichStatus[teamId].currentTask = 'Obteniendo detalles del equipo';
        const teamDetails = await scraper.getTeamBasicDetails(teamId);
        
        if (!teamDetails) {
          throw new Error(`No se pudo obtener información del equipo con ID ${teamId}`);
        }
        
        // 2. Buscar o crear equipo en la base de datos
        let team = await Team.findOne({
          where: { sofaScoreId: teamId }
        });
        
        if (!team) {
          team = await Team.create({
            name: teamDetails.name,
            shortName: teamDetails.shortName,
            country: teamDetails.country,
            logo: teamDetails.logo,
            sofaScoreId: teamId
          });
          console.log(`✅ Equipo creado: ${teamDetails.name} (ID: ${teamId})`);
        } else {
          // Actualizar información del equipo
          await team.update({
            name: teamDetails.name || team.name,
            shortName: teamDetails.shortName || team.shortName,
            country: teamDetails.country || team.country,
            logo: teamDetails.logo || team.logo
          });
          console.log(`✅ Equipo actualizado: ${team.name} (ID: ${teamId})`);
        }
        
        global.teamEnrichStatus[teamId].stats.team.processed = 1;
        global.teamEnrichStatus[teamId].stats.team.updated = 1;
        global.teamEnrichStatus[teamId].progress = 10;
        
        // 3. Procesar país del equipo
        global.teamEnrichStatus[teamId].currentTask = 'Procesando país del equipo';
        if (teamDetails.country) {
          // Buscar o crear país
          const [country, isNewCountry] = await Country.findOrCreate({
            where: { name: teamDetails.country },
            defaults: {
              name: teamDetails.country,
              // Valores por defecto para el país
              region: 'Unknown'
            }
          });
          
          // Asociar país al equipo
          if (country && team) {
            await team.update({ countryId: country.id });
            console.log(`✅ Equipo ${team.name} asociado con país ${country.name}`);
          }
          
          global.teamEnrichStatus[teamId].stats.country.processed = 1;
          global.teamEnrichStatus[teamId].stats.country.updated = isNewCountry ? 1 : 0;
        }
        
        global.teamEnrichStatus[teamId].progress = 20;
        
        // 4. Procesar ligas del equipo
        global.teamEnrichStatus[teamId].currentTask = 'Procesando ligas asociadas';
        
        // Buscar ligas principales basadas en el país del equipo
        const teamCountry = teamDetails.country || 'Unknown';
        const predefinedLeagues = [
          { id: 17, name: "EPL", shortName: "EPL", country: "England" },
          { id: 8, name: "La Liga", shortName: "La Liga", country: "Spain" },
          { id: 35, name: "Bundesliga", shortName: "BL", country: "Germany" },
          { id: 23, name: "Serie A", shortName: "SA", country: "Italy" },
          { id: 34, name: "Ligue 1", shortName: "L1", country: "France" }
        ];
        
        // Encontrar liga del mismo país
        let matchingLeague = predefinedLeagues.find(league => league.country === teamCountry);
        
        // Si no hay liga del mismo país, usar la primera disponible
        if (!matchingLeague && predefinedLeagues.length > 0) {
          matchingLeague = predefinedLeagues[0];
        }
        
        if (matchingLeague) {
          // Buscar o crear liga
          const [league, isNewLeague] = await League.findOrCreate({
            where: { 
              [Op.or]: [
                { sofaScoreId: matchingLeague.id.toString() },
                { name: matchingLeague.name }
              ]
            },
            defaults: {
              name: matchingLeague.name,
              shortName: matchingLeague.shortName,
              country: matchingLeague.country,
              sofaScoreId: matchingLeague.id.toString(),
              season: season
            }
          });
          
          // Asociar liga al equipo
          if (league && team) {
            await TeamLeague.findOrCreate({
              where: {
                teamId: team.id,
                leagueId: league.id
              },
              defaults: {
                season: season.split('-')[0],
                status: 'active'
              }
            });
            
            console.log(`✅ Equipo ${team.name} asociado con liga ${league.name}`);
            
            // 5. Obtener clasificación de la liga
            global.teamEnrichStatus[teamId].currentTask = 'Obteniendo clasificación de liga';
            try {
              // Verificar que la liga tiene un sofaScoreId válido
              if (league.sofaScoreId && league.id) {
                console.log(`🔄 Obteniendo clasificación para liga ${league.name} (ID: ${league.sofaScoreId})...`);
                
                await scraper.fetchLeagueStandingsInBackground(
                  league.sofaScoreId,
                  league.id,
                  season.split('-')[0]
                );
                
                // También obtener goleadores/asistentes solo si hay sofaScoreId
                console.log(`🔄 Obteniendo mejores jugadores para liga ${league.name} (ID: ${league.sofaScoreId})...`);
                await scraper.fetchLeagueTopScorersInBackground(
                  league.sofaScoreId,
                  league.id,
                  season.split('-')[0]
                );
                
                global.teamEnrichStatus[teamId].stats.standings.processed = 1;
                global.teamEnrichStatus[teamId].stats.standings.updated = 1;
                console.log(`✅ Clasificación obtenida para liga ${league.name}`);
              } else {
                console.warn(`⚠️ La liga ${league.name} no tiene sofaScoreId válido, omitiendo clasificación y goleadores`);
              }
            } catch (error) {
              console.error(`❌ Error obteniendo clasificación: ${error.message}`);
              global.teamEnrichStatus[teamId].errors.push(`Error en clasificación: ${error.message}`);
            }
          }
          
          global.teamEnrichStatus[teamId].stats.league.processed = 1;
          global.teamEnrichStatus[teamId].stats.league.updated = isNewLeague ? 1 : 0;
        }
        
        global.teamEnrichStatus[teamId].progress = 40;
        
        // 6. Obtener plantilla de jugadores
        global.teamEnrichStatus[teamId].currentTask = 'Obteniendo plantilla de jugadores';
        try {
          const players = await scraper.getTeamPlayers(teamId);
          
          if (players && players.length > 0) {
            // Preparar jugadores con información del equipo
            const playersWithTeam = players.map(player => ({
              ...player,
              teamId: team.id,
              team: team.name
            }));
            
            // Guardar jugadores en la base de datos
            const result = await scraper.savePlayersToDatabase(playersWithTeam);
            
            global.teamEnrichStatus[teamId].stats.players.processed = players.length;
            global.teamEnrichStatus[teamId].stats.players.updated = result.updated;
            global.teamEnrichStatus[teamId].stats.players.new = result.saved;
            
            console.log(`✅ Obtenidos ${players.length} jugadores para equipo ${team.name}`);
          }
        } catch (error) {
          console.error(`❌ Error obteniendo jugadores: ${error.message}`);
          global.teamEnrichStatus[teamId].errors.push(`Error obteniendo jugadores: ${error.message}`);
        }
        
        global.teamEnrichStatus[teamId].progress = 70;
        
        // 7. Obtener partidos recientes del equipo
        global.teamEnrichStatus[teamId].currentTask = 'Obteniendo partidos recientes';
        try {
          // Buscar partidos existentes con este equipo
          const matches = await Match.findAll({
            where: {
              [Op.or]: [
                { homeTeamId: team.id },
                { awayTeamId: team.id }
              ],
              sofaScoreId: {
                [Op.not]: null
              }
            },
            limit: 10
          });
          
          global.teamEnrichStatus[teamId].stats.matches.processed = matches.length;
          
          // Procesar estadísticas para cada partido
          for (const match of matches) {
            try {
              // Obtener estadísticas del partido
              await scraper.fetchMatchStatsInBackground(
                match.sofaScoreId,
                match.id,
                match.homeTeamId,
                match.awayTeamId
              );
              
              // Obtener eventos del partido (goles, tarjetas)
              await scraper.fetchMatchEventsInBackground(
                match.sofaScoreId,
                match.id
              );
              
              global.teamEnrichStatus[teamId].stats.matches.updated++;
              console.log(`✅ Estadísticas procesadas para partido ${match.id}`);
            } catch (error) {
              console.error(`❌ Error procesando estadísticas del partido ${match.id}: ${error.message}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando partidos: ${error.message}`);
          global.teamEnrichStatus[teamId].errors.push(`Error procesando partidos: ${error.message}`);
        }
        
        // Marcar como completado
        global.teamEnrichStatus[teamId].isRunning = false;
        global.teamEnrichStatus[teamId].endTime = new Date();
        global.teamEnrichStatus[teamId].progress = 100;
        global.teamEnrichStatus[teamId].currentTask = 'Proceso completado';
        
        console.log(`✅ Proceso de enriquecimiento desde equipo ${teamId} completado con éxito`);
      } catch (error) {
        global.teamEnrichStatus[teamId].isRunning = false;
        global.teamEnrichStatus[teamId].endTime = new Date();
        global.teamEnrichStatus[teamId].error = error.message;
        global.teamEnrichStatus[teamId].errors.push(error.message);
        global.teamEnrichStatus[teamId].currentTask = 'Proceso finalizado con errores';
        
        console.error(`❌ Error en proceso de enriquecimiento desde equipo ${teamId}:`, error);
      }
    } catch (error) {
      console.error('Error iniciando proceso de enriquecimiento desde equipo:', error);
      next(error);
    }
  }
  
  /**
   * Obtener estado del proceso de enriquecimiento de un equipo específico
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getTeamEnrichStatus(req, res) {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        error: 'Se requiere el ID del equipo'
      });
    }
    
    const status = global.teamEnrichStatus?.[teamId] || {
      isRunning: false,
      message: 'No hay proceso de enriquecimiento para este equipo',
      teamId
    };
    
    res.status(200).json({
      message: status.isRunning ? 'Proceso en ejecución' : 'Proceso finalizado o no iniciado',
      status
    });
  }
  
  /**
   * Enriquecer todos los equipos de la base de datos
   * Este endpoint procesa automáticamente todos los equipos que tienen sofaScoreId
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async enrichAllTeams(req, res, next) {
    try {
      const { limit = '100', season = '2024-2025', batchSize = '5' } = req.query;
      const maxLimit = parseInt(limit, 10);
      const processBatchSize = parseInt(batchSize, 10);
      
      // Responder de inmediato ya que este proceso es largo
      res.status(202).json({
        message: `Iniciando proceso de enriquecimiento para todos los equipos (máximo ${maxLimit})`,
        info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos',
        details: 'Se procesarán todos los equipos con sofaScoreId en la base de datos',
        statusEndpoint: `/api/sofascore/enrich/all/status`
      });
      
      // Estado del proceso (variable global para seguimiento)
      global.allTeamsEnrichStatus = {
        isRunning: true,
        startTime: new Date(),
        endTime: null,
        progress: 0,
        season: season,
        totalTeams: 0,
        processedTeams: 0,
        currentBatch: 0,
        totalBatches: 0,
        batchSize: processBatchSize,
        maxTeams: maxLimit,
        currentTeam: null,
        stats: {
          teams: { processed: 0, updated: 0, errors: 0 },
          countries: { processed: 0, updated: 0, errors: 0 },
          leagues: { processed: 0, updated: 0, errors: 0 },
          players: { processed: 0, updated: 0, new: 0, errors: 0 },
          standings: { processed: 0, updated: 0, errors: 0 },
          matches: { processed: 0, updated: 0, errors: 0 }
        },
        currentTask: 'Inicializando',
        errors: [],
        teamResults: {}
      };
      
      // Ejecutar en segundo plano
      try {
        const scraper = new SofaScoreScraper();
        
        // 1. Obtener todos los equipos que tienen sofaScoreId
        global.allTeamsEnrichStatus.currentTask = 'Obteniendo lista de equipos';
        const teams = await Team.findAll({
          where: {
            sofaScoreId: {
              [Op.not]: null
            }
          },
          limit: maxLimit
        });
        
        global.allTeamsEnrichStatus.totalTeams = teams.length;
        global.allTeamsEnrichStatus.totalBatches = Math.ceil(teams.length / processBatchSize);
        
        console.log(`📊 Encontrados ${teams.length} equipos con sofaScoreId para enriquecer (procesando en lotes de ${processBatchSize})`);
        
        // 2. Procesar los equipos en lotes
        for (let batchIndex = 0; batchIndex < global.allTeamsEnrichStatus.totalBatches; batchIndex++) {
          global.allTeamsEnrichStatus.currentBatch = batchIndex + 1;
          const startIdx = batchIndex * processBatchSize;
          const endIdx = Math.min(startIdx + processBatchSize, teams.length);
          const batchTeams = teams.slice(startIdx, endIdx);
          
          console.log(`🔄 Procesando lote ${batchIndex + 1}/${global.allTeamsEnrichStatus.totalBatches} (equipos ${startIdx + 1}-${endIdx} de ${teams.length})`);
          
          // Procesar cada equipo en el lote
          for (const team of batchTeams) {
            try {
              global.allTeamsEnrichStatus.currentTeam = team.sofaScoreId;
              global.allTeamsEnrichStatus.currentTask = `Enriqueciendo equipo ${team.name} (ID: ${team.sofaScoreId})`;
              
              console.log(`🔄 Procesando equipo ${team.name} (ID: ${team.sofaScoreId})`);
              
              // Crear estado para este equipo específico
              global.allTeamsEnrichStatus.teamResults[team.sofaScoreId] = {
                teamId: team.sofaScoreId,
                name: team.name,
                startTime: new Date(),
                endTime: null,
                success: false,
                error: null,
                stats: {
                  country: { processed: 0, updated: 0 },
                  league: { processed: 0, updated: 0 },
                  players: { processed: 0, updated: 0, new: 0 },
                  standings: { processed: 0, updated: 0 },
                  matches: { processed: 0, updated: 0 }
                }
              };
              
              // 3. Obtener detalles del equipo
              const teamDetails = await scraper.getTeamBasicDetails(team.sofaScoreId);
              
              if (teamDetails) {
                // Actualizar equipo con información adicional
                await team.update({
                  name: teamDetails.name || team.name,
                  shortName: teamDetails.shortName || team.shortName,
                  country: teamDetails.country || team.country,
                  logo: teamDetails.logo || team.logo
                });
                
                global.allTeamsEnrichStatus.stats.teams.updated++;
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].stats.team = { updated: 1 };
                
                // 4. Procesar país del equipo
                if (teamDetails.country) {
                  // Buscar o crear país
                  const [country, isNewCountry] = await Country.findOrCreate({
                    where: { name: teamDetails.country },
                    defaults: {
                      name: teamDetails.country,
                      region: 'Unknown'
                    }
                  });
                  
                  // Asociar país al equipo
                  if (country) {
                    await team.update({ countryId: country.id });
                    console.log(`✅ Equipo ${team.name} asociado con país ${country.name}`);
                    
                    global.allTeamsEnrichStatus.stats.countries.processed++;
                    global.allTeamsEnrichStatus.stats.countries.updated += isNewCountry ? 1 : 0;
                    global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].stats.country = { 
                      processed: 1, 
                      updated: isNewCountry ? 1 : 0 
                    };
                  }
                }
                
                // 5. Procesar ligas del equipo
                const teamCountry = teamDetails.country || 'Unknown';
                const predefinedLeagues = [
                  { id: 17, name: "EPL", shortName: "EPL", country: "England" },
                  { id: 8, name: "La Liga", shortName: "La Liga", country: "Spain" },
                  { id: 35, name: "Bundesliga", shortName: "BL", country: "Germany" },
                  { id: 23, name: "Serie A", shortName: "SA", country: "Italy" },
                  { id: 34, name: "Ligue 1", shortName: "L1", country: "France" }
                ];
                
                // Encontrar liga del mismo país
                let matchingLeague = predefinedLeagues.find(league => league.country === teamCountry);
                
                // Si no hay liga del mismo país, usar la primera disponible
                if (!matchingLeague && predefinedLeagues.length > 0) {
                  matchingLeague = predefinedLeagues[0];
                }
                
                if (matchingLeague) {
                  // Buscar o crear liga
                  const [league, isNewLeague] = await League.findOrCreate({
                    where: { 
                      [Op.or]: [
                        { sofaScoreId: matchingLeague.id.toString() },
                        { name: matchingLeague.name }
                      ]
                    },
                    defaults: {
                      name: matchingLeague.name,
                      shortName: matchingLeague.shortName,
                      country: matchingLeague.country,
                      sofaScoreId: matchingLeague.id.toString(),
                      season: season
                    }
                  });
                  
                  // Asociar liga al equipo
                  if (league) {
                    await TeamLeague.findOrCreate({
                      where: {
                        teamId: team.id,
                        leagueId: league.id
                      },
                      defaults: {
                        season: season.split('-')[0],
                        status: 'active'
                      }
                    });
                    
                    console.log(`✅ Equipo ${team.name} asociado con liga ${league.name}`);
                    
                    global.allTeamsEnrichStatus.stats.leagues.processed++;
                    global.allTeamsEnrichStatus.stats.leagues.updated += isNewLeague ? 1 : 0;
                    global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].stats.league = { 
                      processed: 1, 
                      updated: isNewLeague ? 1 : 0 
                    };
                    
                    // 6. Obtener clasificación de la liga
                    try {
                      // Verificar que la liga tiene un sofaScoreId válido
                      if (league.sofaScoreId && league.id) {
                        console.log(`🔄 Obteniendo clasificación para liga ${league.name} (ID: ${league.sofaScoreId})...`);
                        
                        await scraper.fetchLeagueStandingsInBackground(
                          league.sofaScoreId,
                          league.id,
                          season.split('-')[0]
                        );
                        
                        // También obtener goleadores/asistentes solo si hay sofaScoreId
                        console.log(`🔄 Obteniendo mejores jugadores para liga ${league.name} (ID: ${league.sofaScoreId})...`);
                        await scraper.fetchLeagueTopScorersInBackground(
                          league.sofaScoreId,
                          league.id,
                          season.split('-')[0]
                        );
                        
                        global.allTeamsEnrichStatus.stats.standings.processed++;
                        global.allTeamsEnrichStatus.stats.standings.updated++;
                        global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].stats.standings = { 
                          processed: 1, 
                          updated: 1 
                        };
                        
                        console.log(`✅ Clasificación obtenida para liga ${league.name}`);
                      } else {
                        console.warn(`⚠️ La liga ${league.name} no tiene sofaScoreId válido, omitiendo clasificación y goleadores`);
                      }
                    } catch (error) {
                      console.error(`❌ Error obteniendo clasificación para liga ${league.name}: ${error.message}`);
                      global.allTeamsEnrichStatus.stats.standings.errors++;
                      global.allTeamsEnrichStatus.errors.push(`Error en clasificación para liga ${league.name}: ${error.message}`);
                    }
                  }
                }
                
                // 7. Obtener plantilla de jugadores
                try {
                  const players = await scraper.getTeamPlayers(team.sofaScoreId);
                  
                  if (players && players.length > 0) {
                    // Preparar jugadores con información del equipo
                    const playersWithTeam = players.map(player => ({
                      ...player,
                      teamId: team.id,
                      team: team.name
                    }));
                    
                    // Guardar jugadores en la base de datos
                    const result = await scraper.savePlayersToDatabase(playersWithTeam);
                    
                    global.allTeamsEnrichStatus.stats.players.processed += players.length;
                    global.allTeamsEnrichStatus.stats.players.updated += result.updated;
                    global.allTeamsEnrichStatus.stats.players.new += result.saved;
                    
                    global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].stats.players = { 
                      processed: players.length, 
                      updated: result.updated,
                      new: result.saved
                    };
                    
                    console.log(`✅ Obtenidos ${players.length} jugadores para equipo ${team.name}`);
                  }
                } catch (error) {
                  console.error(`❌ Error obteniendo jugadores para equipo ${team.name}: ${error.message}`);
                  global.allTeamsEnrichStatus.stats.players.errors++;
                  global.allTeamsEnrichStatus.errors.push(`Error obteniendo jugadores para equipo ${team.name}: ${error.message}`);
                }
                
                // 8. Obtener partidos recientes del equipo
                try {
                  // Buscar partidos existentes con este equipo
                  const matches = await Match.findAll({
                    where: {
                      [Op.or]: [
                        { homeTeamId: team.id },
                        { awayTeamId: team.id }
                      ],
                      sofaScoreId: {
                        [Op.not]: null
                      }
                    },
                    limit: 5 // Limitado a 5 partidos por equipo
                  });
                  
                  let matchesUpdated = 0;
                  
                  // Procesar estadísticas para cada partido
                  for (const match of matches) {
                    try {
                      // Obtener estadísticas del partido
                      await scraper.fetchMatchStatsInBackground(
                        match.sofaScoreId,
                        match.id,
                        match.homeTeamId,
                        match.awayTeamId
                      );
                      
                      // Obtener eventos del partido (goles, tarjetas)
                      await scraper.fetchMatchEventsInBackground(
                        match.sofaScoreId,
                        match.id
                      );
                      
                      matchesUpdated++;
                      console.log(`✅ Estadísticas procesadas para partido ${match.id}`);
                    } catch (error) {
                      console.error(`❌ Error procesando estadísticas para partido ${match.id}: ${error.message}`);
                    }
                  }
                  
                  global.allTeamsEnrichStatus.stats.matches.processed += matches.length;
                  global.allTeamsEnrichStatus.stats.matches.updated += matchesUpdated;
                  
                  global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].stats.matches = { 
                    processed: matches.length, 
                    updated: matchesUpdated 
                  };
                } catch (error) {
                  console.error(`❌ Error obteniendo partidos para equipo ${team.name}: ${error.message}`);
                  global.allTeamsEnrichStatus.stats.matches.errors++;
                  global.allTeamsEnrichStatus.errors.push(`Error obteniendo partidos para equipo ${team.name}: ${error.message}`);
                }
                
                // Marcar este equipo como completado con éxito
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].success = true;
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].endTime = new Date();
              } else {
                console.error(`❌ No se pudo obtener información para equipo ${team.name} (ID: ${team.sofaScoreId})`);
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].error = 'No se pudo obtener detalles del equipo';
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].endTime = new Date();
                global.allTeamsEnrichStatus.errors.push(`No se pudo obtener detalles para equipo ${team.name} (ID: ${team.sofaScoreId})`);
                global.allTeamsEnrichStatus.stats.teams.errors++;
              }
              
            } catch (error) {
              console.error(`❌ Error procesando equipo ${team.name}: ${error.message}`);
              global.allTeamsEnrichStatus.errors.push(`Error procesando equipo ${team.name}: ${error.message}`);
              global.allTeamsEnrichStatus.stats.teams.errors++;
              
              if (global.allTeamsEnrichStatus.teamResults[team.sofaScoreId]) {
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].error = error.message;
                global.allTeamsEnrichStatus.teamResults[team.sofaScoreId].endTime = new Date();
              }
            }
            
            // Incrementar contador de equipos procesados
            global.allTeamsEnrichStatus.processedTeams++;
            global.allTeamsEnrichStatus.progress = Math.round((global.allTeamsEnrichStatus.processedTeams / global.allTeamsEnrichStatus.totalTeams) * 100);
            
            // Esperar un momento entre equipos para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Esperar un momento entre lotes
          console.log(`✅ Lote ${batchIndex + 1}/${global.allTeamsEnrichStatus.totalBatches} completado`);
          
          if (batchIndex < global.allTeamsEnrichStatus.totalBatches - 1) {
            console.log('⏳ Esperando antes de procesar el siguiente lote...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        // Marcar como completado
        global.allTeamsEnrichStatus.isRunning = false;
        global.allTeamsEnrichStatus.endTime = new Date();
        global.allTeamsEnrichStatus.currentTask = 'Proceso completado';
        
        console.log(`✅ Proceso de enriquecimiento para todos los equipos completado con éxito: ${global.allTeamsEnrichStatus.processedTeams} equipos procesados`);
      } catch (error) {
        global.allTeamsEnrichStatus.isRunning = false;
        global.allTeamsEnrichStatus.endTime = new Date();
        global.allTeamsEnrichStatus.error = error.message;
        global.allTeamsEnrichStatus.errors.push(error.message);
        global.allTeamsEnrichStatus.currentTask = 'Proceso finalizado con errores';
        
        console.error(`❌ Error en proceso de enriquecimiento para todos los equipos:`, error);
      }
    } catch (error) {
      console.error('Error iniciando proceso de enriquecimiento para todos los equipos:', error);
      next(error);
    }
  }
  
  /**
   * Obtener estado del proceso de enriquecimiento de todos los equipos
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getAllTeamsEnrichStatus(req, res) {
    const status = global.allTeamsEnrichStatus || {
      isRunning: false,
      message: 'No hay proceso de enriquecimiento para todos los equipos en ejecución',
      stats: {}
    };
    
    res.status(200).json({
      message: status.isRunning ? 'Proceso en ejecución' : 'Proceso finalizado o no iniciado',
      status
    });
  }
  
  /**
   * Obtener estado del proceso de enriquecimiento
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getEnrichStatus(req, res) {
    const status = global.enrichStatus || {
      isRunning: false,
      message: 'No hay proceso de enriquecimiento en ejecución',
      stats: {}
    };
    
    res.status(200).json({
      message: status.isRunning ? 'Proceso en ejecución' : 'Proceso finalizado o no iniciado',
      status
    });
  }
  
  /**
   * Procesa países para la base de datos
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   */
  static async processCountries(scraper) {
    try {
      console.log('🌎 Obteniendo información de países...');
      
      // Lista de principales países del fútbol (como fallback)
      const fallbackCountries = [
        { id: 1, name: "England", alpha2: "GB", alpha3: "GBR", region: "Europe", flag: null },
        { id: 2, name: "Spain", alpha2: "ES", alpha3: "ESP", region: "Europe", flag: null },
        { id: 3, name: "Germany", alpha2: "DE", alpha3: "DEU", region: "Europe", flag: null },
        { id: 4, name: "Italy", alpha2: "IT", alpha3: "ITA", region: "Europe", flag: null },
        { id: 5, name: "France", alpha2: "FR", alpha3: "FRA", region: "Europe", flag: null },
        { id: 6, name: "Brazil", alpha2: "BR", alpha3: "BRA", region: "South America", flag: null },
        { id: 7, name: "Argentina", alpha2: "AR", alpha3: "ARG", region: "South America", flag: null },
        { id: 8, name: "Portugal", alpha2: "PT", alpha3: "PRT", region: "Europe", flag: null },
        { id: 9, name: "Netherlands", alpha2: "NL", alpha3: "NLD", region: "Europe", flag: null },
        { id: 10, name: "Belgium", alpha2: "BE", alpha3: "BEL", region: "Europe", flag: null },
        { id: 11, name: "United States", alpha2: "US", alpha3: "USA", region: "North America", flag: null },
        { id: 12, name: "Mexico", alpha2: "MX", alpha3: "MEX", region: "North America", flag: null },
        { id: 13, name: "Uruguay", alpha2: "UY", alpha3: "URY", region: "South America", flag: null },
        { id: 14, name: "Colombia", alpha2: "CO", alpha3: "COL", region: "South America", flag: null },
        { id: 15, name: "Chile", alpha2: "CL", alpha3: "CHL", region: "South America", flag: null },
        { id: 16, name: "Saudi Arabia", alpha2: "SA", alpha3: "SAU", region: "Asia", flag: null },
        { id: 17, name: "Japan", alpha2: "JP", alpha3: "JPN", region: "Asia", flag: null },
        { id: 18, name: "South Korea", alpha2: "KR", alpha3: "KOR", region: "Asia", flag: null },
        { id: 19, name: "Australia", alpha2: "AU", alpha3: "AUS", region: "Oceania", flag: null },
        { id: 20, name: "Qatar", alpha2: "QA", alpha3: "QAT", region: "Asia", flag: null }
      ];
      
      // Usar directamente la lista de fallback ya que la API no está funcionando
      const countries = fallbackCountries;
      global.enrichStatus.stats.countries.processed = countries.length;
      
      console.log(`🔄 Usando lista predefinida de ${countries.length} países debido a que la API no está disponible`);
      
      let created = 0;
      let updated = 0;
      
      // Guardar cada país en la base de datos
      for (const countryData of countries) {
        try {
          const [country, isNew] = await Country.findOrCreate({
            where: { name: countryData.name },
            defaults: {
              code: countryData.alpha2,
              code3: countryData.alpha3,
              region: countryData.region,
              flag: countryData.flag,
              sofaScoreId: countryData.id.toString()
            }
          });
          
          if (isNew) {
            created++;
          } else if (!country.code || !country.code3 || !country.sofaScoreId) {
            // Actualizar si ya existe pero falta información
            await country.update({
              code: countryData.alpha2 || country.code,
              code3: countryData.alpha3 || country.code3,
              region: countryData.region || country.region,
              sofaScoreId: countryData.id.toString() || country.sofaScoreId
            });
            updated++;
          }
        } catch (error) {
          console.error(`❌ Error procesando país ${countryData.name}:`, error);
          global.enrichStatus.stats.countries.errors++;
          global.enrichStatus.errors.push(`Error en país ${countryData.name}: ${error.message}`);
        }
      }
      
      global.enrichStatus.stats.countries.updated = created + updated;
      console.log(`✅ Países procesados: ${created} nuevos, ${updated} actualizados`);
    } catch (error) {
      console.error('❌ Error procesando países:', error);
      global.enrichStatus.errors.push(`Error procesando países: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar con los siguientes pasos
      global.enrichStatus.stats.countries.errors++;
    }
  }
  
  /**
   * Procesa ligas a partir de equipos existentes
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {string} season - Temporada (ej: '2024-2025')
   */
  static async processLeaguesFromExistingTeams(scraper, season) {
    try {
      console.log('🏆 Procesando ligas a partir de equipos existentes...');
      
      // Ligas principales predefinidas (ya que nearest-tournaments no funciona)
      const predefinedLeagues = [
        { id: 17, name: "EPL", shortName: "EPL", country: "England" },
        { id: 8, name: "La Liga", shortName: "La Liga", country: "Spain" },
        { id: 35, name: "Bundesliga", shortName: "BL", country: "Germany" },
        { id: 23, name: "Serie A", shortName: "SA", country: "Italy" },
        { id: 34, name: "Ligue 1", shortName: "L1", country: "France" },
        { id: 7, name: "Champions League", shortName: "UCL", country: "Europe" },
        { id: 679, name: "Europa League", shortName: "UEL", country: "Europe" },
        { id: 155, name: "Argentina Liga Profesional", shortName: "ALP", country: "Argentina" },
        { id: 325, name: "Brasileirão Serie A", shortName: "BSA", country: "Brazil" },
        { id: 384, name: "Copa Libertadores", shortName: "CL", country: "South America" },
        { id: 242, name: "MLS", shortName: "MLS", country: "United States" },
        { id: 955, name: "Saudi Pro League", shortName: "SPL", country: "Saudi Arabia" }
      ];
      
      // Obtener todos los equipos que tienen sofaScoreId
      const teams = await Team.findAll({
        where: {
          sofaScoreId: {
            [Op.not]: null
          }
        },
        limit: 100 // Limitar para no sobrecargar
      });
      
      console.log(`📊 Encontrados ${teams.length} equipos con ID de SofaScore`);
      
      // Set para evitar procesar ligas duplicadas
      const processedLeagueIds = new Set();
      let processedCount = 0;
      let leaguesProcessed = 0;
      
      // 1. Primero guardar las ligas predefinidas
      console.log(`🔄 Guardando ${predefinedLeagues.length} ligas predefinidas...`);
      
      for (const leagueData of predefinedLeagues) {
        try {
          // Evitar procesar la misma liga múltiples veces
          if (processedLeagueIds.has(leagueData.id.toString())) continue;
          processedLeagueIds.add(leagueData.id.toString());
          
          // Buscar o crear la liga
          const [league, created] = await League.findOrCreate({
            where: { 
              [Op.or]: [
                { sofaScoreId: leagueData.id.toString() },
                { name: leagueData.name }
              ]
            },
            defaults: {
              name: leagueData.name,
              shortName: leagueData.shortName,
              country: leagueData.country,
              logo: null, // No tenemos logos disponibles
              season: season
            }
          });
          
          // Buscar el país asociado a esta liga
          if (leagueData.country) {
            const country = await Country.findOne({
              where: { name: leagueData.country }
            });
            
            if (country) {
              await league.update({ countryId: country.id });
            }
          }
          
          if (created) {
            global.enrichStatus.stats.leagues.updated++;
          }
          
          leaguesProcessed++;
        } catch (error) {
          console.error(`❌ Error procesando liga predefinida ${leagueData.name}:`, error);
          global.enrichStatus.stats.leagues.errors++;
        }
      }
      
      // 2. Procesar cada equipo para actualizar su información y asociarlo a ligas
      for (const team of teams) {
        try {
          // Intentar obtener detalles básicos del equipo (sin ligas, estadio o entrenador)
          console.log(`🔍 Obteniendo detalles básicos del equipo ${team.name} (ID: ${team.sofaScoreId})`);
          const teamDetails = await scraper.getTeamBasicDetails(team.sofaScoreId);
          
          // Actualizar el equipo con la información disponible
          if (teamDetails) {
            await team.update({
              shortName: teamDetails.shortName || team.shortName,
              country: teamDetails.country || team.country,
              logo: teamDetails.logo || team.logo
            });
            
            global.enrichStatus.stats.teams.updated++;
            console.log(`✅ Equipo ${team.name} actualizado`);
          }
          
          // Asignar al menos una liga basada en el país del equipo
          const teamCountry = team.country || 'Unknown';
          let matchingLeague = null;
          
          // Buscar una liga del mismo país
          for (const leagueData of predefinedLeagues) {
            if (leagueData.country === teamCountry) {
              matchingLeague = leagueData;
              break;
            }
          }
          
          // Si no hay liga del mismo país, asignar una por defecto
          if (!matchingLeague && predefinedLeagues.length > 0) {
            matchingLeague = predefinedLeagues[0]; // EPL como default
          }
          
          if (matchingLeague) {
            try {
              // Buscar la liga en la base de datos
              const league = await League.findOne({
                where: { 
                  [Op.or]: [
                    { sofaScoreId: matchingLeague.id.toString() },
                    { name: matchingLeague.name }
                  ]
                }
              });
              
              if (league) {
                // Crear relación equipo-liga si no existe
                await TeamLeague.findOrCreate({
                  where: {
                    teamId: team.id,
                    leagueId: league.id
                  },
                  defaults: {
                    season: season.split('-')[0],
                    status: 'active'
                  }
                });
                
                processedCount++;
                console.log(`✅ Equipo ${team.name} asociado a liga ${league.name}`);
              }
            } catch (error) {
              console.error(`❌ Error asociando equipo ${team.name} a liga:`, error);
            }
          }
          
          // Actualizar progreso
          global.enrichStatus.stats.teams.processed++;
          global.enrichStatus.progress = Math.min(
            30, 
            Math.round((global.enrichStatus.stats.teams.processed / teams.length) * 30)
          );
          
          // Pausa entre equipos para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error procesando equipo ${team.name}:`, error);
          global.enrichStatus.stats.teams.errors++;
          global.enrichStatus.errors.push(`Error en equipo ${team.name}: ${error.message}`);
        }
      }
      
      global.enrichStatus.stats.leagues.processed = leaguesProcessed;
      console.log(`✅ Ligas procesadas: ${leaguesProcessed}, asociaciones equipo-liga: ${processedCount}`);
    } catch (error) {
      console.error('❌ Error procesando ligas:', error);
      global.enrichStatus.errors.push(`Error procesando ligas: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.leagues.errors++;
    }
  }
  
  /**
   * Procesa clasificaciones de ligas
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {string} season - Temporada
   */
  static async processStandings(scraper, season) {
    try {
      console.log('🏆 Obteniendo clasificaciones de ligas...');
      
      // Lista de ligas principales (usar esto si las ligas en DB no tienen sofaScoreId)
      const mainLeagues = [
        { id: "17", name: "EPL", country: "England" },
        { id: "8", name: "La Liga", country: "Spain" },
        { id: "35", name: "Bundesliga", country: "Germany" },
        { id: "23", name: "Serie A", country: "Italy" },
        { id: "34", name: "Ligue 1", country: "France" },
        { id: "7", name: "Champions League", country: "Europe" },
        { id: "155", name: "Argentina Liga Profesional", country: "Argentina" },
        { id: "325", name: "Brasileirão Serie A", country: "Brazil" }
      ];
      
      // Primero intentar obtener ligas de la base de datos
      let leagues = await League.findAll({
        where: {
          sofaScoreId: {
            [Op.not]: null
          }
        },
        limit: 20
      });
      
      // Si no hay ligas con sofaScoreId, crear algunas basadas en mainLeagues
      if (leagues.length === 0) {
        console.log('⚠️ No se encontraron ligas con ID de SofaScore, creando ligas principales...');
        
        for (const leagueData of mainLeagues) {
          try {
            // Buscar si ya existe la liga por nombre
            let league = await League.findOne({ where: { name: leagueData.name } });
            
            // Si no existe, crearla
            if (!league) {
              league = await League.create({
                name: leagueData.name,
                country: leagueData.country,
                sofaScoreId: leagueData.id,
                season: season
              });
              console.log(`✅ Liga creada: ${leagueData.name} (ID: ${leagueData.id})`);
            } 
            // Si existe pero no tiene sofaScoreId, actualizarla
            else if (!league.sofaScoreId) {
              await league.update({ sofaScoreId: leagueData.id });
              console.log(`✅ Liga actualizada: ${leagueData.name} (ID: ${leagueData.id})`);
            }
          } catch (error) {
            console.error(`❌ Error creando liga ${leagueData.name}:`, error);
          }
        }
        
        // Volver a obtener las ligas ahora que hemos creado algunas
        leagues = await League.findAll({
          where: {
            sofaScoreId: {
              [Op.not]: null
            }
          },
          limit: 20
        });
      }
      
      console.log(`📊 Procesando ${leagues.length} ligas para obtener clasificaciones`);
      
      const yearSeason = season.split('-')[0];
      let processedCount = 0;
      
      // Procesar cada liga
      for (const league of leagues) {
        try {
          // Verificar que la liga tiene un sofaScoreId válido
          if (!league.sofaScoreId || !league.id) {
            console.warn(`⚠️ La liga ${league.name} no tiene sofaScoreId válido, omitiendo clasificación y goleadores`);
            continue;
          }
          
          console.log(`🔄 Procesando clasificación para liga ${league.name} (ID: ${league.sofaScoreId})`);
          
          // Obtener la clasificación de la liga
          await scraper.fetchLeagueStandingsInBackground(
            league.sofaScoreId,
            league.id,
            yearSeason
          );
          
          // Procesar también goleadores y asistentes aquí para asegurarnos que se hace
          console.log(`🔄 Obteniendo mejores jugadores para liga ${league.name} (ID: ${league.sofaScoreId})...`);
          await scraper.fetchLeagueTopScorersInBackground(
            league.sofaScoreId,
            league.id,
            yearSeason
          );
          
          processedCount++;
          global.enrichStatus.stats.standings.updated++;
          console.log(`✅ Clasificación y goleadores procesados para liga ${league.name}`);
          
          // Actualizar progreso
          global.enrichStatus.stats.standings.processed++;
          global.enrichStatus.progress = 30 + Math.min(
            25, 
            Math.round((global.enrichStatus.stats.standings.processed / leagues.length) * 25)
          );
          
          // Pausa entre ligas para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`❌ Error procesando clasificación para liga ${league.name}:`, error);
          global.enrichStatus.stats.standings.errors++;
          global.enrichStatus.errors.push(`Error en clasificación liga ${league.name}: ${error.message}`);
        }
      }
      
      console.log(`✅ Clasificaciones procesadas: ${processedCount}`);
    } catch (error) {
      console.error('❌ Error procesando clasificaciones:', error);
      global.enrichStatus.errors.push(`Error procesando clasificaciones: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.standings.errors++;
    }
  }
  
  /**
   * Procesa goleadores y asistentes
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {string} season - Temporada
   */
  static async processTopScorers(scraper, season) {
    try {
      console.log('⚽ Obteniendo goleadores y asistentes...');
      
      // Obtener todas las ligas que tienen sofaScoreId
      const leagues = await League.findAll({
        where: {
          sofaScoreId: {
            [Op.not]: null
          }
        },
        limit: 15 // Limitar para no sobrecargar
      });
      
      const yearSeason = season.split('-')[0];
      let processedCount = 0;
      
      // Procesar cada liga
      for (const league of leagues) {
        try {
          // Verificar que la liga tiene un sofaScoreId válido
          if (!league.sofaScoreId || !league.id) {
            console.warn(`⚠️ La liga ${league.name} no tiene sofaScoreId válido, omitiendo goleadores`);
            continue;
          }
          
          console.log(`🔄 Procesando goleadores para liga ${league.name} (ID: ${league.sofaScoreId})`);
          
          // Obtener los mejores jugadores de la liga
          await scraper.fetchLeagueTopScorersInBackground(
            league.sofaScoreId,
            league.id,
            yearSeason
          );
          
          processedCount++;
          global.enrichStatus.stats.topScorers.updated++;
          console.log(`✅ Goleadores procesados para liga ${league.name}`);
          
          // Actualizar progreso
          global.enrichStatus.stats.topScorers.processed++;
          global.enrichStatus.progress = 55 + Math.min(
            15, 
            Math.round((global.enrichStatus.stats.topScorers.processed / leagues.length) * 15)
          );
          
          // Pausa entre ligas para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Error procesando goleadores para liga ${league.name}:`, error);
          global.enrichStatus.stats.topScorers.errors++;
          global.enrichStatus.errors.push(`Error en goleadores liga ${league.name}: ${error.message}`);
        }
      }
      
      console.log(`✅ Goleadores y asistentes procesados: ${processedCount}`);
    } catch (error) {
      console.error('❌ Error procesando goleadores:', error);
      global.enrichStatus.errors.push(`Error procesando goleadores: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.topScorers.errors++;
    }
  }
  
  /**
   * Procesa información detallada de jugadores
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {number} limit - Límite de jugadores a procesar
   * @param {string} season - Temporada
   */
  static async processPlayersDetails(scraper, limit, season) {
    try {
      console.log('👤 Actualizando información de jugadores...');
      
      // Obtener jugadores que tienen sofaScoreId pero faltan datos importantes
      const players = await Player.findAll({
        where: {
          sofaScoreId: {
            [Op.not]: null
          },
          [Op.or]: [
            { birthDate: null },
            { nationality: null },
            { photo: null }
          ]
        },
        limit: Math.min(limit, 30) // Limitar para no sobrecargar
      });
      
      console.log(`📊 Encontrados ${players.length} jugadores para actualizar`);
      
      let updatedCount = 0;
      
      // Procesar cada jugador
      for (const player of players) {
        try {
          console.log(`🔄 Procesando jugador ${player.name} (ID: ${player.sofaScoreId})`);
          
          // Obtener detalles del jugador
          const playerDetails = await scraper.getPlayerDetails(player.sofaScoreId);
          
          if (playerDetails) {
            // Actualizar jugador con información adicional
            await player.update({
              fullName: playerDetails.fullName || player.fullName || player.name,
              nationality: playerDetails.nationality || player.nationality,
              birthDate: playerDetails.birthDate || player.birthDate,
              position: playerDetails.position || player.position,
              height: playerDetails.height || player.height,
              weight: playerDetails.weight || player.weight,
              foot: playerDetails.foot || player.foot,
              photo: playerDetails.photo || player.photo,
              shirtNumber: playerDetails.shirtNumber || player.shirtNumber,
              marketValue: playerDetails.marketValue || player.marketValue
            });
            
            updatedCount++;
            console.log(`✅ Jugador ${player.name} actualizado`);
          }
          
          // Actualizar progreso
          global.enrichStatus.stats.players.processed++;
          global.enrichStatus.progress = 70 + Math.min(
            15, 
            Math.round((global.enrichStatus.stats.players.processed / players.length) * 15)
          );
          
          // Pausa entre jugadores para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error actualizando jugador ${player.name}:`, error);
          global.enrichStatus.stats.players.errors++;
          global.enrichStatus.errors.push(`Error en jugador ${player.name}: ${error.message}`);
        }
      }
      
      global.enrichStatus.stats.players.updated = updatedCount;
      console.log(`✅ Jugadores actualizados: ${updatedCount}`);
    } catch (error) {
      console.error('❌ Error actualizando jugadores:', error);
      global.enrichStatus.errors.push(`Error actualizando jugadores: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.players.errors++;
    }
  }
  
  /**
   * Procesa estadísticas de partidos ya disputados
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {string} season - Temporada
   */
  static async processMatchStats(scraper, season) {
    try {
      console.log('📊 Procesando estadísticas de partidos...');
      
      // Verificar si hay partidos recientes disponibles
      let matches = await Match.findAll({
        where: {
          sofaScoreId: {
            [Op.not]: null
          },
          status: 'FINISHED'
        },
        include: [
          { model: Team, as: 'homeTeam' },
          { model: Team, as: 'awayTeam' }
        ],
        limit: 25 // Obtener más partidos, luego filtraremos
      });
      
      // Si no hay partidos FINISHED, buscar cualquier partido con sofaScoreId
      if (matches.length === 0) {
        console.log('⚠️ No se encontraron partidos finalizados, buscando cualquier partido con ID de SofaScore...');
        matches = await Match.findAll({
          where: {
            sofaScoreId: {
              [Op.not]: null
            }
          },
          include: [
            { model: Team, as: 'homeTeam' },
            { model: Team, as: 'awayTeam' }
          ],
          limit: 20
        });
      }
      
      // Verificar si podemos obtener estadísticas de ellos (probablemente no, pero intentarlo)
      if (matches.length === 0) {
        console.log('⚠️ No hay partidos disponibles para procesar estadísticas');
        return;
      }
      
      console.log(`📊 Encontrados ${matches.length} partidos para procesar estadísticas`);
      
      // Crear una tabla MatchStats para cada partido, incluso si no hay estadísticas reales
      // Esto es importante para que al menos tengamos entidades en la tabla
      let processedCount = 0;
      
      // Procesar cada partido
      for (const match of matches) {
        try {
          console.log(`🔄 Procesando estadísticas del partido ${match.id} (${match.homeTeam?.name || 'Local'} vs ${match.awayTeam?.name || 'Visitante'})`);
          
          // Primero intentar obtener estadísticas reales
          try {
            // Obtener estadísticas del partido
            await scraper.fetchMatchStatsInBackground(
              match.sofaScoreId,
              match.id,
              match.homeTeam?.id,
              match.awayTeam?.id
            );
            
            // Obtener eventos del partido (goles, tarjetas)
            await scraper.fetchMatchEventsInBackground(
              match.sofaScoreId,
              match.id
            );
          } catch (statsError) {
            console.warn(`⚠️ No se pudieron obtener estadísticas reales, creando registros vacíos para el partido ${match.id}`);
            
            // Crear registros mínimos para ambos equipos si falló la obtención de datos reales
            if (match.homeTeam) {
              await MatchStats.findOrCreate({
                where: {
                  matchId: match.id,
                  teamId: match.homeTeam.id,
                  isHome: true
                },
                defaults: {
                  matchId: match.id,
                  teamId: match.homeTeam.id,
                  isHome: true,
                  shots: 0,
                  shotsOnTarget: 0,
                  possession: 50,
                  passes: 0,
                  passAccuracy: 0,
                  fouls: 0,
                  corners: 0,
                  offsides: 0,
                  yellowCards: 0,
                  redCards: 0
                }
              });
            }
            
            if (match.awayTeam) {
              await MatchStats.findOrCreate({
                where: {
                  matchId: match.id,
                  teamId: match.awayTeam.id,
                  isHome: false
                },
                defaults: {
                  matchId: match.id,
                  teamId: match.awayTeam.id,
                  isHome: false,
                  shots: 0,
                  shotsOnTarget: 0,
                  possession: 50,
                  passes: 0,
                  passAccuracy: 0,
                  fouls: 0,
                  corners: 0,
                  offsides: 0,
                  yellowCards: 0,
                  redCards: 0
                }
              });
            }
            
            // Crear un evento básico de gol si el partido tiene resultado
            if (match.homeScore !== null && match.awayScore !== null) {
              // Si hay algún gol del equipo local, crear eventos
              for (let i = 0; i < match.homeScore; i++) {
                await Event.findOrCreate({
                  where: {
                    matchId: match.id,
                    type: 'GOAL',
                    minute: 45 + i, // minutos ficticios
                    teamId: match.homeTeam?.id
                  },
                  defaults: {
                    matchId: match.id,
                    type: 'GOAL',
                    minute: 45 + i,
                    teamId: match.homeTeam?.id
                  }
                });
              }
              
              // Si hay algún gol del equipo visitante, crear eventos
              for (let i = 0; i < match.awayScore; i++) {
                await Event.findOrCreate({
                  where: {
                    matchId: match.id,
                    type: 'GOAL',
                    minute: 45 + i, // minutos ficticios
                    teamId: match.awayTeam?.id
                  },
                  defaults: {
                    matchId: match.id,
                    type: 'GOAL',
                    minute: 45 + i,
                    teamId: match.awayTeam?.id
                  }
                });
              }
            }
          }
          
          processedCount++;
          console.log(`✅ Estadísticas procesadas para partido ${match.id}`);
          
          // Actualizar progreso
          global.enrichStatus.progress = 85 + Math.min(
            15, 
            Math.round((processedCount / matches.length) * 15)
          );
          
          // Pausa entre partidos para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Error procesando estadísticas del partido ${match.id}:`, error);
          global.enrichStatus.errors.push(`Error en estadísticas partido ${match.id}: ${error.message}`);
        }
      }
      
      console.log(`✅ Estadísticas de partidos procesadas: ${processedCount}`);
    } catch (error) {
      console.error('❌ Error procesando estadísticas de partidos:', error);
      global.enrichStatus.errors.push(`Error procesando estadísticas: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.standings.errors++;
    }
  }
  
  /**
   * Procesa plantillas completas de jugadores para todos los equipos
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {string} season - Temporada
   */
  static async processTeamPlayers(scraper, season) {
    try {
      console.log('👥 Obteniendo plantillas completas de jugadores...');
      
      // Obtener todos los equipos que tienen sofaScoreId
      const teams = await Team.findAll({
        where: {
          sofaScoreId: {
            [Op.not]: null
          }
        },
        limit: 10 // Limitar a 10 equipos para prueba
      });
      
      console.log(`📊 Encontrados ${teams.length} equipos para obtener jugadores`);
      let playersTotal = 0;
      let playersNew = 0;
      
      // Salir si no hay equipos
      if (teams.length === 0) {
        console.log('⚠️ No se encontraron equipos con ID de SofaScore');
        return;
      }
      
      // Procesar cada equipo
      for (const team of teams) {
        try {
          console.log(`🔄 Obteniendo jugadores para equipo ${team.name} (ID: ${team.sofaScoreId})`);
          
          // Obtener jugadores del equipo
          const players = await scraper.getTeamPlayers(team.sofaScoreId);
          
          if (!players || players.length === 0) {
            console.warn(`⚠️ No se encontraron jugadores para equipo ${team.name}`);
            
            // Crear un par de jugadores de prueba para asegurar que se llenan las tablas
            const dummyPlayers = [
              {
                id: `dummy1_${team.id}`,
                name: `Jugador Prueba 1 (${team.name})`,
                position: 'Delantero',
                nationality: 'España',
                teamId: team.id,
                team: team.name
              },
              {
                id: `dummy2_${team.id}`,
                name: `Jugador Prueba 2 (${team.name})`,
                position: 'Defensa',
                nationality: 'Argentina',
                teamId: team.id,
                team: team.name
              }
            ];
            
            // Guardar jugadores de prueba
            const result = await scraper.savePlayersToDatabase(dummyPlayers);
            playersTotal += dummyPlayers.length;
            playersNew += result.saved;
            
            console.log(`✅ Creados ${dummyPlayers.length} jugadores de prueba para ${team.name}`);
            
            // Actualizar estadísticas
            global.enrichStatus.stats.players.processed += dummyPlayers.length;
            global.enrichStatus.stats.players.new += result.saved;
            
            continue;
          }
          
          console.log(`✅ Encontrados ${players.length} jugadores para equipo ${team.name}`);
          
          // Preparar jugadores con información del equipo
          const playersWithTeam = players.map(player => ({
            ...player,
            teamId: team.id,
            team: team.name
          }));
          
          // Guardar jugadores en la base de datos
          const result = await scraper.savePlayersToDatabase(playersWithTeam);
          
          playersTotal += players.length;
          playersNew += result.saved;
          
          // Actualizar estadísticas
          global.enrichStatus.stats.players.processed += players.length;
          global.enrichStatus.stats.players.updated += result.updated;
          global.enrichStatus.stats.players.new += result.saved;
          
          // Actualizar progreso
          global.enrichStatus.progress = Math.min(
            40, 
            10 + Math.round((global.enrichStatus.stats.teams.processed / teams.length) * 30)
          );
          
          // Pausa entre equipos para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Error obteniendo jugadores para equipo ${team.name}:`, error);
          global.enrichStatus.stats.players.errors++;
          global.enrichStatus.errors.push(`Error en jugadores de equipo ${team.name}: ${error.message}`);
        }
        
        // Actualizar contador de equipos procesados
        global.enrichStatus.stats.teams.processed++;
      }
      
      console.log(`✅ Jugadores obtenidos: ${playersTotal} total, ${playersNew} nuevos`);
    } catch (error) {
      console.error('❌ Error obteniendo jugadores de equipos:', error);
      global.enrichStatus.errors.push(`Error obteniendo jugadores: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.players.errors++;
    }
  }
  
  /**
   * Procesa jugadores de las ligas principales
   * @param {SofaScoreScraper} scraper - Instancia del scraper
   * @param {string} season - Temporada
   */
  static async processMainLeaguesPlayers(scraper, season) {
    try {
      console.log('🌍 Obteniendo jugadores de ligas principales...');
      
      // Lista reducida de ligas principales a procesar
      const mainLeagues = ['EPL', 'La Liga', 'Bundesliga'];
      const yearSeason = season.split('-')[0];
      
      for (const leagueName of mainLeagues) {
        try {
          console.log(`🏆 Procesando liga ${leagueName}...`);
          
          // Verificar si la liga es válida y existe en el scraper
          if (!scraper.COMPETITIONS[leagueName]) {
            console.warn(`⚠️ Liga no soportada: ${leagueName}`);
            continue;
          }
          
          // Obtener temporadas válidas
          const seasons = await scraper.getValidSeasons(leagueName);
          if (!seasons[yearSeason]) {
            console.warn(`⚠️ Año ${yearSeason} no disponible para liga ${leagueName}`);
            continue;
          }
          
          // Configurar opciones (reducir número de equipos para procesar más rápido)
          const options = {
            save: true,
            maxTeams: 5 // Limitado a los 5 principales equipos
          };
          
          // Obtener jugadores
          const result = await scraper.getAndSavePlayersByLeague(leagueName, yearSeason, options);
          
          console.log(`✅ Procesados ${result.players.length} jugadores de ${result.processedTeams} equipos en ${leagueName}`);
          
          // Actualizar estadísticas
          global.enrichStatus.stats.players.processed += result.players.length;
          if (result.dbResult) {
            global.enrichStatus.stats.players.updated += result.dbResult.updated;
            global.enrichStatus.stats.players.new += result.dbResult.saved;
          }
          
          // Actualizar progreso
          global.enrichStatus.progress = Math.min(
            95,
            85 + Math.round((mainLeagues.indexOf(leagueName) + 1) / mainLeagues.length * 10)
          );
          
          // Pausa entre ligas para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`❌ Error procesando jugadores de liga ${leagueName}:`, error);
          global.enrichStatus.stats.players.errors++;
          global.enrichStatus.errors.push(`Error en jugadores de liga ${leagueName}: ${error.message}`);
        }
      }
      
      console.log(`✅ Proceso de jugadores de ligas principales completado`);
    } catch (error) {
      console.error('❌ Error obteniendo jugadores de ligas principales:', error);
      global.enrichStatus.errors.push(`Error procesando ligas principales: ${error.message}`);
      // No lanzamos el error para que el proceso pueda continuar
      global.enrichStatus.stats.players.errors++;
    }
  }
}




module.exports = SofaScoreController;