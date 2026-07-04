const db = require('../config/db');

const Portfolio = {
  // Get all holdings of a user with stock details
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      `SELECT p.*, ms.symbol, ms.company_name 
       FROM portfolio p
       JOIN master_stocks ms ON p.stock_id = ms.id
       WHERE p.user_id = ?
       ORDER BY ms.symbol`,
      [userId]
    );
    return rows;
  },

  // Add new holding
  add: async (data) => {
    const { userId, stockId, quantity, buyPrice, currentPrice, transactionDate } = data;
    const [result] = await db.query(
      `INSERT INTO portfolio (user_id, stock_id, quantity, buy_price, current_price, transaction_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, stockId, quantity, buyPrice, currentPrice || buyPrice, transactionDate || new Date()]
    );
    return result;
  },

  // Update holding
  update: async (id, userId, data) => {
    const { quantity, buyPrice, currentPrice } = data;
    const [result] = await db.query(
      `UPDATE portfolio SET quantity = ?, buy_price = ?, current_price = ? 
       WHERE id = ? AND user_id = ?`,
      [quantity, buyPrice, currentPrice, id, userId]
    );
    return result;
  },

  // Delete holding
  delete: async (id, userId) => {
    const [result] = await db.query(
      'DELETE FROM portfolio WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result;
  },

  // Update current price only
  updatePrice: async (id, userId, currentPrice) => {
    const [result] = await db.query(
      'UPDATE portfolio SET current_price = ? WHERE id = ? AND user_id = ?',
      [currentPrice, id, userId]
    );
    return result;
  },
};

module.exports = Portfolio;