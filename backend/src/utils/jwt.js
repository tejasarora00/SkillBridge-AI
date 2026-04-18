import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function createAdminToken() {
  return jwt.sign(
    {
      sub: 'admin',
      role: 'admin',
      email: 'admin@skillbridge.local'
    },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
