// En ScraperGpt.js
const { Op } = require("sequelize");
const {
  Team,
  Country,
  League,
  Player,
  Transfer,
  TeamLeague,
  TeamStats,
  TopScorer,
  Season,
  TeamSeason,
  PlayerStats,
} = require("../models");

const { scrapeCompleteTeamData } = require("./SofaScoreScraperFull");
const moment = require("moment");

async function getOrCreateTeam(teamData) {
    if (!teamData || !teamData.id) return null;
    const [team] = await Team.findOrCreate({
      where: { sofaScoreId: teamData.id },
      defaults: {
        name: teamData.name,
        slug: teamData.slug,
        // Puedes agregar aquí otros atributos necesarios según la definición de tu modelo Team
      },
    });
    return team.id;
  }

  async function scrapeAndUpdateAllTeams() {
    try {
      const teams = await Team.findAll({
        where: { sofaScoreId: { [Op.ne]: null } },
        attributes: ["id", "sofaScoreId"],
      });
      console.log(`Se encontraron ${teams.length} equipos para procesar.`);
      
      for (let i = 126; i < teams.length; i++) {
        const team = teams[i];
        console.log(`Iniciando iteración ${i + 1} de ${teams.length}`);

        console.log(`Procesando equipo ${i + 1} (sofaScoreId: ${team.sofaScoreId})...`);
        
        try {
          console.log(`Procesando equipo ${team.sofaScoreId}...`);
  
          // Scraping completo
          const completeData = await scrapeCompleteTeamData(team.sofaScoreId);
          console.log(`Jugadores obtenidos para el equipo ${team.sofaScoreId}: ${completeData.players ? completeData.players.length : 0}`);
          const seasonId = completeData.seasonId; // SeasonId obtenido
  
          await team.update({
            name: completeData.team.name,
            logo: completeData.team.logo,
            venue: completeData.team.venue,
          });
  
          if (completeData.team.country) {
            const [country] = await Country.findOrCreate({
              where: { name: completeData.team.country },
              defaults: { name: completeData.team.country },
            });
            await team.update({ countryId: country.id });
          }
  
          if (completeData.league) {
            const [league] = await League.findOrCreate({
              where: { sofaScoreId: completeData.league.id },
              defaults: {
                name: completeData.league.name,
                country: completeData.team.country || "Desconocido",
                season: moment().year().toString(),
              },
            });
  
            await TeamLeague.findOrCreate({
              where: { teamId: team.id, leagueId: league.id },
            });
  
            await Season.findOrCreate({
              where: { id: seasonId },
              defaults: {
                id: seasonId,
                leagueId: league.id,
                year: moment().year().toString(),
              },
            });
  
            // Guarda estadísticas del equipo
            await TeamStats.findOrCreate({
              where: {
                teamId: team.id,
                leagueId: league.id,
                seasonId: seasonId,
              },
              defaults: completeData.teamStats,
            });
  
            // Guarda la relación histórica Team-Season
            await TeamSeason.findOrCreate({
              where: { teamId: team.id, seasonId: seasonId },
            });
  
            // Procesa los máximos goleadores
            for (const scorer of completeData.topScorers) {
              const [player] = await Player.findOrCreate({
                where: { sofaScoreId: scorer.player.id },
                defaults: {
                  name: scorer.player.name,
                  position: scorer.player.position,
                  photo: scorer.player.photo,
                },
              });
              await TopScorer.findOrCreate({
                where: {
                  playerId: player.id,
                  leagueId: league.id,
                  seasonId: seasonId,
                },
                defaults: {
                  goals: scorer.goals,
                  matchesPlayed: scorer.matchesPlayed,
                },
              });
            }
  
            // Procesa jugadores y sus transferencias
            for (const playerData of completeData.players) {
                
              const [player] = await Player.findOrCreate({
                where: { sofaScoreId: playerData.id },
                defaults: {
                  name: playerData.name,
                  position: playerData.position,
                  photo: playerData.photo,
                },
              });
              
              const stats = playerData.stats?.statistics || {};

              await PlayerStats.upsert({
                playerId: player.id,
                teamId: team.id,
                leagueId: league.id,
                season: seasonId,
                appearances: stats.appearances || 0,
                starts: stats.starts || 0,
                minutesPlayed: stats.minutesPlayed || 0,
                goals: stats.goals || 0,
                assists: stats.assists || 0,
                yellowCards: stats.yellowCards || 0,
                redCards: stats.redCards || 0,
                shots: stats.totalShots || 0,
                shotsOnTarget: stats.shotsOnTarget || 0,
                passesAttempted: stats.totalPasses || 0,
                passesCompleted: stats.accuratePasses || 0,
                passAccuracy: stats.accuratePassesPercentage || 0,
                keyPasses: stats.keyPasses || 0,
                tackles: stats.tackles || 0,
                interceptions: stats.interceptions || 0,
                blocks: stats.blockedShots || 0,
                clearances: stats.clearances || 0,
                saves: stats.saves || 0,
                cleanSheets: stats.cleanSheet || 0,
                goalsConceded: stats.goalsConceded || 0,
              });
              
  
              // Procesa las transferencias para cada jugador
              for (const transfer of playerData.transfers) {
                const transferYear = moment(transfer.transferDate).year();
                const seasonObj = await Season.findOne({
                  where: {
                    leagueId: league.id,
                    year: transferYear.toString(),
                  },
                });
                const fromTeamId = transfer.transferFrom ? await getOrCreateTeam(transfer.transferFrom) : null;
                const toTeamId = transfer.transferTo ? await getOrCreateTeam(transfer.transferTo) : null;
  
                await Transfer.findOrCreate({
                  where: {
                    playerId: player.id,
                    fromTeamId: fromTeamId,
                    toTeamId: toTeamId,
                    transferDate: transfer.transferDate,
                  },
                  defaults: {
                    fee: transfer.fee,
                    seasonId: seasonId || null,
                  },
                });
              }
            }
          }
  
          console.log(`✅ Equipo ${team.sofaScoreId} procesado.`);
        } catch (error) {
          console.error(`❌ Error equipo ${team.sofaScoreId}:`, error);
        }
      }
      console.log("✅ Scraping completado para todos los equipos.");
    } catch (error) {
      console.error("❌ Error general en scraping:", error);
    }
  }

module.exports = { scrapeAndUpdateAllTeams };
