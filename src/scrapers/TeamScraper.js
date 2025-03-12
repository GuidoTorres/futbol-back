const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sequelize = require('../config/database');
const Team = require('../models/Team');
const League = require('../models/League');
const Competition = require('../models/Competition');

// Headers compartidos
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.5',
  'Referer': 'https://fbref.com/'
};

/**
 * Función para hacer solicitudes HTTP con reintentos
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const content = await page.content();
    await browser.close();
    return content;
  } catch (error) {
    if (retries > 0 && error.response?.status !== 404) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

/**
 * Extrae información de clubes de FBref
 */
async function scrapeClubs() {
  const url = 'https://fbref.com/es/equipos/';
  console.log(`🔍 Scraping clubs from: ${url}`);
  
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    const clubs = [];

    // Iterar por cada competición
    $('div.table_container').each((_, comp) => {
      const competition = $(comp).find('caption').text().split(' - ')[0].trim();
      
      // Iterar por cada equipo
      $(comp).find('table.stats_table tbody tr').each((_, row) => {
        try {
          const teamName = $(row).find('td[data-stat="team_name"] a').text().trim();
          const teamUrl = $(row).find('td[data-stat="team_name"] a').attr('href') || '';
          const country = $(row).find('td[data-stat="country"]').text().trim();
          const venue = $(row).find('td[data-stat="venue"]').text().trim();
          
          if (!teamName || !teamUrl) return;

          clubs.push({
            name: teamName,
            fbrefUrl: `https://fbref.com${teamUrl}`,
            country: country || 'Unknown',
            venue: venue || 'N/A',
            competition: competition || 'Unknown Competition'
          });
        } catch (error) {
          console.error('Error parsing club:', error);
        }
      });
    });

    console.log(`✅ Scraped ${clubs.length} clubs`);
    return clubs;
  } catch (error) {
    console.error('❌ Error during club scraping:', error);
    throw error;
  }
}

/**
 * Guarda clubes en la base de datos
 */
async function saveClubsToDatabase(clubs) {
  let savedCount = 0;
  
  console.log(`💾 Saving ${clubs.length} clubs to database...`);
  
  try {
    const transaction = await sequelize.transaction();
    
    try {
      // Cargar ligas existentes
      const existingLeagues = await League.findAll({ transaction });
      const existingCompetitions = await Competition.findAll({ transaction });

      for (const clubData of clubs) {
        if (!clubData.name || !clubData.fbrefUrl) {
          console.warn('Skipping invalid club:', clubData);
          continue;
        }

        // Buscar/Añadir competición
        let leagueId = null;
        const compName = clubData.competition;
        
        if (compName) {
          const existingLeague = existingLeagues.find(l => l.name === compName);
          if (existingLeague) {
            leagueId = existingLeague.id;
          } else {
            const [newComp] = await Competition.findOrCreate({
              where: { name: compName },
              defaults: {
                name: compName,
                country: clubData.country,
                season: new Date().getFullYear().toString()
              },
              transaction
            });
            leagueId = newComp.id;
          }
        }

        // Crear/Actualizar equipo
        const [team, created] = await Team.findOrCreate({
          where: { name: clubData.name },
          defaults: {
            country: clubData.country,
            fbrefUrl: clubData.fbrefUrl,
            stadium: clubData.venue,
            LeagueId: leagueId
          },
          transaction
        });

        if (!created) {
          await team.update({
            country: clubData.country,
            stadium: clubData.venue,
            LeagueId: leagueId
          }, { transaction });
        }

        savedCount += created ? 1 : 0;
      }

      await transaction.commit();
      console.log(`✅ Successfully saved ${savedCount} new clubs`);
      return savedCount;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
}

/**
 * Función principal para scrapear y guardar clubes
 */
async function scrapeAndSaveClubs() {
  try {
    const clubs = await scrapeClubs();
    return await saveClubsToDatabase(clubs);
  } catch (error) {
    console.error('❌ Error in scrapeAndSaveClubs:', error);
    throw error;
  }
}

module.exports = {
  scrapeClubs,
  saveClubsToDatabase,
  scrapeAndSaveClubs
};