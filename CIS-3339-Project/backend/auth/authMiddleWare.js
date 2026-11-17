// Authentication and authorization middleware shared by every protected route.
//
//   requireAuth          -> 401 unless the request carries a valid JWT
//   requireRole('editor') -> 403 unless the logged-in user has that role
//
// Usage: router.post('/', requireAuth, requireRole('editor'), handler)

// import Node.js module for verifying JWTs (JSON Web Tokens)
const jwt = require('jsonwebtoken');

// Reject the request with 401 unless it has a valid "Authorization: Bearer <token>" header.
// On success, the decoded token ({ name, role, orgId }) is available as req.user.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.header('Authorization') || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // tokens issued before organization scoping existed have no orgId; make the user log in again
    if (!decoded.orgId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Build a middleware that rejects the request with 403 unless req.user.role matches.
// Must run after requireAuth.
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to perform this action' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
