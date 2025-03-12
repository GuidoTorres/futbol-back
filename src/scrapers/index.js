// Archivo principal para ejecutar todos los scrapers
const { scrapeAndSaveMatches } = require('./MatchesScraper');
const TeamScraper = require('./TeamScraper');
const CompetitionScraper = require('./CompsScraper');
const PlayerScraper = require('./PlayerScraper');

/**
 * Ejecuta todos los scrapers en secuencia
 * @param {Object} options - Opciones de configuración
 * @param {string} [options.date] - Fecha específica para los partidos (YYYY-MM-DD)
 * @param {boolean} [options.skipMatches] - Omitir el scraping de partidos
 * @param {boolean} [options.skipTeams] - Omitir el scraping de equipos
 * @param {boolean} [options.skipCompetitions] - Omitir el scraping de competiciones
 * @param {boolean} [options.skipPlayers] - Omitir el scraping de jugadores
 * @returns {Promise<Object>} Resultados de la operación
 */
async function runAllScrapers(options = {}) {
  const results = {
    matches: { count: 0, saved: 0 },
    teams: { count: 0, saved: 0 },
    competitions: { count: 0, saved: 0 },
    players: { count: 0, saved: 0 }
  };

  console.log('🚀 Iniciando proceso de scraping completo...');

  try {
    // 1. Partidos
    if (!options.skipMatches) {
      console.log('\n📅 Obteniendo partidos...');
      try {
        const { matches, savedCount } = await scrapeAndSaveMatches(options.date);
        results.matches.count = matches.length;
        results.matches.saved = savedCount;
        console.log(`✅ Proceso de partidos completado. Obtenidos: ${matches.length}, Guardados: ${savedCount}`);
      } catch (error) {
        console.error('❌ Error en el scraping de partidos:', error.message);
        results.matches.error = error.message;
      }
    }

    // 2. Equipos
    if (!options.skipTeams) {
      console.log('\n⚽ Obteniendo equipos...');
      try {
        const teamScraper = new TeamScraper();
        const savedTeams = await teamScraper.scrapeAndSaveClubs();
        results.teams.saved = savedTeams;
        console.log(`✅ Proceso de equipos completado. Guardados: ${savedTeams}`);
      } catch (error) {
        console.error('❌ Error en el scraping de equipos:', error.message);
        results.teams.error = error.message;
      }
    }

    // 3. Competiciones
    if (!options.skipCompetitions) {
      console.log('\n🏆 Obteniendo competiciones...');
      try {
        const compScraper = new CompetitionScraper();
        const savedComps = await compScraper.scrapeAndSaveCompetitions();
        results.competitions.saved = savedComps;
        console.log(`✅ Proceso de competiciones completado. Guardados: ${savedComps}`);
      } catch (error) {
        console.error('❌ Error en el scraping de competiciones:', error.message);
        results.competitions.error = error.message;
      }
    }

    // 4. Jugadores
    if (!options.skipPlayers) {
      console.log('\n👤 Obteniendo jugadores...');
      try {
        const playerScraper = new PlayerScraper();
        const savedPlayers = await playerScraper.scrapeAndSavePlayers();
        results.players.saved = savedPlayers;
        console.log(`✅ Proceso de jugadores completado. Guardados: ${savedPlayers}`);
      } catch (error) {
        console.error('❌ Error en el scraping de jugadores:', error.message);
        results.players.error = error.message;
      }
    }

    console.log('\n🎉 Proceso de scraping completado!');
    return results;
  } catch (error) {
    console.error('❌ Error general en el proceso de scraping:', error);
    throw error;
  }
}

module.exports = {
  runAllScrapers,
  scrapeMatches: scrapeAndSaveMatches,
  TeamScraper,
  CompetitionScraper,
  PlayerScraper
};