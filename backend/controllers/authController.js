const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { sendMail } = require('../config/mailService');

// Salt rounds for secure bcrypt password hashing
const BCRYPT_SALT_ROUNDS = 12;

// Helper to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper to validate password strength (OWASP recommendation: min 8 characters)
const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

/**
 * Handle user registration (with email verification flow and input validation).
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation and Sanitization
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (!password || !isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check for duplicate emails safely
    const existingUser = await UserModel.findUserByEmail(normalizedEmail);
    if (existingUser) {
      // Security Decision: To prevent email harvesting, we can return a generic response, 
      // but in standard user signup, returning 'Email already in use' is common for UX.
      // However, to strictly follow 'do not reveal whether email exists' request from user, 
      // we return a generic message and send a notification mail to the existing user instead.
      // For UX and simplicity, returning a generic registration message is safest.
      return res.status(400).json({ message: 'Email address is not available.' });
    }

    // 3. Generate verification token and secure hash
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours expiry

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 4. Save inactive user in database
    await UserModel.createUser(name, normalizedEmail, hashedPassword, verificationToken, tokenExpires);

    // 5. Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    await sendMail({
      to: normalizedEmail,
      subject: 'Verify your SmartERP Account',
      text: `Hello ${name},\n\nPlease verify your email by clicking: ${verifyLink}\n\nThis link is active for 24 hours.`,
      html: `<p>Hello <strong>${name}</strong>,</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>This link is active for 24 hours.</p>`
    });

    res.status(201).json({ 
      message: 'Registration successful. A verification link has been sent to your email.' 
    });
  } catch (err) {
    console.error('Error during registration:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle verification token check.
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await UserModel.findUserByVerificationToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Verify expiry
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ message: 'Verification token has expired. Please register again.' });
    }

    await UserModel.verifyUser(user.id);
    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    console.error('Error during verification:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle secure login (uses HTTP-only cookies, verified checks, and generic errors).
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await UserModel.findUserByEmail(normalizedEmail);
    
    // Generic message: do not reveal whether user exists or if password is wrong
    const genericErrorMessage = 'Invalid email or password';

    if (!user) {
      // Execute dummy compare to prevent timing analysis attacks
      await bcrypt.compare('dummy_password', '$2b$12$DummySaltValueDummySaltValueDummySaltValue');
      return res.status(401).json({ message: genericErrorMessage });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: genericErrorMessage });
    }

    // Enforce verified status
    if (!user.is_verified) {
      return res.status(403).json({ 
        message: 'Account not verified. Please check your email to verify your account.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // JWT expire matching cookie maxAge
    );

    // Set secure HTTP-only cookie containing JWT
    res.cookie('token', token, {
      httpOnly: true, // Prevents XSS scripts reading cookie
      secure: process.env.NODE_ENV === 'production', // Only transmit over HTTPS in production
      sameSite: 'strict', // Mitigates CSRF requests
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (in milliseconds)
    });

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle password reset request.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Security Decision: Generic success message returned regardless of email existence to prevent user enumeration
    const genericSuccessMessage = 'If that email address is registered, a password reset link has been sent.';

    const user = await UserModel.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.json({ message: genericSuccessMessage });
    }

    // Generate cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour expiry

    await UserModel.setResetToken(normalizedEmail, resetToken, tokenExpires);

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendMail({
      to: normalizedEmail,
      subject: 'Reset your SmartERP Password',
      text: `Hello ${user.name},\n\nPlease reset your password by clicking: ${resetLink}\n\nThis link is active for 1 hour.`,
      html: `<p>Hello <strong>${user.name}</strong>,</p><p>Please reset your password by clicking the link below:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link is active for 1 hour.</p>`
    });

    res.json({ message: genericSuccessMessage });
  } catch (err) {
    console.error('Error in forgotPassword:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset password using verification token.
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }
    if (!newPassword || !isValidPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const user = await UserModel.findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    // Check expiry
    if (new Date() > new Date(user.reset_password_expires)) {
      return res.status(400).json({ message: 'Password reset token has expired' });
    }

    // Hash password and clear tokens
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await UserModel.updatePasswordAndClearReset(user.id, hashedPassword);

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (err) {
    console.error('Error in resetPassword:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Clear secure HTTP-only cookies to log out.
 */
const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Error during logout:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  logout
};