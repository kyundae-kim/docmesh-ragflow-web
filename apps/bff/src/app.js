import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_API_VERSION = '0.1.0';
const SERVICE_USER_ID = 'ragflow';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const normalizeBaseUrl = (value) => String(value || 'http://localhost:8000').replace(/\/+$/, '');

const publicError = (payload, fallback = {}) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    code: typeof source.code === 'string' ? source.code : (fallback.code || 'upstream_error'),
    category: typeof source.category === 'string' ? source.category : (fallback.category || 'unavailable'),
    retryable: typeof source.retryable === 'boolean' ? source.retryable : (fallback.retryable ?? true),
    message: typeof source.message === 'string' ? source.message : (fallback.message || 'RAG Flow API request failed'),
    ...(Array.isArray(source.issues) ? { issues: source.issues } : {}),
  };
};

const parseResponse = async (response) => {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const safeJsonBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body;
};

export function createApp({
  fetchImpl = globalThis.fetch,
  ragflowBaseUrl = process.env.RAGFLOW_BASE_URL || 'http://localhost:8000',
  serviceUserId = SERVICE_USER_ID,
  expectedApiVersion = EXPECTED_API_VERSION,
  frontendDist,
} = {}) {
  const app = express();
  const baseUrl = normalizeBaseUrl(ragflowBaseUrl);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  const requestUpstream = async (route, { method = 'GET', body, business = true, headers: extraHeaders } = {}) => {
    const headers = new Headers(extraHeaders || {});
    headers.set('accept', 'application/json');
    if (business) headers.set('x-user-id', serviceUserId);
    if (body !== undefined && !(typeof FormData !== 'undefined' && body instanceof FormData)) {
      headers.set('content-type', 'application/json');
    }

    try {
      return await fetchImpl(`${baseUrl}${route}`, { method, headers, body });
    } catch {
      return new Response(JSON.stringify(publicError(null, {
        code: 'upstream_unavailable',
        category: 'unavailable',
        retryable: true,
        message: 'RAG Flow API is unavailable',
      })), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    }
  };

  const sendUpstream = async (res, upstream) => {
    const payload = await parseResponse(upstream);
    if (upstream.status === 204) return res.status(204).end();
    if (!upstream.ok) {
      return res.status(upstream.status).json(publicError(payload));
    }
    return res.status(upstream.status).json(payload ?? {});
  };

  app.get('/api/status', async (_req, res) => {
    const [openapi, live, ready] = await Promise.all([
      requestUpstream('/openapi.json', { business: false }),
      requestUpstream('/health/live', { business: false }),
      requestUpstream('/health/ready', { business: false }),
    ]);
    const [openapiBody, liveBody, readyBody] = await Promise.all([
      parseResponse(openapi),
      parseResponse(live),
      parseResponse(ready),
    ]);
    const apiVersion = openapiBody?.info?.version || null;
    const compatible = apiVersion === expectedApiVersion;
    const available = openapi.ok && live.ok && ready.ok && compatible;
    const response = {
      apiVersion,
      expectedVersion: expectedApiVersion,
      compatible,
      available,
      live: liveBody || { status: 'unavailable' },
      ready: readyBody || { status: 'unavailable', services: [] },
    };
    return res.status(available ? 200 : 503).json(response);
  });

  app.get('/api/documents', async (_req, res) => {
    return sendUpstream(res, await requestUpstream('/documents'));
  });

  app.get('/api/documents/:docId', async (req, res) => {
    return sendUpstream(res, await requestUpstream(`/documents/${encodeURIComponent(req.params.docId)}`));
  });

  app.get('/api/documents/:docId/chunks', async (req, res) => {
    return sendUpstream(res, await requestUpstream(`/documents/${encodeURIComponent(req.params.docId)}/chunks`));
  });

  app.get('/api/documents/:docId/ingestion-progress', async (req, res) => {
    const query = req.query.job_id ? `?job_id=${encodeURIComponent(req.query.job_id)}` : '';
    return sendUpstream(res, await requestUpstream(`/documents/${encodeURIComponent(req.params.docId)}/ingestion-progress${query}`));
  });

  app.post('/api/documents/text', async (req, res) => {
    const body = safeJsonBody(req.body);
    const payload = JSON.stringify({ text: body.text, source: body.source });
    return sendUpstream(res, await requestUpstream('/documents/text', { method: 'POST', body: payload }));
  });

  app.post('/api/documents/file', (req, res, next) => {
    upload.single('file')(req, res, async (error) => {
      if (error) return next(error);
      if (!req.file) {
        return res.status(422).json(publicError({
          code: 'invalid_request',
          category: 'validation',
          retryable: false,
          message: 'Choose a UTF-8 text file to upload',
        }));
      }
      const form = new FormData();
      form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'text/plain' }), req.file.originalname);
      if (typeof req.body?.source === 'string' && req.body.source.trim()) form.append('source', req.body.source.trim());
      return sendUpstream(res, await requestUpstream('/documents/file', { method: 'POST', body: form }));
    });
  });

  app.post('/api/query', async (req, res) => {
    const body = safeJsonBody(req.body);
    const payload = JSON.stringify({ question: body.question, top_k: body.top_k });
    return sendUpstream(res, await requestUpstream('/query', { method: 'POST', body: payload }));
  });

  app.delete('/api/documents/:docId', async (req, res) => {
    return sendUpstream(res, await requestUpstream(`/documents/${encodeURIComponent(req.params.docId)}`, { method: 'DELETE' }));
  });

  if (frontendDist && fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*splat', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
  }

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json(publicError({
        code: 'request_too_large',
        category: 'validation',
        retryable: false,
        message: 'The request is larger than the allowed limit',
      }));
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json(publicError({
        code: 'upload_too_large',
        category: 'validation',
        retryable: false,
        message: 'Files must be smaller than 10 MiB',
      }));
    }
    return res.status(500).json(publicError(null, {
      code: 'internal_error',
      category: 'internal',
      retryable: false,
      message: 'The request could not be completed',
    }));
  });

  return app;
}

export { MAX_UPLOAD_BYTES, EXPECTED_API_VERSION, publicError, normalizeBaseUrl };
