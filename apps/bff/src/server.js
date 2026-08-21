import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, DEFAULT_RAGFLOW_BASE_URL } from './app.js';
import { createMockFetch } from './mock-upstream.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const mode = process.env.RAGFLOW_MODE || 'proxy';
const fetchImpl = mode === 'mock' ? createMockFetch() : globalThis.fetch;
const port = Number(process.env.BFF_PORT || 4000);

const app = createApp({
  fetchImpl,
  ragflowBaseUrl: process.env.RAGFLOW_BASE_URL || DEFAULT_RAGFLOW_BASE_URL,
  serviceUserId: process.env.RAGFLOW_USER_ID || 'ragflow',
  expectedApiVersion: process.env.EXPECTED_RAGFLOW_VERSION || '0.1.0',
  frontendDist,
});

app.listen(port, () => {
  console.log(`DocMesh BFF listening on http://localhost:${port} (${mode} upstream)`);
});
