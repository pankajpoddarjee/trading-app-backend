const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const MasterStock = require('../models/MasterStock');
const db = require('../config/db');

// @desc    Get all holdings
// @route   GET /api/portfolio
// @access  Private
const getHoldings = async (req, res) => {
  try {
    const userId = req.user.id;
    const holdings = await Portfolio.getByUserId(userId);
    
    let totalInvestment = 0;
    let totalCurrentValue = 0;
    
    holdings.forEach(h => {
      totalInvestment += h.quantity * h.buy_price;
      totalCurrentValue += h.quantity * h.current_price;
    });
    
    const formattedHoldings = holdings.map(h => ({
      id: h.id,
      symbol: h.symbol,
      company_name: h.company_name,
      quantity: h.quantity,
      buy_price: parseFloat(h.buy_price),
      current_price: parseFloat(h.current_price),
    }));
    
    res.json({
      holdings: formattedHoldings,
      summary: {
        totalInvestment,
        totalCurrentValue,
        totalPnl: totalCurrentValue - totalInvestment,
        totalPnlPercent: totalInvestment > 0 ? ((totalCurrentValue - totalInvestment) / totalInvestment) * 100 : 0,
      }
    });
  } catch (error) {
    console.error('Get holdings error:', error);
    res.status(500).json({ 
      holdings: [], 
      summary: { totalInvestment: 0, totalCurrentValue: 0, totalPnl: 0, totalPnlPercent: 0 }
    });
  }
};

// @desc    Add holding (or update if exists)
// @route   POST /api/portfolio/add
// @access  Private
const addHolding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, companyName, quantity, buyPrice, currentPrice, transactionDate } = req.body;
    
    // Validation
    if (!symbol || !companyName || !quantity || !buyPrice) {
      return res.status(400).json({ message: 'All fields are required' });
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
    
    // Check if already exists
    const existingHoldings = await Portfolio.getByUserId(userId);
    const existing = existingHoldings.find(h => h.stock_id === stockId);
    
    if (existing) {
      // Update: add quantity and recalculate average buy price
      const totalCost = (existing.quantity * existing.buy_price) + (quantity * buyPrice);
      const newQuantity = existing.quantity + quantity;
      const newAvgPrice = totalCost / newQuantity;
      
      await Portfolio.update(existing.id, userId, {
        quantity: newQuantity,
        buyPrice: newAvgPrice,
        currentPrice: currentPrice || buyPrice,
      });
      
      await Transaction.add({
        userId,
        stockId,
        type: 'BUY',
        quantity,
        price: buyPrice,
        totalAmount: quantity * buyPrice,
        transactionDate: transactionDate || new Date(),
      });
      
      await db.query(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [quantity * buyPrice, userId]
      );
      
      return res.json({ 
        message: 'Holding updated successfully (quantity added)',
        newQuantity,
        newAvgPrice
      });
    }
    
    // New holding
    await Portfolio.add({
      userId,
      stockId,
      quantity,
      buyPrice,
      currentPrice: currentPrice || buyPrice,
      transactionDate: transactionDate || new Date(),
    });
    
    await Transaction.add({
      userId,
      stockId,
      type: 'BUY',
      quantity,
      price: buyPrice,
      totalAmount: quantity * buyPrice,
      transactionDate: transactionDate || new Date(),
    });
    
    await db.query(
      'UPDATE users SET balance = balance - ? WHERE id = ?',
      [quantity * buyPrice, userId]
    );
    
    res.status(201).json({ message: 'Holding added successfully' });
  } catch (error) {
    console.error('Add holding error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Sell holding (partial or full)
// @route   POST /api/portfolio/sell
// @access  Private
const sellHolding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, quantity, sellPrice, transactionDate } = req.body; // ✅ Add transactionDate
    
    // Validation
    if (!symbol || !quantity || !sellPrice) {
      return res.status(400).json({ message: 'Symbol, quantity and sell price are required' });
    }
    
    // ✅ Get stock_id from symbol
    const stock = await MasterStock.getBySymbol(symbol.toUpperCase());
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found in master' });
    }
    const stockId = stock.id;
    
    const holdings = await Portfolio.getByUserId(userId);
    const holding = holdings.find(h => h.stock_id === stockId);
    
    if (!holding) {
      return res.status(404).json({ message: 'Holding not found for this symbol' });
    }
    
    if (quantity > holding.quantity) {
      return res.status(400).json({ 
        message: `Insufficient quantity! You have ${holding.quantity} shares of ${symbol}`
      });
    }
    
    const remainingQuantity = holding.quantity - quantity;
    const totalSellAmount = quantity * sellPrice;
    
    // ✅ Add sell transaction with transactionDate
    await Transaction.add({
      userId,
      stockId,
      type: 'SELL',
      quantity,
      price: sellPrice,
      totalAmount: totalSellAmount,
      transactionDate: transactionDate || new Date(), // ✅ Use provided date or default
    });
    
    if (remainingQuantity === 0) {
      await Portfolio.delete(holding.id, userId);
    } else {
      await Portfolio.update(holding.id, userId, {
        quantity: remainingQuantity,
        buyPrice: holding.buy_price,
        currentPrice: sellPrice,
      });
    }
    
    await db.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [totalSellAmount, userId]
    );
    
    res.json({
      message: `Sold ${quantity} shares of ${symbol} at ₹${sellPrice}`,
      remainingQuantity,
      totalSellAmount,
      sellPrice,
      transactionDate: transactionDate || new Date(),
    });
  } catch (error) {
    console.error('Sell holding error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Update holding
// @route   PUT /api/portfolio/update/:id
// @access  Private
const updateHolding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity, buyPrice, currentPrice } = req.body;
    
    await Portfolio.update(id, userId, { quantity, buyPrice, currentPrice });
    res.json({ message: 'Holding updated successfully' });
  } catch (error) {
    console.error('Update holding error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Update current price
// @route   PUT /api/portfolio/price/:id
// @access  Private
const updatePrice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { currentPrice } = req.body;
    
    await Portfolio.updatePrice(id, userId, currentPrice);
    res.json({ message: 'Price updated successfully' });
  } catch (error) {
    console.error('Update price error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Delete holding
// @route   DELETE /api/portfolio/delete/:id
// @access  Private
const deleteHolding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const holdings = await Portfolio.getByUserId(userId);
    const holding = holdings.find(h => h.id == id);
    
    if (!holding) {
      return res.status(404).json({ message: 'Holding not found' });
    }
    
    await db.query(
      'DELETE FROM transactions WHERE user_id = ? AND stock_id = ?',
      [userId, holding.stock_id]
    );
    
    await Portfolio.delete(id, userId);
    
    res.json({ 
      message: `Holding and all transactions deleted successfully` 
    });
  } catch (error) {
    console.error('Delete holding error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Get transactions history
// @route   GET /api/portfolio/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.getByUserId(userId);
    console.log("📊 Transactions found:", transactions.length);
    res.json(transactions || []);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json([]);
  }
};

module.exports = {
  getHoldings,
  addHolding,
  sellHolding,
  updateHolding,
  updatePrice,
  deleteHolding,
  getTransactions,
};