const express = require('express');
const router = express.Router();
const { search } = require('../controllers/SearchController');

router.get('/data', search);

module.exports = router;
