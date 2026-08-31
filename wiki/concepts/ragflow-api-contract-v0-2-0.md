---
title: RAG Flow API Contract v0.2.0
created: 2026-08-31
updated: 2026-08-31
type: concept
tags: [api, data-model, integration, testing, decision, risk]
sources: [raw/articles/ragflow-api-api-reference-v0-2-0.md, raw/articles/ragflow-api-examples-v0-2-0.md]
confidence: medium
---

# RAG Flow API Contract v0.2.0

## Definition

이 페이지는 `ragflow-api` package/source snapshot `v0.2.0`의 HTTP 공개 계약을 정리한다. 이 suffix는 source revision과 package version을 식별하며, 현재 wire-level `OpenAPI info.version`은 여전히 `0.1.0`이다. 따라서 프론트엔드는 `v0.2.0`과 `info.version: 0.1.0`을 하나의 버전 값으로 합치지 않는다.

Normative contract는 API Reference와 생성된 `OpenAPI-v0.2.0.json`이며, Examples 문서는 호출 순서와 smoke workflow를 보완한다.

## Contract identity

| 확인 대상 | 기대 값 |
| --- | --- |
| package/source snapshot | `v0.2.0` |
| package version | `0.2.0` |
| HTTP/OpenAPI `info.version` | `0.1.0` |
| `openapi` | `3.1.0` |
| source revision | `d6bebafa4f83347284baa3d3c2c066ba0ce07ffa` |
| release tag | 없음; `git describe`는 `v0.1.0-6-gd6bebaf` |
| generated artifact | `OpenAPI-v0.2.0.json` |
| artifact SHA-256 | `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566` |
| publication verification | `uv run pytest -q` — `48 passed in 1.92s` |
| static verification | `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright` 통과 |

현재 URL에는 `/v1` 또는 `/v0.2.0` prefix가 없다. 배포 대상은 base URL과 위 version tuple을 함께 확인해야 한다.

## Public surface

OpenAPI artifact에는 10개 business path와 11개 application operation이 있다. FastAPI 기본 discovery route 4개(`/openapi.json`, `/docs`, `/docs/oauth2-redirect`, `/redoc`)를 더하면 unique public path는 14개다. 기본 discovery route는 실제로 `GET`과 `HEAD`를 제공하지만 계약 표에서는 `GET`으로 표시한다.

| Trace | Method / path | `operationId` | Application call | Success / declared errors |
| --- | --- | --- | --- | --- |
| API-01 | `GET /health/live` | `liveness_health_live_get` | 없음 | `200` |
| API-02 | `GET /health/ready` | `readiness_health_ready_get` | `health_check_runner()` | `200`, `503` |
| API-03 | `POST /documents/text` | `ingest_text_documents_text_post` | `core.ingest_text()` | `201` |
| API-04 | `POST /documents/file` | `ingest_file_documents_file_post` | `core.ingest_file_stream()` | `201` |
| API-05 | `GET /documents` | `list_documents_documents_get` | `core.list_documents()` | `200` |
| API-06 | `GET /documents/{doc_id}` | `get_document_documents__doc_id__get` | `core.get_document()` | `200`, `404` |
| API-07 | `GET /documents/{doc_id}/chunks` | `list_document_chunks_documents__doc_id__chunks_get` | `core.list_document_chunks()` | `200`, `404` |
| API-08 | `GET /documents/{doc_id}/ingestion-progress` | `list_ingestion_progress_documents__doc_id__ingestion_progress_get` | `core.list_ingestion_progress()` | `200`, `404` |
| API-09 | `DELETE /documents/{doc_id}` | `delete_document_documents__doc_id__delete` | `core.delete_document()` | `204`, `404` |
| API-10 | `POST /query` | `query_query_post` | `core.query()` | `200` |
| API-11 | `GET /documents/{doc_id}/ingestion-step-statuses` | `get_ingestion_step_statuses_documents__doc_id__ingestion_step_statuses_get` | `core.get_ingestion_step_statuses()` | `200`, `404` |

`API-11`은 transition history를 반환하는 API-08과 달리 문서 ingestion pipeline의 단계별 final status map을 반환한다. `job_id`를 주면 특정 ingestion을 기준으로 계산한다.

## Common request and scope rules

`API-03`부터 `API-11`까지의 business route는 `X-User-Id`를 요구한다. 값은 양끝 공백을 제거한 뒤 `AuthenticatedUser(sub=...)`로 전달되며, header가 없거나 공백뿐이면 `400 user_id_required`다. API 자체는 Bearer token, JWT, Keycloak 또는 identity provider를 검증하지 않으므로 trusted gateway나 상위 호출자가 진위를 보장해야 한다.

OpenAPI에서는 FastAPI dependency의 기본값 때문에 이 header가 `required: false`로 보일 수 있다. 이는 runtime에서 optional이라는 뜻이 아니며, client와 contract test는 runtime의 required 규칙을 기준으로 한다.

`RAGFLOW_MAX_UPLOAD_BYTES` 기본값은 10 MiB다. `/documents/file`은 파일별 한도를 검사하고, ASGI middleware는 multipart overhead 1 MiB를 더한 전체 request body를 검사하므로 기본 전체 한도는 11 MiB다. `Content-Length`가 없어도 누적 body 크기를 검사한다.

pagination과 cursor는 제공되지 않는다. `GET /documents/{doc_id}/ingestion-progress`와 `GET /documents/{doc_id}/ingestion-step-statuses`만 선택 query `job_id`로 ingestion history 또는 status map을 좁힐 수 있다. 별도 idempotency-key header를 받는 endpoint도 없다.

## Schema and status contract

- `TextIngestRequest`: `text`, `source`는 required이며 trim 후 blank일 수 없다.
- `IngestResponse`: `job_id`, `doc_id`, `source`, `created_at`, `chunk_count`를 반환한다.
- `DocumentResponse`: `doc_id`, `source`, `created_at`만 공개한다.
- `ChunkResponse`: `chunk_id`, `doc_id`, `content`, `metadata.source`를 공개한다. asset reference, token, 내부 persistence 값은 노출하지 않는다.
- `IngestionProgressResponse`: `progress_id`, `job_id`, `doc_id`, `source`, `step_name`, `step_order`, `status`, `created_at`를 반환한다.
- API-11 status map: `load`, `preprocess`, `chunking`, `embedding`, `vector_store`, `chunk_persistence` 같은 정의된 단계별 상태를 `object<string, string>`으로 반환한다.
- `QueryRequest`: `question`은 required이며 trim 후 blank일 수 없고, `top_k`의 기본값은 `3`, 범위는 `1..100`이다.
- `QueryResponse`: `answer`와 요청 사용자 scope의 `context_chunks`를 반환한다.

성공 status는 ingestion `201`, 문서·chunk·progress·status 조회 `200`, 삭제 `204`다. `/health/ready`의 dependency 실패는 `ReadinessResponse` body와 `503`을 사용하며 일반 `ApiErrorResponse`와 구분한다.

공통 오류 envelope의 안정적인 top-level field는 `code`, `category`, `retryable`, `message`이며 validation 오류에만 `issues[]`가 포함될 수 있다. OpenAPI가 선언한 `502`와 `504`는 가능한 오류 status이지, publication test가 각 dependency의 live 응답을 관찰했다는 의미는 아니다.

## Reproduction and compatibility

실행 중 서버의 wire contract는 다음 guard로 확인한다.

```sh
BASE_URL="${BASE_URL:-http://localhost:8000}"
EXPECTED_OPENAPI_VERSION="0.1.0"
SERVER_VERSION="$(curl -fsS "$BASE_URL/openapi.json" | jq -r '.info.version')"
[ "$SERVER_VERSION" = "$EXPECTED_OPENAPI_VERSION" ] || exit 1
```

source revision `d6bebafa4f83347284baa3d3c2c066ba0ce07ffa`에서 `create_app().openapi()`를 재생성한 뒤 `OpenAPI-v0.2.0.json`의 SHA-256과 비교한다. package/API version, endpoint, `operationId`, schema, status, header 또는 example workflow가 바뀌면 이 페이지를 덮어쓰지 않고 새 snapshot을 추가한다.

## Related pages

전체 외부 경계는 [[ragflow-api]], 이전 계약과의 차이는 [[ragflow-api-v0-1-0-v0-2-0]], 문서 처리 순서는 [[ragflow-api-document-lifecycle]], scope와 오류 projection은 [[ragflow-api-user-scope-and-errors]], 이전 snapshot은 [[ragflow-api-contract-v0-1-0]]을 참조한다.
