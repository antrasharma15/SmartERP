const rateLimit = require('express-rate-limit');

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// Rate limiter for login and registration endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevOrTest ? 100 : 5, // Default to strict limit (5) unless explicitly in dev/test mode
  message: {
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for forgot-password/reset requests to prevent spamming
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevOrTest ? 100 : 3, // Default to strict limit (3) unless explicitly in dev/test mode
  message: {
    message: 'Too many password reset requests from this IP. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  forgotPasswordLimiter
};
