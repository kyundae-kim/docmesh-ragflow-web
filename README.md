# docmesh-ragflow-web

React + Express BFF UI for the `ragflow-api` v0.1.0 contract.

## Architecture

```text
React / Vite  →  same-origin /api  →  Express BFF  →  ragflow-api
```

- `apps/frontend`: React UI for the document lifecycle, ingestion progress and final step statuses, public chunks, query context, and API monitor.
- `apps/bff`: Express adapter that owns the upstream URL, fixed `X-User-Id: ragflow` scope, version/readiness guard, multipart forwarding, and public error projection.
- `apps/bff/src/mock-upstream.js`: optional disposable in-memory RAG Flow API implementation for tests or isolated UI preview.

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

The BFF connects to `http://ragflow:8000` by default. To serve the built frontend through Express:

```sh
npm run build
npm start
```

Use `RAGFLOW_MODE=mock` only when the live service is intentionally unavailable and a disposable in-memory preview is needed.

## Connect to the real RAG Flow API

The adapter uses the exact v0.1.0 paths documented in `wiki/entities/ragflow-api.md` and does not add `/v1`.

```sh
RAGFLOW_MODE=proxy \
RAGFLOW_BASE_URL=http://ragflow:8000 \
RAGFLOW_USER_ID=ragflow \
EXPECTED_RAGFLOW_VERSION=0.1.0 \
npm start
```

`RAGFLOW_MODE=proxy` makes the BFF use `RAGFLOW_BASE_URL` instead of the local mock. The live `/openapi.json`, `/health/live`, and `/health/ready` responses are exposed through `/api/status`; incompatible versions guard ingestion and query actions in the UI. The status response also advertises whether the v0.2.0 `ingestion-step-statuses` capability is present, so an older compatible server is not called for an unsupported route.

## Verify

```sh
npm test
npm run build
curl -i http://localhost:4000/api/status
curl -i http://localhost:4000/api/documents
curl -i http://localhost:4000/
```

The test suite covers the exact upstream paths, fixed server-side scope header, multipart and JSON boundary handling, public error projection, version/readiness and capability status, `204` deletion, and React lifecycle/tab smoke tests.
