const axios = require("axios");
const puppeteer = require("puppeteer");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Player = require("../models/Player");
const { getTodayMatches } = require("../controllers/SofaScoreController");
// Headers para evitar bloqueos
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.sofascore.com/",
};



/**
 * Busca jugadores por nombre
 * @param {string} query - Texto para buscar jugadores
 * @returns {Promise<Array>} - Lista de jugadores encontrados
 */
async function searchPlayersByName(query) {
  try {
    if (!query || query.length < 3) {
      throw new Error("La búsqueda debe tener al menos 3 caracteres");
    }

    // URL de búsqueda de la API
    const searchUrl = `https://api.sofascore.com/api/v1/search/players/${encodeURIComponent(
      query
    )}`;

    const data = await this.fetchWithRetry(searchUrl);

    if (!data || !data.players) {
      console.warn("⚠️ API de búsqueda no devolvió resultados esperados");
      return [];
    }

    // Procesar resultados
    const players = data.players.map((player) => ({
      id: player.id.toString(),
      name: player.name,
      position: player.position || "N/A",
      team: player.team?.name || "Unknown",
      teamId: player.team?.id || null,
      country: player.country?.name || "Unknown",
      countryId: player.country?.id || null,
      countryCode: player.country?.alpha2 || null,
      dateOfBirth: player.dateOfBirthTimestamp
        ? new Date(player.dateOfBirthTimestamp * 1000)
            .toISOString()
            .split("T")[0]
        : null,
      height: player.height || null,
      slug: player.slug || null,
      photo: `https://api.sofascore.app/api/v1/player/${player.id}/image`,
      sofaScoreUrl: `https://www.sofascore.com/player/${player.id}/${
        player.slug || player.name.toLowerCase().replace(/\s+/g, "-")
      }`,
    }));

    console.log(
      `✅ Encontrados ${players.length} jugadores para la búsqueda "${query}"`
    );
    return players;
  } catch (error) {
    console.error(`❌ Error en búsqueda de jugadores para "${query}":`, error);

    // Intentar con Puppeteer como alternativa
    return this.searchPlayersWithPuppeteer(query);
  }
}

/**
 * Busca jugadores con Puppeteer (alternativa)
 * @param {string} query - Texto de búsqueda
 * @returns {Promise<Array>} - Lista de jugadores
 */
async function searchPlayersWithPuppeteer(query) {
  console.log(`🤖 Buscando jugadores con Puppeteer para "${query}"...`);

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(this.HEADERS["User-Agent"]);

    // Navegar a la página de búsqueda
    await page.goto(
      `https://www.sofascore.com/search/${encodeURIComponent(query)}`,
      {
        waitUntil: "networkidle2",
        timeout: 30000,
      }
    );

    // Hacer clic en pestaña de jugadores si existe
    try {
      await page.waitForSelector('[data-tabid="player"]', { timeout: 5000 });
      await page.click('[data-tabid="player"]');
      await page.waitForTimeout(2000); // Esperar que cargue
    } catch (e) {
      console.log("Pestaña de jugadores no encontrada, continuando...");
    }

    // Extraer datos de jugadores
    const players = await page.evaluate(() => {
      const playerElements = document.querySelectorAll(".sc-hLseeU");
      return Array.from(playerElements)
        .map((el) => {
          try {
            const name = el.querySelector("h4")?.textContent || "Unknown";
            const details = el.querySelectorAll("p");
            const team = details[0]?.textContent || "Unknown";
            const position = details[1]?.textContent || "N/A";
            const playerUrl = el.closest("a")?.href || null;

            // Extraer ID del jugador de la URL
            const idMatch = playerUrl?.match(/\/player\/(\d+)/) || [];
            const id = idMatch[1] || null;

            return {
              id,
              name,
              team,
              position,
              sofaScoreUrl: playerUrl,
            };
          } catch (error) {
            console.error("Error extrayendo datos de jugador:", error);
            return null;
          }
        })
        .filter((player) => player !== null && player.id);
    });

    await browser.close();
    console.log(
      `✅ Encontrados ${players.length} jugadores con Puppeteer para "${query}"`
    );
    return players;
  } catch (error) {
    console.error("❌ Error en búsqueda con Puppeteer:", error);
    return [];
  }
}

/**
 * Obtiene todos los jugadores de un equipo
 * @param {string} teamId - ID del equipo en SofaScore
 * @returns {Promise<Array>} - Lista de jugadores del equipo
 */
async function getTeamPlayers(teamId) {
  try {
    if (!teamId) {
      throw new Error("Se requiere ID del equipo");
    }

    // Primero obtenemos información del equipo
    let teamData = null;
    try {
      const teamUrl = `https://api.sofascore.com/api/v1/team/${teamId}`;
      const teamResponse = await this.fetchWithRetry(teamUrl);
      if (teamResponse && teamResponse.team) {
        teamData = teamResponse.team;
      }
    } catch (error) {
      console.warn(
        `⚠️ No se pudo obtener información del equipo ${teamId}:`,
        error.message
      );
    }

    // URL de la API para obtener jugadores del equipo
    const url = `https://api.sofascore.com/api/v1/team/${teamId}/players`;

    const data = await this.fetchWithRetry(url);

    if (!data || !data.players) {
      console.warn(`⚠️ API no devolvió jugadores para equipo ${teamId}`);
      return [];
    }

    // Procesar jugadores
    const players = data.players.map((player) => {
      const playerObj = player.player;
      return {
        id: playerObj.id.toString(),
        name: playerObj.name,
        fullName: playerObj.fullName || playerObj.name,
        shortName: playerObj.shortName || null,
        position: playerObj.position || "N/A",
        positionCategory: this.mapPositionToCategory(
          playerObj.position || "Unknown"
        ),

        // Datos personales
        nationality: playerObj.country?.name || "Unknown",
        countryId: playerObj.country?.id || null,
        countryCode: playerObj.country?.alpha2 || null,
        dateOfBirth: playerObj.dateOfBirthTimestamp
          ? new Date(playerObj.dateOfBirthTimestamp * 1000)
              .toISOString()
              .split("T")[0]
          : null,
        age: playerObj.dateOfBirthTimestamp
          ? this.calculateAge(new Date(playerObj.dateOfBirthTimestamp * 1000))
          : null,
        height: playerObj.height || null,
        weight: playerObj.weight || null,

        // Datos de equipo
        team: teamData?.name || "Unknown",
        teamId: teamId,
        teamCountry: teamData?.country?.name || "Unknown",
        teamCountryCode: teamData?.country?.alpha2 || null,
        teamLogo: teamData?.id
          ? `https://api.sofascore.app/api/v1/team/${teamData.id}/image`
          : null,
        shirtNumber: player.jerseyNumber || null,

        // Contrato
        contractUntil: playerObj.contractUntilTimestamp
          ? new Date(playerObj.contractUntilTimestamp * 1000)
              .toISOString()
              .split("T")[0]
          : null,

        // Recursos
        slug: playerObj.slug || null,
        photo: playerObj.id
          ? `https://api.sofascore.app/api/v1/player/${playerObj.id}/image`
          : null,
        sofaScoreUrl: `https://www.sofascore.com/player/${playerObj.id}/${
          playerObj.slug || "player"
        }`,
      };
    });

    console.log(
      `✅ Obtenidos ${players.length} jugadores del equipo ${teamId}`
    );
    return players;
  } catch (error) {
    console.error(`❌ Error obteniendo jugadores del equipo ${teamId}:`, error);

    // Intentar con Puppeteer como alternativa
    return this.getTeamPlayersWithPuppeteer(teamId);
  }
}

/**
 * Obtiene jugadores de un equipo usando Puppeteer
 * @param {string} teamId - ID del equipo
 * @returns {Promise<Array>} - Lista de jugadores
 */
async function getTeamPlayersWithPuppeteer(teamId) {
  console.log(`🤖 Obteniendo jugadores del equipo ${teamId} con Puppeteer...`);

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(this.HEADERS["User-Agent"]);

    // Navegar a la página del equipo
    await page.goto(`https://www.sofascore.com/team/football/${teamId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Hacer clic en pestaña de plantilla si existe
    try {
      await page.waitForSelector('a[href*="squads"]', { timeout: 5000 });
      await page.click('a[href*="squads"]');
      await page.waitForTimeout(2000); // Esperar que cargue
    } catch (e) {
      console.log("Pestaña de plantilla no encontrada, continuando...");
    }

    // Extraer datos de jugadores
    const players = await page.evaluate(() => {
      const playerElements = document.querySelectorAll(".sc-fznKkj");
      return Array.from(playerElements)
        .map((el) => {
          try {
            const name = el.querySelector("span")?.textContent || "Unknown";
            const numberEl = el.querySelector('div[class*="sc-fzoz"]');
            const jerseyNumber = numberEl ? numberEl.textContent : null;
            const playerLink = el.closest("a");
            const playerUrl = playerLink?.href || null;

            // Extraer ID del jugador de la URL
            const idMatch = playerUrl?.match(/\/player\/(\d+)/) || [];
            const id = idMatch[1] || null;

            // Extraer posición
            const positionEl = el.querySelector('div[class*="sc-fzny"]');
            const position = positionEl ? positionEl.textContent : "N/A";

            return {
              id,
              name,
              position,
              jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
              sofaScoreUrl: playerUrl,
            };
          } catch (error) {
            console.error("Error extrayendo datos de jugador:", error);
            return null;
          }
        })
        .filter((player) => player !== null && player.id);
    });

    await browser.close();
    console.log(
      `✅ Obtenidos ${players.length} jugadores con Puppeteer para equipo ${teamId}`
    );
    return players;
  } catch (error) {
    console.error("❌ Error obteniendo jugadores con Puppeteer:", error);
    return [];
  }
}

/**
 * Guarda múltiples jugadores en la base de datos
 * @param {Array} players - Lista de jugadores a guardar
 * @returns {Promise<Object>} - Estadísticas de la operación
 */
async function savePlayersToDatabase(players) {
  let savedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  try {
    const transaction = await sequelize.transaction();

    try {
      for (const playerData of players) {
        try {
          // Validar datos críticos
          if (!playerData.name) {
            console.warn("⚠️ Jugador sin nombre, omitiendo:", playerData);
            errorCount++;
            continue;
          }

          // Encontrar equipo si es necesario
          let teamId = null;
          if (playerData.team && playerData.team !== "Unknown") {
            const team = await Team.findOne({
              where: { name: playerData.team },
              transaction,
            });
            if (team) {
              teamId = team.id;
            }
          }

          // Crear o actualizar jugador
          const [player, created] = await Player.findOrCreate({
            where: {
              [Op.or]: [
                { sofaScoreId: playerData.id },
                { name: playerData.name },
              ],
            },
            defaults: {
              name: playerData.name,
              position: playerData.position,
              nationality: playerData.country || playerData.nationality,
              birthDate: playerData.birthDate || playerData.dateOfBirth,
              height: playerData.height,
              weight: playerData.weight,
              shirtNumber: playerData.shirtNumber || playerData.jerseyNumber,
              photo: playerData.photo,
              TeamId: teamId,
              sofaScoreId: playerData.id,
            },
            transaction,
          });

          // Actualizar si ya existe
          if (!created) {
            await player.update(
              {
                position: playerData.position,
                nationality: playerData.country || playerData.nationality,
                birthDate: playerData.birthDate || playerData.dateOfBirth,
                height: playerData.height,
                weight: playerData.weight,
                shirtNumber: playerData.shirtNumber || playerData.jerseyNumber,
                photo: playerData.photo,
                TeamId: teamId,
                sofaScoreId: playerData.id,
              },
              { transaction }
            );
            updatedCount++;
          } else {
            savedCount++;
          }
        } catch (error) {
          console.error("❌ Error guardando jugador:", playerData.name, error);
          errorCount++;
        }
      }

      await transaction.commit();
      console.log(
        `✅ Operación completada: ${savedCount} nuevos, ${updatedCount} actualizados, ${errorCount} errores`
      );

      return { saved: savedCount, updated: updatedCount, errors: errorCount };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error en transacción:", error);
    throw error;
  }
}

/**
 * Procesa datos de API de jugador
 * @param {Object} playerData - Datos del jugador
 * @returns {Object} - Datos procesados
 */
function processPlayerApiData(playerData) {
  return {
    id: playerData.id.toString(),
    name: playerData.name || "Unknown",
    fullName: playerData.fullName || playerData.name || "Unknown",
    shortName: playerData.shortName || null,
    position: playerData.position || "N/A",
    positionCategory: this.mapPositionToCategory(
      playerData.position || "Unknown"
    ),

    // Datos personales
    nationality: playerData.country?.name || "Unknown",
    countryId: playerData.country?.id || null,
    countryCode: playerData.country?.alpha2 || null,
    birthDate: playerData.dateOfBirthTimestamp
      ? new Date(playerData.dateOfBirthTimestamp * 1000)
          .toISOString()
          .split("T")[0]
      : null,
    birthPlace: playerData.birthArea?.name || null,
    age: playerData.dateOfBirthTimestamp
      ? this.calculateAge(new Date(playerData.dateOfBirthTimestamp * 1000))
      : null,
    height: playerData.height || null,
    weight: playerData.weight || null,
    foot: playerData.preferredFoot || null,

    // Datos de equipo
    team: playerData.team?.name || "Unknown",
    teamId: playerData.team?.id || null,
    teamSlug: playerData.team?.slug || null,
    teamLogo: playerData.team?.id
      ? `https://api.sofascore.app/api/v1/team/${playerData.team.id}/image`
      : null,
    shirtNumber: playerData.jerseyNumber || null,

    // Recursos
    slug: playerData.slug || null,
    photo: playerData.id
      ? `https://api.sofascore.app/api/v1/player/${playerData.id}/image`
      : null,
    sofaScoreUrl: `https://www.sofascore.com/player/${playerData.id}/${
      playerData.slug || "player"
    }`,

    // Valor y contrato
    marketValue: playerData.marketValue || null,
    contractUntil: playerData.contractUntilTimestamp
      ? new Date(playerData.contractUntilTimestamp * 1000)
          .toISOString()
          .split("T")[0]
      : null,
  };
}

/**
 * Mapea posición a categoría
 * @param {string} position - Posición del jugador
 * @returns {string} - Categoría de la posición
 */
function mapPositionToCategory(position) {
  // Normalizar la posición
  const pos = position.toUpperCase();

  // Categorías de posición
  if (pos.includes("GK")) return "Goalkeeper";
  if (
    pos.includes("CB") ||
    pos.includes("LB") ||
    pos.includes("RB") ||
    pos.includes("WB") ||
    pos.includes("DEFENDER")
  )
    return "Defender";
  if (
    pos.includes("CM") ||
    pos.includes("CDM") ||
    pos.includes("CAM") ||
    pos.includes("LM") ||
    pos.includes("RM") ||
    pos.includes("MIDFIELDER")
  )
    return "Midfielder";
  if (
    pos.includes("ST") ||
    pos.includes("CF") ||
    pos.includes("LW") ||
    pos.includes("RW") ||
    pos.includes("FORWARD")
  )
    return "Forward";

  return "Unknown";
}

/**
* Scrapea jugador usando Puppeteer
* @param {string} playerId - ID del jugador
* @returns {Promise<Object>} - Datos del jugador
*/
async function scrapePlayerWithPuppeteer(playerId) {
  console.log(`🤖 Scraping player ${playerId} with Puppeteer...`);

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(this.HEADERS["User-Agent"]);
    await page.setViewport({ width: 1366, height: 768 });

    await page.goto(`https://www.sofascore.com/player/${playerId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Esperar carga de contenido
    await page.waitForSelector(".sc-hLseeU", { timeout: 10000 });

    // Extraer datos
    const playerData = await page.evaluate(() => {
      try {
        const name =
          document.querySelector("h1.sc-hLseeU")?.textContent || "Unknown";
        const position =
          document.querySelector(".sc-gueYoa")?.textContent || "N/A";

        // Buscar estadísticas y datos personales
        const infoItems = document.querySelectorAll(".sc-jEACwC");
        const stats = {};

        infoItems.forEach((item) => {
          const label = item.querySelector(".sc-kgKVFY")?.textContent;
          const value = item.querySelector(".sc-csCMJt")?.textContent;
          if (label && value) {
            stats[label.toLowerCase().replace(/\s+/g, "_")] = value;
          }
        });

        return {
          name,
          position,
          nationality: stats.nationality || "Unknown",
          birthDate: stats.date_of_birth || null,
          height: stats.height ? parseInt(stats.height, 10) : null,
          weight: stats.weight ? parseInt(stats.weight, 10) : null,
          team: stats.team || "Unknown",
          shirtNumber: stats.jersey_number
            ? parseInt(stats.jersey_number, 10)
            : null,
        };
      } catch (error) {
        console.error("Error extracting player data:", error);
        return { name: "Unknown", position: "N/A" };
      }
    });

    await browser.close();
    playerData.id = playerId;
    playerData.sofaScoreUrl = `https://www.sofascore.com/player/${playerId}`;

    return playerData;
  } catch (error) {
    console.error("❌ Error with Puppeteer player scraping:", error);
    throw error;
  }
}

/**
 * Guarda jugador en base de datos
 * @param {Object} playerData - Datos del jugador
 * @returns {Promise<Object>} - Resultado de la operación
 */
async function savePlayerToDatabase(playerData) {
  try {
    // Validar datos críticos
    if (!playerData.name) {
      throw new Error("Datos insuficientes para guardar jugador");
    }

    // Encontrar equipo
    let teamId = null;
    if (playerData.team && playerData.team !== "Unknown") {
      const team = await Team.findOne({ where: { name: playerData.team } });
      if (team) {
        teamId = team.id;
      }
    }

    // Crear o actualizar jugador
    const [player, created] = await Player.findOrCreate({
      where: {
        // Buscar por sofaScoreId o por nombre
        [Op.or]: [{ sofaScoreId: playerData.id }, { name: playerData.name }],
      },
      defaults: {
        name: playerData.name,
        position: playerData.position,
        nationality: playerData.nationality,
        birthDate: playerData.birthDate,
        height: playerData.height,
        weight: playerData.weight,
        shirtNumber: playerData.shirtNumber,
        photo: playerData.photo,
        teamId: teamId,
        sofaScoreId: playerData.id,
        sofaScoreUrl: playerData.sofaScoreUrl,
      },
    });

    // Actualizar si ya existe
    if (!created) {
      await player.update({
        position: playerData.position,
        nationality: playerData.nationality,
        birthDate: playerData.birthDate,
        height: playerData.height,
        weight: playerData.weight,
        shirtNumber: playerData.shirtNumber,
        photo: playerData.photo,
        teamId: teamId,
        sofaScoreId: playerData.id,
        sofaScoreUrl: playerData.sofaScoreUrl,
      });
    }

    return { player, created };
  } catch (error) {
    console.error("❌ Error guardando jugador:", error);
    throw error;
  }
}


/**
 * Realiza solicitudes HTTP con reintentos
 * @param {string} url - URL a consultar
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Tiempo de espera entre reintentos
 * @returns {Promise<Object>} - Datos de respuesta
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    console.log(`🔍 Consultando API: ${url}`);
    const response = await axios.get(url, {
      headers: this.HEADERS,
      timeout: 15000,
    });

    // Esperar tiempo aleatorio para evitar patrones
    const randomDelay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, randomDelay));

    return response.data;
  } catch (error) {
    if (retries > 0 && error.response?.status !== 404) {
      console.log(`🔄 Reintento ${4 - retries}/3...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Guarda partidos en la base de datos
 * @param {Array} matches - Lista de partidos
 * @returns {Promise<number>} - Número de partidos guardados
 */
async function saveMatchesToDatabase(matches) {
  let savedCount = 0;
  let updatedCount = 0;

  try {
    const transaction = await sequelize.transaction();

    try {
      for (const matchData of matches) {
        // Validar datos críticos
        if (!matchData.homeTeam || !matchData.awayTeam) {
          console.warn("⚠️ Datos de equipo faltantes:", matchData);
          continue;
        }

        // Crear/obtener equipos
        const [homeTeam] = await Team.findOrCreate({
          where: { name: matchData.homeTeam },
          defaults: { country: "Unknown" },
          transaction,
        });

        const [awayTeam] = await Team.findOrCreate({
          where: { name: matchData.awayTeam },
          defaults: { country: "Unknown" },
          transaction,
        });

        // Crear fecha para el partido
        const matchDate = matchData.matchDate
          ? new Date(`${matchData.matchDate}T${matchData.matchTime || "00:00"}`)
          : new Date();

        // Crear/actualizar partido
        const [match, created] = await Match.findOrCreate({
          where: {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            date: {
              [Op.between]: [
                new Date(matchDate.getTime() - 24 * 60 * 60 * 1000), // 1 día antes
                new Date(matchDate.getTime() + 24 * 60 * 60 * 1000), // 1 día después
              ],
            },
          },
          defaults: {
            date: matchDate,
            homeScore: matchData.homeScore,
            awayScore: matchData.awayScore,
            venue: matchData.venue,
            status: matchData.status,
            sofaScoreId: matchData.id,
            sofaScoreUrl: matchData.sofaScoreUrl,
          },
          transaction,
        });

        // Actualizar datos existentes si el partido ya existe
        if (
          !created &&
          (match.status !== matchData.status ||
            match.homeScore !== matchData.homeScore ||
            match.awayScore !== matchData.awayScore)
        ) {
          await match.update(
            {
              homeScore: matchData.homeScore,
              awayScore: matchData.awayScore,
              status: matchData.status,
              sofaScoreId: matchData.id,
              sofaScoreUrl: matchData.sofaScoreUrl,
            },
            { transaction }
          );
          updatedCount++;
        }

        savedCount += created ? 1 : 0;
      }

      await transaction.commit();
      console.log(
        `✅ Base de datos actualizada: ${savedCount} nuevos, ${updatedCount} actualizados`
      );
      return { saved: savedCount, updated: updatedCount };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error guardando en base de datos:", error);
    throw error;
  }
}

/**
 * Obtiene y guarda información de jugador por ID
 * @param {string} playerId - ID de jugador en SofaScore
 * @returns {Promise<Object>} - Datos del jugador
 */
async function scrapePlayerById(playerId) {
  try {
    // Intento con API
    const apiUrl = `https://api.sofascore.com/api/v1/player/${playerId}`;

    try {
      const apiData = await this.fetchWithRetry(apiUrl);
      if (apiData && apiData.player) {
        return this.processPlayerApiData(apiData.player);
      }
    } catch (error) {
      console.warn(
        `⚠️ API para jugador ${playerId} falló, usando Puppeteer...`
      );
    }

    // Fallback a Puppeteer
    return await this.scrapePlayerWithPuppeteer(playerId);
  } catch (error) {
    console.error(`❌ Error obteniendo jugador ${playerId}:`, error);
    throw error;
  }
}

/**
 * Obtiene y guarda partidos del día actual
 * @returns {Promise<Object>} - Resultado de la operación
 */
async function scrapeAndSaveTodayMatches() {
  try {
    const matches = await this.scrapeTodayMatches();
    const result = await this.saveMatchesToDatabase(matches);

    return {
      matches,
      stats: result,
    };
  } catch (error) {
    console.error("❌ Error global en scrapeAndSaveTodayMatches:", error);
    throw error;
  }
}

/**
 * Obtiene detalles de un partido específico
 * @param {string} matchId - ID del partido
 * @returns {Promise<Object>} - Detalles del partido
 */
async function getMatchDetails(matchId) {
  try {
    // Intento con API
    const url = `https://api.sofascore.com/api/v1/event/${matchId}`;
    const data = await this.fetchWithRetry(url);

    // Si todo va bien, procesar datos
    const matchDetails = {
      match: {
        id: data.event.id,
        homeTeam: data.event.homeTeam.name,
        awayTeam: data.event.awayTeam.name,
        homeScore: data.event.homeScore.current,
        awayScore: data.event.awayScore.current,
        competition: data.event.tournament.name,
        venue: data.event.venue?.name || "N/A",
        date: new Date(data.event.startTimestamp * 1000),
        status: data.event.status.type,
        referee: data.event.referee?.name || "N/A",
      },
      lineups: await this.getMatchLineups(matchId),
    };

    return matchDetails;
  } catch (error) {
    console.error(
      `❌ Error obteniendo detalles del partido ${matchId}:`,
      error
    );

    // Intentar con Puppeteer como fallback
    return this.getMatchDetailsWithPuppeteer(matchId);
  }
}

/**
 * Obtiene alineaciones de un partido
 * @param {string} matchId - ID del partido
 * @returns {Promise<Object>} - Alineaciones
 */
async function getMatchLineups(matchId) {
  try {
    const url = `https://api.sofascore.com/api/v1/event/${matchId}/lineups`;
    const data = await this.fetchWithRetry(url);

    return {
      home:
        data.home?.players.map((p) => ({
          id: p.player.id,
          name: p.player.name,
          position: p.player.position,
          shirtNumber: p.shirtNumber,
          rating: p.statistics?.rating || null,
          isStarting: p.substitute === false,
        })) || [],
      away:
        data.away?.players.map((p) => ({
          id: p.player.id,
          name: p.player.name,
          position: p.player.position,
          shirtNumber: p.shirtNumber,
          rating: p.statistics?.rating || null,
          isStarting: p.substitute === false,
        })) || [],
    };
  } catch (error) {
    console.warn(
      `⚠️ No se pudieron obtener alineaciones para partido ${matchId}:`,
      error.message
    );
    return { home: [], away: [] };
  }
}

/**
 * Obtiene detalles de partido con Puppeteer
 * @param {string} matchId - ID del partido
 * @returns {Promise<Object>} - Detalles del partido
 */
async function getMatchDetailsWithPuppeteer(matchId) {
  console.log(`🤖 Obteniendo detalles del partido ${matchId} con Puppeteer...`);

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(this.HEADERS["User-Agent"]);

    await page.goto(`https://www.sofascore.com/event/${matchId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Esperar carga
    await page.waitForSelector(".sc-iGgWBj", { timeout: 10000 });

    // Extraer datos
    const matchData = await page.evaluate(() => {
      try {
        const teams = document.querySelectorAll(".sc-iGgWBj");
        const homeTeam = teams[0]?.textContent || "Unknown";
        const awayTeam = teams[1]?.textContent || "Unknown";

        const scores = document.querySelectorAll(".sc-fqkvVR");
        const homeScore = scores[0]?.textContent || "0";
        const awayScore = scores[1]?.textContent || "0";

        const competition =
          document.querySelector(".sc-gueYoa")?.textContent || "Unknown";
        const venue =
          document.querySelector(".sc-beySbM")?.textContent || "N/A";
        const statusElement = document.querySelector(".sc-dcJsrY");
        const status = statusElement
          ? statusElement.textContent.includes("'")
            ? "LIVE"
            : statusElement.textContent === "FT"
            ? "FINISHED"
            : "SCHEDULED"
          : "SCHEDULED";

        // Jugadores
        const homePlayers = [];
        const awayPlayers = [];

        // Intentar obtener jugadores titulares
        document
          .querySelectorAll(".sc-fznyAO")
          .forEach((teamSection, teamIndex) => {
            const players = teamSection.querySelectorAll(".sc-fznLPX");
            players.forEach((playerEl) => {
              const name =
                playerEl.querySelector(".sc-fzoyAV")?.textContent || "Unknown";
              const number =
                playerEl.querySelector(".sc-fzoLag")?.textContent || "0";
              const position =
                playerEl.querySelector(".sc-fzpkqZ")?.textContent || "N/A";

              const playerData = {
                name,
                shirtNumber: parseInt(number, 10) || 0,
                position,
                isStarting: true,
              };

              if (teamIndex === 0) {
                homePlayers.push(playerData);
              } else {
                awayPlayers.push(playerData);
              }
            });
          });

        return {
          match: {
            homeTeam,
            awayTeam,
            homeScore: parseInt(homeScore, 10) || 0,
            awayScore: parseInt(awayScore, 10) || 0,
            competition,
            venue,
            status,
            date: new Date().toISOString(),
          },
          lineups: {
            home: homePlayers,
            away: awayPlayers,
          },
        };
      } catch (error) {
        console.error("Error extracting match data:", error);
        return {
          match: {
            homeTeam: "Unknown",
            awayTeam: "Unknown",
            status: "UNKNOWN",
          },
          lineups: { home: [], away: [] },
        };
      }
    });

    await browser.close();
    matchData.match.id = matchId;

    return matchData;
  } catch (error) {
    console.error("❌ Error with Puppeteer match scraping:", error);
    throw error;
  }
}

/**
 * Guarda información de partido en la base de datos
 * @param {Object} matchDetails - Detalles del partido
 * @returns {Promise<Object>} - Resultado de la operación
 */
async function saveMatchToDatabase(matchDetails) {
  try {
    // Extraer datos
    const { match, lineups } = matchDetails;

    // Crear/obtener equipos
    const [homeTeam] = await Team.findOrCreate({
      where: { name: match.homeTeam },
      defaults: { country: "Unknown" },
    });

    const [awayTeam] = await Team.findOrCreate({
      where: { name: match.awayTeam },
      defaults: { country: "Unknown" },
    });

    // Crear/actualizar partido
    const [matchRecord, created] = await Match.findOrCreate({
      where: {
        [Op.or]: [
          { sofaScoreId: match.id },
          {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            date: {
              [Op.between]: [
                new Date(new Date(match.date).getTime() - 24 * 60 * 60 * 1000),
                new Date(new Date(match.date).getTime() + 24 * 60 * 60 * 1000),
              ],
            },
          },
        ],
      },
      defaults: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: match.date,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        venue: match.venue,
        status: match.status,
        referee: match.referee,
        sofaScoreId: match.id,
        sofaScoreUrl: `https://www.sofascore.com/event/${match.id}`,
      },
    });

    // Actualizar si no se creó
    if (!created) {
      await matchRecord.update({
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        referee: match.referee,
        sofaScoreId: match.id,
        sofaScoreUrl: `https://www.sofascore.com/event/${match.id}`,
      });
    }

    // Guardar jugadores de las alineaciones
    if (lineups && (lineups.home.length > 0 || lineups.away.length > 0)) {
      await this.saveLineupPlayers(lineups, homeTeam.id, awayTeam.id);
    }

    return { created, match: matchRecord };
  } catch (error) {
    console.error("❌ Error guardando partido en la base de datos:", error);
    throw error;
  }
}

/**
 * Guarda jugadores de alineaciones
 * @param {Object} lineups - Alineaciones
 * @param {number} homeTeamId - ID del equipo local
 * @param {number} awayTeamId - ID del equipo visitante
 */
async function saveLineupPlayers(lineups, homeTeamId, awayTeamId) {
  const transaction = await sequelize.transaction();

  try {
    // Guardar jugadores locales
    for (const playerData of lineups.home) {
      if (!playerData.name || playerData.name === "Unknown") continue;

      await Player.findOrCreate({
        where: {
          [Op.or]: [
            { sofaScoreId: playerData.id },
            {
              name: playerData.name,
              teamId: homeTeamId,
            },
          ],
        },
        defaults: {
          name: playerData.name,
          position: playerData.position,
          shirtNumber: playerData.shirtNumber,
          teamId: homeTeamId,
          sofaScoreId: playerData.id,
        },
        transaction,
      });
    }

    // Guardar jugadores visitantes
    for (const playerData of lineups.away) {
      if (!playerData.name || playerData.name === "Unknown") continue;

      await Player.findOrCreate({
        where: {
          [Op.or]: [
            { sofaScoreId: playerData.id },
            {
              name: playerData.name,
              teamId: awayTeamId,
            },
          ],
        },
        defaults: {
          name: playerData.name,
          position: playerData.position,
          shirtNumber: playerData.shirtNumber,
          teamId: awayTeamId,
          sofaScoreId: playerData.id,
        },
        transaction,
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error guardando jugadores de alineaciones:", error);
  }
}

/**
 * Obtiene temporadas disponibles para una liga
 * @param {string} league - Nombre de la liga
 * @returns {Promise<Object>} - Temporadas disponibles
 */
async function getValidSeasons(league) {
  if (!this.COMPETITIONS[league]) {
    throw new Error(`Liga no soportada: ${league}`);
  }

  try {
    const url = `/unique-tournament/${this.COMPETITIONS[league]}/seasons`;
    console.log(
      `🔍 Obteniendo temporadas de ${league} (ID: ${this.COMPETITIONS[league]})...`
    );
    const data = await this.fetchWithRetry(
      `https://api.sofascore.com/api/v1${url}`
    );

    if (!data || !data.seasons || !Array.isArray(data.seasons)) {
      console.warn(
        `⚠️ Respuesta inesperada para temporadas de ${league}:`,
        data
      );
      // Devolver datos de temporada actuales como fallback
      const currentYear = new Date().getFullYear();
      return {
        [currentYear.toString()]:
          this.COMPETITIONS[league] * 1000 + currentYear, // Generar un ID basado en la liga
      };
    }

    console.log(
      `✅ Encontradas ${data.seasons.length} temporadas para ${league}`
    );

    const seasons = data.seasons.reduce((acc, season) => {
      acc[season.year] = season.id;
      return acc;
    }, {});

    console.log(
      `Años disponibles para ${league}:`,
      Object.keys(seasons).sort((a, b) => b - a)
    );
    return seasons;
  } catch (error) {
    console.error(`❌ Error obteniendo temporadas para ${league}:`, error);

    // Devolver datos de temporada actuales como fallback
    const currentYear = new Date().getFullYear();
    return {
      [currentYear.toString()]: this.COMPETITIONS[league] * 1000 + currentYear, // Generar un ID basado en la liga
    };
  }
}

/**
 * Obtiene todas las ligas disponibles con sus IDs
 * @returns {Promise<Array>} - Lista de ligas disponibles
 */
async function getAllLeagues() {
  try {
    // Primero usamos las ligas que ya conocemos
    const knownLeagues = Object.keys(this.COMPETITIONS).map((leagueName) => ({
      id: this.COMPETITIONS[leagueName],
      name: leagueName,
      category: this.getCategoryFromLeagueName(leagueName),
      source: "predefined",
    }));

    // Intentar obtener ligas populares de la API
    try {
      // Categoría Fútbol (tiene ID 1)
      const url =
        "https://api.sofascore.com/api/v1/sport/football/unique-tournaments";
      const data = await this.fetchWithRetry(url);

      if (data && data.uniqueTournaments) {
        const apiLeagues = data.uniqueTournaments.map((league) => ({
          id: league.id,
          name: league.name,
          country: league.category?.name || null,
          region: league.category?.slug || null,
          slug: league.slug,
          primaryColorHex: league.primaryColorHex || null,
          secondaryColorHex: league.secondaryColorHex || null,
          hasLogo: !!league.hasLogo,
          logo: league.hasLogo
            ? `https://api.sofascore.app/api/v1/unique-tournament/${league.id}/image`
            : null,
          source: "api",
        }));

        // Combinar y eliminar duplicados por ID
        const allLeagues = [...knownLeagues];

        for (const apiLeague of apiLeagues) {
          if (!allLeagues.some((l) => l.id === apiLeague.id)) {
            allLeagues.push(apiLeague);
          }
        }

        return allLeagues;
      }
    } catch (error) {
      console.warn("⚠️ Error obteniendo ligas de la API:", error.message);
    }

    return knownLeagues;
  } catch (error) {
    console.error("❌ Error obteniendo todas las ligas:", error);
    return Object.keys(this.COMPETITIONS).map((leagueName) => ({
      id: this.COMPETITIONS[leagueName],
      name: leagueName,
    }));
  }
}

/**
 * Obtiene datos completos de una liga específica, incluyendo equipos y temporadas
 * @param {string} leagueId - ID de la liga
 * @returns {Promise<Object>} - Datos completos de la liga
 */
async function getLeagueDetails(leagueId) {
  try {
    // URL para información básica de la liga
    const leagueUrl = `https://api.sofascore.com/api/v1/unique-tournament/${leagueId}`;
    const leagueData = await this.fetchWithRetry(leagueUrl);

    if (!leagueData || !leagueData.uniqueTournament) {
      throw new Error(
        `No se encontró información para la liga con ID ${leagueId}`
      );
    }

    const leagueInfo = leagueData.uniqueTournament;

    // Verificar si hay una liga correspondiente en nuestro mapa de IDs a nombres
    let leagueName = null;
    for (const [name, id] of Object.entries(this.COMPETITIONS)) {
      if (id === parseInt(leagueId, 10)) {
        leagueName = name;
        break;
      }
    }

    // Este bloque es para temporadas, pero podría fallar así que lo encapsulamos
    let seasonsData = {};
    let currentSeasonYear = new Date().getFullYear().toString();
    let currentSeasonId = null;
    let sortedSeasons = [];

    try {
      if (leagueName) {
        // Si encontramos el nombre, usamos el método existente
        seasonsData = await this.getValidSeasons(leagueName);
        sortedSeasons = Object.keys(seasonsData).sort((a, b) => b - a);
        if (sortedSeasons.length > 0) {
          currentSeasonYear = sortedSeasons[0];
          currentSeasonId = seasonsData[currentSeasonYear];
        }
      } else {
        // Intentar obtener temporadas directamente por ID
        const seasonUrl = `https://api.sofascore.com/api/v1/unique-tournament/${leagueId}/seasons`;
        const seasonData = await this.fetchWithRetry(seasonUrl);

        if (seasonData && seasonData.seasons) {
          // Transformar los datos de temporada
          seasonData.seasons.forEach((season) => {
            seasonsData[season.year] = season.id;
          });

          // Ordenar temporadas
          sortedSeasons = Object.keys(seasonsData).sort((a, b) => b - a);
          if (sortedSeasons.length > 0) {
            currentSeasonYear = sortedSeasons[0];
            currentSeasonId = seasonsData[currentSeasonYear];
          }
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ Error obteniendo temporadas para liga ${leagueId}:`,
        error.message
      );
    }

    // Obtener equipos de la temporada actual
    let teams = [];
    try {
      if (currentSeasonId) {
        teams = await this.getLeagueTeams(leagueId, currentSeasonId);
      } else {
        // Intentar obtener equipos sin temporada específica
        const standingsUrl = `https://api.sofascore.com/api/v1/unique-tournament/${leagueId}/standings/season`;
        const standingsData = await this.fetchWithRetry(standingsUrl);

        if (standingsData && standingsData.standings) {
          // Extraer equipos de las clasificaciones
          for (const standing of standingsData.standings) {
            if (standing.rows) {
              for (const row of standing.rows) {
                if (row.team) {
                  teams.push({
                    id: row.team.id,
                    name: row.team.name,
                    shortName: row.team.shortName || null,
                    logo: row.team.id
                      ? `https://api.sofascore.app/api/v1/team/${row.team.id}/image`
                      : null,
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ Error obteniendo equipos para liga ${leagueId}:`,
        error.message
      );
    }

    // Organizar la información
    return {
      id: leagueInfo.id,
      name: leagueInfo.name,
      slug: leagueInfo.slug,
      shortName: leagueInfo.shortName || null,
      country: leagueInfo.category?.name || null,
      countryId: leagueInfo.category?.id || null,
      region: leagueInfo.category?.priority || 0,
      logo: leagueInfo.hasLogo
        ? `https://api.sofascore.app/api/v1/unique-tournament/${leagueInfo.id}/image`
        : null,
      primaryColor: leagueInfo.primaryColorHex || null,
      secondaryColor: leagueInfo.secondaryColorHex || null,
      hasStandings: !!leagueInfo.hasStandings,
      type: leagueInfo.uniqueTournamentType || "LEAGUE",
      seasons: sortedSeasons.map((year) => ({
        year,
        id: seasonsData[year],
      })),
      currentSeason: currentSeasonId
        ? {
            year: currentSeasonYear,
            id: currentSeasonId,
          }
        : null,
      teams: teams,
      teamsCount: teams.length,
    };
  } catch (error) {
    console.error(`❌ Error obteniendo detalles de liga ${leagueId}:`, error);
    throw error;
  }
}

/**
 * Obtiene todos los equipos de una liga
 * @param {string} leagueId - ID de la liga
 * @param {string} seasonId - ID de la temporada
 * @returns {Promise<Array>} - Lista de equipos
 */
async function getLeagueTeams(leagueId, seasonId) {
  try {
    const url = `https://api.sofascore.com/api/v1/unique-tournament/${leagueId}/season/${seasonId}/standings/total`;
    const data = await this.fetchWithRetry(url);

    if (!data || !data.standings) {
      throw new Error("API no devolvió datos de equipos");
    }

    const teamsMap = new Map();

    // Extraer equipos de las clasificaciones
    for (const standing of data.standings) {
      if (standing.rows) {
        for (const row of standing.rows) {
          if (row.team && !teamsMap.has(row.team.id)) {
            teamsMap.set(row.team.id, {
              id: row.team.id,
              name: row.team.name,
              shortName: row.team.shortName || null,
              slug: row.team.slug,
              sport: {
                id: 1, // ID de fútbol
                name: "Football",
              },
              category: standing.name || null,
              tournament: {
                id: leagueId,
                name: data.uniqueTournament?.name || "Unknown",
              },
            });
          }
        }
      }
    }

    return Array.from(teamsMap.values());
  } catch (error) {
    console.error(`❌ Error obteniendo equipos de liga ${leagueId}:`, error);

    // Intentar con método alternativo
    return this.getLeagueTeamsWithPuppeteer(leagueId, seasonId);
  }
}

/**
 * Obtiene equipos de liga usando Puppeteer (alternativa)
 * @param {string} leagueId - ID de la liga
 * @param {string} seasonId - ID de la temporada
 * @returns {Promise<Array>} - Lista de equipos
 */
async function getLeagueTeamsWithPuppeteer(leagueId, seasonId) {
  console.log(
    `🤖 Obteniendo equipos con Puppeteer para liga ${leagueId}, temporada ${seasonId}...`
  );

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(this.HEADERS["User-Agent"]);

    // Navegar a la página de la liga
    await page.goto(
      `https://www.sofascore.com/tournament/${leagueId}/season/${seasonId}/standings`,
      {
        waitUntil: "networkidle2",
        timeout: 30000,
      }
    );

    // Esperar y extraer equipos
    await page.waitForSelector(".sc-fqkvVR", { timeout: 10000 });

    const teams = await page.evaluate(() => {
      const teamElements = document.querySelectorAll('a[href*="/team/"]');
      const teamsMap = new Map();

      teamElements.forEach((el) => {
        try {
          const teamUrl = el.href;
          const idMatch = teamUrl.match(/\/team\/football\/(\d+)/) || [];
          const id = idMatch[1];

          if (id && !teamsMap.has(id)) {
            const name =
              el.querySelector(".sc-iGgWBj")?.textContent || "Unknown";
            teamsMap.set(id, {
              id,
              name,
              url: teamUrl,
            });
          }
        } catch (error) {
          console.error("Error extrayendo equipo:", error);
        }
      });

      return Array.from(teamsMap.values());
    });

    await browser.close();
    console.log(`✅ Encontrados ${teams.length} equipos con Puppeteer`);
    return teams;
  } catch (error) {
    console.error("❌ Error con Puppeteer:", error);
    return [];
  }
}

/**
 * Obtiene todos los jugadores de varios equipos automáticamente
 * @param {Array} teams - Lista de equipos
 * @param {Object} options - Opciones
 * @param {number} options.delay - Milisegundos entre solicitudes
 * @param {number} options.maxTeams - Máximo número de equipos a procesar
 * @param {function} options.progressCallback - Función para reportar progreso
 * @returns {Promise<Array>} - Lista de jugadores
 */
async function getAllPlayersFromTeams(teams, options = {}) {
  const { delay = 2000, maxTeams = 100, progressCallback = null } = options;

  const allPlayers = [];
  const processedTeams = {};
  const errors = [];

  // Limitar número de equipos
  const teamsToProcess = teams.slice(0, maxTeams);
  let processedCount = 0;

  // Función para reportar progreso
  const reportProgress = (current, total, team, playerCount) => {
    if (progressCallback) {
      progressCallback({
        team,
        current,
        total,
        percent: Math.round((current / total) * 100),
        totalPlayers: allPlayers.length,
        newPlayers: playerCount,
      });
    }
  };

  for (const team of teamsToProcess) {
    try {
      // Evitar procesar el mismo equipo dos veces
      if (processedTeams[team.id]) {
        continue;
      }

      console.log(
        `🔍 Obteniendo jugadores del equipo ${team.name} (${team.id})...`
      );

      // Obtener jugadores
      const players = await this.getTeamPlayers(team.id);
      console.log(`✅ Obtenidos ${players.length} jugadores de ${team.name}`);

      // Añadir el nombre del equipo a cada jugador antes de agregarlo a la lista
      const playersWithTeam = players.map((player) => ({
        ...player,
        team: team.name,
        teamId: team.id,
        teamName: team.name,
      }));

      // Añadir a lista global
      allPlayers.push(...playersWithTeam);
      processedTeams[team.id] = true;
      processedCount++;

      // Reportar progreso
      reportProgress(
        processedCount,
        teamsToProcess.length,
        team,
        players.length
      );

      // Esperar antes de siguiente solicitud
      if (processedCount < teamsToProcess.length) {
        const randomDelay = delay + Math.floor(Math.random() * 1000);
        await new Promise((resolve) => setTimeout(resolve, randomDelay));
      }
    } catch (error) {
      console.error(`❌ Error con equipo ${team.name}:`, error.message);
      errors.push({
        teamId: team.id,
        teamName: team.name,
        error: error.message,
      });
    }
  }

  // Eliminar duplicados por ID
  const uniquePlayers = [];
  const playerIds = new Set();

  for (const player of allPlayers) {
    if (player.id && !playerIds.has(player.id)) {
      playerIds.add(player.id);
      uniquePlayers.push(player);
    }
  }

  return {
    players: uniquePlayers,
    count: uniquePlayers.length,
    processedTeams: processedCount,
    totalTeams: teams.length,
    errors,
  };
}

/**
 * Obtiene y guarda jugadores por liga
 * @param {string} leagueName - Nombre de la liga
 * @param {string} year - Año de la temporada
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Resultado de la operación
 */
async function getAndSavePlayersByLeague(leagueName, year, options = {}) {
  try {
    console.log(
      `🏆 Procesando liga: ${leagueName}, año: ${year}, guardar: ${options.save}`
    );

    const seasons = await this.getValidSeasons(leagueName);

    // Comprobar si el año existe y si no, usar el último disponible
    if (!seasons[year]) {
      const availableYears = Object.keys(seasons).sort((a, b) => b - a);
      if (availableYears.length > 0) {
        const newYear = availableYears[0];
        console.log(
          `⚠️ Año ${year} no disponible, usando ${newYear} en su lugar`
        );
        year = newYear;
      } else {
        throw new Error(`No hay temporadas disponibles para ${leagueName}`);
      }
    }

    const leagueId = this.COMPETITIONS[leagueName];
    const seasonId = seasons[year];

    console.log(
      `📅 Usando temporada: ${year} (ID: ${seasonId}) para liga ${leagueName}`
    );

    // Obtener equipos de la liga
    console.log(`🔍 Obteniendo equipos de ${leagueName}...`);
    const teams = await this.getLeagueTeams(leagueId, seasonId);
    console.log(`✅ Encontrados ${teams.length} equipos en ${leagueName}`);

    if (teams.length === 0) {
      throw new Error(`No se encontraron equipos para ${leagueName}`);
    }

    // Obtener jugadores de todos los equipos
    console.log(
      `🧩 Obteniendo jugadores de ${
        options.maxTeams || teams.length
      } equipos...`
    );
    const result = await this.getAllPlayersFromTeams(teams, options);
    console.log(
      `✅ Obtenidos ${result.players.length} jugadores de ${result.processedTeams} equipos`
    );

    // Guardar jugadores en la base de datos (solo si se especifica)
    if (options.save === true) {
      console.log("💾 Guardando jugadores en la base de datos...");
      const dbResult = await this.savePlayersToDatabase(result.players);
      console.log(
        `✅ Guardados ${dbResult.saved} jugadores, actualizados ${dbResult.updated}`
      );
      result.dbResult = dbResult;
    } else {
      console.log("⏩ Omitiendo guardado en base de datos");
      result.dbResult = { saved: 0, updated: 0, skipped: true };
    }

    return result;
  } catch (error) {
    console.error(`❌ Error en getAndSavePlayersByLeague:`, error);
    throw error;
  }
}

/**
 * Obtiene partidos de una liga y temporada específica
 * @param {string} year - Año de la temporada
 * @param {string} league - Nombre de la liga
 * @returns {Promise<Array>} - Lista de partidos
 */
async function scrapeLeagueMatches(year, league) {
  try {
    const seasons = await this.getValidSeasons(league);

    if (!seasons[year]) {
      throw new Error(`Año ${year} no disponible para liga ${league}`);
    }

    const seasonId = seasons[year];
    let allMatches = [];
    let page = 0;
    const limit = 100; // Máximo de resultados por página

    console.log(
      `🔍 Obteniendo partidos de ${league} ${year} (ID: ${seasonId})...`
    );

    // Obtener datos con paginación
    while (true) {
      try {
        const url = `https://api.sofascore.com/api/v1/unique-tournament/${
          this.COMPETITIONS[league]
        }/season/${seasonId}/events/last/${page * limit}`;
        const data = await this.fetchWithRetry(url);

        if (!data.events || data.events.length === 0) {
          break; // No hay más partidos
        }

        const matches = data.events.map((event) => ({
          id: event.id,
          homeTeam: event.homeTeam?.name || "Unknown",
          awayTeam: event.awayTeam?.name || "Unknown",
          homeScore: event.homeScore?.current || null,
          awayScore: event.awayScore?.current || null,
          matchTime: event.status?.description || "N/A",
          matchDate: event.startTimestamp
            ? new Date(event.startTimestamp * 1000).toISOString().split("T")[0]
            : null,
          competition: event.tournament?.name || league,
          round: event.roundInfo?.round || null,
          venue: event.venue?.name || "N/A",
          status: event.status?.type || "SCHEDULED",
          sofaScoreUrl: `https://www.sofascore.com/event/${event.id}`,
        }));

        allMatches = allMatches.concat(matches);
        console.log(
          `✅ Obtenidos ${matches.length} partidos (página ${page + 1})`
        );

        page++;

        // Esperar entre solicitudes para evitar bloqueos
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 + Math.random() * 1000)
        );

        // Limitar a 10 páginas por seguridad
        if (page >= 10) break;
      } catch (error) {
        console.error(`❌ Error en página ${page}:`, error.message);
        break;
      }
    }

    console.log(
      `✅ Total: ${allMatches.length} partidos obtenidos para ${league} ${year}`
    );
    return allMatches;
  } catch (error) {
    console.error(
      `❌ Error obteniendo partidos de liga ${league} ${year}:`,
      error
    );

    // Intentar con Puppeteer como alternativa
    return this.scrapeLeagueMatchesWithPuppeteer(year, league);
  }
}

/**
 * Obtiene partidos de liga mediante Puppeteer (alternativa)
 * @param {string} year - Año de la temporada
 * @param {string} league - Nombre de la liga
 * @returns {Promise<Array>} - Lista de partidos
 */
async function scrapeLeagueMatchesWithPuppeteer(year, league) {
  console.log(
    `🤖 Usando Puppeteer para obtener partidos de ${league} ${year}...`
  );

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(this.HEADERS["User-Agent"]);
    await page.setViewport({ width: 1366, height: 768 });

    // Construir URL
    const leagueId = this.COMPETITIONS[league];
    const url = `https://www.sofascore.com/tournament/${leagueId}/season/${year}`;

    // Navegar a la página
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Esperar que cargue el contenido
    await page.waitForSelector(".sc-hLseeU", { timeout: 10000 });

    // Hacer scroll para cargar más resultados
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Scroll 5 veces para cargar más partidos
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1000); // Esperar a que cargue
      }
    });

    // Extraer datos
    const matches = await page.evaluate(() => {
      const matchElements = document.querySelectorAll(".sc-bqOBKt");
      return Array.from(matchElements)
        .map((element) => {
          try {
            const homeTeam =
              element.querySelector(".sc-fnGiBr:nth-child(1)")?.textContent ||
              "Unknown";
            const awayTeam =
              element.querySelector(".sc-fnGiBr:nth-child(2)")?.textContent ||
              "Unknown";
            const matchTime =
              element.querySelector(".sc-gueYoa")?.textContent || "N/A";
            const competitionEl = element
              .closest(".sc-fqkvVR")
              .querySelector(".sc-iJbNxu");
            const competition = competitionEl
              ? competitionEl.textContent
              : "Unknown Competition";

            // Buscar fecha
            const dateEl = element
              .closest(".sc-fqkvVR")
              .querySelector(".sc-bBABsx");
            const matchDate = dateEl
              ? dateEl.textContent
              : new Date().toISOString().split("T")[0];

            // Buscar scores
            const scoreElements = element.querySelectorAll(".sc-hLseeU");
            const homeScore = scoreElements[0]?.textContent || null;
            const awayScore = scoreElements[1]?.textContent || null;

            // Extraer estado del partido
            const statusEl = element.querySelector(".sc-gueYoa");
            const status = statusEl
              ? statusEl.textContent.includes("'")
                ? "LIVE"
                : statusEl.textContent === "FT"
                ? "FINISHED"
                : "SCHEDULED"
              : "SCHEDULED";

            // Generar URL
            const matchUrl = element.closest("a")?.href || null;

            return {
              homeTeam,
              awayTeam,
              homeScore: homeScore ? parseInt(homeScore, 10) : null,
              awayScore: awayScore ? parseInt(awayScore, 10) : null,
              matchTime,
              matchDate,
              competition,
              status,
              sofaScoreUrl: matchUrl,
            };
          } catch (error) {
            console.error("Error extracting match data:", error);
            return null;
          }
        })
        .filter((match) => match !== null);
    });

    await browser.close();
    console.log(
      `✅ Scraped ${matches.length} matches with Puppeteer for ${league} ${year}`
    );
    return matches;
  } catch (error) {
    console.error("❌ Error scraping league matches with Puppeteer:", error);
    return []; // Retornar array vacío en caso de error
  }
}
/**
 * Convierte el tipo de estado del partido en un valor estandarizado
 * @param {string} statusType - Tipo de estado del partido
 * @returns {string} - Estado estandarizado
 */
function getMatchStatus(statusType) {
  if (!statusType) return "SCHEDULED";

  // Mapeo de estados
  const statusMap = {
    finished: "FINISHED",
    notstarted: "SCHEDULED",
    inprogress: "LIVE",
    interrupted: "INTERRUPTED",
    canceled: "CANCELLED",
    postponed: "POSTPONED",
  };

  return statusMap[statusType.toLowerCase()] || "SCHEDULED";
}

/**
 * Obtiene partidos programados por fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @param {boolean} save - Indica si guardar los partidos en la base de datos
 * @returns {Promise<Object>} - Objeto con información de partidos del día
 */
async function getMatchesByDate(date, save = false) {
  try {
    // Validar formato de fecha
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Formato de fecha inválido. Debe ser YYYY-MM-DD");
    }

    // Convertir fecha a formato unix timestamp (comienzo del día)
    const startDate = new Date(date + "T00:00:00Z");
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    // Fin del día
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    console.log(`🗓️ Obteniendo partidos para el día ${date}...`);

    try {
      // Usar la API de SofaScore para obtener partidos
      // URL correcta con formato YYYY-MM-DD según comentario en revisar.txt
      const url = `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${date}`;
      const data = await this.fetchWithRetry(url);

      if (!data || !data.events || !Array.isArray(data.events)) {
        console.warn("⚠️ No se encontraron datos de partidos para esta fecha");
        return {
          date,
          matches: [],
          count: 0,
          competitions: [],
        };
      }

      // Filtrar solo los partidos del día
      const matchesOfDay = data.events.filter((event) => {
        const eventTimestamp = event.startTimestamp;
        return (
          eventTimestamp >= startTimestamp && eventTimestamp < endTimestamp
        );
      });

      console.log(
        `📊 Encontrados ${matchesOfDay.length} partidos para el ${date}`
      );

      // Procesar datos
      const matches = matchesOfDay.map((event) => {
        const homeTeam = event.homeTeam?.name || "Unknown";
        const awayTeam = event.awayTeam?.name || "Unknown";
        const competition = event.tournament?.name || "Unknown Competition";
        const country = event.tournament?.category?.name || "Unknown Country";
        const status = this.getMatchStatus(event.status?.type);

        return {
          id: event.id.toString(),
          homeTeam: homeTeam,
          homeTeamId: event.homeTeam?.id?.toString(),
          homeTeamLogo: event.homeTeam?.logo
            ? `https://api.sofascore.app/api/v1/team/${event.homeTeam.id}/image`
            : null,
          awayTeam: awayTeam,
          awayTeamId: event.awayTeam?.id?.toString(),
          awayTeamLogo: event.awayTeam?.logo
            ? `https://api.sofascore.app/api/v1/team/${event.awayTeam.id}/image`
            : null,
          homeScore: event.homeScore?.current,
          awayScore: event.awayScore?.current,
          date: new Date(event.startTimestamp * 1000)
            .toISOString()
            .split("T")[0],
          datetime: new Date(event.startTimestamp * 1000).toISOString(),
          competition: competition,
          country: country,
          status: status,
          round: event.roundInfo?.round || null,
          sofaScoreId: event.id.toString(),
          sofaScoreUrl: `https://www.sofascore.com/event/${event.id}`,
        };
      });

      // Guardar en la base de datos si se solicita
      if (save) {
        await this.saveMatchesToDatabase(matches);
      }

      return {
        date,
        matches,
        count: matches.length,
        competitions: [...new Set(matches.map((m) => m.competition))].sort(),
      };
    } catch (error) {
      console.error(
        `❌ Error obteniendo partidos para ${date}: ${error.message}`
      );
      return {
        date,
        matches: [],
        count: 0,
        competitions: [],
      };
    }
  } catch (error) {
    console.error(`❌ Error obteniendo partidos por fecha:`, error);
    throw error;
  }
}

/**
 * Obtiene partidos para un rango de fechas
 * @param {string} startDate - Fecha inicial en formato YYYY-MM-DD
 * @param {string} endDate - Fecha final en formato YYYY-MM-DD
 * @param {boolean} save - Indica si guardar los partidos en la base de datos
 * @returns {Promise<Object>} - Objeto con partidos agrupados por fecha
 */
async function getMatchesByDateRange(startDate, endDate, save = false) {
  try {
    // Validar formato de fechas
    if (
      !startDate ||
      !endDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      throw new Error("Formato de fecha inválido. Debe ser YYYY-MM-DD");
    }

    // Verificar que la fecha final es posterior a la inicial
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new Error(
        "La fecha inicial debe ser anterior o igual a la fecha final"
      );
    }

    console.log(
      `🗓️ Obteniendo partidos para el rango ${startDate} a ${endDate}...`
    );

    // Obtener los partidos para cada día en el rango
    const result = {
      startDate,
      endDate,
      dayCount: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
      matches: {},
      totalMatches: 0,
    };

    // Calcular cuántos días son en total
    const totalDays = result.dayCount;

    // Si son muchos días, mostrar una advertencia
    if (totalDays > 30) {
      console.warn(
        `⚠️ Atención: Se solicitaron ${totalDays} días de partidos. Esto puede tardar varios minutos.`
      );
    }

    // Iterar por cada día en el rango
    const currentDate = new Date(start);
    let processedDays = 0;

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      console.log(
        `📅 Procesando día ${++processedDays}/${totalDays}: ${dateStr}`
      );

      try {
        const dayMatches = await this.getMatchesByDate(dateStr, save);

        // Guardar los partidos de este día
        result.matches[dateStr] = dayMatches.matches;
        result.totalMatches += dayMatches.matches.length;

        console.log(
          `✅ Día ${dateStr}: ${dayMatches.matches.length} partidos encontrados`
        );
      } catch (error) {
        console.error(
          `❌ Error obteniendo partidos para ${dateStr}:`,
          error.message
        );
        result.matches[dateStr] = [];
      }

      // Pasar al día siguiente
      currentDate.setDate(currentDate.getDate() + 1);

      // Esperar un momento para no sobrecargar la API
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo partidos por rango de fechas:`, error);
    throw error;
  }
}

/**
 * Obtiene todos los partidos de una temporada específica
 * @param {string} season - Temporada en formato 'YYYY-YYYY' (ej: '2024-2025')
 * @param {boolean} save - Indica si guardar los partidos en la base de datos
 * @returns {Promise<Object>} - Resultados de la operación
 */
async function getSeasonFixture(season = "2024-2025", save = true) {
  try {
    // Validar formato de temporada
    if (!/^\d{4}-\d{4}$/.test(season)) {
      throw new Error("Formato de temporada inválido. Debe ser YYYY-YYYY");
    }

    // Extraer años
    const [startYear, endYear] = season
      .split("-")
      .map((year) => parseInt(year, 10));

    // Verificar que son años consecutivos
    if (endYear !== startYear + 1) {
      throw new Error("La temporada debe estar formada por años consecutivos");
    }

    console.log(
      `🏆 Obteniendo fixture completo para la temporada ${season}...`
    );

    // Definir fechas de inicio y fin de temporada
    // Generalmente las temporadas europeas van de agosto a mayo
    const startDate = `${startYear}-08-01`;
    const endDate = `${endYear}-05-31`;

    // Obtener resultados en bloques de un mes para evitar sobrecargar la API
    const fixtures = {
      season,
      startDate,
      endDate,
      leagues: {},
      totalMatches: 0,
      errors: [],
    };

    // Definir bloques de fechas para procesar (un mes a la vez)
    const dateBlocks = [];
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    let currentBlockStart = new Date(startDateTime);

    while (currentBlockStart < endDateTime) {
      // Fin del bloque actual (un mes después)
      const currentBlockEnd = new Date(currentBlockStart);
      currentBlockEnd.setMonth(currentBlockEnd.getMonth() + 1);

      // Si el fin del bloque supera la fecha final, ajustarlo
      if (currentBlockEnd > endDateTime) {
        dateBlocks.push({
          start: currentBlockStart.toISOString().split("T")[0],
          end: endDateTime.toISOString().split("T")[0],
        });
      } else {
        // Restar un día para evitar solapamiento
        const blockEnd = new Date(currentBlockEnd);
        blockEnd.setDate(blockEnd.getDate() - 1);

        dateBlocks.push({
          start: currentBlockStart.toISOString().split("T")[0],
          end: blockEnd.toISOString().split("T")[0],
        });
      }

      // Avanzar al siguiente bloque
      currentBlockStart = new Date(currentBlockEnd);
    }

    console.log(`📅 Se procesarán ${dateBlocks.length} bloques de fechas`);

    // Actualizar estado global
    if (global.fixtureProcessStatus) {
      global.fixtureProcessStatus.totalBlocks = dateBlocks.length;
    }

    // Procesar cada bloque
    let blockIndex = 0;
    for (const block of dateBlocks) {
      blockIndex++;
      console.log(
        `📅 Procesando bloque ${blockIndex}/${dateBlocks.length}: ${block.start} a ${block.end}`
      );

      try {
        const blockResult = await this.getMatchesByDateRange(
          block.start,
          block.end,
          save
        );

        // Agregar partidos al resultado general
        for (const [date, matches] of Object.entries(blockResult.matches)) {
          // Agregar a lista por competición
          for (const match of matches) {
            const competition = match.competition || "Unknown";

            if (!fixtures.leagues[competition]) {
              fixtures.leagues[competition] = {
                name: competition,
                matches: [],
                count: 0,
              };
            }

            fixtures.leagues[competition].matches.push(match);
            fixtures.leagues[competition].count++;
            fixtures.totalMatches++;
          }
        }

        console.log(
          `✅ Bloque ${blockIndex} completado: ${blockResult.totalMatches} partidos`
        );

        // Actualizar estado global
        if (global.fixtureProcessStatus) {
          global.fixtureProcessStatus.processedBlocks = blockIndex;
          global.fixtureProcessStatus.progress = Math.round(
            (blockIndex / dateBlocks.length) * 100
          );
          global.fixtureProcessStatus.totalMatches = fixtures.totalMatches;
        }
      } catch (error) {
        console.error(`❌ Error en bloque ${blockIndex}:`, error.message);
        fixtures.errors.push({
          block: blockIndex,
          dates: block,
          error: error.message,
        });
      }

      // Esperar entre bloques para evitar sobrecargar la API
      if (blockIndex < dateBlocks.length) {
        console.log("⏳ Esperando antes de procesar el siguiente bloque...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Ordenar las ligas por cantidad de partidos
    fixtures.leaguesSummary = Object.values(fixtures.leagues)
      .map((league) => ({
        name: league.name,
        count: league.count,
      }))
      .sort((a, b) => b.count - a.count);

    console.log(
      `✅ Proceso completado: ${fixtures.totalMatches} partidos en ${
        Object.keys(fixtures.leagues).length
      } competiciones`
    );

    return fixtures;
  } catch (error) {
    console.error(`❌ Error obteniendo fixture de temporada:`, error);
    throw error;
  }
}

/**
 * Actualizar información de equipos desde SofaScore
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateTeamInfo(req, res, next) {
  try {
    const { teamId } = req.params;
    const { forceUpdate } = req.query;

    if (!global.teamsUpdateStatus) {
      global.teamsUpdateStatus = {
        processing: false,
        lastUpdated: null,
        progress: 0,
      };
    }

    if (global.teamsUpdateStatus.processing) {
      return res.status(409).json({
        error: "Update already in progress",
        progress: global.teamsUpdateStatus.progress,
      });
    }

    global.teamsUpdateStatus.processing = true;

    const scraper = new SofaScoreScraper();
    const teamData = await scraper.scrapeTeamDetails(teamId);
    const result = await scraper.updateTeamInDatabase(
      teamData,
      forceUpdate === "true"
    );

    global.teamsUpdateStatus = {
      processing: false,
      lastUpdated: new Date(),
      progress: 100,
    };

    res.status(200).json({
      message: "Team information updated successfully",
      teamId,
      updatedFields: result.updatedFields,
      newPlayers: result.newPlayers.length,
      updatedStats: result.updatedStats,
    });
  } catch (error) {
    global.teamsUpdateStatus.processing = false;
    console.error("Error updating team info:", error);
    next(error);
  }
}
module.exports = {
  updateTeamInfo,
  getSeasonFixture,
  getMatchesByDateRange,
  getTodayMatches,
  getAllLeagues,
  getAllPlayersFromTeams,
  getAndSavePlayersByLeague,
  getLeagueDetails,
  getLeagueTeams,
  getLeagueTeamsWithPuppeteer,
  getMatchDetails,
  getMatchesByDate,
  scrapeLeagueMatchesWithPuppeteer,
  scrapeLeagueMatches,
  getValidSeasons,
  saveLineupPlayers,
  saveMatchToDatabase,
  getMatchDetailsWithPuppeteer,
  fetchWithRetry,
  scrapeAndSaveTodayMatches,
  scrapePlayerById,
  saveLineupPlayers,
  getMatchLineups,
  scrapeLeagueMatchesWithPuppeteer,
  saveMatchesToDatabase,
  saveMatchesToDatabase,
  getMatchStatus,
};
