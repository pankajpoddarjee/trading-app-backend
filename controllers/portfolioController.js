const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
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
    const { symbol, companyName, quantity, buyPrice, currentPrice } = req.body;
    
    // Validation
    if (!symbol || !companyName || !quantity || !buyPrice) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if already exists
    const existingHoldings = await Portfolio.getByUserId(userId);
    const existing = existingHoldings.find(h => h.symbol === symbol.toUpperCase());
    
    if (existing) {
      // ✅ Update: add quantity and recalculate average buy price
      const totalCost = (existing.quantity * existing.buy_price) + (quantity * buyPrice);
      const newQuantity = existing.quantity + quantity;
      const newAvgPrice = totalCost / newQuantity;
      
      await Portfolio.update(existing.id, userId, {
        quantity: newQuantity,
        buyPrice: newAvgPrice,
        currentPrice: currentPrice || buyPrice,
      });
      
      // Add transaction for new purchase
      await Transaction.add({
        userId,
        symbol: symbol.toUpperCase(),
        companyName,
        type: 'BUY',
        quantity,
        price: buyPrice,
        totalAmount: quantity * buyPrice,
      });
      
      // ✅ Update user balance (deduct money)
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
      symbol: symbol.toUpperCase(),
      companyName,
      quantity,
      buyPrice,
      currentPrice: currentPrice || buyPrice,
    });
    
    await Transaction.add({
      userId,
      symbol: symbol.toUpperCase(),
      companyName,
      type: 'BUY',
      quantity,
      price: buyPrice,
      totalAmount: quantity * buyPrice,
    });
    
    // ✅ Update user balance (deduct money)
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
    const { symbol, quantity, sellPrice } = req.body;
    
    // Validation
    if (!symbol || !quantity || !sellPrice) {
      return res.status(400).json({ message: 'Symbol, quantity and sell price are required' });
    }
    
    // Check if holding exists
    const holdings = await Portfolio.getByUserId(userId);
    const holding = holdings.find(h => h.symbol === symbol.toUpperCase());
    
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
    
    // Add sell transaction
    await Transaction.add({
      userId,
      symbol: symbol.toUpperCase(),
      companyName: holding.company_name,
      type: 'SELL',
      quantity,
      price: sellPrice,
      totalAmount: totalSellAmount,
    });
    
    if (remainingQuantity === 0) {
      // Delete holding if quantity becomes 0
      await Portfolio.delete(holding.id, userId);
    } else {
      // Update holding with remaining quantity
      await Portfolio.update(holding.id, userId, {
        quantity: remainingQuantity,
        buyPrice: holding.buy_price,
        currentPrice: sellPrice,
      });
    }
    
    // ✅ Update user balance (add money)
    await db.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [totalSellAmount, userId]
    );
    
    res.json({
      message: `Sold ${quantity} shares of ${symbol} at ₹${sellPrice}`,
      remainingQuantity,
      totalSellAmount,
      sellPrice,
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
    
    // ✅ Get holding first
    const holdings = await Portfolio.getByUserId(userId);
    const holding = holdings.find(h => h.id == id);
    
    if (!holding) {
      return res.status(404).json({ message: 'Holding not found' });
    }
    
    // ✅ Delete all transactions for this symbol (BUY + SELL)
    await db.query(
      'DELETE FROM transactions WHERE user_id = ? AND symbol = ?',
      [userId, holding.symbol]
    );
    
    // ✅ Delete holding
    await Portfolio.delete(id, userId);
    
    res.json({ 
      message: `Holding and all transactions for ${holding.symbol} deleted successfully` 
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
    console.log("📊 Transactions found:", transactions.length); // ✅ Debug log
    res.json(transactions || []);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json([]); // ✅ Always return array
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