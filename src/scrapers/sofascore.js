const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Mapeo de competiciones (equivalente al 'comps' de Python)
const SOFASCORE_COMPETITIONS = {
  "Champions League": 7,
  "Europa League": 679,
  "Europa Conference League": 17015,
  "EPL": 17,
  "La Liga": 8,
  "Bundesliga": 35,
  "Serie A": 23,
  "Ligue 1": 34,
  "Turkish Super Lig": 52,
  "Argentina Liga Profesional": 155,
  "Argentina Copa de la Liga Profesional": 13475,
  "Liga 1 Peru": 406,
  "Copa Libertadores": 384,
  "MLS": 242,
  "Saudi Pro League": 955,
  "World Cup": 16,
  "Euros": 1,
  "Gold Cup": 140,
  "Women's World Cup": 290
};

// Configuración de Axios con headers y retries
const apiClient = axios.create({
  baseURL: 'https://api.sofascore.com/api/v1',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.sofascore.com/'
  }
});

// Función para manejar reintentos
async function fetchWithRetry(url, params = {}, retries = 3, delay = 1000) {
  try {
    const response = await apiClient.get(url, { params });
    return response.data;
  } catch (error) {
    if (retries > 0 && error.response?.status !== 404) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, params, retries - 1, delay * 1.5);
    }
    throw new Error(`API request failed: ${error.message}`);
  }
}

// 1. Obtener temporadas válidas para una competición
async function getValidSeasons(league) {
  if (!SOFASCORE_COMPETITIONS[league]) {
    throw new Error(`Invalid league: ${league}`);
  }
  
  const url = `/unique-tournament/${SOFASCORE_COMPETITIONS[league]}/seasons`;
  const data = await fetchWithRetry(url);
  
  return data.seasons.reduce((acc, season) => {
    acc[season.year] = season.id;
    return acc;
  }, {});
}

// 2. Obtener todos los partidos de una temporada
async function getMatchDicts(year, league) {
  const validSeasons = await getValidSeasons(league);
  if (!validSeasons[year]) {
    throw new Error(`Invalid year ${year} for league ${league}`);
  }

  let allMatches = [];
  let page = 0;
  
  while (true) {
    const url = `/unique-tournament/${SOFASCORE_COMPETITIONS[league]}/season/${validSeasons[year]}/events/last/${page}`;
    const data = await fetchWithRetry(url);
    
    if (!data.events || data.events.length === 0) break;
    
    allMatches = allMatches.concat(data.events);
    page++;
  }
  
  return allMatches;
}

// 3. Obtener ID de partido desde URL
function getMatchIdFromUrl(matchUrl) {
  const matchId = matchUrl.split('#id:').pop();
  return parseInt(matchId, 10);
}

// 4. Obtener URL de partido desde ID
function getMatchUrlFromId(matchId) {
  return `https://www.sofascore.com/event/${matchId}`;
}

// 5. Obtener datos básicos de un partido
async function getMatchDict(matchId) {
  const url = `/event/${matchId}`;
  const data = await fetchWithRetry(url);
  return data.event;
}

// 6. Obtener nombres de equipos de un partido
async function getTeamNames(matchId) {
  const matchData = await getMatchDict(matchId);
  return {
    homeTeam: matchData.homeTeam.name,
    awayTeam: matchData.awayTeam.name
  };
}

// 7. Obtener IDs de jugadores de un partido
async function getPlayerIds(matchId) {
  const url = `/event/${matchId}/lineups`;
  const data = await fetchWithRetry(url);
  
  const playerIds = {};
  ['home', 'away'].forEach(team => {
    data[team].players.forEach(player => {
      playerIds[player.player.name] = player.player.id;
    });
  });
  
  return playerIds;
}

// 8. Obtener estadísticas de jugadores en una liga
async function scrapePlayerLeagueStats(year, league, accumulation = 'total', selectedPositions = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards']) {
  const validSeasons = await getValidSeasons(league);
  if (!validSeasons[year]) throw new Error(`Invalid year ${year} for league ${league}`);
  
  const positionMap = {
    'Goalkeepers': 'G',
    'Defenders': 'D',
    'Midfielders': 'M',
    'Forwards': 'F'
  };
  
  const positions = selectedPositions.map(p => positionMap[p]).join('~');
  const fields = [
    'goals', 'yellowCards', 'redCards', 'groundDuelsWon', 'groundDuelsWonPercentage',
    'aerialDuelsWon', 'aerialDuelsWonPercentage', 'successfulDribbles',
    'successfulDribblesPercentage', 'tackles', 'assists', 'accuratePassesPercentage',
    'totalDuelsWon', 'totalDuelsWonPercentage', 'minutesPlayed', 'wasFouled', 'fouls',
    'dispossessed', 'possesionLost', 'appearances', 'started', 'saves', 'cleanSheets',
    'savedShotsFromInsideTheBox', 'savedShotsFromOutsideTheBox',
    'goalsConcededInsideTheBox', 'goalsConcededOutsideTheBox', 'highClaims',
    'successfulRunsOut', 'punches', 'runsOut', 'accurateFinalThirdPasses',
    'bigChancesCreated', 'accuratePasses', 'keyPasses', 'accurateCrosses',
    'accurateCrossesPercentage', 'accurateLongBalls', 'accurateLongBallsPercentage',
    'interceptions', 'clearances', 'dribbledPast', 'bigChancesMissed', 'totalShots',
    'shotsOnTarget', 'blockedShots', 'goalConversionPercentage', 'hitWoodwork', 'offsides',
    'expectedGoals', 'errorLeadToGoal', 'errorLeadToShot', 'passToAssist'
  ].join('%2C');

  const url = `/unique-tournament/${SOFASCORE_COMPETITIONS[league]}/season/${validSeasons[year]}/statistics`;
  const params = {
    limit: 100,
    offset: 0,
    accumulation,
    fields,
    filters: `position.in.${positions}`
  };

  let allResults = [];
  let currentPage = 0;
  let totalPages = 1;

  while (currentPage < totalPages) {
    params.offset = currentPage * 100;
    const data = await fetchWithRetry(url, params);
    
    allResults = allResults.concat(data.results);
    currentPage++;
    totalPages = data.pages;
  }

  return allResults.map(item => ({
    playerId: item.player.id,
    playerName: item.player.name,
    teamId: item.team.id,
    teamName: item.team.name,
    ...item.stats
  }));
}

// 9. Obtener momentum de partido
async function scrapeMatchMomentum(matchId) {
  const url = `/event/${matchId}/graph`;
  const data = await fetchWithRetry(url);
  return data.graphPoints || [];
}

// 10. Obtener estadísticas de equipos en un partido
async function scrapeTeamMatchStats(matchId) {
  const url = `/event/${matchId}/statistics`;
  const data = await fetchWithRetry(url);
  
  return data.statistics.flatMap(period => 
    period.groups.flatMap(group => 
      group.statisticsItems.map(stat => ({
        period: period.period,
        category: group.groupName,
        ...stat
      }))
    )
  );
}

// 11. Obtener estadísticas de jugadores en un partido
async function scrapePlayerMatchStats(matchId) {
  const lineupUrl = `/event/${matchId}/lineups`;
  const matchData = await getMatchDict(matchId);
  
  const data = await fetchWithRetry(lineupUrl);
  const players = [
    ...data.home.players.map(p => ({ ...p, team: matchData.homeTeam })),
    ...data.away.players.map(p => ({ ...p, team: matchData.awayTeam }))
  ];

  return players.map(player => ({
    playerId: player.player.id,
    playerName: player.player.name,
    teamId: player.team.id,
    teamName: player.team.name,
    position: player.position,
    ...player.stats
  }));
}

// 12. Obtener posiciones promedio de jugadores
async function scrapePlayerAveragePositions(matchId) {
  const url = `/event/${matchId}/average-positions`;
  const data = await fetchWithRetry(url);
  const { homeTeam, awayTeam } = await getTeamNames(matchId);

  return [
    ...(data.home || []).map(pos => ({
      team: homeTeam,
      playerName: pos.player.name,
      playerId: pos.player.id,
      averageX: pos.averageX,
      averageY: pos.averageY
    })),
    ...(data.away || []).map(pos => ({
      team: awayTeam,
      playerName: pos.player.name,
      playerId: pos.player.id,
      averageX: pos.averageX,
      averageY: pos.averageY
    }))
  ];
}

// 13. Obtener heatmaps de jugadores
async function scrapeHeatmaps(matchId) {
  const players = await getPlayerIds(matchId);
  const heatmaps = {};

  for (const [name, id] of Object.entries(players)) {
    const url = `/event/${matchId}/player/${id}/heatmap`;
    const data = await fetchWithRetry(url);
    heatmaps[name] = data.heatmap || [];
  }

  return heatmaps;
}

// 14. Obtener tiros de un partido
async function scrapeMatchShots(matchId) {
  const url = `/event/${matchId}/shotmap`;
  const data = await fetchWithRetry(url);
  return data.shotmap || [];
}

// Ejemplo de uso:
async function main() {
  try {
    // Obtener temporadas de La Liga
    const seasons = await getValidSeasons("La Liga");
    console.log("Temporadas disponibles:", seasons);

    // Obtener partidos de la temporada 2023/24
    const matches = await getMatchDicts("2023", "La Liga");
    console.log("Partidos encontrados:", matches.length);

    // Obtener stats de jugadores en La Liga 2023
    const playerStats = await scrapePlayerLeagueStats("2023", "La Liga");
    console.log("Estadísticas de jugadores:", playerStats);

  } catch (error) {
    console.error("Error:", error);
  }
}

main();