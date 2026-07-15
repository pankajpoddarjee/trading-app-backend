const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllStocks,searchStocks, addMasterStock, updateMasterStock,
  deleteMasterStock, } = require('../controllers/masterStockController');
router.get('/', protect, getAllStocks);
router.get('/search', protect, searchStocks);
router.post('/add', protect, addMasterStock);
router.put('/update/:id', protect, updateMasterStock);
router.delete('/delete/:id', protect, deleteMasterStock);

module.exports = router;