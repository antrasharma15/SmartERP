const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { checkLock } = require('../Middleware/lockMiddleware');
const settingsController = require('../controllers/settingsController');

// All settings routes require authentication
router.use(protect);

// Apply Concurrency Session Lock middleware for mutating routes (POST, PUT, DELETE)
router.use(checkLock);

// 1. Company Profile Settings
router.put('/company', settingsController.updateCompanySettings);

// 2. Concurrency Lock Status & Force Release
router.get('/lock-status', settingsController.getLockStatus);
router.post('/lock/release', settingsController.releaseLock);

// 3. User Management (Simplified)
router.get('/users', settingsController.getCompanyUsers);
router.post('/users/invite', settingsController.inviteCompanyUser);
router.put('/users/role', settingsController.updateCompanyUserRole);
router.put('/users/status', settingsController.toggleCompanyUserStatus);

// 4. Invoice/Document Settings
router.get('/invoice', settingsController.getInvoiceSettings);
router.put('/invoice', settingsController.updateInvoiceSettings);

// 5. Tax Settings
router.get('/taxes', settingsController.getTaxSettings);
router.post('/taxes', settingsController.createTaxRate);
router.put('/taxes/:id', settingsController.updateTaxRate);
router.delete('/taxes/:id', settingsController.deleteTaxRate);

// 6. Notification Settings
router.get('/notifications', settingsController.getNotificationSettings);
router.put('/notifications', settingsController.updateNotificationSettings);

// 7. User Security & Profile Toggles
router.put('/profile', settingsController.updateUserProfile);
router.put('/change-password', settingsController.changeUserPassword);

// 8. Audit Logs & Data Export
router.get('/audit-logs', settingsController.getAuditLogs);
router.get('/export/csv', settingsController.exportTransactionsCSV);

module.exports = router;
