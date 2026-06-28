const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect } = require('../Middleware/authMiddleware');

router.get('/', protect, invoiceController.getInvoices);
router.get('/:id', protect, invoiceController.getInvoice);
router.post('/', protect, invoiceController.createInvoice);
router.delete('/:id', protect, invoiceController.deleteInvoice);

module.exports = router;
