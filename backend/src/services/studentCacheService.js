import { env } from '../config/env.js';
import { deleteCachedByPattern, getCachedJson, setCachedJson } from './cacheService.js';

const CACHE_VERSION = 'v1';

function studentProfileKey(studentUserId) {
  return `student:profile:${CACHE_VERSION}:${studentUserId}`;
}

function studentDashboardKey(studentUserId) {
  return `student:dashboard:${CACHE_VERSION}:${studentUserId}`;
}

function studentExpertSessionsKey(studentUserId) {
  return `student:expert-sessions:${CACHE_VERSION}:${studentUserId}`;
}

export async function getCachedStudentProfile(studentUserId) {
  return getCachedJson(studentProfileKey(studentUserId));
}

export async function setCachedStudentProfile(studentUserId, payload) {
  await setCachedJson(studentProfileKey(studentUserId), payload, env.studentProfileTtlSeconds);
}

export async function getCachedStudentDashboard(studentUserId) {
  return getCachedJson(studentDashboardKey(studentUserId));
}

export async function setCachedStudentDashboard(studentUserId, payload) {
  await setCachedJson(studentDashboardKey(studentUserId), payload, env.studentDashboardTtlSeconds);
}

export async function getCachedStudentExpertSessions(studentUserId) {
  return getCachedJson(studentExpertSessionsKey(studentUserId));
}

export async function setCachedStudentExpertSessions(studentUserId, payload) {
  await setCachedJson(studentExpertSessionsKey(studentUserId), payload, env.studentDashboardTtlSeconds);
}

export async function invalidateStudentProfileCache(studentUserId) {
  await deleteCachedByPattern(studentProfileKey(studentUserId));
}

export async function invalidateStudentDashboardCache(studentUserId) {
  await deleteCachedByPattern(studentDashboardKey(studentUserId));
}

export async function invalidateStudentExpertSessionsCache(studentUserId) {
  await deleteCachedByPattern(studentExpertSessionsKey(studentUserId));
}

export async function invalidateStudentReadCaches(studentUserId) {
  await Promise.all([
    invalidateStudentProfileCache(studentUserId),
    invalidateStudentDashboardCache(studentUserId),
    invalidateStudentExpertSessionsCache(studentUserId)
  ]);
}
