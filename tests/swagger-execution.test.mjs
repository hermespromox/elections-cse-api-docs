import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const require = createRequire(import.meta.url);
const projectRoot = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), 'utf8');
}

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    json(body) {
      this.setHeader('content-type', 'application/json; charset=utf-8');
      this.body = body;
      return this;
    },
  };
}

function upstreamResponse({ status = 200, body = '{}', headers = {} } = {}) {
  const normalized = new Map(
    Object.entries({ 'content-type': 'application/json', ...headers })
      .map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    status,
    headers: { get: (name) => normalized.get(name.toLowerCase()) ?? null },
    arrayBuffer: async () => Buffer.from(body),
  };
}

test('landing page explains restricted interactive execution', async () => {
  const index = await source('index.html');
  assert.doesNotMatch(index, /read-only|execution is disabled/i);
  assert.match(index, /restricted same-origin proxy/i);
});

test('Swagger enables Try it out for GET and POST requests', async () => {
  const swagger = await source('swagger.js');
  assert.match(swagger, /supportedSubmitMethods:\s*\['get',\s*'post'\]/);
});

test('OpenAPI sends executable requests through the same-origin proxy', async () => {
  const openapi = await source('openapi.yaml');
  assert.match(openapi, /servers:\s*\n\s*- url: \/api\/proxy/);
});

test('proxy preserves repeated electoral cycles when listing PVs', async () => {
  const calls = [];
  const { createHandler } = require('../api/proxy/[...path].js');
  const handler = createHandler({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return upstreamResponse({ body: '{"items":[],"cycles":[2021,2025]}' });
    },
  });
  const req = {
    method: 'GET',
    query: { path: ['portal', 'establishments', '42', 'pvs'], cycles: ['2021', '2025'] },
    headers: {},
  };
  const res = mockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(
    calls[0].url,
    'https://backend.elections-professionnelles.travail.gouv.fr/api/v1/portal/establishments/42/pvs?cycles=2021&cycles=2025',
  );
  assert.equal(res.body.toString(), '{"items":[],"cycles":[2021,2025]}');
});

test('proxy permits establishment search and forwards JSON only', async () => {
  const calls = [];
  const { createHandler } = require('../api/proxy/[...path].js');
  const handler = createHandler({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return upstreamResponse({ body: '{"items":[]}' });
    },
  });
  const req = {
    method: 'POST',
    query: { path: ['portal', 'establishments'] },
    headers: { authorization: 'Bearer must-not-forward', cookie: 'private=1' },
    body: { page: 1, limit: 10, countSearch: true, filters: { sirenOrSiret: '780129987' } },
  };
  const res = mockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.authorization, undefined);
  assert.equal(calls[0].options.headers.cookie, undefined);
  assert.equal(calls[0].options.headers['content-type'], 'application/json');
  assert.equal(JSON.parse(calls[0].options.body).countSearch, true);
});

test('proxy rejects mutation routes that Swagger must not execute', async () => {
  const { createHandler } = require('../api/proxy/[...path].js');
  let called = false;
  const handler = createHandler({ fetchImpl: async () => { called = true; } });
  const req = {
    method: 'POST',
    query: { path: ['portal', 'establishments', '42', 'pvs', '9', 'observations'] },
    headers: {},
    body: { message: 'test' },
  };
  const res = mockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(called, false);
  assert.equal(res.body.code, 'SWAGGER_OPERATION_DISABLED');
});

test('proxy propagates upstream quota status and retry information', async () => {
  const { createHandler } = require('../api/proxy/[...path].js');
  const handler = createHandler({
    fetchImpl: async () => upstreamResponse({
      status: 429,
      body: '{"code":"QUOTA_EXCEEDED","retryAfter":60}',
      headers: { 'retry-after': '60' },
    }),
  });
  const req = { method: 'GET', query: { path: ['portal', 'pv-search-stats'] }, headers: {} };
  const res = mockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['retry-after'], '60');
  assert.match(res.body.toString(), /QUOTA_EXCEEDED/);
});
