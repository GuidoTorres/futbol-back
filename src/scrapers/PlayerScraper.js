const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sequelize = require('../config/database');
const Player = require('../models/Player');

// Headers compartidos
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.5',
  'Referer': 'https://fbref.com/'
};

/**
 * Realiza solicitudes HTTP con reintentos
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
 * Extrae información de jugadores de FBref
 */
async function scrapePlayers() {
  const url = 'https://fbref.com/es/jugadores/';
  console.log(`🔍 Scraping players from: ${url}`);
  
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    const players = [];

    // Iterar por cada letra del índice
    $('.section_heading').each((_, section) => {
      const letter = $(section).text().trim().charAt(0);
      
      // Iterar por cada jugador en la sección
      $(section).next('table').find('tbody tr').each((_, row) => {
        try {
          const playerName = $(row).find('td[data-stat="player"] a').text().trim();
          const playerUrl = $(row).find('td[data-stat="player"] a').attr('href');
          const playerId = playerUrl?.split('/').pop().split('.')[0] || null;
          const nationality = $(row).find('td[data-stat="nationality"]').text().trim();
          const position = $(row).find('td[data-stat="position"]').text().trim();
          const team = $(row).find('td[data-stat="team"] a').text().trim();
          
          if (playerName && playerId) {
            players.push({
              id: playerId,
              name: playerName,
              nationality: nationality || 'Unknown',
              position: position || 'N/A',
              team: team || 'Free Agent',
              fbrefUrl: `https://fbref.com${playerUrl}`
            });
          }
        } catch (error) {
          console.error('Error parsing player row:', error);
        }
      });
    });

    console.log(`✅ Scraped ${players.length} players`);
    return players;
  } catch (error) {
    console.error('❌ Error during player scraping:', error);
    throw error;
  }
}

/**
 * Guarda jugadores en la base de datos
 */
async function savePlayersToDatabase(players) {
  let savedCount = 0;
  
  console.log(`💾 Saving ${players.length} players to database...`);
  
  try {
    const transaction = await sequelize.transaction();
    
    try {
      for (const playerData of players) {
        // Validar datos esenciales
        if (!playerData.id || !playerData.name) {
          console.warn('Skipping invalid player:', playerData);
          continue;
        }

        // Crear/actualizar jugador
        const [player, created] = await Player.findOrCreate({
          where: { id: playerData.id },
          defaults: {
            name: playerData.name,
            nationality: playerData.nationality,
            position: playerData.position,
            currentTeam: playerData.team,
            fbrefUrl: playerData.fbrefUrl
          },
          transaction
        });

        // Actualizar datos existentes
        if (!created) {
          await player.update({
            nationality: playerData.nationality,
            position: playerData.position,
            currentTeam: playerData.team,
            fbrefUrl: playerData.fbrefUrl
          }, { transaction });
        }

        savedCount += created ? 1 : 0;
      }

      await transaction.commit();
      console.log(`✅ Successfully saved ${savedCount} players`);
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
 * Función principal para scrapear y guardar jugadores
 */
async function scrapeAndSavePlayers() {
  try {
    const players = await scrapePlayers();
    return await savePlayersToDatabase(players);
  } catch (error) {
    console.error('❌ Error in scrapeAndSavePlayers:', error);
    throw error;
  }
}

module.exports = {
  scrapePlayers,
  savePlayersToDatabase,
  scrapeAndSavePlayers
};