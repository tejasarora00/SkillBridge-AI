import { env } from '../config/env.js';
import { deleteCachedByPattern, getCachedJson, setCachedJson } from './cacheService.js';

const CACHE_VERSION = 'v1';

function normalizeKeyPart(value) {
  return encodeURIComponent(String(value || '').trim().toLowerCase() || 'all');
}

function recruiterSnapshotKey(recruiterId, { minimumScore = 0, targetCareer = '' } = {}) {
  return `recruiter:candidates:${CACHE_VERSION}:${recruiterId}:min:${minimumScore}:target:${normalizeKeyPart(targetCareer)}`;
}

function recruiterBriefKey(recruiterId, studentProfileId) {
  return `recruiter:brief:${CACHE_VERSION}:${recruiterId}:${studentProfileId}`;
}

export async function getCachedRecruiterCandidateSnapshot(recruiterId, filters = {}) {
  return getCachedJson(recruiterSnapshotKey(recruiterId, filters));
}

export async function setCachedRecruiterCandidateSnapshot(recruiterId, filters = {}, snapshot) {
  await setCachedJson(
    recruiterSnapshotKey(recruiterId, filters),
    snapshot,
    env.recruiterCandidateSnapshotTtlSeconds
  );
}

export async function getCachedRecruiterCandidateBrief(recruiterId, studentProfileId) {
  return getCachedJson(recruiterBriefKey(recruiterId, studentProfileId));
}

export async function setCachedRecruiterCandidateBrief(recruiterId, studentProfileId, brief) {
  await setCachedJson(
    recruiterBriefKey(recruiterId, studentProfileId),
    brief,
    env.recruiterCandidateBriefTtlSeconds
  );
}

export async function invalidateAllRecruiterCandidateSnapshots() {
  await deleteCachedByPattern(`recruiter:candidates:${CACHE_VERSION}:*`);
}

export async function invalidateRecruiterCandidateSnapshotsForRecruiter(recruiterId) {
  await deleteCachedByPattern(`recruiter:candidates:${CACHE_VERSION}:${recruiterId}:*`);
}

export async function invalidateRecruiterCandidateBriefsForStudent(studentProfileId) {
  await deleteCachedByPattern(`recruiter:brief:${CACHE_VERSION}:*:${studentProfileId}`);
}
