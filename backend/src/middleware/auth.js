import { User } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub).lean();

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    req.user = {
      _id: 'admin',
      name: 'SkillBridge Admin',
      email: decoded.email || 'admin@skillbridge.local',
      role: 'admin'
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return next();
  };
}
