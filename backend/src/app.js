import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import recruiterRoutes from './routes/recruiterRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { User } from './models/User.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = new Set([
        env.clientUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001'
      ]);

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS not allowed.'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'SkillBridge AI API' });
});

app.get('/api/stats', async (req, res) => {
  const [studentsJoined, recruitersJoined] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'recruiter' })
  ]);

  res.json({
    studentsJoined,
    recruitersJoined
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', requireAuth, requireRole('student'), studentRoutes);
app.use('/api/ai', requireAuth, requireRole('student'), aiRoutes);
app.use('/api/tasks', requireAuth, requireRole('student'), aiRoutes);
app.use('/api/recruiter', requireAuth, requireRole('recruiter'), recruiterRoutes);

// Route aliases make local setup more forgiving when the frontend API URL is configured without /api.
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/students', requireAuth, requireRole('student'), studentRoutes);
app.use('/ai', requireAuth, requireRole('student'), aiRoutes);
app.use('/tasks', requireAuth, requireRole('student'), aiRoutes);
app.use('/recruiter', requireAuth, requireRole('recruiter'), recruiterRoutes);
app.get('/stats', async (req, res) => {
  const [studentsJoined, recruitersJoined] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'recruiter' })
  ]);

  res.json({
    studentsJoined,
    recruitersJoined
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

export default app;
