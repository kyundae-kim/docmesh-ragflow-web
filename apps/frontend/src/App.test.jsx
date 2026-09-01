import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const responses = {
  '/api/status': {
    apiVersion: '0.1.0',
    expectedVersion: '0.1.0',
    compatible: true,
    available: true,
    live: { status: 'ok' },
    ready: { status: 'ready', services: [{ service: 'metadata', ok: true }] },
  },
  '/api/documents': [
    { doc_id: 'doc-1', source: 'architecture.md', created_at: '2026-08-21T00:00:00Z' },
  ],
};

describe('RAG Flow workspace', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => responses[url],
    })));
  });

  it('renders the fixed identity and a document tile from the BFF', async () => {
    render(<App />);


    expect(screen.getByText('Knowledge workspace')).toBeInTheDocument();
    expect(screen.getAllByText('ragflow')).toHaveLength(2);
    await waitFor(() => expect(screen.getByText('architecture.md')).toBeInTheDocument());
    expect(screen.getByText('API ready')).toBeInTheDocument();
  });

  it('uses the ingestion job id when loading the new document progress', async () => {
    const documentsBeforeIngest = [
      { doc_id: 'doc-1', source: 'architecture.md', created_at: '2026-08-21T00:00:00Z' },
    ];
    const documentsAfterIngest = [
      ...documentsBeforeIngest,
      { doc_id: 'doc-2', source: 'notes.md', created_at: '2026-08-21T00:01:00Z' },
    ];
    let listRequestCount = 0;
    const fetchMock = vi.fn(async (url) => {
      if (url === '/api/status') return { ok: true, status: 200, json: async () => responses['/api/status'] };
      if (url === '/api/documents') {
        listRequestCount += 1;
        return { ok: true, status: 200, json: async () => listRequestCount > 1 ? documentsAfterIngest : documentsBeforeIngest };
      }

      if (url === '/api/documents/text') return {
        ok: true,
        status: 201,
        json: async () => ({ job_id: 'job-2', doc_id: 'doc-2', source: 'notes.md' }),
      };
      if (url.startsWith('/api/documents/doc-2/ingestion-progress')) return {
        ok: true,
        status: 200,
        json: async () => [{ step_name: 'load', status: 'completed' }],
      };

      if (url.startsWith('/api/documents/doc-2/chunks')) return {
        ok: true,
        status: 200,
        json: async () => [{ chunk_id: 'doc-2-chunk-01', content: 'New notes', metadata: { source: 'notes.md' } }],
      };
      if (url === '/api/documents/doc-2') return {
        ok: true,
        status: 200,
        json: async () => documentsAfterIngest[1],
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

  });

  it('changes the main view and active sidebar tab', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('architecture.md').length).toBeGreaterThan(0));


    const overviewTab = screen.getByRole('button', { name: /^Overview$/ });
    const documentsTab = screen.getByRole('button', { name: /^Documents/ });
    expect(overviewTab).toHaveAttribute('aria-current', 'page');

    fireEvent.click(documentsTab);

    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(documentsTab).toHaveAttribute('aria-current', 'page');
    expect(overviewTab).not.toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('Your library is ready for the next question.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Query console' }));

    expect(screen.getByRole('heading', { name: 'Query console' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'API health' }));

    expect(screen.getByRole('heading', { name: 'API health' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('keeps the upstream hostname behind the BFF boundary', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('architecture.md')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.queryByText('http://ragflow:8000')).not.toBeInTheDocument();
    expect(screen.getByText('Server-managed target')).toBeInTheDocument();
  });

  it('shows the stable API error code for a failed query', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url === '/api/status') return { ok: true, status: 200, json: async () => responses['/api/status'] };
      if (url === '/api/documents') return { ok: true, status: 200, json: async () => responses['/api/documents'] };
      if (url === '/api/query') return {
        ok: false,
        status: 422,
        json: async () => ({
          code: 'request_validation_failed',
          category: 'validation',
          retryable: false,
          message: 'Question is required',
        }),
      };
      return { ok: true, status: 200, json: async () => [] };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await waitFor(() => expect(screen.getByText('API ready')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Ask a question about your indexed sources…'), { target: { value: 'What is this?' } });
    fireEvent.submit(document.querySelector('.query-form'));

    await waitFor(() => expect(screen.getByText('Question is required · request_validation_failed')).toBeInTheDocument());
  });
});
