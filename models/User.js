const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    // Create user
    create: async (userData) => {
        const { username, email, password, role } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            `INSERT INTO users (username, email, password, role) 
             VALUES (?, ?, ?, ?)`,
            [username, email, hashedPassword, role || 'client']
        );
        return result;
    },

    // Find by email
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    // Find by id
    findById: async (id) => {
        const [rows] = await db.query('SELECT id, username, email, role, balance FROM users WHERE id = ?', [id]);
        return rows[0];
    },

    // Update balance
    updateBalance: async (userId, newBalance) => {
        const [result] = await db.query(
            'UPDATE users SET balance = ? WHERE id = ?',
            [newBalance, userId]
        );
        return result;
    }
};

module.exports = User;