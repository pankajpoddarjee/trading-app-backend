const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getHoldings,
  addHolding,
  sellHolding,
  updateHolding,
  updatePrice,
  deleteHolding,
  getTransactions,
} = require('../controllers/portfolioController');

router.get('/', protect, getHoldings);
router.post('/add', protect, addHolding);
router.post('/sell', protect, sellHolding);
router.put('/update/:id', protect, updateHolding);
router.put('/price/:id', protect, updatePrice);
router.delete('/delete/:id', protect, deleteHolding);
router.get('/transactions', protect, getTransactions);

module.exports = router;