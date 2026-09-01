import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const LIVE_BASE_URL = process.env.RAGFLOW_LIVE_BASE_URL
  || process.env.RAGFLOW_BASE_URL
  || 'http://ragflow:8000';
const LIVE_USER_ID = process.env.RAGFLOW_LIVE_USER_ID
  || process.env.RAGFLOW_USER_ID
  || 'ragflow';
const EXPECTED_API_VERSION = process.env.RAGFLOW_LIVE_EXPECTED_API_VERSION
  || process.env.EXPECTED_RAGFLOW_VERSION
  || '0.1.0';
const EXPECTED_OPENAPI_VERSION = process.env.RAGFLOW_LIVE_EXPECTED_OPENAPI_VERSION || '3.1.0';
const REQUEST_TIMEOUT_MS = Number(process.env.RAGFLOW_LIVE_TIMEOUT_MS || 30_000);
const QUERY_TIMEOUT_MS = Number(process.env.RAGFLOW_LIVE_QUERY_TIMEOUT_MS || 180_000);
const runLiveQuery = process.env.RAGFLOW_LIVE_QUERY !== '0';

const fetchLive = (input, options = {}) => {
  const timeoutMs = new URL(input).pathname === '/query' ? QUERY_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  return fetch(input, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
};

const app = createApp({
  fetchImpl: fetchLive,
  ragflowBaseUrl: LIVE_BASE_URL,
  serviceUserId: LIVE_USER_ID,
  expectedApiVersion: EXPECTED_API_VERSION,
  expectedOpenapiVersion: EXPECTED_OPENAPI_VERSION,
});

const jsonStatus = (response, expectedStatus, label) => {
  assert.equal(response.status, expectedStatus, `${label}: ${response.text}`);
  assert.match(response.headers['content-type'] || '', /json/);
};

const assertDocument = (document, label) => {
  assert.equal(typeof document?.doc_id, 'string', `${label}.doc_id`);
  assert.equal(typeof document?.source, 'string', `${label}.source`);
  assert.equal(typeof document?.created_at, 'string', `${label}.created_at`);
  assert.deepEqual(Object.keys(document).sort(), ['created_at', 'doc_id', 'source'], `${label} public fields`);
};

const assertChunk = (chunk, label) => {
  assert.equal(typeof chunk?.chunk_id, 'string', `${label}.chunk_id`);
  assert.equal(typeof chunk?.doc_id, 'string', `${label}.doc_id`);
  assert.equal(typeof chunk?.content, 'string', `${label}.content`);
  assert.equal(typeof chunk?.metadata, 'object', `${label}.metadata`);
  assert.deepEqual(Object.keys(chunk.metadata).sort(), ['source'], `${label}.metadata public fields`);
};

const listLiveDocuments = async () => {
  const response = await request(app).get('/api/documents');
  jsonStatus(response, 200, 'GET /api/documents');
  assert.ok(Array.isArray(response.body), 'document list must be an array');
  response.body.forEach((document, index) => assertDocument(document, `documents[${index}]`));
  return response.body;
};

test('live RAG Flow contract is compatible and ready through the BFF', async () => {
  const response = await request(app).get('/api/status');

  jsonStatus(response, 200, 'GET /api/status');
  assert.equal(response.body.apiVersion, EXPECTED_API_VERSION);
  assert.equal(response.body.openapiVersion, EXPECTED_OPENAPI_VERSION);
  assert.equal(response.body.compatible, true);
  assert.equal(response.body.available, true);
  assert.equal(response.body.live?.status, 'ok');
  assert.equal(response.body.ready?.status, 'ready');
  assert.equal(response.body.capabilities?.ingestionStepStatuses, true);
});

test('live document list is public-shaped and ignores browser scope overrides', async () => {
  const normal = await listLiveDocuments();
  const spoofed = await request(app)
    .get('/api/documents')
    .set('X-User-Id', 'browser-controlled-user');

  jsonStatus(spoofed, 200, 'GET /api/documents with browser scope');
  assert.deepEqual(spoofed.body, normal, 'browser scope must not change the server-scoped list');
});

test('live validation errors retain the public error envelope', async () => {
  const response = await request(app)
    .post('/api/query')
    .send({ question: '' });

  jsonStatus(response, 422, 'POST /api/query with an empty question');
  assert.equal(response.body.code, 'request_validation_failed');
  assert.equal(response.body.category, 'validation');
  assert.equal(response.body.retryable, false);
  assert.equal(typeof response.body.message, 'string');
  assert.ok(Array.isArray(response.body.issues));
  assert.ok(!('internal' in response.body));
  assert.ok(!('detail' in response.body));
});

test('live existing-document read models preserve the lifecycle identifiers', async (t) => {
  const documents = await listLiveDocuments();
  if (!documents.length) {
    t.skip('the live scope has no document fixture for a non-mutating lifecycle read');
    return;
  }

  const document = documents[0];
  const encodedDocId = encodeURIComponent(document.doc_id);
  const detail = await request(app).get(`/api/documents/${encodedDocId}`);
  jsonStatus(detail, 200, 'GET /api/documents/{doc_id}');
  assert.deepEqual(detail.body, document);

  const chunks = await request(app).get(`/api/documents/${encodedDocId}/chunks`);
  jsonStatus(chunks, 200, 'GET /api/documents/{doc_id}/chunks');
  assert.ok(Array.isArray(chunks.body));
  chunks.body.forEach((chunk, index) => {
    assertChunk(chunk, `chunks[${index}]`);
    assert.equal(chunk.doc_id, document.doc_id);
  });

  const progress = await request(app).get(`/api/documents/${encodedDocId}/ingestion-progress`);
  jsonStatus(progress, 200, 'GET /api/documents/{doc_id}/ingestion-progress');
  assert.ok(Array.isArray(progress.body));
  progress.body.forEach((entry, index) => {
    assert.equal(typeof entry.job_id, 'string', `progress[${index}].job_id`);
    assert.equal(entry.doc_id, document.doc_id, `progress[${index}].doc_id`);
  });

  const jobId = progress.body[0]?.job_id;
  const jobQuery = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
  const filteredProgress = await request(app)
    .get(`/api/documents/${encodedDocId}/ingestion-progress${jobQuery}`);
  jsonStatus(filteredProgress, 200, 'GET /api/documents/{doc_id}/ingestion-progress?job_id=...');
  assert.ok(Array.isArray(filteredProgress.body));
  if (jobId) filteredProgress.body.forEach((entry) => assert.equal(entry.job_id, jobId));

  const stepStatuses = await request(app)
    .get(`/api/documents/${encodedDocId}/ingestion-step-statuses${jobQuery}`);
  jsonStatus(stepStatuses, 200, 'GET /api/documents/{doc_id}/ingestion-step-statuses?job_id=...');
  assert.equal(typeof stepStatuses.body, 'object');
  assert.ok(!Array.isArray(stepStatuses.body));
  assert.ok(Object.keys(stepStatuses.body).length > 0);
});

test('live query returns an answer and public context chunks', { timeout: QUERY_TIMEOUT_MS }, async (t) => {
  if (!runLiveQuery) {
    t.skip('set RAGFLOW_LIVE_QUERY=1 to enable the live model query');
    return;
  }

  const documents = await listLiveDocuments();
  if (!documents.length) {
    t.skip('the live scope has no document fixture for a non-mutating query');
    return;
  }

  const response = await request(app)
    .post('/api/query')
    .send({ question: 'What is this document about?', top_k: 1 });

  jsonStatus(response, 200, 'POST /api/query');
  assert.equal(typeof response.body.answer, 'string');
  assert.ok(response.body.answer.length > 0);
  assert.ok(Array.isArray(response.body.context_chunks));
  response.body.context_chunks.forEach((chunk, index) => assertChunk(chunk, `context_chunks[${index}]`));
});
