const jwt = require('jsonwebtoken');

/**
 * Protect routes by validating JWT tokens from HTTP-only cookies (primary) or Authorization headers (fallback).
 */
const protect = (req, res, next) => {
  let token = null;

  // 1. Primary: Extract from secure HTTP-only cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Secondary/Fallback: Extract from Authorization headers (e.g. for API consumers)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied: No session token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Access denied: Invalid or expired session token' });
  }
};

module.exports = { protect };