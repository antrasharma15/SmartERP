const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  getVouchers,
  getVoucher,
  createVoucher,
  deleteVoucher
} = require('../controllers/voucherController');

// All voucher endpoints require session authentication
router.use(protect);

router.get('/', getVouchers);
router.post('/', createVoucher);
router.get('/:id', getVoucher);
router.delete('/:id', deleteVoucher);

module.exports = router;
