import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

test('documents proxy uses the exact upstream path and fixed server scope', async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return jsonResponse([{ doc_id: 'doc-1', source: 'architecture.md', created_at: '2026-08-21T00:00:00Z' }]);
  };

  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test/' });
  const response = await request(app)
    .get('/api/documents')
    .set('X-User-Id', 'attacker-controlled');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ doc_id: 'doc-1', source: 'architecture.md', created_at: '2026-08-21T00:00:00Z' }]);
  assert.equal(observed.url, 'http://ragflow.test/documents');
  assert.equal(observed.options.headers.get('x-user-id'), 'ragflow');
});

test('upstream errors are reduced to the public error envelope', async () => {
  const fetchImpl = async () => jsonResponse({
    code: 'request_validation_failed',
    category: 'validation',
    retryable: false,
    message: 'Question is required',
    internal: 'postgres://secret',
    detail: 'traceback should not escape',
  }, 422);

  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app)
    .post('/api/query')
    .send({ question: '' });

  assert.equal(response.status, 422);
  assert.deepEqual(response.body, {
    code: 'request_validation_failed',
    category: 'validation',
    retryable: false,
    message: 'Question is required',
  });
  assert.equal('internal' in response.body, false);
  assert.equal('detail' in response.body, false);
});

test('status endpoint checks contract version and health routes', async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith('/openapi.json')) return jsonResponse({ openapi: '3.1.0', info: { version: '0.1.0' } });
    if (url.endsWith('/health/live')) return jsonResponse({ status: 'ok' });
    return jsonResponse({ status: 'ready', services: [{ service: 'metadata', ok: true }] });
  };

  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app).get('/api/status');

  assert.equal(response.status, 200);
  assert.equal(response.body.apiVersion, '0.1.0');
  assert.equal(response.body.compatible, true);
  assert.equal(response.body.live.status, 'ok');
  assert.equal(response.body.ready.status, 'ready');
});
