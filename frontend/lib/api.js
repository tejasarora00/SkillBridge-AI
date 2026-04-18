const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function buildCandidateUrls(path) {
  const normalizedBase = normalizeBaseUrl(API_URL);
  const candidates = [`${normalizedBase}${path}`];

  if (normalizedBase.endsWith('/api')) {
    candidates.push(`${normalizedBase.slice(0, -4)}${path}`);
  } else {
    candidates.push(`${normalizedBase}/api${path}`);
  }

  return [...new Set(candidates)];
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  let lastErrorMessage = 'Something went wrong.';
  let lastNetworkError = null;

  for (const url of buildCandidateUrls(path)) {
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers
      });
    } catch (error) {
      lastNetworkError = error;
      continue;
    }

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return data;
    }

    const message = data.message || 'Something went wrong.';
    lastErrorMessage = message;

    const canRetryWithAnotherUrl = message === 'Route not found.' || response.status === 404;
    if (canRetryWithAnotherUrl) {
      continue;
    }

    throw new Error(message);
  }

  if (lastErrorMessage === 'Route not found.') {
    throw new Error(
      'Backend route not found. Restart the backend server and verify NEXT_PUBLIC_API_URL points to your Express API.'
    );
  }

  if (lastNetworkError) {
    throw new Error(
      'Unable to reach the backend API. Make sure the backend server is running and NEXT_PUBLIC_API_URL points to it.'
    );
  }

  throw new Error(lastErrorMessage);
}

export async function apiRequest(path, options = {}) {
  return request(path, options);
}

export async function authRequest(path, token, options = {}) {
  return request(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}
