import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'skillbridge-dev-secret',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  redisUrl: process.env.REDIS_URL || '',
  cacheDefaultTtlSeconds: Number(process.env.CACHE_DEFAULT_TTL_SECONDS || 300),
  recruiterCandidateSnapshotTtlSeconds: Number(process.env.RECRUITER_CANDIDATE_SNAPSHOT_TTL_SECONDS || 180),
  recruiterCandidateBriefTtlSeconds: Number(process.env.RECRUITER_CANDIDATE_BRIEF_TTL_SECONDS || 900),
  studentProfileTtlSeconds: Number(process.env.STUDENT_PROFILE_TTL_SECONDS || 300),
  studentDashboardTtlSeconds: Number(process.env.STUDENT_DASHBOARD_TTL_SECONDS || 120)
};
