const express = require('express');
const router = express.Router();
const YahooService = require('../services/yahooService');

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    console.log(`🔍 Search API called for: ${query}`);
    const data = await YahooService.searchSymbol(query);
    console.log(`📤 Returning ${data.length} results`);
    res.json(data);
  } catch (error) {
    console.error('Search route error:', error.message);
    res.status(500).json({ error: error.message, results: [] });
  }
});

router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await YahooService.getFullQuote(symbol);
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: 'Symbol not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1mo' } = req.query;
    const data = await YahooService.getChartData(symbol, range);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;