# docmesh-ragflow-web

React + Express BFF UI mockup for the `ragflow-api` v0.1.0 contract.

## Architecture

```text
React / Vite  →  same-origin /api  →  Express BFF  →  ragflow-api
                                      └─ mock upstream (default preview mode)
```

- `apps/frontend`: React UI for the document lifecycle, ingestion progress, public chunks, query context, and API monitor.
- `apps/bff`: Express adapter that owns the upstream URL, fixed `X-User-Id: ragflow` scope, version/readiness guard, multipart forwarding, and public error projection.
- `apps/bff/src/mock-upstream.js`: disposable in-memory RAG Flow API implementation for local UI preview. It follows the documented paths and response shapes without requiring a running backend.

The UI calls only `/api/*`. The browser cannot override the BFF's service identity.

## Run the preview

```sh
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and Express BFF. `npm run build` only creates the production bundle; it does not start a server. `npm build dev` is not a valid npm command.

Open:

- React/Vite development UI: <http://localhost:5173>
- Production-style BFF root: <http://localhost:4000>

The BFF defaults to the in-memory mock upstream so the lifecycle can be exercised immediately. To serve the built frontend through Express:

```sh
npm run build
npm start
```

## Connect to the real RAG Flow API

The adapter uses the exact v0.1.0 paths documented in `wiki/entities/ragflow-api.md` and does not add `/v1`.

```sh
RAGFLOW_MODE=proxy \
RAGFLOW_BASE_URL=http://localhost:8000 \
RAGFLOW_USER_ID=ragflow \
EXPECTED_RAGFLOW_VERSION=0.1.0 \
npm start
```

`RAGFLOW_MODE=proxy` makes the BFF use `RAGFLOW_BASE_URL` instead of the local mock. The live `/openapi.json`, `/health/live`, and `/health/ready` responses are exposed through `/api/status`; incompatible versions guard ingestion and query actions in the UI.

## Verify

```sh
npm test
npm run build
curl -i http://localhost:4000/api/status
curl -i http://localhost:4000/api/documents
curl -i http://localhost:4000/
```

The test suite covers the exact upstream path, fixed server-side scope header, public error projection, version/readiness status, and a React document tile smoke test.
