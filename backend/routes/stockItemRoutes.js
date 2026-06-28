const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  getStockItems,
  createStockItem,
  getStockItem,
  updateStockItem,
  deleteStockItem
} = require('../controllers/stockController');

// All stock item endpoints require session authentication
router.use(protect);

router.get('/', getStockItems);
router.post('/', createStockItem);
router.get('/:id', getStockItem);
router.put('/:id', updateStockItem);
router.delete('/:id', deleteStockItem);

module.exports = router;
