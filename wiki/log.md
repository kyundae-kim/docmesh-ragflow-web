# Wiki Log

> Chronological record of all wiki actions. Append-only.
> Format: `## [YYYY-MM-DD] action | subject`
> Actions: ingest, update, query, lint, create, archive, delete
> When this file exceeds 500 entries, rotate it to `log-YYYY.md` and start fresh.

## [2026-08-21] create | Wiki initialized
- Domain: DocMesh init RAG system web frontend and RESTful API consumer
- Scope: frontend web UI, user flows, API contracts, integration behavior, testing, deployment, and operational knowledge
- Boundary: application layer and business logic are supplied by an external program through RESTful API; backend implementation is out of scope
- Structure created: `SCHEMA.md`, `index.md`, `log.md`, `raw/`, `entities/`, `concepts/`, `comparisons/`, `queries/`
- Initial wiki pages: none; ready for source ingestion

## [2026-08-21] ingest | RAG Flow API v0.1.0 reference and examples
- Sources captured:
  - `raw/articles/ragflow-api-api-reference-v0-1-0.md`
  - `raw/articles/ragflow-api-examples-v0-1-0.md`
- Raw body SHA-256:
  - `6324fbc4307db95c24eaa0286bba66680c54d15731d993410cd1b0af0a6465e5`
  - `30a6221e8ef381de57a3df39cbd69b4577591af01af4c0c828af8f22ea33289f`
- Pages created:
  - `entities/ragflow-api.md`
  - `concepts/ragflow-api-contract-v0-1-0.md`
  - `concepts/ragflow-api-document-lifecycle.md`
  - `concepts/ragflow-api-user-scope-and-errors.md`
- Navigation updated: `index.md` total pages `4`

## [2026-08-31] ingest | RAG Flow API v0.2.0 reference and examples
- Sources captured:
  - `raw/articles/ragflow-api-api-reference-v0-2-0.md`
  - `raw/articles/ragflow-api-examples-v0-2-0.md`
- Raw body SHA-256:
  - `934c94061ccd70ba67449c2e5177511060e4cbdeb5cde8e69518609eb86ff15e`
  - `0ff5c7fe3ae7507ba46b3e14c2fab862ad83536a09b3b345cc3e39b898b2448f`
- Pages created:
  - `concepts/ragflow-api-contract-v0-2-0.md`
  - `comparisons/ragflow-api-v0-1-0-v0-2-0.md`
- Pages updated:
  - `entities/ragflow-api.md`
  - `concepts/ragflow-api-document-lifecycle.md`
  - `concepts/ragflow-api-user-scope-and-errors.md`
- Key changes: package/source snapshot `v0.2.0` is distinct from HTTP `OpenAPI info.version` `0.1.0`; API-11 adds ingestion step-status maps; v0.2.0 records 11 application operations, explicit 10 MiB/11 MiB request limits, and declared-versus-observed error handling.
- Navigation and log updated: `index.md` total pages `6`, `log.md`
