const express = require('express');
const router = express.Router();
const DatabasePopulator = require('../utils/databasePopulator');

/**
 * @route   GET /api/scraper/populate/initialize
 * @desc    Inicializar la base de datos con datos básicos
 */
router.get('/populate/initialize', async (req, res) => {
  try {
    const populator = new DatabasePopulator();
    const startTime = Date.now();
    
    // Iniciar el proceso en segundo plano
    res.status(202).json({
      message: 'Inicializando población de la base de datos...',
      info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos'
    });
    
    // Ejecutar la inicialización
    await populator.initialize();
    
    // Calcular tiempo total
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Proceso completado en ${totalTime.toFixed(2)} segundos`);
  } catch (error) {
    console.error('❌ Error iniciando población:', error);
    // No se envía respuesta de error ya que ya se envió la respuesta inicial
  }
});

/**
 * @route   GET /api/scraper/populate/league/:leagueId
 * @desc    Poblar los equipos y jugadores de una liga
 */
router.get('/populate/league/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    if (!leagueId) {
      return res.status(400).json({
        error: 'Se requiere ID de liga'
      });
    }
    
    const populator = new DatabasePopulator();
    
    // Iniciar el proceso en segundo plano
    res.status(202).json({
      message: `Iniciando población de equipos y jugadores para liga ${leagueId}...`,
      info: 'Este proceso se ejecuta en segundo plano y puede tardar varios minutos'
    });
    
    // Poblar la liga
    await populator.populateTeamsForLeague(leagueId);
    
  } catch (error) {
    console.error(`❌ Error poblando liga:`, error);
    // No se envía respuesta de error ya que ya se envió la respuesta inicial
  }
});

/**
 * @route   GET /api/scraper/populate/team/:teamId
 * @desc    Poblar los jugadores de un equipo
 */
router.get('/populate/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        error: 'Se requiere ID de equipo'
      });
    }
    
    const populator = new DatabasePopulator();
    
    // Iniciar el proceso
    const startTime = Date.now();
    const result = await populator.populatePlayersForTeam(teamId);
    const totalTime = (Date.now() - startTime) / 1000;
    
    res.status(200).json({
      message: `Población de jugadores ${result ? 'completada' : 'falló'} en ${totalTime.toFixed(2)} segundos`,
      success: result
    });
  } catch (error) {
    console.error(`❌ Error poblando equipo:`, error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/scraper/populate/player/:playerId/:sofaScoreId
 * @desc    Poblar detalles de un jugador específico
 */
router.get('/populate/player/:playerId/:sofaScoreId', async (req, res) => {
  try {
    const { playerId, sofaScoreId } = req.params;
    
    if (!playerId || !sofaScoreId) {
      return res.status(400).json({
        error: 'Se requieren IDs de jugador'
      });
    }
    
    const populator = new DatabasePopulator();
    
    // Iniciar el proceso
    const startTime = Date.now();
    const result = await populator.populatePlayerDetails(playerId, sofaScoreId);
    const totalTime = (Date.now() - startTime) / 1000;
    
    res.status(200).json({
      message: `Población de detalles del jugador ${result ? 'completada' : 'falló'} en ${totalTime.toFixed(2)} segundos`,
      success: result
    });
  } catch (error) {
    console.error(`❌ Error poblando detalles del jugador:`, error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;