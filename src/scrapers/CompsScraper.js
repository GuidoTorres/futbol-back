const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sequelize = require('../config/database');
const Competition = require('../models/Competition');

// Headers compartidos
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.5',
  'Referer': 'https://fbref.com/'
};

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

async function scrapeCompetitions() {
  const url = 'https://fbref.com/es/comps/';
  console.log(`🔍 Scraping competitions from: ${url}`);
  
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    const competitions = [];

    // Iterar por cada competición
    $('div[id^="sched_"]').each((_, comp) => {
      const caption = $(comp).find('caption').text().trim();
      const region = caption.split(' - ')[0];
      const competitionName = caption.split(' - ')[1]?.split(' Table')[0] || 'Unknown';

      // Iterar por cada liga en la tabla
      $(comp).find('table.stats_table tbody tr').each((_, row) => {
        try {
          const leagueName = $(row).find('td[data-stat="league_name"] a').text().trim();
          const leagueUrl = $(row).find('td[data-stat="league_name"] a').attr('href');
          const country = $(row).find('td[data-stat="country"]').text().trim();
          const numTeams = parseInt($(row).find('td[data-stat="num_of_teams"]').text().trim(), 10);
          const currentSeason = $(row).find('td[data-stat="season"] span.current').length > 0;

          if (!leagueName || !leagueUrl) return;

          competitions.push({
            name: leagueName,
            region: region,
            country: country || 'Unknown',
            numTeams: isNaN(numTeams) ? null : numTeams,
            currentSeason: !!currentSeason,
            fbrefUrl: `https://fbref.com${leagueUrl}`,
            fbrefId: leagueUrl.split('/').filter(p => /^\d+$/.test(p))[0]
          });
        } catch (error) {
          console.error('Error parsing competition row:', error);
        }
      });
    });

    console.log(`✅ Scraped ${competitions.length} competitions`);
    return competitions;
  } catch (error) {
    console.error('❌ Error during competition scraping:', error);
    throw error;
  }
}

async function saveCompetitionsToDatabase(competitions) {
  let savedCount = 0;
  
  console.log(`💾 Saving ${competitions.length} competitions to database...`);
  
  try {
    const transaction = await sequelize.transaction();
    
    try {
      for (const comp of competitions) {
        if (!comp.name || !comp.fbrefUrl) {
          console.warn('Skipping invalid competition:', comp);
          continue;
        }

        const [competition, created] = await Competition.findOrCreate({
          where: { fbrefId: comp.fbrefId },
          defaults: {
            name: comp.name,
            region: comp.region,
            country: comp.country,
            numTeams: comp.numTeams,
            currentSeason: comp.currentSeason,
            fbrefUrl: comp.fbrefUrl
          },
          transaction
        });

        if (!created) {
          await competition.update({
            currentSeason: comp.currentSeason,
            numTeams: comp.numTeams
          }, { transaction });
        }

        savedCount += created ? 1 : 0;
      }

      await transaction.commit();
      console.log(`✅ Successfully saved ${savedCount} new competitions`);
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

async function scrapeAndSaveCompetitions() {
  try {
    const competitions = await scrapeCompetitions();
    return await saveCompetitionsToDatabase(competitions);
  } catch (error) {
    console.error('❌ Error in scrapeAndSaveCompetitions:', error);
    throw error;
  }
}

module.exports = {
  scrapeCompetitions,
  saveCompetitionsToDatabase,
  scrapeAndSaveCompetitions
};