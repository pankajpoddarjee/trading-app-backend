const db = require('../config/db');

const Transaction = {
  // Add transaction record
  add: async (data) => {
    const { userId, stockId, type, quantity, price, totalAmount, transactionDate } = data;
    const [result] = await db.query(
      `INSERT INTO transactions (user_id, stock_id, type, quantity, price, total_amount, transaction_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, stockId, type, quantity, price, totalAmount, transactionDate || new Date()]
    );
    return result;
  },

  // Get all transactions of a user with stock details
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      `SELECT t.*, ms.symbol, ms.company_name 
       FROM transactions t
       JOIN master_stocks ms ON t.stock_id = ms.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return rows;
  },
};

module.exports = Transaction;