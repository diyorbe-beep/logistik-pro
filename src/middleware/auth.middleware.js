import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { UserModel } from '../models/user.model.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    const dbUser = UserModel.findById(user.id);
    if (!dbUser) {
      return res.status(401).json({ 
        error: 'User account no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = dbUser;
    next();
  });
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
