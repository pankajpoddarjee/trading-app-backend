const BulkPortfolio = require('../models/BulkPortfolio');
const BulkTransaction = require('../models/BulkTransaction');
const MasterStock = require('../models/MasterStock');
const db = require('../config/db');

// @desc    Get all bulk holdings
// @route   GET /api/bulk-portfolio
// @access  Private
const getBulkHoldings = async (req, res) => {
  try {
    const userId = req.user.id;
    const holdings = await BulkPortfolio.getByUserId(userId);
    res.json(holdings || []);
  } catch (error) {
    console.error('Get bulk holdings error:', error);
    res.status(500).json([]);
  }
};

// @desc    Add multiple holdings (bulk buy)
// @route   POST /api/bulk-portfolio/add-bulk
// @access  Private
const addBulkHoldings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entries, transactionDate } = req.body;
    
    if (!entries || entries.length === 0) {
      return res.status(400).json({ message: 'No entries provided' });
    }
    
    const portfolioEntries = [];
    const transactionEntries = [];
    let totalAmount = 0;
    
    for (const entry of entries) {
      const { symbol, companyName, quantity, buyPrice, currentPrice } = entry;
      
      if (!symbol || !companyName || !quantity || !buyPrice) {
        return res.status(400).json({ message: 'All fields are required for each entry' });
      }
      
      // ✅ Get or create stock in master
      let stock = await MasterStock.getBySymbol(symbol.toUpperCase());
      if (!stock) {
        await MasterStock.add({
          symbol: symbol.toUpperCase(),
          companyName,
          sector: 'Others',
          exchange: 'NSE',
        });
        stock = await MasterStock.getBySymbol(symbol.toUpperCase());
      }
      
      const stockId = stock.id;
      const entryTotal = quantity * buyPrice;
      totalAmount += entryTotal;
      
      portfolioEntries.push({
        userId,
        stockId,
        quantity,
        buyPrice,
        currentPrice: currentPrice || buyPrice,
        transactionDate: transactionDate || new Date(),
      });
      
      transactionEntries.push({
        userId,
        stockId,
        quantity,
        price: buyPrice,
        totalAmount: entryTotal,
        transactionDate: transactionDate || new Date(),
      });
    }
    
    // ✅ Insert all portfolio entries
    await BulkPortfolio.addBulk(portfolioEntries);
    
    // ✅ Insert all transaction entries
    await BulkTransaction.addBulk(transactionEntries);
    
    // ✅ Update user balance
    await db.query(
      'UPDATE users SET balance = balance - ? WHERE id = ?',
      [totalAmount, userId]
    );
    
    res.status(201).json({ 
      message: `${entries.length} holdings added successfully`,
      totalAmount,
      count: entries.length,
    });
  } catch (error) {
    console.error('Add bulk holdings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Delete bulk holding
// @route   DELETE /api/bulk-portfolio/delete/:id
// @access  Private
const deleteBulkHolding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    await BulkPortfolio.delete(id, userId);
    res.json({ message: 'Bulk holding deleted successfully' });
  } catch (error) {
    console.error('Delete bulk holding error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getBulkHoldings,
  addBulkHoldings,
  deleteBulkHolding,
};