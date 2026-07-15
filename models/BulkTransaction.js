const db = require('../config/db');

const BulkTransaction = {
  // Add multiple transactions
  addBulk: async (entries) => {
    if (!entries || entries.length === 0) return [];
    
    const results = [];
    for (const entry of entries) {
      const { userId, stockId, quantity, price, totalAmount, transactionDate } = entry;
      const [result] = await db.query(
        `INSERT INTO bulk_transactions (user_id, stock_id, quantity, price, total_amount, transaction_date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, stockId, quantity, price, totalAmount, transactionDate || new Date()]
      );
      results.push(result);
    }
    return results;
  },

  // Get all bulk transactions
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      `SELECT bt.*, ms.symbol, ms.company_name 
       FROM bulk_transactions bt
       JOIN master_stocks ms ON bt.stock_id = ms.id
       WHERE bt.user_id = ?
       ORDER BY bt.created_at DESC`,
      [userId]
    );
    return rows;
  },
};

module.exports = BulkTransaction;