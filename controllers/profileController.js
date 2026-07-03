const db = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Update profile
// @route   PUT /api/profile/update
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = users[0];

    if (username && username !== user.username) {
      const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    if (email && email !== user.email) {
      const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    await db.query(
      'UPDATE users SET username = ?, email = ? WHERE id = ?',
      [username || user.username, email || user.email, userId]
    );

    const [updatedUsers] = await db.query('SELECT id, username, email, balance, role FROM users WHERE id = ?', [userId]);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUsers[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/profile/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = users[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  updateProfile,
  changePassword,
};