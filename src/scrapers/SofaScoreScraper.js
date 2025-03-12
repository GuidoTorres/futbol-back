const axios = require('axios');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Match = require('../models/Match');
const Team = require('../models/Team');

// Headers para evitar bloqueos
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.sofascore.com/'
};

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    return response.data;
  } catch (error) {
    if (retries > 0 && error.response?.status !== 404) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    throw new Error(`API request failed: ${error.message}`);
  }
}

async function scrapeTodayMatches() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${today}`;
  
  try {
    const data = await fetchWithRetry(url);
    console.log('====================================');
    console.log(data);
    console.log('====================================');
    const matches = data.events.map(event => ({
      homeTeam: event.homeTeam?.name || 'Unknown',
      awayTeam: event.awayTeam?.name || 'Unknown',
      homeScore: event.homeScore?.current || null,
      awayScore: event.awayScore?.current || null,
      matchTime: event.status?.description || 'N/A',
      competition: event.tournament?.name || 'Unknown Competition',
      venue: event.venue?.name || 'N/A',
      status: event.status?.type || 'SCHEDULED',
      fbrefUrl: event.url || null
    }));
    
    console.log(`✅ Scraped ${matches.length} matches for ${today}`);
    return matches;
  } catch (error) {
    console.error('❌ Error scraping today matches:', error);
    throw error;
  }
}

async function saveMatchesToDatabase(matches) {
  let savedCount = 0;
  
  try {
    
    for (const matchData of matches) {
      // Validar datos críticos
      if (!matchData.homeTeam || !matchData.awayTeam) continue;

      // Crear/obtener equipos
      const [homeTeam] = await Team.findOrCreate({
        where: { name: matchData.homeTeam },
        defaults: { country: 'Unknown' },
        
      });

      const [awayTeam] = await Team.findOrCreate({
        where: { name: matchData.awayTeam },
        defaults: { country: 'Unknown' },

      });

      // Crear/obtener partido
      const [match, created] = await Match.findOrCreate({
        where: { 
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          date: new Date(`${matchData.matchDate}T${matchData.matchTime}`)
        },
        defaults: {
          homeScore: matchData.homeScore,
          awayScore: matchData.awayScore,
          venue: matchData.venue,
          status: matchData.status,
          fbrefUrl: matchData.fbrefUrl
        },
      });

      savedCount += created ? 1 : 0;
    }

    return savedCount;
  } catch (error) {
    throw error;
  }
}

async function scrapeAndSaveTodayMatches() {
  try {
    const matches = await scrapeTodayMatches();
    return await saveMatchesToDatabase(matches);
  } catch (error) {
    console.error('❌ Global error in scrapeAndSaveTodayMatches:', error);
    throw error;
  }
}

module.exports = { scrapeAndSaveTodayMatches };