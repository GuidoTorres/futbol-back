const express = require('express');
const router = express.Router();

const teamRoutes = require('./teamRoutes');
const playerRoutes = require('./playerRoutes');
const leagueRoutes = require('./leagueRoutes');
const matchRoutes = require('./matchRoutes');
const eventRoutes = require('./eventRoutes');
const sofascoreRoutes = require('./sofascoreRoutes');
const scrapeGptRoutes = require('./scrapeGptRoutes');
const searchRoutes = require('./searchRoutes');
// API routes
router.use('/api/teams', teamRoutes);
router.use('/api/players', playerRoutes);
router.use('/api/leagues', leagueRoutes);
router.use('/api/matches', matchRoutes);
router.use('/api/events', eventRoutes);
router.use('/api/sofascore', sofascoreRoutes);
router.use('/api/gpt', scrapeGptRoutes);
router.use('/api/search', searchRoutes);

// Root route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Soccer API ',
    endpoints: {
      teams: '/api/teams',
      players: '/api/players',
      leagues: '/api/leagues',
      matches: '/api/matches',
      events: '/api/events',
      live: '/api/live/matches',
      fbref: {
        matchesToday: '/api/fbref/matches/today',
        matchesByDate: '/api/fbref/matches/2025-03-10',
        matchesByDateRange: '/api/fbref/matches/2025-03-01/2025-03-31',
        fetchMatchesToday: '/api/fbref/fetch/matches/today',
        fetchMatchesByDate: '/api/fbref/fetch/matches/2025-03-10'
      },
      sofascore: {
        today_matches: '/api/sofascore/matches/today',
        available_leagues: '/api/sofascore/leagues',
        league_seasons: '/api/sofascore/leagues/La Liga/seasons',
        league_matches: '/api/sofascore/leagues/La Liga/matches/2023',
        match_details: '/api/sofascore/matches/12345678'
      },
      scraper: {
        run_all: '/api/scraper/run-all',
        run_matches: '/api/scraper/run-matches?date=2025-03-06',
        run_teams: '/api/scraper/run-teams',
        run_competitions: '/api/scraper/run-competitions',
        run_players: '/api/scraper/run-players',
        search: '/api/scraper/search?query=teamName&type=[all|leagues|teams|players]',
        all_leagues: '/api/scraper/leagues',
        live_scores: '/api/scraper/live-scores',
        current_matches: '/api/scraper/matches/current',
        match_details: '/api/scraper/matches/:matchId',
        league_standings: '/api/scraper/leagues/:leagueId/standings?season=2023-2024',
        team_info: '/api/scraper/teams/:teamId?season=2023-2024',
        player_stats: '/api/scraper/players/:playerName',
        fixtures: '/api/scraper/fixtures/:entityId?type=[team|league]'
      },
      migration: {
        all: '/api/migration/all',
        live_matches: '/api/migration/live-matches',
        league_standings: '/api/migration/leagues/:leagueId/standings',
        team_info: '/api/migration/teams/:teamId',
        match_details: '/api/migration/matches/:matchId',
        fixtures: '/api/migration/fixtures/:entityId',
        player_stats: '/api/migration/players/:playerName'
      }
    },
    source: 'Data provided by fbref.com',
    version: '2.0.0'
  });
});

module.exports = router;