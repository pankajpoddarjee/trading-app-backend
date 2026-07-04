const db = require('../config/db');

const MasterStock = {
  // Search stocks by symbol or company name
  search: async (query) => {
    const [rows] = await db.query(
      `SELECT * FROM master_stocks 
       WHERE symbol LIKE ? OR company_name LIKE ? 
       AND is_active = 1
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  },

  // Add new stock to master
  add: async (data) => {
    const { symbol, companyName, sector, exchange } = data;
    const [result] = await db.query(
      `INSERT INTO master_stocks (symbol, company_name, sector, exchange) 
       VALUES (?, ?, ?, ?)`,
      [symbol, companyName, sector, exchange || 'NSE']
    );
    return result;
  },

  // Get stock by symbol
  getBySymbol: async (symbol) => {
    const [rows] = await db.query(
      'SELECT * FROM master_stocks WHERE symbol = ?',
      [symbol]
    );
    return rows[0];
  },
};

module.exports = MasterStock;