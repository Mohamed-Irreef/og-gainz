// Phase 1 skeleton only
module.exports = (req, res, next) => {
  // TODO (Phase 2): Ensure req.user is set by real auth.middleware (JWT) and enforce permissions.
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin role required',
    });
  }

  return next();
};
