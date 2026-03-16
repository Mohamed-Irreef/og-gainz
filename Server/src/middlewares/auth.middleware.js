const jwt = require('jsonwebtoken');

const { ENV } = require('../config/env.config');
const User = require('../models/User.model');

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
};

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(token, ENV.JWT_SECRET);

    if (!payload || typeof payload !== 'object' || !payload.userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token user',
      });
    }

    req.user = {
      id: String(user._id),
      role: user.role,
    };

    return next();
  } catch (err) {
    // jsonwebtoken errors: JsonWebTokenError / TokenExpiredError
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
};
