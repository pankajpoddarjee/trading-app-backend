const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { searchStocks, addMasterStock } = require('../controllers/masterStockController');

router.get('/search', protect, searchStocks);
router.post('/add', protect, addMasterStock);

module.exports = router;