/**
 * Scheduler for automatic data updates
 */
const { scrapeAndSaveCompetitions } = require('../scrapers/CompsScraper');
const { scrapeAndSaveMatches } = require('../scrapers/MatchesScraper');
const { scrapeAndSavePlayers } = require('../scrapers/PlayerScraper');
const { scrapeAndSaveClubs } = require('../scrapers/TeamScraper');

// Update matches from FBref daily
async function updateMatches() {
  try {
    console.log('Starting scheduled match update from FBref...');
       
    // Get today's matches
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Scraping matches for today (${todayStr})...`);
    const todaySaved = await scrapeAndSaveMatches(todayStr);

    console.log(`Completed match updates. Saved ${todaySaved} new matches.`);
    
    return todaySaved;
  } catch (error) {
    console.error('Error in scheduled updateMatches:', error);
  }
}

// Create schedulers
async function startAllSchedulers() {
  // Run updates immediately on startup
  // updateMatches();
  // // Schedule daily updates - run at midnight
  // const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  // setInterval(updateMatches, ONE_DAY);
  // await scrapeAndSavePlayers();
  // await scrapeAndSaveClubs();
  // await scrapeAndSaveCompetitions()
  
  console.log('All match update schedulers started');
}

module.exports = {
  startAllSchedulers,
  updateMatches // Export for manual triggering
};