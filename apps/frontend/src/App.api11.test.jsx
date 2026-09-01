import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const statusResponse = {
  apiVersion: '0.1.0',
  expectedVersion: '0.1.0',
  openapiVersion: '3.1.0',
  expectedOpenapiVersion: '3.1.0',
  compatible: true,
  available: true,
  capabilities: { ingestionStepStatuses: true },
  live: { status: 'ok' },
  ready: { status: 'ready', services: [{ service: 'metadata', ok: true }] },
};

const documentsBeforeIngest = [
  { doc_id: 'doc-1', source: 'architecture.md', created_at: '2026-08-21T00:00:00Z' },
];

const documentsAfterIngest = [
  ...documentsBeforeIngest,
  { doc_id: 'doc-2', source: 'notes.md', created_at: '2026-08-21T00:01:00Z' },
];

describe('RAG Flow API-11 lifecycle capability', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === '/api/status') return { ok: true, status: 200, json: async () => statusResponse };
      if (url === '/api/documents') return { ok: true, status: 200, json: async () => documentsBeforeIngest };
      return { ok: true, status: 200, json: async () => [] };
    }));
  });

  it('uses the ingestion job id for the final step status map', async () => {
    let listRequestCount = 0;
    const fetchMock = vi.fn(async (url) => {
      if (url === '/api/status') return { ok: true, status: 200, json: async () => statusResponse };
      if (url === '/api/documents') {
        listRequestCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => listRequestCount > 1 ? documentsAfterIngest : documentsBeforeIngest,
        };
      }
      if (url === '/api/documents/text') return {
        ok: true,
        status: 201,
        json: async () => ({ job_id: 'job-2', doc_id: 'doc-2', source: 'notes.md' }),
      };
      if (url === '/api/documents/doc-1') return {
        ok: true,
        status: 200,
        json: async () => documentsBeforeIngest[0],
      };
      if (url.startsWith('/api/documents/doc-1/ingestion-step-statuses')) return {
        ok: true,
        status: 200,
        json: async () => ({ load: 'completed' }),
      };
      if (url === '/api/documents/doc-2') return {
        ok: true,
        status: 200,
        json: async () => documentsAfterIngest[1],
      };
      if (url.startsWith('/api/documents/doc-2/ingestion-progress')) return {
        ok: true,
        status: 200,
        json: async () => [{ step_name: 'load', status: 'completed' }],
      };
      if (url.startsWith('/api/documents/doc-2/ingestion-step-statuses')) return {
        ok: true,
        status: 200,
        json: async () => ({ load: 'completed', chunking: 'running' }),
      };
      if (url.startsWith('/api/documents/doc-2/chunks')) return {
        ok: true,
        status: 200,
        json: async () => [{ chunk_id: 'doc-2-chunk-01', content: 'New notes', metadata: { source: 'notes.md' } }],
      };
      return { ok: true, status: 200, json: async () => [] };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await waitFor(() => expect(screen.getByText('architecture.md')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Add source' })[0]);
    fireEvent.change(screen.getByLabelText('Source content'), { target: { value: 'New notes' } });
    fireEvent.change(screen.getByLabelText('Source name'), { target: { value: 'notes.md' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/documents/doc-2/ingestion-progress?job_id=job-2')).toBe(true));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/documents/doc-2/ingestion-step-statuses?job_id=job-2')).toBe(true));
    await waitFor(() => expect(screen.getByText('2 final statuses')).toBeInTheDocument());
  });
});
