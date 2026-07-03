const db = require('../config/db');

const Portfolio = {
  // Get all holdings of a user
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      'SELECT * FROM portfolio WHERE user_id = ? ORDER BY symbol',
      [userId]
    );
    return rows;
  },

  // Add new holding
  add: async (data) => {
    const { userId, symbol, companyName, quantity, buyPrice, currentPrice } = data;
    const [result] = await db.query(
      `INSERT INTO portfolio (user_id, symbol, company_name, quantity, buy_price, current_price) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, symbol, companyName, quantity, buyPrice, currentPrice || buyPrice]
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