const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateProfile, changePassword } = require('../controllers/profileController');

router.put('/update', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;