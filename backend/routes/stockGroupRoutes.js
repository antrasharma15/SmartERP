const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  getStockGroups,
  createStockGroup,
  updateStockGroup,
  deleteStockGroup
} = require('../controllers/stockController');

// All stock group endpoints require session authentication
router.use(protect);

router.get('/', getStockGroups);
router.post('/', createStockGroup);
router.put('/:id', updateStockGroup);
router.delete('/:id', deleteStockGroup);

module.exports = router;
