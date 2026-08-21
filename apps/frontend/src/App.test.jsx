import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const responses = {
  '/api/status': {
    apiVersion: '0.1.0',
    compatible: true,
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
});
