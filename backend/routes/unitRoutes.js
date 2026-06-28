const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit
} = require('../controllers/stockController');

// All unit endpoints require session authentication
router.use(protect);

router.get('/', getUnits);
router.post('/', createUnit);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);

module.exports = router;
