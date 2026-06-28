const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../Middleware/authMiddleware');

router.get('/trial-balance', protect, reportController.getTrialBalanceReport);
router.get('/profit-loss', protect, reportController.getProfitAndLossReport);
router.get('/balance-sheet', protect, reportController.getBalanceSheetReport);
router.get('/day-book', protect, reportController.getDayBookReport);
router.get('/stock-summary', protect, reportController.getStockSummaryReport);

module.exports = router;
