import bcrypt from 'bcryptjs';
import { StudentProfile, User } from '../models/index.js';
import { createToken } from '../utils/jwt.js';
import { sanitizeUser } from '../utils/response.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(req, res) {
  try {
    const { name, email, password, role = 'student' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPassword = String(password || '');

    if (normalizedName.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long.' });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (normalizedPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: role === 'recruiter' ? 'recruiter' : 'student'
    });

    if (user.role === 'student') {
      await StudentProfile.create({
        userId: user._id
      });
    }

    return res.status(201).json({
      token: createToken(user),
      user: sanitizeUser(user)
    });
  } catch {
    return res.status(500).json({ message: 'Unable to create account.' });
  }
}

export async function login(req, res) {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    return res.json({
      token: createToken(user),
      user: sanitizeUser(user)
    });
  } catch {
    return res.status(500).json({ message: 'Unable to log in.' });
  }
}

export async function getMe(req, res) {
  return res.json({
    user: sanitizeUser(req.user)
  });
}
