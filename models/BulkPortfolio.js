const db = require('../config/db');

const BulkPortfolio = {
  // Get all bulk holdings
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      `SELECT bp.*, ms.symbol, ms.company_name 
       FROM bulk_portfolio bp
       JOIN master_stocks ms ON bp.stock_id = ms.id
       WHERE bp.user_id = ?
       ORDER BY ms.symbol`,
      [userId]
    );
    return rows;
  },

  // Add multiple holdings
  addBulk: async (entries) => {
    if (!entries || entries.length === 0) return [];
    
    const results = [];
    for (const entry of entries) {
      const { userId, stockId, quantity, buyPrice, currentPrice, transactionDate } = entry;
      const [result] = await db.query(
        `INSERT INTO bulk_portfolio (user_id, stock_id, quantity, buy_price, current_price, transaction_date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, stockId, quantity, buyPrice, currentPrice || buyPrice, transactionDate || new Date()]
      );
      results.push(result);
    }
    return results;
  },

  // Delete bulk holding
  delete: async (id, userId) => {
    const [result] = await db.query(
      'DELETE FROM bulk_portfolio WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result;
  },
};

module.exports = BulkPortfolio;