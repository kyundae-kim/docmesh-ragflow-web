const API_VERSION = '0.1.0';

const seedDocuments = [
  {
    doc_id: 'doc-001',
    source: 'ragflow-api-contract.md',
    created_at: '2026-08-20T09:14:00.000Z',
    job_id: 'job-001',
    status: 'ready',
    chunks: [
      'The RAG Flow API exposes a versioned HTTP contract for document ingestion and retrieval.',
      'Business routes use the X-User-Id header to scope documents, chunks, progress, and query context.',
      'The frontend uses the running OpenAPI document as the compatibility source of truth.',
    ],
  },
  {
    doc_id: 'doc-002',
    source: 'product-brief-q3.txt',
    created_at: '2026-08-19T14:42:00.000Z',
    job_id: 'job-002',
    status: 'ready',
    chunks: [
      'DocMesh gives teams one workspace for ingestion, retrieval, and traceable context.',
      'Every answer keeps a visible link back to the source chunk that informed it.',
    ],
  },
  {
    doc_id: 'doc-003',
    source: 'support-playbook.md',
    created_at: '2026-08-18T11:06:00.000Z',
    job_id: 'job-003',
    status: 'processing',
    chunks: [
      'Support answers should be grounded in the latest approved playbook.',
      'Escalate when a retrieved chunk does not contain enough evidence to answer confidently.',
    ],
  },
  {
    doc_id: 'doc-004',
    source: 'engineering-notes.txt',
    created_at: '2026-08-16T08:33:00.000Z',
    job_id: 'job-004',
    status: 'ready',
    chunks: [
      'Express acts as a same-origin BFF between the React client and the internal RAG API.',
      'The BFF owns upstream routing and fixed service identity; the browser calls only /api routes.',
    ],
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const response = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), {
  status,
  headers: body === null ? {} : { 'content-type': 'application/json' },
});
const error = (code, category, retryable, message, issues) => ({
  code,
  category,
  retryable,
  message,
  ...(issues ? { issues } : {}),
});
const isoNow = () => new Date().toISOString();

const documentView = (doc) => ({
  doc_id: doc.doc_id,
  source: doc.source,
  created_at: doc.created_at,
});

const chunksView = (doc) => doc.chunks.map((content, index) => ({
  chunk_id: `${doc.doc_id}-chunk-${String(index + 1).padStart(2, '0')}`,
  doc_id: doc.doc_id,
  content,
  metadata: { source: doc.source },
}));

const progressView = (doc) => {
  const steps = ['load', 'preprocess', 'chunking', 'embedding', 'vector_store', 'chunk_persistence'];
  const completedUntil = doc.status === 'ready' ? steps.length : 4;
  return steps.map((step_name, index) => ({
    progress_id: `${doc.job_id}-${step_name}`,
    job_id: doc.job_id,
    doc_id: doc.doc_id,
    step_name,
    step_order: index + 1,
    status: index < completedUntil ? 'completed' : index === completedUntil ? 'running' : 'pending',
  }));
};

export function createMockFetch() {
  const documents = new Map(seedDocuments.map((doc) => [doc.doc_id, clone(doc)]));
  let nextNumber = 5;

  return async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method || 'GET';
    const path = url.pathname;
    const userId = new Headers(options.headers || {}).get('x-user-id');
    const businessRoute = path === '/documents' || path.startsWith('/documents/') || path === '/query';
    if (businessRoute && !userId?.trim()) {
      return response(error('user_id_required', 'validation', false, 'X-User-Id header is required'), 400);
    }

    if (method === 'GET' && path === '/openapi.json') {
      return response({ openapi: '3.1.0', info: { title: 'RAG Flow API', version: API_VERSION }, paths: {} });
    }
    if (method === 'GET' && path === '/health/live') return response({ status: 'ok' });
    if (method === 'GET' && path === '/health/ready') {
      return response({ status: 'ready', services: [{ service: 'metadata', ok: true, duration_seconds: 0.004, error: null }, { service: 'vector_store', ok: true, duration_seconds: 0.007, error: null }] });
    }

    if (method === 'GET' && path === '/documents') {
      return response([...documents.values()].map(documentView));
    }

    const detailMatch = path.match(/^\/documents\/([^/]+)$/);
    const chunksMatch = path.match(/^\/documents\/([^/]+)\/chunks$/);
    const progressMatch = path.match(/^\/documents\/([^/]+)\/ingestion-progress$/);
    if (detailMatch) {
      const doc = documents.get(decodeURIComponent(detailMatch[1]));
      if (method === 'GET') return doc ? response(documentView(doc)) : response(error('document_not_found', 'not_found', false, 'Document was not found'), 404);
      if (method === 'DELETE') {
        if (!doc) return response(error('document_not_found', 'not_found', false, 'Document was not found'), 404);
        documents.delete(doc.doc_id);
        return response(null, 204);
      }
    }
    if (method === 'GET' && chunksMatch) {
      const doc = documents.get(decodeURIComponent(chunksMatch[1]));
      return doc ? response(chunksView(doc)) : response(error('document_not_found', 'not_found', false, 'Document was not found'), 404);
    }
    if (method === 'GET' && progressMatch) {
      const doc = documents.get(decodeURIComponent(progressMatch[1]));
      if (!doc) return response(error('document_not_found', 'not_found', false, 'Document was not found'), 404);
      const jobId = url.searchParams.get('job_id');
      return response(jobId && jobId !== doc.job_id ? [] : progressView(doc));
    }

    if (method === 'POST' && path === '/documents/text') {
      const body = options.body ? JSON.parse(options.body) : {};
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const source = typeof body.source === 'string' ? body.source.trim() : '';
      if (!text || !source) {
        return response(error('request_validation_failed', 'validation', false, 'Text and source are required', [
          { location: ['body', !text ? 'text' : 'source'], message: 'Field is required', type: 'value_error' },
        ]), 422);
      }
      const doc = {
        doc_id: `doc-${String(nextNumber).padStart(3, '0')}`,
        source,
        created_at: isoNow(),
        job_id: `job-${String(nextNumber).padStart(3, '0')}`,
        status: 'ready',
        chunks: text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 8),
      };
      if (!doc.chunks.length) doc.chunks = [text];
      documents.set(doc.doc_id, doc);
      nextNumber += 1;
      return response({ job_id: doc.job_id, doc_id: doc.doc_id, source: doc.source, created_at: doc.created_at, chunk_count: doc.chunks.length }, 201);
    }

    if (method === 'POST' && path === '/documents/file') {
      const form = options.body;
      const file = form?.get?.('file');
      if (!file) return response(error('invalid_request', 'validation', false, 'File is required'), 422);
      const content = (await file.text()).trim();
      if (!content) return response(error('empty_upload', 'validation', false, 'The uploaded file is empty'), 422);
      const sourcePart = form.get('source');
      const source = String(sourcePart || file.name || '').trim();
      if (!source) return response(error('invalid_source', 'validation', false, 'A source or filename is required'), 422);
      const doc = {
        doc_id: `doc-${String(nextNumber).padStart(3, '0')}`,
        source,
        created_at: isoNow(),
        job_id: `job-${String(nextNumber).padStart(3, '0')}`,
        status: 'ready',
        chunks: content.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 8),
      };
      documents.set(doc.doc_id, doc);
      nextNumber += 1;
      return response({ job_id: doc.job_id, doc_id: doc.doc_id, source: doc.source, created_at: doc.created_at, chunk_count: doc.chunks.length }, 201);
    }

    if (method === 'POST' && path === '/query') {
      const body = options.body ? JSON.parse(options.body) : {};
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      const topK = Math.min(Math.max(Number(body.top_k || 3), 1), 100);
      if (!question) {
        return response(error('request_validation_failed', 'validation', false, 'Question is required', [
          { location: ['body', 'question'], message: 'Field is required', type: 'value_error' },
        ]), 422);
      }
      const terms = question.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
      const ranked = [...documents.values()]
        .flatMap((doc) => chunksView(doc).map((chunk) => ({ chunk, score: terms.filter((term) => chunk.content.toLowerCase().includes(term)).length })))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(({ chunk }) => chunk);
      const context = ranked.length ? ranked : chunksView([...documents.values()][0]).slice(0, topK);
      return response({
        answer: `Based on ${context.length} retrieved context block${context.length === 1 ? '' : 's'}, ${question[0].toLowerCase()}${question.slice(1)} is grounded in the indexed workspace.`,
        context_chunks: context,
      });
    }

    return response(error('not_found', 'not_found', false, 'Route was not found'), 404);
  };
}
