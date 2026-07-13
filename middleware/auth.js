// Authentication & Authorization Middleware
// Session-based authentication and role-based access control

/**
 * Middleware to check if user is authenticated
 * Use this for routes that require any logged-in user
 */
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login.'
    });
  }
  next();
};

/**
 * Middleware to check if user is Admin
 * Use this for admin-only routes
 */
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.session.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required. Your role does not have permission.'
    });
  }

  next();
};

/**
 * Middleware to check if user has specific role
 * Usage: requireRole('Admin', 'Billing')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.session.user.role}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is Billing user or Admin
 */
const requireBillingAccess = requireRole('Admin', 'Billing');

/**
 * Middleware to check if user is Stock user or Admin
 */
const requireStockAccess = requireRole('Admin', 'Stock');

/**
 * Middleware to log all authenticated requests
 */
const logAuthenticatedRequest = (req, res, next) => {
  if (req.session.user) {
    console.log(`[${new Date().toISOString()}] ${req.session.user.role} - ${req.session.user.username} - ${req.method} ${req.path}`);
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireRole,
  requireBillingAccess,
  requireStockAccess,
  logAuthenticatedRequest
};

