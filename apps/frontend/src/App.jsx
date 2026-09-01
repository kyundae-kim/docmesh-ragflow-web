import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const fallbackStatus = {
  apiVersion: null,
  expectedVersion: '0.1.0',
  openapiVersion: null,
  expectedOpenapiVersion: '3.1.0',
  compatible: false,
  available: false,
  capabilities: { ingestionStepStatuses: false },
  live: { status: 'unknown' },
  ready: { status: 'unknown', services: [] },
};

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'documents', label: 'Documents', icon: 'files' },
  { id: 'query', label: 'Query console', icon: 'spark' },
  { id: 'health', label: 'API health', icon: 'activity' },
];

const tabCopy = {
  overview: {
    label: 'Overview',
    title: 'Knowledge workspace',
    description: 'Turn source material into answers you can inspect, trace, and trust.',
  },
  documents: {
    label: 'Documents',
    title: 'Documents',
    description: 'Browse indexed sources, inspect their public chunks, and follow ingestion progress.',
  },
  query: {
    label: 'Query console',
    title: 'Query console',
    description: 'Ask the scoped workspace and keep every retrieved context block in view.',
  },
  health: {
    label: 'API health',
    title: 'API health',
    description: 'Monitor the live RAG Flow contract, dependencies, and same-origin BFF boundary.',
  },
  settings: {
    label: 'Settings',
    title: 'Settings',
    description: 'Review the connection target and the server-owned identity policy for this workspace.',
  },
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function formatApiError(error, fallback) {
  const payload = error?.payload;
  if (payload?.code) return `${payload.message || fallback} · ${payload.code}`;
  return payload?.message || fallback;
}

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" {...common} /><rect x="14" y="3" width="7" height="7" rx="1" {...common} /><rect x="3" y="14" width="7" height="7" rx="1" {...common} /><rect x="14" y="14" width="7" height="7" rx="1" {...common} /></>,
    files: <><path d="M7 3.5h8l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" {...common} /><path d="M15 3.5V7h3M9 11h6M9 15h6" {...common} /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" {...common} /><path d="m16 16 4.5 4.5" {...common} /></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" {...common} /></>,
    settings: <><circle cx="12" cy="12" r="3" {...common} /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.84 1.84-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-2.6v-.06a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.84-1.84.06-.06A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.56-1.04H6v-2.6h.06A1.7 1.7 0 0 0 7.62 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.84-1.84.06.06A1.7 1.7 0 0 0 11 6a1.7 1.7 0 0 0 1.04-1.56V4h2.6v.06A1.7 1.7 0 0 0 15.68 6a1.7 1.7 0 0 0 1.88.34l.06-.06 1.84 1.84-.06.06A1.7 1.7 0 0 0 19.06 10c.7.1 1.26.67 1.36 1.36H20.5v2.6h-.08A1.7 1.7 0 0 0 19.4 15Z" {...common} /></>,
    plus: <><path d="M12 5v14M5 12h14" {...common} /></>,
    upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" {...common} /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" {...common} /></>,
    chevron: <path d="m8 10 4 4 4-4" {...common} />,
    check: <path d="m5 12 4 4L19 6" {...common} />,
    clock: <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M12 7v5l3.5 2" {...common} /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    trash: <><path d="M4.5 7h15M10 3.5h4l1 2.5H9l1-2.5ZM7 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7M10 11v6M14 11v6" {...common} /></>,
    send: <><path d="m21 3-7.2 18-3.4-7.4L3 10.2 21 3Z" {...common} /><path d="M10.4 13.6 21 3" {...common} /></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" {...common} /></>,
    database: <><ellipse cx="12" cy="5.5" rx="7.5" ry="3" {...common} /><path d="M4.5 5.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6M4.5 11.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" {...common} /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" {...common} /><path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} /></>,
    file: <><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" {...common} /><path d="M14 3.5V8h4M9 12h6M9 16h4" {...common} /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" {...common} /></>,
    alert: <><path d="M12 3.5 21 20H3L12 3.5Z" {...common} /><path d="M12 9v4M12 16.5h.01" {...common} /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.8 4L21 14M21 19v-5h-5" {...common} /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">{paths[name] || paths.file}</svg>;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function fileKind(source = '') {
  const extension = source.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'PDF';
  if (extension === 'md') return 'MD';
  if (extension === 'txt') return 'TXT';
  return 'DOC';
}

function StatusPill({ status, children }) {
  return <span className={`status-pill ${status}`}><span className="status-dot" />{children}</span>;
}

function DocumentTile({ document, selected, chunkCount, onSelect }) {
  return (
    <button className={`document-tile ${selected ? 'selected' : ''}`} onClick={() => onSelect(document.doc_id)} type="button">
      <span className="file-badge">{fileKind(document.source)}</span>
      <span className="document-tile-copy">
        <strong>{document.source}</strong>
        <small>{document.doc_id} · added {formatDate(document.created_at)}</small>
      </span>
      <span className="document-tile-meta">
        <StatusPill status="ready">indexed</StatusPill>
        <small>{chunkCount ? `${chunkCount} chunks` : 'syncing'}</small>
      </span>
      <Icon name="chevron" size={16} />
    </button>
  );
}

function EmptyState({ icon = 'files', title, description }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={21} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState(fallbackStatus);
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [stepStatuses, setStepStatuses] = useState({});
  const [chunkCounts, setChunkCounts] = useState({});
  const [jobIds, setJobIds] = useState({});
  const [search, setSearch] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestMode, setIngestMode] = useState('text');
  const [ingestText, setIngestText] = useState('');
  const [ingestSource, setIngestSource] = useState('');
  const [ingestFile, setIngestFile] = useState(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const apiReady = Boolean(status.available !== false && status.compatible && status.ready?.status === 'ready' && status.live?.status === 'ok');

  const showToast = useCallback((message, tone = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    const [statusResult, documentsResult] = await Promise.allSettled([
      requestJson('/api/status'),
      requestJson('/api/documents'),
    ]);
    if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
    else if (statusResult.reason?.payload) setStatus(statusResult.reason.payload);
    if (documentsResult.status === 'fulfilled') {
      const nextDocuments = Array.isArray(documentsResult.value) ? documentsResult.value : [];
      setDocuments(nextDocuments);
      setSelectedId((current) => current || nextDocuments[0]?.doc_id || null);
    } else {
      showToast(formatApiError(documentsResult.reason, 'Could not load documents'), 'error');
    }
    setWorkspaceLoading(false);
  }, [showToast]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const supportsStepStatuses = status.capabilities?.ingestionStepStatuses === true;

  const loadDocument = useCallback(async (docId) => {
    if (!docId) return;
    const jobQuery = jobIds[docId] ? `?job_id=${encodeURIComponent(jobIds[docId])}` : '';
    const requests = [
      requestJson(`/api/documents/${encodeURIComponent(docId)}`),
      requestJson(`/api/documents/${encodeURIComponent(docId)}/chunks`),
      requestJson(`/api/documents/${encodeURIComponent(docId)}/ingestion-progress${jobQuery}`),
    ];
    if (supportsStepStatuses) {
      requests.push(requestJson(`/api/documents/${encodeURIComponent(docId)}/ingestion-step-statuses${jobQuery}`));
    }
    const [detailResult, chunksResult, progressResult, stepStatusesResult] = await Promise.allSettled(requests);
    if (detailResult.status === 'fulfilled') setSelectedDocument(detailResult.value);
    if (chunksResult.status === 'fulfilled') {
      const nextChunks = Array.isArray(chunksResult.value) ? chunksResult.value : [];
      setChunks(nextChunks);
      setChunkCounts((current) => ({ ...current, [docId]: nextChunks.length }));
    }
    if (progressResult.status === 'fulfilled') setProgress(Array.isArray(progressResult.value) ? progressResult.value : []);
    if (stepStatusesResult?.status === 'fulfilled') {
      const nextStepStatuses = stepStatusesResult.value;
      if (nextStepStatuses && typeof nextStepStatuses === 'object' && !Array.isArray(nextStepStatuses)) {
        setStepStatuses(nextStepStatuses);
      }
    }
    const results = [detailResult, chunksResult, progressResult];
    if (supportsStepStatuses) results.push(stepStatusesResult);
    const failedResult = results.find((result) => result.status === 'rejected' && result.reason?.status !== 404);
    if (failedResult) {
      showToast(formatApiError(failedResult.reason, 'The selected document could not be fully loaded'), 'error');
    }
  }, [jobIds, showToast, supportsStepStatuses]);

  useEffect(() => { loadDocument(selectedId); }, [loadDocument, selectedId]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((document) => `${document.source} ${document.doc_id}`.toLowerCase().includes(term));
  }, [documents, search]);

  const stepStatusEntries = Object.entries(stepStatuses);
  const pipelineSteps = stepStatusEntries.length
    ? stepStatusEntries.map(([step_name, pipelineStatus]) => ({ step_name, status: pipelineStatus }))
    : progress.length
      ? progress
      : ['load', 'preprocess', 'chunking', 'embedding', 'vector_store', 'chunk_persistence'].map((step_name) => ({ step_name, status: 'completed' }));
  const pipelineStepCount = stepStatusEntries.length || progress.length;
  const completedSteps = stepStatusEntries.length
    ? stepStatusEntries.filter(([, pipelineStatus]) => pipelineStatus === 'completed').length
    : progress.filter((item) => item.status === 'completed').length;
  const progressPercent = pipelineStepCount ? Math.round((completedSteps / pipelineStepCount) * 100) : 100;
  const selectedListDocument = documents.find((document) => document.doc_id === selectedId);

  const handleQuery = async (event) => {
    event.preventDefault();
    if (!question.trim() || !apiReady) return;
    setQueryLoading(true);
    try {
      const result = await requestJson('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), top_k: 3 }),
      });
      setAnswer(result);
    } catch (error) {
      showToast(formatApiError(error, 'Query failed'), 'error');
    } finally {
      setQueryLoading(false);
    }
  };

  const refreshDocument = () => {
    loadDocument(selectedId);
    showToast('Document detail refreshed');
  };

  const handleDelete = async () => {
    if (!selectedId || !apiReady) return;
    try {
      await requestJson(`/api/documents/${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
      const nextDocuments = await requestJson('/api/documents');
      setDocuments(nextDocuments);
      setSelectedId(nextDocuments[0]?.doc_id || null);
      setSelectedDocument(null);
      setChunks([]);
      setProgress([]);
      setStepStatuses({});
      setJobIds((current) => {
        const next = { ...current };
        delete next[selectedId];
        return next;
      });
      showToast('Document removed from the workspace');
    } catch (error) {
      showToast(formatApiError(error, 'Document could not be deleted'), 'error');
    }
  };

  const handleIngest = async (event) => {
    event.preventDefault();
    if (!apiReady) return;
    setIngestLoading(true);
    try {
      let result;
      if (ingestMode === 'text') {
        result = await requestJson('/api/documents/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ingestText, source: ingestSource }),
        });
      } else {
        const formData = new FormData();
        if (ingestFile) formData.append('file', ingestFile);
        if (ingestSource.trim()) formData.append('source', ingestSource.trim());
        result = await requestJson('/api/documents/file', { method: 'POST', body: formData });
      }
      const nextDocuments = await requestJson('/api/documents');
      setDocuments(nextDocuments);
      if (result?.doc_id && result?.job_id) setJobIds((current) => ({ ...current, [result.doc_id]: result.job_id }));
      setSelectedId(result.doc_id);
      setIngestOpen(false);
      setIngestText('');
      setIngestSource('');
      setIngestFile(null);
      showToast(`${result.source} is now in the ingestion queue`, 'success');
    } catch (error) {
      showToast(formatApiError(error, 'Ingestion failed'), 'error');
    } finally {
      setIngestLoading(false);
    }
  };

  const serviceCount = status.ready?.services?.length || 0;
  const readyServiceCount = status.ready?.services?.filter((service) => service.ok).length || 0;
  const activeTabConfig = tabCopy[activeTab] || tabCopy.overview;
  const canAddSource = activeTab === 'overview' || activeTab === 'documents';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>docmesh</strong><small>RAG workspace</small></div>
        </div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigationItems.map((item) => <button className={`nav-item ${activeTab === item.id ? 'active' : ''}`} key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? 'page' : undefined}><Icon name={item.icon} />{item.label}{item.id === 'documents' && <span className="nav-count">{documents.length || '—'}</span>}{activeTab === item.id && <span className="nav-active-line" />}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="scope-card">
            <div className="scope-card-top"><span className="scope-icon"><Icon name="lock" size={14} /></span><span>Scoped workspace</span><span className="scope-live" /></div>
            <strong>ragflow</strong>
            <p>Identity is fixed by the BFF. Browser headers are never trusted.</p>
          </div>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('settings')} aria-current={activeTab === 'settings' ? 'page' : undefined}><Icon name="settings" />Settings{activeTab === 'settings' && <span className="nav-active-line" />}</button>
          <div className="user-row"><div className="avatar">DM</div><div><strong>DocMesh team</strong><small>Internal preview</small></div><Icon name="more" size={16} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeTabConfig.label}</strong></div>
          <div className="topbar-actions">
            <div className="api-status-wrap">
              <span className={`api-status-dot ${apiReady ? 'ready' : 'offline'}`} />
              <span>{apiReady ? 'API ready' : status.apiVersion ? 'Compatibility check' : 'Connecting'}</span>
              <span className="api-version">v{status.apiVersion || '—'}</span>
            </div>
            <button className="icon-button" type="button" aria-label="Search workspace"><Icon name="search" /></button>
            <button className="avatar small" type="button">DM</button>
          </div>
        </header>

        <div className={`content-wrap tab-${activeTab}`}>
          <section className="page-intro">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />RAGFLOW CONTROL PLANE</p>
              <h1>{activeTabConfig.title}</h1>
              <p className="intro-copy">{activeTabConfig.description}</p>
            </div>
            <div className="intro-actions">
              <div className="identity-chip"><span className="identity-orb"><Icon name="lock" size={13} /></span><span><small>Service identity</small><strong>ragflow</strong></span></div>
              {canAddSource && <button className="primary-button" type="button" onClick={() => setIngestOpen(true)} disabled={!apiReady}><Icon name="plus" size={17} />Add source</button>}
            </div>
          </section>

          {activeTab === 'overview' && <section className="hero-panel">
            <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
            <div className="hero-copy"><span className="hero-kicker"><Icon name="spark" size={14} /> retrieval, with receipts</span><h2>Your library is ready for the next question.</h2><p>Ingest a source, follow its processing trail, then ask the workspace with context always in view.</p><button className="text-button" type="button" onClick={() => document.getElementById('query-console')?.scrollIntoView({ behavior: 'smooth' })}>Open query console <Icon name="arrow" size={15} /></button></div>
            <div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><Icon name="database" size={29} /></div><span className="orbit-label label-top">indexed</span><span className="orbit-label label-right">scoped</span><span className="orbit-label label-bottom">traceable</span></div>
          </section>}

          {activeTab === 'overview' && <section className="metric-row" aria-label="Workspace summary">
            <div className="metric-card"><span className="metric-icon peach"><Icon name="files" size={17} /></span><div><small>Sources indexed</small><strong>{workspaceLoading ? '—' : documents.length}</strong></div><span className="metric-trend positive">+{documents.length ? '12%' : '—'}</span></div>
            <div className="metric-card"><span className="metric-icon mint"><Icon name="database" size={17} /></span><div><small>Selected chunks</small><strong>{selectedId ? (chunkCounts[selectedId] || '…') : '—'}</strong></div><span className="metric-trend">public</span></div>
            <div className="metric-card"><span className="metric-icon violet"><Icon name="activity" size={17} /></span><div><small>Pipeline health</small><strong>{serviceCount ? `${readyServiceCount}/${serviceCount}` : '—'}</strong></div><span className="metric-trend positive">stable</span></div>
            <div className="metric-card"><span className="metric-icon blue"><Icon name="spark" size={17} /></span><div><small>Contract version</small><strong>{status.apiVersion || '—'}</strong></div><span className={`metric-trend ${status.compatible ? 'positive' : 'warning'}`}>{status.compatible ? 'compatible' : 'guarded'}</span></div>
          </section>}

          {(activeTab === 'overview' || activeTab === 'documents') && <section className="workspace-grid">
            <div className="surface-card library-card">
              <div className="card-heading"><div><p className="card-kicker">Library</p><h2>Indexed documents</h2></div><button className="quiet-button" type="button" onClick={() => setIngestOpen(true)} disabled={!apiReady}><Icon name="plus" size={15} />Add</button></div>
              <div className="library-toolbar"><label className="search-field"><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by source or id" aria-label="Filter documents" /></label><button className="filter-button" type="button"><Icon name="files" size={15} />All <Icon name="chevron" size={14} /></button></div>
              <div className="document-list">
                {workspaceLoading ? <div className="list-loading"><span /><span /><span /></div> : filteredDocuments.length ? filteredDocuments.map((document) => <DocumentTile key={document.doc_id} document={document} selected={document.doc_id === selectedId} chunkCount={chunkCounts[document.doc_id]} onSelect={setSelectedId} />) : <EmptyState icon="search" title="No matching sources" description="Try a different source name or clear the filter." />}
              </div>
              <div className="list-footer"><span><span className="footer-pulse" />Synced with scoped API</span><span>{documents.length} total</span></div>
            </div>

            <div className="surface-card inspector-card">
              <div className="card-heading"><div><p className="card-kicker">Inspector</p><h2>Document detail</h2></div><div className="heading-actions"><button className="icon-button subtle" type="button" aria-label="Refresh document" onClick={refreshDocument} disabled={!selectedId}><Icon name="refresh" size={16} /></button><button className="icon-button subtle danger" type="button" aria-label="Delete document" onClick={handleDelete} disabled={!selectedId || !apiReady}><Icon name="trash" size={16} /></button></div></div>
              {selectedDocument ? <>
                <div className="selected-source"><span className="file-badge large">{fileKind(selectedDocument.source)}</span><div><h3>{selectedDocument.source}</h3><span>{selectedDocument.doc_id}</span></div><StatusPill status="ready">ready</StatusPill></div>
                <div className="metadata-grid"><div><span>Created</span><strong>{formatDate(selectedDocument.created_at)}</strong></div><div><span>Chunks</span><strong>{chunks.length || chunkCounts[selectedId] || '—'}</strong></div><div><span>Visibility</span><strong><Icon name="lock" size={12} /> scoped</strong></div></div>
                <div className="pipeline-heading"><div><span className="card-kicker">Ingestion trail</span><strong>{progressPercent}% complete</strong></div><span className="pipeline-job">{stepStatusEntries.length ? `${stepStatusEntries.length} final statuses` : 'progress history'}</span></div>
                <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
                <div className="timeline">{pipelineSteps.map((step, index) => <div className="timeline-step" key={`${step.step_name}-${index}`}><span className={`timeline-icon ${step.status}`}><Icon name={step.status === 'completed' ? 'check' : step.status === 'failed' ? 'alert' : step.status === 'running' ? 'activity' : 'clock'} size={12} /></span><span>{step.step_name.replaceAll('_', ' ')}</span></div>)}</div>
                <div className="chunk-preview-heading"><span className="card-kicker">Public chunk preview</span><span>{chunks.length} blocks</span></div>
                <div className="chunk-preview">{chunks.slice(0, 2).map((chunk) => <div className="chunk-row" key={chunk.chunk_id}><span className="chunk-index">{chunk.chunk_id.split('-').pop()}</span><p>{chunk.content}</p></div>)}</div>
              </> : <EmptyState icon="file" title="Select a source" description="Choose a document to inspect its public metadata, chunks, and ingestion trail." />}
            </div>
          </section>}

          {(activeTab === 'overview' || activeTab === 'query' || activeTab === 'health') && <section className={`query-layout ${activeTab === 'health' ? 'health-layout' : ''}`} id="query-console">
            <div className="surface-card query-card">
              <div className="card-heading"><div><p className="card-kicker">Retrieval</p><h2>Ask the workspace</h2></div><span className="scope-label"><Icon name="lock" size={12} />user scope only</span></div>
              <form className="query-form" onSubmit={handleQuery}><div className="query-input-wrap"><span className="query-spark"><Icon name="spark" size={16} /></span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about your indexed sources…" rows="3" disabled={!apiReady} /><button className="send-button" type="submit" disabled={!apiReady || queryLoading || !question.trim()}>{queryLoading ? <span className="button-spinner" /> : <Icon name="send" size={17} />}</button></div><div className="query-footer"><div className="suggestion-list"><button type="button" onClick={() => setQuestion('What does the BFF own in this architecture?')}>What does the BFF own?</button><button type="button" onClick={() => setQuestion('How is document scope protected?')}>How is scope protected?</button></div><span className="query-limit">top_k 3 · grounded answer</span></div></form>
              {answer ? <div className="answer-block"><div className="answer-heading"><span className="answer-icon"><Icon name="spark" size={15} /></span><div><span className="card-kicker">Generated answer</span><strong>Answer from your workspace</strong></div><StatusPill status="ready">grounded</StatusPill></div><p>{answer.answer}</p><div className="context-heading"><span>Context used</span><span>{answer.context_chunks?.length || 0} public chunks</span></div><div className="context-list">{(answer.context_chunks || []).map((chunk) => <div className="context-card" key={chunk.chunk_id}><span className="context-source"><Icon name="file" size={13} />{chunk.metadata?.source || 'source'}</span><p>{chunk.content}</p><small>{chunk.chunk_id}</small></div>)}</div></div> : <div className="query-empty"><span className="query-empty-icon"><Icon name="spark" size={17} /></span><div><strong>Answers will keep their receipts.</strong><p>Ask a question to see the response and public retrieval context side by side.</p></div></div>}
            </div>
            <div className="surface-card monitor-card">
              <div className="card-heading"><div><p className="card-kicker">Runtime</p><h2>API monitor</h2></div><StatusPill status={apiReady ? 'ready' : 'offline'}>{apiReady ? 'operational' : 'guarded'}</StatusPill></div>
              <div className="monitor-version"><span className="version-orb"><Icon name="activity" size={16} /></span><div><span>RAG Flow API</span><strong>v{status.apiVersion || '—'} <em>{status.compatible ? 'compatible' : 'needs review'}</em></strong></div></div>
              <div className="health-list"><div><span><i className={status.live?.status === 'ok' ? 'health-check' : 'health-off'} />Liveness</span><strong>{status.live?.status || 'unknown'}</strong></div><div><span><i className={status.ready?.status === 'ready' ? 'health-check' : 'health-off'} />Readiness</span><strong>{status.ready?.status || 'unknown'}</strong></div><div><span><i className={apiReady ? 'health-check' : 'health-off'} />BFF boundary</span><strong>same-origin</strong></div></div>
              <div className="monitor-note"><Icon name="lock" size={14} /><p>Upstream host, identity policy, and error projection stay server-side.</p></div>
            </div>
          </section>}

          {activeTab === 'settings' && <section className="settings-layout">
            <div className="surface-card settings-card">
              <div className="card-heading"><div><p className="card-kicker">Connection</p><h2>Runtime configuration</h2></div><StatusPill status={apiReady ? 'ready' : 'offline'}>{apiReady ? 'connected' : 'guarded'}</StatusPill></div>
              <div className="settings-list">
                <div className="settings-row"><span>Upstream service</span><strong>RAG Flow API</strong></div>
                <div className="settings-row"><span>Configured target</span><strong>Server-managed target</strong></div>
                <div className="settings-row"><span>Contract version</span><strong>{status.apiVersion || '—'}</strong></div>
                <div className="settings-row"><span>Compatibility</span><strong>{status.compatible ? 'Compatible' : 'Needs review'}</strong></div>
              </div>
            </div>
            <div className="surface-card settings-card">
              <div className="card-heading"><div><p className="card-kicker">Security boundary</p><h2>Scoped identity</h2></div><span className="scope-label"><Icon name="lock" size={12} />server-owned</span></div>
              <div className="settings-identity"><span className="identity-orb"><Icon name="lock" size={15} /></span><div><span>Service identity</span><strong>ragflow</strong></div></div>
              <div className="settings-note"><Icon name="lock" size={14} /><p>The BFF supplies <code>X-User-Id</code> to business routes. Browser-provided identity headers are ignored.</p></div>
            </div>
          </section>}

          <footer className="page-footer"><span>DocMesh preview · contract-first integration</span><span><Icon name="lock" size={12} /> No private metadata exposed to the UI</span></footer>
        </div>
      </main>

      {ingestOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIngestOpen(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="ingest-title"><div className="modal-heading"><div><p className="card-kicker">New source</p><h2 id="ingest-title">Add to your workspace</h2></div><button className="icon-button subtle" type="button" aria-label="Close dialog" onClick={() => setIngestOpen(false)}><Icon name="close" /></button></div><div className="ingest-tabs"><button className={ingestMode === 'text' ? 'active' : ''} onClick={() => setIngestMode('text')} type="button"><Icon name="file" size={15} />Paste text</button><button className={ingestMode === 'file' ? 'active' : ''} onClick={() => setIngestMode('file')} type="button"><Icon name="upload" size={15} />Upload file</button></div><form onSubmit={handleIngest} className="ingest-form">{ingestMode === 'text' ? <label>Source content<textarea value={ingestText} onChange={(event) => setIngestText(event.target.value)} placeholder="Paste a short source to index…" rows="7" required /></label> : <label className="file-drop"><span className="file-drop-icon"><Icon name="upload" size={20} /></span><strong>{ingestFile ? ingestFile.name : 'Choose a UTF-8 text file'}</strong><small>10 MiB maximum · filename becomes source</small><input type="file" accept=".txt,.md,.csv,text/plain,text/markdown" onChange={(event) => setIngestFile(event.target.files?.[0] || null)} required /></label>}<label>Source name<input value={ingestSource} onChange={(event) => setIngestSource(event.target.value)} placeholder={ingestMode === 'file' ? 'Optional · defaults to filename' : 'e.g. architecture-notes.md'} required={ingestMode === 'text'} /></label><div className="modal-actions"><button className="quiet-button" type="button" onClick={() => setIngestOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={ingestLoading || (ingestMode === 'text' ? !ingestText.trim() || !ingestSource.trim() : !ingestFile)}>{ingestLoading ? <span className="button-spinner" /> : <Icon name="plus" size={16} />}{ingestLoading ? 'Indexing…' : 'Start ingestion'}</button></div></form></div></div>}
      {toast && <div className={`toast ${toast.tone}`}><span className="toast-icon"><Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={15} /></span>{toast.message}</div>}
    </div>
  );
}

export default App;
