import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createMockFetch } from '../src/mock-upstream.js';

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

test('the default upstream target is the live ragflow service', async () => {
  let observedUrl;
  const fetchImpl = async (url) => {
    observedUrl = url;
    return jsonResponse([]);
  };

  const app = createApp({ fetchImpl });
  const response = await request(app).get('/api/documents');

  assert.equal(response.status, 200);
  assert.equal(observedUrl, 'http://ragflow:8000/documents');
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

test('validation issues are projected to their public fields only', async () => {
  const fetchImpl = async () => jsonResponse({
    code: 'request_validation_failed',
    category: 'validation',
    retryable: false,
    message: 'Request validation failed',
    issues: [
      {
        location: ['body', 'question'],
        message: 'Question is required',
        type: 'value_error',
        internal: 'traceback should not escape',
      },
    ],
  }, 422);

  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app).post('/api/query').send({ question: '' });

  assert.deepEqual(response.body, {
    code: 'request_validation_failed',
    category: 'validation',
    retryable: false,
    message: 'Request validation failed',
    issues: [{ location: ['body', 'question'], message: 'Question is required', type: 'value_error' }],
  });
});

test('status endpoint checks contract version and health routes', async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith('/openapi.json')) return jsonResponse({
      openapi: '3.1.0',
      info: { version: '0.1.0' },
      paths: { '/documents/{doc_id}/ingestion-step-statuses': { get: {} } },
    });
    if (url.endsWith('/health/live')) return jsonResponse({ status: 'ok' });
    return jsonResponse({ status: 'ready', services: [{ service: 'metadata', ok: true }] });
  };

  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app).get('/api/status');

  assert.equal(response.status, 200);
  assert.equal(response.body.apiVersion, '0.1.0');
  assert.equal(response.body.openapiVersion, '3.1.0');
  assert.equal(response.body.compatible, true);
  assert.equal(response.body.capabilities.ingestionStepStatuses, true);
  assert.equal(response.body.live.status, 'ok');
  assert.equal(response.body.ready.status, 'ready');
});

test('ingestion step statuses proxy preserves the job filter and fixed server scope', async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return jsonResponse({ load: 'completed', chunking: 'running', chunk_persistence: 'not_started' });
  };

  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test/' });
  const response = await request(app)
    .get('/api/documents/doc-1/ingestion-step-statuses?job_id=job-9')
    .set('X-User-Id', 'attacker-controlled');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { load: 'completed', chunking: 'running', chunk_persistence: 'not_started' });
  assert.equal(observed.url, 'http://ragflow.test/documents/doc-1/ingestion-step-statuses?job_id=job-9');
  assert.equal(observed.options.headers.get('x-user-id'), 'ragflow');
});

test('mock upstream exposes the v0.2 final ingestion status map', async () => {
  const app = createApp({ fetchImpl: createMockFetch(), ragflowBaseUrl: 'http://mock.test' });
  const response = await request(app)
    .get('/api/documents/doc-001/ingestion-step-statuses?job_id=job-001');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    load: 'completed',
    preprocess: 'completed',
    chunking: 'completed',
    embedding: 'completed',
    vector_store: 'completed',
    chunk_persistence: 'completed',
  });
});

test('malformed multipart input becomes a public invalid-request error', async () => {
  const fetchImpl = async () => {
    throw new Error('the upstream must not receive malformed multipart input');
  };
  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app)
    .post('/api/documents/file')
    .set('Content-Type', 'multipart/form-data')
    .send('not-a-valid-multipart-body');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    code: 'invalid_request',
    category: 'validation',
    retryable: false,
    message: 'The multipart request could not be parsed',
  });
});

test('truncated multipart input becomes a public invalid-request error', async () => {
  const app = createApp({ fetchImpl: async () => jsonResponse({}) });
  const response = await request(app)
    .post('/api/documents/file')
    .set('Content-Type', 'multipart/form-data; boundary=docmesh-test')
    .send('--docmesh-test\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\n\r\npartial');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    code: 'invalid_request',
    category: 'validation',
    retryable: false,
    message: 'The multipart request could not be parsed',
  });
});

test('malformed JSON input becomes a public invalid-request error', async () => {
  const app = createApp({ fetchImpl: async () => jsonResponse({}) });
  const response = await request(app)
    .post('/api/query')
    .set('Content-Type', 'application/json')
    .send('{"question":');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    code: 'invalid_request',
    category: 'validation',
    retryable: false,
    message: 'The JSON request could not be parsed',
  });
});

test('multipart requests over the total body limit are rejected at the BFF boundary', async () => {
  const fetchImpl = async () => {
    throw new Error('the upstream must not receive an oversized request');
  };
  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app)
    .post('/api/documents/file')
    .set('Content-Type', 'multipart/form-data')
    .set('Content-Length', String(11 * 1024 * 1024 + 1))
    .send(Buffer.alloc(1));

  assert.equal(response.status, 413);
  assert.deepEqual(response.body, {
    code: 'request_too_large',
    category: 'validation',
    retryable: false,
    message: 'The request is larger than the allowed limit',
  });
});

test('file ingestion forwards multipart data without overriding its boundary', async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return jsonResponse({ job_id: 'job-1', doc_id: 'doc-1', source: 'notes.md', chunk_count: 1 }, 201);
  };
  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app)
    .post('/api/documents/file')
    .attach('file', Buffer.from('A short UTF-8 note.'), 'notes.txt')
    .field('source', 'notes.md');

  assert.equal(response.status, 201);
  assert.equal(observed.url, 'http://ragflow.test/documents/file');
  assert.equal(observed.options.headers.get('x-user-id'), 'ragflow');
  assert.equal(observed.options.headers.has('content-type'), false);
  assert.equal(observed.options.body.get('source'), 'notes.md');
  assert.equal(await observed.options.body.get('file').text(), 'A short UTF-8 note.');
});

test('document deletion preserves the upstream 204 empty response', async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return new Response(null, { status: 204 });
  };
  const app = createApp({ fetchImpl, ragflowBaseUrl: 'http://ragflow.test' });
  const response = await request(app)
    .delete('/api/documents/doc-1')
    .set('X-User-Id', 'attacker-controlled');

  assert.equal(response.status, 204);
  assert.equal(response.text, '');
  assert.equal(observed.options.method, 'DELETE');
  assert.equal(observed.options.headers.get('x-user-id'), 'ragflow');
});
