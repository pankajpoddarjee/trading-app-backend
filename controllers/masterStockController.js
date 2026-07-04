const MasterStock = require('../models/MasterStock');

// @desc    Search stocks
// @route   GET /api/master/search?q=query
// @access  Private
const searchStocks = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json([]);
    }
    const results = await MasterStock.search(q);
    res.json(results);
  } catch (error) {
    console.error('Search stocks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add new stock to master
// @route   POST /api/master/add
// @access  Private
const addMasterStock = async (req, res) => {
  try {
    const { symbol, companyName, sector, exchange } = req.body;
    
    if (!symbol || !companyName) {
      return res.status(400).json({ message: 'Symbol and Company Name are required' });
    }
    
    // Check if already exists
    const existing = await MasterStock.getBySymbol(symbol.toUpperCase());
    if (existing) {
      return res.status(400).json({ message: 'Stock already exists in master' });
    }
    
    await MasterStock.add({
      symbol: symbol.toUpperCase(),
      companyName,
      sector: sector || 'Others',
      exchange: exchange || 'NSE',
    });
    
    res.status(201).json({ message: 'Stock added to master successfully' });
  } catch (error) {
    console.error('Add master stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  searchStocks,
  addMasterStock,
};