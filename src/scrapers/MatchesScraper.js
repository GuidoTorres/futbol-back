const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sequelize = require('../config/database');
const Match = require('../models/Match');
const Team = require('../models/Team');
const League = require('../models/League');
const { Op } = require('sequelize');

/**
 * Scrape matches from FBref for a specific date
 * @param {Date|string} [date] - Optional date object or string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of match objects
 */
async function scrapeFbrefMatches(date) {
  const formattedDate = date || new Date().toISOString().split('T')[0];
  const url = `https://fbref.com/es/partidos/${formattedDate}`;
  console.log(`🔍 Scraping matches from: ${url}`);
  
  const browser = await puppeteer.launch({ headless: 'new' });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    const matches = [];
    
    // Iterar sobre cada competición
    $('div.table_container').each((_, tableContainer) => {
      const competition = $(tableContainer).find('caption').text().trim().split(' - ')[0];
      
      // Iterar sobre cada fila de partido (ignorar encabezados)
      $(tableContainer).find('table.stats_table tbody tr:has(td)').each((_, row) => {
        const homeTeam = $(row).find('td[data-stat="home_team"] a').text().trim();
        const awayTeam = $(row).find('td[data-stat="away_team"] a').text().trim();
        const homeScore = $(row).find('td[data-stat="home_score"]').text().trim();
        const awayScore = $(row).find('td[data-stat="away_score"]').text().trim();
        const matchTime = $(row).find('td[data-stat="match_time"]').text().trim();
        const venue = $(row).find('td[data-stat="venue"]').text().trim();
        
        // Determinar si el partido está en vivo o programado
        const isLive = matchTime.includes("'") || homeScore !== '-' || awayScore !== '-';
        const status = isLive ? 'LIVE' : 'SCHEDULED';
        
        // Extraer URL del partido
        const matchUrl = $(row).find('td[data-stat="match_report"] a').attr('href') || '';
        
        matches.push({
          homeTeam,
          awayTeam,
          homeScore: homeScore === '-' ? null : parseInt(homeScore, 10),
          awayScore: awayScore === '-' ? null : parseInt(awayScore, 10),
          matchTime,
          venue,
          competition,
          status,
          matchUrl: matchUrl ? `https://fbref.com${matchUrl}` : null,
          isLive,
          date: formattedDate
        });
      });
    });
    
    console.log(`✅ Scraped ${matches.length} matches for ${formattedDate}`);
    return matches;
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Guardar los datos de los partidos en la base de datos manteniendo relaciones
 * @param {Array} matches - Array de objetos de partidos del scraper
 * @returns {Promise<number>} Número de partidos guardados
 */
async function saveMatchesToDatabase(matches) {
  let savedCount = 0;
  
  console.log(`💾 Saving ${matches.length} matches to database...`);
  
  try {
    const transaction = await sequelize.transaction();
    
    try {
      for (const matchData of matches) {
        // Validar datos críticos
        if (!matchData.homeTeam || !matchData.awayTeam) {
          console.warn('Skipping invalid match data:', matchData);
          continue;
        }
        
        // 1. Buscar o crear los equipos
        const [homeTeam] = await Team.findOrCreate({
          where: { name: matchData.homeTeam },
          defaults: {
            name: matchData.homeTeam,
            country: 'Unknown', // Default value
            fbrefUrl: matchData.matchUrl ? `https://fbref.com/teams/${matchData.homeTeam.toLowerCase().replace(/\s+/g, '-')}` : null
          },
          transaction
        });
        
        const [awayTeam] = await Team.findOrCreate({
          where: { name: matchData.awayTeam },
          defaults: {
            name: matchData.awayTeam,
            country: 'Unknown', // Default value
            fbrefUrl: matchData.matchUrl ? `https://fbref.com/teams/${matchData.awayTeam.toLowerCase().replace(/\s+/g, '-')}` : null
          },
          transaction
        });
        
        // 2. Buscar o crear la liga/competición
        const leagueName = matchData.competition || 'Unknown Competition';
        const [league] = await League.findOrCreate({
          where: { name: leagueName },
          defaults: {
            name: leagueName,
            country: 'Unknown',
            season: new Date().getFullYear().toString() // Current year as season
          },
          transaction
        });
        
        // 3. Crear fecha del partido
        const matchDate = new Date(matchData.date);
        
        // Ajustar la hora si está disponible
        if (matchData.matchTime) {
          const timeMatch = matchData.matchTime.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            const [_, hours, minutes] = timeMatch;
            matchDate.setHours(parseInt(hours, 10));
            matchDate.setMinutes(parseInt(minutes, 10));
          }
        }
        
        // 4. Buscar o crear el partido con relaciones
        const [match, created] = await Match.findOrCreate({
          where: {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            LeagueId: league.id,
            date: {
              [Op.between]: [
                new Date(matchDate.getTime() - 6 * 60 * 60 * 1000), // 6 hours before
                new Date(matchDate.getTime() + 6 * 60 * 60 * 1000)  // 6 hours after
              ]
            }
          },
          defaults: {
            date: matchDate,
            status: matchData.status,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            LeagueId: league.id,
            homeScore: matchData.homeScore,
            awayScore: matchData.awayScore,
            venue: matchData.venue,
            fbrefUrl: matchData.matchUrl
          },
          transaction
        });
        
        // 5. Si el partido ya existe pero tiene actualizaciones, actualizarlo
        if (!created && 
            (matchData.status !== match.status || 
             matchData.homeScore !== match.homeScore || 
             matchData.awayScore !== match.awayScore)) {
          
          await match.update({
            status: matchData.status,
            homeScore: matchData.homeScore,
            awayScore: matchData.awayScore,
            venue: matchData.venue || match.venue,
            fbrefUrl: matchData.matchUrl || match.fbrefUrl
          }, { transaction });
          
          console.log(`📊 Updated match: ${matchData.homeTeam} ${matchData.homeScore}-${matchData.awayScore} ${matchData.awayTeam}`);
        }
        
        if (created) {
          savedCount++;
          console.log(`➕ Added new match: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
        }
      }
      
      await transaction.commit();
      console.log(`✅ Successfully saved ${savedCount} new matches to database`);
      return savedCount;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error saving matches:', error);
    throw error;
  }
}

/**
 * Obtener partidos y guardarlos en la base de datos
 * @param {Date|string} [date] - Fecha opcional como objeto o string (YYYY-MM-DD)
 * @returns {Promise<{matches: Array, savedCount: number}>} Partidos obtenidos y cantidad guardada
 */
async function scrapeAndSaveMatches(date) {
  try {
    const matches = await scrapeFbrefMatches(date);
    let savedCount = 0;
    
    if (matches.length > 0) {
      savedCount = await saveMatchesToDatabase(matches);
    }
    
    return { matches, savedCount };
  } catch (error) {
    console.error('❌ Error in scrapeAndSaveMatches:', error);
    throw error;
  }
}

module.exports = { 
  scrapeFbrefMatches,
  saveMatchesToDatabase,
  scrapeAndSaveMatches
};