const pool = require('../config/db');

/**
 * Middleware to enforce single-active-user operations.
 * Intercepts mutating requests (POST, PUT, DELETE) and validates/acquires session locks.
 */
const checkLock = async (req, res, next) => {
  // Only intercept mutating write requests
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Skip lock checking for authentication routes, company lists, and settings endpoints
    const skipPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/verify',
      '/companies',
      '/settings/lock-status',
      '/settings/lock/release'
    ];
    
    if (skipPaths.some(p => req.originalUrl.includes(p))) {
      return next();
    }

    const companyId = req.headers['x-company-id'] || req.query?.company_id || req.body?.company_id;
    if (!companyId) {
      // If no company context is provided, let it pass (could be user creation or setup)
      return next();
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      // Query if there is an active lock for the company
      const lockRes = await pool.query(
        `SELECT l.*, u.name as user_name 
         FROM system_locks l
         JOIN users u ON l.user_id = u.id
         WHERE l.company_id = $1 AND l.expires_at >= NOW()`,
        [companyId]
      );

      if (lockRes.rows.length > 0) {
        const lock = lockRes.rows[0];
        
        // If the lock is held by another user, block the request
        if (lock.user_id !== userId) {
          console.warn(`[LockMiddleware] Blocked mutating request from ${userId} because lock is held by ${lock.user_id} (${lock.user_name})`);
          return res.status(423).json({
            message: `Concurrency Lock: User "${lock.user_name}" is currently editing the database. Please try again later.`,
            lockHolder: lock.user_name,
            expiresAt: lock.expires_at
          });
        }
      }

      // If no active lock exists, or it is held by the same user, acquire/extend the lock for 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      await pool.query(
        `INSERT INTO system_locks (company_id, user_id, locked_at, expires_at)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (company_id) 
         DO UPDATE SET user_id = $2, locked_at = NOW(), expires_at = $3`,
        [companyId, userId, expiresAt]
      );
      
    } catch (err) {
      console.error('[LockMiddleware Error] Failed to enforce concurrency lock:', err);
    }
  }
  next();
};

module.exports = { checkLock };
