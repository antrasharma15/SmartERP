const pool = require('../config/db');

/**
 * Creates a new inactive user with a verification token and expiration.
 */
const createUser = async (name, email, hashedPassword, verificationToken, tokenExpires) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, verification_token, verification_token_expires) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, name, email, role, is_verified`,
    [name, email, hashedPassword, verificationToken, tokenExpires]
  );
  return result.rows[0];
};

/**
 * Finds a user by email address (parameterized query to prevent SQLi).
 */
const findUserByEmail = async (email) => {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0];
};

/**
 * Finds a user by verification token.
 */
const findUserByVerificationToken = async (token) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE verification_token = $1`,
    [token]
  );
  return result.rows[0];
};

/**
 * Verifies the user's email address by clearing the verification token and setting is_verified to true.
 */
const verifyUser = async (userId) => {
  const result = await pool.query(
    `UPDATE users 
     SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW() 
     WHERE id = $1 
     RETURNING id, name, email, is_verified`,
    [userId]
  );
  return result.rows[0];
};

/**
 * Sets a reset password token and expiration for the specified email.
 */
const setResetToken = async (email, token, expires) => {
  const result = await pool.query(
    `UPDATE users 
     SET reset_password_token = $1, reset_password_expires = $2, updated_at = NOW() 
     WHERE email = $3 
     RETURNING id, email`,
    [token, expires, email]
  );
  return result.rows[0];
};

/**
 * Finds a user by a reset password token.
 */
const findUserByResetToken = async (token) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE reset_password_token = $1`,
    [token]
  );
  return result.rows[0];
};

/**
 * Updates the user's password and clears the password reset token fields.
 */
const updatePasswordAndClearReset = async (userId, hashedPassword) => {
  const result = await pool.query(
    `UPDATE users 
     SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = NOW() 
     WHERE id = $2 
     RETURNING id, name, email`,
    [hashedPassword, userId]
  );
  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserByVerificationToken,
  verifyUser,
  setResetToken,
  findUserByResetToken,
  updatePasswordAndClearReset
};