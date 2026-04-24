import { createClient } from 'redis';
import { env } from '../config/env.js';

const memoryCache = new Map();
let redisClient = null;
let redisReady = false;
let redisInitStarted = false;

function now() {
  return Date.now();
}

function toGlobRegex(pattern) {
  const escaped = String(pattern || '')
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`);
}

function getMemoryEntry(key) {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

function setMemoryEntry(key, value, ttlSeconds) {
  memoryCache.set(key, {
    value,
    expiresAt: now() + Math.max(1, Number(ttlSeconds || env.cacheDefaultTtlSeconds || 300)) * 1000
  });
}

function deleteMemoryByPattern(pattern) {
  const matcher = toGlobRegex(pattern);

  for (const key of memoryCache.keys()) {
    if (matcher.test(key)) {
      memoryCache.delete(key);
    }
  }
}

export async function initializeCache() {
  if (redisInitStarted) {
    return;
  }

  redisInitStarted = true;

  if (!env.redisUrl) {
    console.log('Cache: REDIS_URL not set, using in-memory cache.');
    return;
  }

  try {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on('error', (error) => {
      redisReady = false;
      console.warn(`Cache: Redis error, falling back to in-memory cache. ${error.message}`);
    });

    await redisClient.connect();
    redisReady = true;
    console.log('Cache: Redis connected.');
  } catch (error) {
    redisReady = false;
    redisClient = null;
    console.warn(`Cache: Redis unavailable, using in-memory cache. ${error.message}`);
  }
}

export async function getCachedJson(key) {
  if (redisReady && redisClient) {
    const cachedValue = await redisClient.get(key);
    return cachedValue ? JSON.parse(cachedValue) : null;
  }

  return getMemoryEntry(key);
}

export async function setCachedJson(key, value, ttlSeconds = env.cacheDefaultTtlSeconds) {
  if (redisReady && redisClient) {
    await redisClient.set(key, JSON.stringify(value), {
      EX: Math.max(1, Number(ttlSeconds || env.cacheDefaultTtlSeconds || 300))
    });
    return;
  }

  setMemoryEntry(key, value, ttlSeconds);
}

export async function deleteCachedKey(key) {
  if (redisReady && redisClient) {
    await redisClient.del(key);
  }

  memoryCache.delete(key);
}

export async function deleteCachedByPattern(pattern) {
  if (redisReady && redisClient) {
    const keysToDelete = [];

    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keysToDelete.push(key);
    }

    if (keysToDelete.length) {
      await redisClient.del(keysToDelete);
    }
  }

  deleteMemoryByPattern(pattern);
}
