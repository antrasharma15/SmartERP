const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect } = require('../Middleware/authMiddleware');

router.get('/', protect, customerController.getCustomers);
router.post('/', protect, customerController.createCustomer);
router.delete('/:id', protect, customerController.deleteCustomer);

module.exports = router;
