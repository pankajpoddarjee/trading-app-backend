const MasterStock = require('../models/MasterStock');
const db = require('../config/db');
// @desc    Search stocks
// @route   GET /api/master/search?q=query
// @access  Private

// @access  Private
const getAllStocks = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM master_stocks WHERE is_active = 1 ORDER BY symbol'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get all stocks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
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
const updateMasterStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, companyName, sector, exchange, is_active } = req.body;

    if (!symbol || !companyName) {
      return res.status(400).json({ message: 'Symbol and Company Name are required' });
    }

    // Check if symbol already exists for another stock
    const [existing] = await db.query(
      'SELECT * FROM master_stocks WHERE symbol = ? AND id != ?',
      [symbol.toUpperCase(), id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Symbol already exists for another stock' });
    }

    await db.query(
      `UPDATE master_stocks 
       SET symbol = ?, company_name = ?, sector = ?, exchange = ?, is_active = ?
       WHERE id = ?`,
      [symbol.toUpperCase(), companyName, sector || 'Others', exchange || 'NSE', is_active !== undefined ? is_active : 1, id]
    );

    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Update master error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete stock from master (soft delete)
// @route   DELETE /api/master/delete/:id
// @access  Private
const deleteMasterStock = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if stock is used in portfolio or transactions
    const [used] = await db.query(
      'SELECT * FROM portfolio WHERE stock_id = ? UNION SELECT * FROM transactions WHERE stock_id = ?',
      [id, id]
    );
    if (used.length > 0) {
      return res.status(400).json({ message: 'Cannot delete stock, it is used in portfolio or transactions' });
    }

    // Soft delete
    await db.query(
      'UPDATE master_stocks SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('Delete master error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllStocks,
  searchStocks,
  addMasterStock,
  updateMasterStock,
  deleteMasterStock,
};