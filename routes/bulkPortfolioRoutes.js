const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBulkHoldings,
  addBulkHoldings,
  deleteBulkHolding,
} = require('../controllers/bulkPortfolioController');

router.get('/', protect, getBulkHoldings);
router.post('/add-bulk', protect, addBulkHoldings);
router.delete('/delete/:id', protect, deleteBulkHolding);

module.exports = router;