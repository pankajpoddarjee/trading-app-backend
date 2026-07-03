const db = require('../config/db');

const Transaction = {
  // Add transaction record
  add: async (data) => {
    const { userId, symbol, companyName, type, quantity, price, totalAmount } = data;
    const [result] = await db.query(
      `INSERT INTO transactions (user_id, symbol, company_name, type, quantity, price, total_amount) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, symbol, companyName, type, quantity, price, totalAmount]
    );
    return result;
  },

  // Get all transactions of a user
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },
};

module.exports = Transaction;