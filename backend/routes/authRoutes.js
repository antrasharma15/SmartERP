const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  logout
} = require('../controllers/authController');
const { forgotPasswordLimiter } = require('../Middleware/rateLimiter');

// Authentication & Session Endpoints
router.post('/register', register);
router.post('/verify', verifyEmail);
router.post('/login', login);
router.post('/logout', logout);

// Password Reset Lifecycle Endpoints
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;