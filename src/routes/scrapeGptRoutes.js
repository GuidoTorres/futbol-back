const express = require('express');
const { scrapeAndUpdateAllTeams } = require('../scrapers/ScraperGpt');
const router = express.Router();

// Endpoint para iniciar el proceso de scraping y actualización de todos los equipos
router.get('/scrape', async (req, res) => {
  try {
    // Ejecuta el proceso de scraping; la función se encarga de recorrer todos los equipos
    // y actualizar/inserir la información completa en la base de datos.
    const result = await scrapeAndUpdateAllTeams();
    // Puedes retornar el resultado o simplemente un mensaje de éxito.
    res.json({ success: true, message: 'Proceso de scraping completado.', result });
  } catch (error) {
    console.error("Error en el endpoint /scrape:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;