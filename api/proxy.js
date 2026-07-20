'use strict';

const UPSTREAM_BASE = 'https://backend.elections-professionnelles.travail.gouv.fr/api/v1';
const MAX_BODY_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

const GET_PATHS = [
  /^portal\/pv-search-stats$/,
  /^portal\/consultations\/captcha-requirement$/,
  /^portal\/establishments\/departments$/,
  /^portal\/establishments\/\d+$/,
  /^portal\/establishments\/\d+\/pvs$/,
  /^portal\/establishments\/\d+\/pvs\/\d+$/,
  /^portal\/establishments\/\d+\/pvs\/\d+\/reference$/,
  /^portal\/observation-profils$/,
  /^cms\/rubriques\/with-articles$/,
  /^cms\/articles\/[A-Za-z0-9_-]+$/,
  /^cms\/articles\/by-identifiers$/,
  /^files\/download-file\/[A-Za-z0-9_-]+$/,
  /^external\/captcha$/,
  /^external\/sound\/[0-9a-fA-F-]{36}$/,
  /^external\/info\/[0-9a-fA-F-]{36}$/,
];

const POST_PATHS = [
  /^portal\/establishments$/,
];

function normalizePath(rawPath) {
  const segments = Array.isArray(rawPath) ? rawPath : [rawPath];
  if (!segments.length || segments.some((segment) => typeof segment !== 'string')) return null;
  const path = segments.join('/');
  if (!path || path.includes('..') || path.includes('\\') || path.includes('\0')) return null;
  return path;
}

function isAllowed(method, path) {
  const patterns = method === 'GET' ? GET_PATHS : method === 'POST' ? POST_PATHS : [];
  return patterns.some((pattern) => pattern.test(path));
}

function appendQuery(url, query) {
  let count = 0;
  for (const [key, rawValue] of Object.entries(query || {})) {
    if (key === 'path' || rawValue === undefined || rawValue === null) continue;
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,49}$/.test(key)) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (count >= 20) break;
      const text = String(value);
      if (text.length <= 200) {
        url.searchParams.append(key, text);
        count += 1;
      }
    }
  }
}

function error(res, status, code, message) {
  return res.status(status).json({ code, message });
}

function createHandler({ fetchImpl = global.fetch } = {}) {
  return async function handler(req, res) {
    const method = String(req.method || '').toUpperCase();
    const path = normalizePath(req.query?.path);

    if (!path || !isAllowed(method, path)) {
      res.setHeader('Allow', 'GET, POST');
      return error(
        res,
        405,
        'SWAGGER_OPERATION_DISABLED',
        'This operation is not executable through the documentation proxy.',
      );
    }

    const target = new URL(`${UPSTREAM_BASE}/${path}`);
    appendQuery(target, req.query);

    const headers = {
      accept: req.headers?.accept || 'application/json, */*',
      'user-agent': 'elections-cse-api-docs/1.1 (+https://elections-cse-api-docs.vercel.app)',
    };
    const options = { method, headers };

    if (method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        return error(res, 413, 'REQUEST_TOO_LARGE', `Request bodies are limited to ${MAX_BODY_BYTES} bytes.`);
      }
      headers['content-type'] = 'application/json';
      options.body = body;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    options.signal = controller.signal;

    try {
      const upstream = await fetchImpl(target.toString(), options);
      const responseBody = Buffer.from(await upstream.arrayBuffer());
      for (const headerName of ['content-type', 'content-disposition', 'retry-after']) {
        const value = upstream.headers.get(headerName);
        if (value) res.setHeader(headerName, value);
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(upstream.status).send(responseBody);
    } catch (requestError) {
      const timedOut = requestError?.name === 'AbortError';
      return error(
        res,
        timedOut ? 504 : 502,
        timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
        timedOut ? 'The upstream API did not respond in time.' : 'The upstream API request failed.',
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.isAllowed = isAllowed;
module.exports.normalizePath = normalizePath;
