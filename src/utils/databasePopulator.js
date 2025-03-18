const { Op } = require('sequelize');
const SofaScoreScraper = require('../scrapers/SofaScoreScraper');
const {
  Country,
  League,
  Team,
  Player,
  Transfer,
  TeamLeague
} = require('../models');

/**
 * Clase para poblar la base de datos con información estructurada
 */
class DatabasePopulator {
  constructor() {
    this.scraper = new SofaScoreScraper();
  }

  /**
   * Inicializa la población de la base de datos
   */
  async initialize() {
    console.log('🚀 Iniciando población de la base de datos...');
    
    try {
      await this.populateCountries();
      await this.populateTopLeagues();
      
      console.log('✅ Población inicial completada.');
    } catch (error) {
      console.error('❌ Error en la población inicial:', error);
    }
  }

  /**
   * Pobla la tabla de países
   */
  async populateCountries() {
    console.log('🌎 Obteniendo países...');
    
    try {
      const countries = await this.scraper.getAllCountries();
      console.log(`📊 Encontrados ${countries.length} países`);
      
      let created = 0;
      
      for (const countryData of countries) {
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
        
        if (isNew) created++;
      }
      
      console.log(`✅ Países guardados: ${created} nuevos`);
      return true;
    } catch (error) {
      console.error('❌ Error obteniendo países:', error);
      return false;
    }
  }

  /**
   * Pobla las ligas principales
   */
  async populateTopLeagues() {
    console.log('🏆 Obteniendo principales ligas...');
    
    try {
      // Obtener estructura completa (países, ligas, equipos)
      const structure = await this.scraper.getCountriesWithLeaguesAndTeams();
      console.log(`📊 Encontrados datos de ${structure.length} países con ligas`);
      
      let leaguesCreated = 0;
      let teamsCreated = 0;
      let teamLeaguesCreated = 0;
      
      // Procesar cada país
      for (const countryWithLeagues of structure) {
        // Buscar país en la BD
        const country = await Country.findOne({
          where: { name: countryWithLeagues.name }
        });
        
        if (!country) {
          console.warn(`⚠️ País no encontrado en la base de datos: ${countryWithLeagues.name}`);
          continue;
        }
        
        // Procesar ligas de este país
        for (const leagueData of countryWithLeagues.leagues) {
          // Encontrar o crear la liga
          const [league, leagueCreated] = await League.findOrCreate({
            where: { 
              [Op.or]: [
                { sofaScoreId: leagueData.id.toString() },
                { name: leagueData.name, countryId: country.id }
              ]
            },
            defaults: {
              name: leagueData.name,
              country: country.name,
              countryId: country.id,
              logo: leagueData.logo,
              season: new Date().getFullYear().toString(),
              sofaScoreId: leagueData.id.toString()
            }
          });
          
          if (leagueCreated) leaguesCreated++;
          
          // Procesar equipos de esta liga
          for (const teamData of leagueData.teams) {
            // Encontrar o crear el equipo
            const [team, teamCreated] = await Team.findOrCreate({
              where: { 
                [Op.or]: [
                  { sofaScoreId: teamData.id.toString() },
                  { name: teamData.name }
                ]
              },
              defaults: {
                name: teamData.name,
                shortName: teamData.shortName,
                country: country.name,
                countryId: country.id,
                logo: teamData.logo,
                sofaScoreId: teamData.id.toString()
              }
            });
            
            if (teamCreated) teamsCreated++;
            
            // Crear relación equipo-liga si no existe
            const [teamLeague, teamLeagueCreated] = await TeamLeague.findOrCreate({
              where: {
                teamId: team.id,
                leagueId: league.id,
                season: new Date().getFullYear().toString()
              },
              defaults: {
                status: 'active'
              }
            });
            
            if (teamLeagueCreated) teamLeaguesCreated++;
          }
        }
      }
      
      console.log(`✅ Población completada: ${leaguesCreated} ligas, ${teamsCreated} equipos, ${teamLeaguesCreated} relaciones`);
      return true;
    } catch (error) {
      console.error('❌ Error poblando ligas:', error);
      return false;
    }
  }

  /**
   * Pobla jugadores para un equipo específico
   * @param {number} teamId - ID del equipo en la base de datos
   */
  async populatePlayersForTeam(teamId) {
    try {
      const team = await Team.findByPk(teamId);
      if (!team || !team.sofaScoreId) {
        console.warn(`⚠️ Equipo no encontrado o sin ID de SofaScore: ${teamId}`);
        return false;
      }
      
      console.log(`🧑‍⚽ Obteniendo jugadores para equipo ${team.name}...`);
      
      // Obtener jugadores del equipo
      const teamDetails = await this.scraper.getTeamDetails(team.sofaScoreId);
      
      if (!teamDetails.players || teamDetails.players.length === 0) {
        console.warn(`⚠️ No se encontraron jugadores para el equipo ${team.name}`);
        return false;
      }
      
      let playersCreated = 0;
      let playersUpdated = 0;
      
      // Procesar cada jugador
      for (const playerData of teamDetails.players) {
        // Buscar país (nacionalidad) del jugador
        let nationality = null;
        
        if (playerData.nationality) {
          nationality = await Country.findOne({
            where: {
              [Op.or]: [
                { name: playerData.nationality },
                { code: playerData.countryCode }
              ]
            }
          });
        }
        
        // Crear o actualizar jugador
        const [player, created] = await Player.findOrCreate({
          where: {
            [Op.or]: [
              playerData.sofaScoreId ? { sofaScoreId: playerData.id.toString() } : {},
              { name: playerData.name, teamId: team.id }
            ]
          },
          defaults: {
            name: playerData.name,
            fullName: playerData.fullName || playerData.name,
            shortName: playerData.shortName,
            position: playerData.position,
            positionCategory: playerData.positionCategory,
            nationality: playerData.nationality,
            nationalityId: nationality?.id,
            birthDate: playerData.dateOfBirth,
            age: playerData.age,
            height: playerData.height,
            weight: playerData.weight,
            foot: playerData.foot,
            shirtNumber: playerData.shirtNumber,
            photo: playerData.photo,
            teamId: team.id,
            sofaScoreId: playerData.id ? playerData.id.toString() : null,
            sofaScoreUrl: playerData.sofaScoreUrl
          }
        });
        
        if (created) {
          playersCreated++;
        } else {
          // Actualizar información del jugador si ya existía
          await player.update({
            position: playerData.position,
            positionCategory: playerData.positionCategory,
            shirtNumber: playerData.shirtNumber,
            photo: playerData.photo || player.photo,
            teamId: team.id
          });
          playersUpdated++;
        }
        
        // Solo obtener datos completos para los nuevos jugadores
        if (created && playerData.id) {
          await this.populatePlayerDetails(player.id, playerData.id);
        }
      }
      
      console.log(`✅ Jugadores procesados para ${team.name}: ${playersCreated} nuevos, ${playersUpdated} actualizados`);
      return true;
    } catch (error) {
      console.error(`❌ Error poblando jugadores para equipo ${teamId}:`, error);
      return false;
    }
  }

  /**
   * Puebla detalles adicionales de un jugador (historial, estadísticas)
   * @param {number} playerId - ID del jugador en la BD
   * @param {string} sofaScoreId - ID del jugador en SofaScore
   */
  async populatePlayerDetails(playerId, sofaScoreId) {
    try {
      const player = await Player.findByPk(playerId);
      if (!player) {
        console.warn(`⚠️ Jugador no encontrado: ${playerId}`);
        return false;
      }
      
      console.log(`🧩 Obteniendo detalles completos para ${player.name}...`);
      
      // Obtener datos completos del jugador
      const playerDetails = await this.scraper.getCompletePlayerData(sofaScoreId);
      
      if (!playerDetails) {
        console.warn(`⚠️ No se encontraron detalles para el jugador ${player.name}`);
        return false;
      }
      
      // Actualizar datos adicionales del jugador
      if (playerDetails.marketValue || playerDetails.contractUntil) {
        await player.update({
          marketValue: playerDetails.marketValue,
          contractUntil: playerDetails.contractUntil
        });
      }
      
      // Procesar historial de transferencias
      if (playerDetails.transferHistory && playerDetails.transferHistory.length > 0) {
        let transfersCreated = 0;
        
        for (const transferData of playerDetails.transferHistory) {
          // Buscar equipos involucrados en la transferencia
          let fromTeam = null;
          let toTeam = null;
          
          if (transferData.fromTeam && transferData.fromTeam.id) {
            fromTeam = await Team.findOne({ 
              where: { sofaScoreId: transferData.fromTeam.id.toString() }
            });
            
            // Si no encontramos el equipo por ID, intentar por nombre
            if (!fromTeam && transferData.fromTeam.name) {
              [fromTeam] = await Team.findOrCreate({
                where: { name: transferData.fromTeam.name },
                defaults: {
                  name: transferData.fromTeam.name,
                  country: 'Unknown',
                  sofaScoreId: transferData.fromTeam.id.toString()
                }
              });
            }
          }
          
          if (transferData.toTeam && transferData.toTeam.id) {
            toTeam = await Team.findOne({ 
              where: { sofaScoreId: transferData.toTeam.id.toString() }
            });
            
            // Si no encontramos el equipo por ID, intentar por nombre
            if (!toTeam && transferData.toTeam.name) {
              [toTeam] = await Team.findOrCreate({
                where: { name: transferData.toTeam.name },
                defaults: {
                  name: transferData.toTeam.name,
                  country: 'Unknown',
                  sofaScoreId: transferData.toTeam.id.toString()
                }
              });
            }
          }
          
          // Solo crear la transferencia si tenemos al menos el equipo destino
          if (toTeam) {
            const [transfer, created] = await Transfer.findOrCreate({
              where: {
                playerId: player.id,
                transferDate: transferData.date,
                fromTeamId: fromTeam?.id || null,
                toTeamId: toTeam.id
              },
              defaults: {
                type: transferData.type,
                fee: transferData.fee,
                playerId: player.id,
                fromTeamId: fromTeam?.id || null,
                toTeamId: toTeam.id
              }
            });
            
            if (created) transfersCreated++;
          }
        }
        
        console.log(`✅ ${transfersCreated} transferencias guardadas para ${player.name}`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Error poblando detalles del jugador ${playerId}:`, error);
      return false;
    }
  }
  
  /**
   * Pobla la base de datos con todos los equipos de una liga
   * @param {number} leagueId - ID de la liga en la base de datos
   */
  async populateTeamsForLeague(leagueId) {
    try {
      const league = await League.findByPk(leagueId);
      if (!league || !league.sofaScoreId) {
        console.warn(`⚠️ Liga no encontrada o sin ID de SofaScore: ${leagueId}`);
        return false;
      }
      
      console.log(`🧩 Obteniendo equipos para liga ${league.name}...`);
      
      // Obtener detalles de la liga
      const leagueDetails = await this.scraper.getLeagueDetails(league.sofaScoreId);
      
      if (!leagueDetails.teams || leagueDetails.teams.length === 0) {
        console.warn(`⚠️ No se encontraron equipos para la liga ${league.name}`);
        return false;
      }
      
      let teamsCreated = 0;
      let teamsProcessed = 0;
      
      // Procesar cada equipo
      for (const teamData of leagueDetails.teams) {
        // Buscar país del equipo
        let country = await Country.findOne({
          where: { name: leagueDetails.country }
        });
        
        // Crear o actualizar equipo
        const [team, created] = await Team.findOrCreate({
          where: {
            [Op.or]: [
              { sofaScoreId: teamData.id.toString() },
              { name: teamData.name }
            ]
          },
          defaults: {
            name: teamData.name,
            shortName: teamData.shortName,
            country: leagueDetails.country || 'Unknown',
            countryId: country?.id,
            logo: teamData.logo,
            sofaScoreId: teamData.id.toString()
          }
        });
        
        if (created) teamsCreated++;
        
        // Crear relación equipo-liga
        await TeamLeague.findOrCreate({
          where: {
            teamId: team.id,
            leagueId: league.id,
            season: new Date().getFullYear().toString()
          },
          defaults: {
            status: 'active'
          }
        });
        
        // Poblar jugadores para este equipo
        await this.populatePlayersForTeam(team.id);
        
        teamsProcessed++;
      }
      
      console.log(`✅ Equipos procesados para ${league.name}: ${teamsCreated} nuevos, ${teamsProcessed} total`);
      return true;
    } catch (error) {
      console.error(`❌ Error poblando equipos para liga ${leagueId}:`, error);
      return false;
    }
  }
}

module.exports = DatabasePopulator;