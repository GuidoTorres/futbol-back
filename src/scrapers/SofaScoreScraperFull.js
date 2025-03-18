// SofaScoreScraperFull.js

const axios = require("axios");
const puppeteer = require("puppeteer");
const dayjs = require('dayjs');



const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Accept: "application/json",
  Connection: "keep-alive",
};

// Función genérica para hacer solicitudes HTTP con reintentos
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await axios.get(url, { headers: headers, timeout: 15000 });
    // Espera un retardo aleatorio para evitar patrones
    const randomDelay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, randomDelay));
    return response.data;
  } catch (error) {
    if (retries > 0 && error.response?.status !== 404) {
      console.log(`Retrying (${4 - retries}/3) for ${url}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    throw new Error(`API request failed for ${url}: ${error.message}`);
  }
}

async function getTeamTournaments(teamId) {
  const url = `https://api.sofascore.com/api/v1/team/${teamId}/unique-tournaments`;
  try {
    const data = await fetchWithRetry(url);
    if (data && data.uniqueTournaments) {
      return data.uniqueTournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        country: tournament.country?.name || null,
        slug: tournament.slug,
        logo: tournament.id
          ? `https://api.sofascore.app/api/v1/unique-tournament/${tournament.id}/image`
          : null,
      }));
    }
    return [];
  } catch (error) {
    console.error(
      `Error fetching tournaments for team ${teamId}: ${error.message}`
    );
    return [];
  }
}

// Función genérica para hacer scraping con Puppeteer
async function scrapeWithPuppeteer(url, evaluateFn) {
  console.log(`Scraping with Puppeteer: ${url}`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS["User-Agent"]);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("body", { timeout: 10000 });
    const data = await page.evaluate(evaluateFn);
    return data;
  } catch (error) {
    console.error(`Error scraping with Puppeteer: ${url}`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Función que, dado un teamId (sofaScoreId), retorna un objeto completo con la data del equipo,
// la liga (si existe) y la lista de jugadores (cada uno con sus transferencias)
// En SofaScoreScraperFull.js
async function scrapeCompleteTeamData(teamId) {
  const teamUrl = `https://api.sofascore.com/api/v1/team/${teamId}`;
  let teamData,
    leagueData = null,
    standings = [],
    topScorers = [],
    teamStats = {},
    seasonId = null;

  try {
    const data = await fetchWithRetry(teamUrl);
    if (data && data.team) {
      teamData = {
        id: data.team.id,
        name: data.team.name,
        shortName: data.team.shortName,
        logo: data.team.imageUrls?.original || "",
        venue: data.team.stadium?.name || "Unknown Stadium",
        country: data.team.country?.name || "Unknown",
        leagueId: data.team?.primaryUniqueTournament?.id || null,
      };
    }
  } catch (error) {
    console.error(`Error fetching team data for ${teamId}: ${error.message}`);
    teamData = await scrapeWithPuppeteer(
      `https://www.sofascore.com/team/${teamId}`,
      () => {
        const name = document.querySelector("h1")?.textContent || "Unknown";
        return {
          id: teamId,
          name,
          shortName: "",
          logo: "",
          venue: "Unknown Stadium",
          country: "Unknown",
          leagueId: null,
        };
      }
    );
  }

  if (teamData.leagueId) {
    try {
      const leagueRes = await fetchWithRetry(
        `https://api.sofascore.com/api/v1/unique-tournament/${teamData.leagueId}`
      );
      if (leagueRes && leagueRes.uniqueTournament) {
        leagueData = {
          id: leagueRes.uniqueTournament.id,
          name: leagueRes.uniqueTournament.name,
          logo: leagueRes.uniqueTournament?.logo?.id
            ? `https://api.sofascore.app/api/v1/unique-tournament/${leagueRes.uniqueTournament.id}/image`
            : null,
          country: leagueRes?.uniqueTournament?.category?.name || "Desconocido",
        };
      }
    } catch (error) {
      console.error(`Error fetching league data: ${error.message}`);
    }

    try {
      seasonId = await getCurrentSeasonId(teamData.leagueId);
    } catch (error) {
      console.error(`Error fetching current season ID: ${error.message}`);
    }

    // Estadísticas del equipo usando endpoint correcto
    if (seasonId) {
      try {
        teamStats = await getTeamStats(teamId, teamData.leagueId, seasonId);
      } catch (error) {
        console.error(`Error fetching team stats: ${error.message}`);
      }
    }

    standings = await getStandings(teamData.leagueId, seasonId);
    topScorers = await getTopScorers(teamData.leagueId, seasonId);
  }

  const players = await getTeamPlayers(teamId);
  for (let player of players) {
    player.transfers = await getTransfers(player.id);
    player.stats = await getPlayerStats(player.id);
  }

  return {
    team: teamData,
    league: leagueData,
    teamStats: teamStats,
    standings: standings,
    topScorers: topScorers,
    players: players,
    seasonId: seasonId, // Retorna claramente el seasonId
  };
}

function convertTimestamp(ts) {
  return ts ? new Date(ts * 1000).toISOString().split("T")[0] : null;
}

function calculateAge(ts) {
  return ts
    ? Math.floor((Date.now() - ts * 1000) / (365.25 * 24 * 3600 * 1000))
    : null;
}

function getPositionCategory(position) {
  switch (position) {
    case "G":
      return "Goalkeeper";
    case "D":
      return "Defender";
    case "M":
      return "Midfielder";
    case "F":
      return "Forward";
    default:
      return null;
  }
}

// Función actualizada para obtener la lista completa de jugadores con campos adicionales
async function getTeamPlayers(teamId) {
  try {
    const playersUrl = `https://api.sofascore.com/api/v1/team/${teamId}/players`;
    const data = await fetchWithRetry(playersUrl);

    console.log(`Total players fetched: ${data.players.length}`);

    return data.players.map((item, index) => {
      const p = item.player;

      // Log detallado para debug
      console.log(
        `Procesando jugador ${index + 1}: id=${p.id}, name=${p.name}`
      );

      // Manejo seguro de campos potencialmente problemáticos
      let birthDate = null;
      try {
        birthDate = p.dateOfBirthTimestamp
          ? convertTimestamp(p.dateOfBirthTimestamp)
          : null;
      } catch (e) {
        console.warn(`Problema en birthDate para jugador ${p.id}`);
      }

      let contractUntil = null;
      try {
        contractUntil = p.contractUntilTimestamp
          ? convertTimestamp(p.contractUntilTimestamp)
          : null;
      } catch (e) {
        console.warn(`Problema en contractUntil para jugador ${p.id}`);
      }

      let age = null;
      try {
        age = p.dateOfBirthTimestamp
          ? calculateAge(p.dateOfBirthTimestamp)
          : null;
      } catch (e) {
        console.warn(`Problema en age para jugador ${p.id}`);
      }

      let marketValue = null;
      try {
        marketValue =
          p.proposedMarketValue && p.proposedMarketValueRaw
            ? `${p.proposedMarketValue} ${p.proposedMarketValueRaw.currency}`
            : null;
      } catch (e) {
        console.warn(`Problema en marketValue para jugador ${p.id}`);
      }

      return {
        id: p.id?.toString() || "null",
        name:
          p.name ||
          `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
          "Sin nombre",
        fullName: p.fullName || p.name || "Sin fullName",
        shortName: p.shortName || null,
        position: p.position || "N/A",
        positionCategory: getPositionCategory(p.position),
        nationality: p.country?.name || null,
        birthDate,
        age,
        height: p.height || null,
        weight: p.weight || null,
        foot: p.preferredFoot || null,
        shirtNumber: p.jerseyNumber || p.shirtNumber || null,
        slug: p.slug || null,
        photo: p.id
          ? `https://api.sofascore.app/api/v1/player/${p.id}/image`
          : "",
        marketValue,
        contractUntil,
        fbrefId: null,
        fbrefUrl: null,
        sofaScoreId: p.id?.toString() || "null",
        sofaScoreUrl: p.slug
          ? `https://www.sofascore.com/player/${p.id}/${p.slug}`
          : null,
      };
    });
  } catch (error) {
    console.error(
      `Error in getTeamPlayers for team ${teamId}: ${error.message}`
    );
    return [];
  }
}

// Función actualizada para obtener los datos completos de un jugador individual
async function getPlayerById(playerId) {
  const url = `https://api.sofascore.com/api/v1/player/${playerId}`;
  try {
    const data = await fetchWithRetry(url);

    console.log(
      `Respuesta cruda de jugadores para el equipo ${teamId}: ${data.players.length}`
    );

    if (data && data.player) {
      console.log(
        `Número de jugadores en data.players para el equipo ${teamId}: ${data.players.length}`
      );

      const p = data.player;
      return {
        id: p.id.toString(),
        name: p.name,
        fullName:
          p.fullName || `${p.firstName || p.name} ${p.lastName || ""}`.trim(),
        shortName: p.shortName || null,
        position: p.position || "N/A",
        positionCategory: getPositionCategory(p.position),
        nationality: p.country?.name || null,
        birthDate: convertTimestamp(p.dateOfBirthTimestamp),
        age: calculateAge(p.dateOfBirthTimestamp),
        height: p.height || null,
        weight: p.weight || null,
        foot: p.preferredFoot || null,
        shirtNumber: p.jerseyNumber || p.shirtNumber || null,
        slug: p.slug || null,
        photo: p.id
          ? `https://api.sofascore.app/api/v1/player/${p.id}/image`
          : "",
        marketValue:
          p.proposedMarketValue && p.proposedMarketValueRaw
            ? `${p.proposedMarketValue} ${p.proposedMarketValueRaw.currency}`
            : null,
        contractUntil: convertTimestamp(p.contractUntilTimestamp),
        fbrefId: null,
        fbrefUrl: null,
        sofaScoreId: p.id.toString(),
        sofaScoreUrl: p.slug
          ? `https://www.sofascore.com/player/${p.id}/${p.slug}`
          : null,
      };
    }
    throw new Error("Player data missing");
  } catch (error) {
    console.error(
      `Error in getPlayerById for player ${playerId}: ${error.message}`
    );
    return {};
  }
}

// Función para obtener el historial de transferencias de un jugador
async function getTransfers(playerId) {
    const url = `https://www.sofascore.com/api/v1/player/${playerId}/transfer-history`;
    try {
      const data = await fetchWithRetry(url);
      if (data && data.transferHistory) {
        return data.transferHistory.map((t) => {
          const transferDate = t.transferDateTimestamp
            ? new Date(t.transferDateTimestamp * 1000).toISOString().split("T")[0]
            : null;
          const typeStr = String(t.type);
          const fee = t.transferFeeDescription || "";
          const currency =
            t.transferFeeRaw && t.transferFeeRaw.currency
              ? t.transferFeeRaw.currency
              : null;
          const season = null;
  
          // Extraemos directamente los id de los objetos transferFrom y transferTo
          const fromTeamId = t.transferFrom && t.transferFrom.id ? t.transferFrom.id : null;
          const toTeamId = t.transferTo && t.transferTo.id ? t.transferTo.id : null;
  
          return {
            transferDate,
            type: typeStr,
            fee,
            currency,
            season,
            sofaScoreId: String(t.id),
            fromTeamId,
            toTeamId,
          };
        });
      }
      return [];
    } catch (error) {
      if (error.message.includes("404")) {
        console.warn(`No se encontró historial de transfer-history para el jugador ${playerId}.`);
        return [];
      }
      console.error(`Error en getTransfers para el jugador ${playerId}: ${error.message}`);
      return [];
    }
  }
  

// Obtiene todas las temporadas del torneo (uniqueTournamentId)
async function getCurrentSeasonId(uniqueTournamentId) {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournamentId}/seasons`;
  const seasonsData = await fetchWithRetry(url);

  if (seasonsData && seasonsData.seasons) {
    return seasonsData.seasons[0].id;
  }
  throw new Error("Current season not found");
}

// Función para obtener estadísticas de un equipo
async function getTeamStats(teamId, uniqueTournamentId, seasonId) {
  const url = `https://api.sofascore.com/api/v1/team/${teamId}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/statistics/overall`;
  try {
    const data = await fetchWithRetry(url);
    if (data && data.statistics) {
      return {
        position: data.statistics.position || null,
        played: data.statistics.matches || 0,
        won: data.statistics.wins || 0,
        drawn: data.statistics.draws || 0,
        lost: data.statistics.losses || 0,
        goalsScored: data.statistics.goalsScored || 0,
        goalsConceded: data.statistics.goalsConceded || 0,
        goalDifference: data.statistics.goalDifference || 0,
        points: data.statistics.points || 0,
        homeWon: data.statistics.homeWins || 0,
        homeDrawn: data.statistics.homeDraws || 0,
        homeLost: data.statistics.homeLosses || 0,
        awayWon: data.statistics.awayWins || 0,
        awayDrawn: data.statistics.awayDraws || 0,
        awayLost: data.statistics.awayLosses || 0,
      };
    }
    return {};
  } catch (error) {
    console.error(
      `Error fetching team stats for team ${teamId}: ${error.message}`
    );
    return {};
  }
}

// Función para obtener estadísticas de un jugador
async function getPlayerStats(playerId) {
    const url = `https://api.sofascore.com/api/v1/player/${playerId}/statistics`;
    try {
      const data = await fetchWithRetry(url);
      let seasons = data.seasons || [];
      
      // Usamos dayjs para calcular la temporada actual.
      // Para ligas europeas: si estamos en julio o posterior, la temporada es "YY/(YY+1)",
      // y si estamos antes de julio, la temporada es "(YY-1)/YY".
      const currentMonth = dayjs().month() + 1; // dayjs().month() devuelve 0-11.
      const currentYear = dayjs().year();
      let currentSeasonEuropean;
      if (currentMonth >= 7) {
        currentSeasonEuropean = `${String(currentYear % 100).padStart(2, '0')}/${String((currentYear + 1) % 100).padStart(2, '0')}`;
      } else {
        currentSeasonEuropean = `${String((currentYear - 1) % 100).padStart(2, '0')}/${String(currentYear % 100).padStart(2, '0')}`;
      }
      const currentSeasonYear = currentYear.toString();
  
      // Filtramos para obtener solo el objeto de la temporada actual:
      // - Si el campo "year" incluye '/', asumimos formato europeo y lo comparamos con currentSeasonEuropean.
      // - Sino, lo comparamos con el año completo (currentSeasonYear).
      const currentSeason = seasons.find(season => {
        if (season.year && season.year.includes('/')) {
          return season.year === currentSeasonEuropean;
        }
        return season.year === currentSeasonYear;
      });
      
      return currentSeason || {};
    } catch (error) {
      console.error(`Error in getPlayerStats for player ${playerId}: ${error.message}`);
      return {};
    }
  }
  

// Función para obtener detalles de una liga (incluye logo, nombre, etc.)
async function getLeagueDetails(leagueId) {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${leagueId}`;
  try {
    const data = await fetchWithRetry(url);
    if (data && data.uniqueTournament) {
      return {
        id: data.uniqueTournament.id,
        name: data.uniqueTournament.name,
        logo: data.uniqueTournament.hasLogo
          ? `https://api.sofascore.app/api/v1/unique-tournament/${data.uniqueTournament.id}/image`
          : null,
        country: data?.uniqueTournament?.category?.name || "Desconocido",
      };
    }
    throw new Error("League data missing");
  } catch (error) {
    console.error(
      `Error in getLeagueDetails for league ${leagueId}: ${error.message}`
    );
    return null;
  }
}

// Función para obtener la tabla de posiciones (standings) de una liga
async function getStandings(leagueId, seasonId) {
  const url = `https://www.sofascore.com/api/v1/unique-tournament/${leagueId}/season/${seasonId}/standings/home
`;
  try {
    const data = await fetchWithRetry(url);
    return data.standings || [];
  } catch (error) {
    console.error(
      `Error in getStandings for league ${leagueId}: ${error.message}`
    );
    return [];
  }
}

// Función para obtener los máximos goleadores (top scorers) de una liga
async function getTopScorers(leagueId, seasonId) {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${leagueId}/season/${seasonId}/top-players/overall`;
  try {
    const data = await fetchWithRetry(url);
    return data.topScorers || [];
  } catch (error) {
    console.error(
      `Error in getTopScorers for league ${leagueId}: ${error.message}`
    );
    return [];
  }
}

module.exports = {
  fetchWithRetry,
  scrapeWithPuppeteer,
  scrapeCompleteTeamData,
  getTeamPlayers,
  getPlayerById,
  getTransfers,
  getTeamStats,
  getPlayerStats,
  getLeagueDetails,
  getStandings,
  getTopScorers,
};
