import app from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initializeCache } from './services/cacheService.js';

async function startServer() {
  try {
    await connectToDatabase();
    await initializeCache();
    app.listen(env.port, () => {
      console.log(`SkillBridge API running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
