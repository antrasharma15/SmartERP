const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  getLedgers,
  getGroups,
  createLedger,
  getLedger,
  updateLedger,
  deleteLedger
} = require('../controllers/ledgerController');

// All ledger endpoints require session authentication
router.use(protect);

router.get('/', getLedgers);
router.get('/groups', getGroups);
router.post('/', createLedger);
router.get('/:id', getLedger);
router.put('/:id', updateLedger);
router.delete('/:id', deleteLedger);

module.exports = router;
