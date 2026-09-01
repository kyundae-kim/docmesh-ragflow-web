---
source_url: https://github.com/kyundae-kim/ragflow-api/wiki/API-Reference-v0.2.0
ingested: 2026-08-31
sha256: 934c94061ccd70ba67449c2e5177511060e4cbdeb5cde8e69518609eb86ff15e
---

# RAG Flow API — API Reference v0.2.0

이 문서는 `ragflow-api`의 현재 소스 snapshot을 기준으로 HTTP 공개 API 전체를 고정한 버전 문서다. 각 endpoint는 `operationId → handler → application call → test/coverage → example` 경로로 추적할 수 있다.

> **버전 식별 주의**
>
> 이 페이지의 `v0.2.0` suffix는 `ragflow-api` package version과 현재 source snapshot을 식별한다. 하지만 현재 FastAPI 앱의 `OpenAPI info.version`은 구현상 `0.1.0`이다. 두 값은 일치하지 않으며 이 문서에서 임의로 합치지 않는다. 배포된 `/openapi.json`은 반드시 아래의 HTTP API 식별자 `0.1.0`과 대조해야 한다.

## 계약 식별 정보

| 항목 | 값 |
|---|---|
| 문서/source snapshot | `v0.2.0` |
| package | `ragflow-api` |
| package version | `0.2.0` ([`pyproject.toml:1-4`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/pyproject.toml#L1-L4)) |
| HTTP API / OpenAPI `info.version` | `0.1.0` ([`ragflow/app.py:66`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L66)) |
| release tag | 없음; `git describe --tags --always --dirty` = `v0.1.0-6-gd6bebaf` |
| source revision | [`d6bebafa4f83347284baa3d3c2c066ba0ce07ffa`](https://github.com/kyundae-kim/ragflow-api/tree/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa) |
| OpenAPI document | `3.1.0` |
| generated contract | [OpenAPI-v0.2.0.json](OpenAPI-v0.2.0.json) |
| generated contract SHA-256 | `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566` |
| declared runtime dependencies | `fastapi[standard]>=0.135.3`, `pydantic>=2.12`, `pyjwt[crypto]>=2.12.1`, `rag-system-core>=0.5.0` |
| source verification | `uv run pytest -q` — `48 passed in 1.92s` |
| static verification | `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright` — 모두 통과 |

package version과 HTTP `info.version`이 달라지는 원인은 현재 구현의 [`FastAPI(...)`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L66) 인자다. 이 문서는 package snapshot을 `v0.2.0`으로, wire-level HTTP 계약을 `0.1.0`으로 각각 명시한다. `info.version`이 변경되거나 endpoint/schema/status 계약이 바뀌면 기존 페이지를 덮어쓰지 말고 새 snapshot을 추가한다.

현재 URL에는 `/v1` 또는 `/v0.2.0` prefix가 없다. 버전은 page/artifact suffix, package version, HTTP `info.version`, full source revision, artifact checksum의 조합으로 식별한다.

관련 문서: [Examples v0.2.0](Examples-v0.2.0), [OpenAPI v0.2.0 JSON](OpenAPI-v0.2.0.json), [API Reference v0.1.0](API-Reference-v0.1.0).

## 1. 공개 표면 전체

OpenAPI artifact에는 10개 path와 11개 application operation이 있다. FastAPI가 기본으로 추가하는 public discovery path 4개를 별도로 포함하면 공개 path는 총 14개다. 기본 discovery route는 실제 route inventory에서 `GET`과 `HEAD`를 제공하며, 아래 표에서는 계약 설명을 위해 `GET`으로 표기한다.

### 1.1 Discovery·운영 route

| Trace ID | Method | Path | 의미 | 인증 | 근거/예제 |
|---|---|---|---|---|---|
| API-D01 | `GET`/`HEAD` | `/openapi.json` | 실행 중인 machine-readable OpenAPI 계약 | 없음 | [`app.py:66`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L66), EX-00 |
| API-D02 | `GET`/`HEAD` | `/docs` | Swagger UI | 없음 | [`app.py:66`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L66), EX-00 |
| API-D03 | `GET`/`HEAD` | `/docs/oauth2-redirect` | Swagger UI 보조 callback route | 없음 | [`app.py:66`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L66), EX-00 |
| API-D04 | `GET`/`HEAD` | `/redoc` | ReDoc UI | 없음 | [`app.py:66`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L66), EX-00 |

이 route들은 `FastAPI` 기본 문서 route이므로 business handler가 아니다. 연동 client는 `/docs` HTML보다 `/openapi.json`의 exact artifact를 기준으로 계약을 선택해야 한다. dedicated pytest HTTP coverage는 없고, route 존재는 앱 생성 경로와 EX-00 smoke check로 추적한다.

### 1.2 Business API traceability matrix

`operationId`와 response 목록은 [OpenAPI-v0.2.0.json](OpenAPI-v0.2.0.json)에서 생성한 값이다. `declared status`는 OpenAPI에 선언된 상태이며, dependency가 실제로 해당 오류를 발생시켰다는 뜻은 아니다.

| Trace ID | Method / path | `operationId` | Handler | Application call | Success / declared errors | Test / coverage | Example |
|---|---|---|---|---|---|---|---|
| API-01 | `GET /health/live` | `liveness_health_live_get` | [`health.py:13-15`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/health.py#L13-L15) | 없음 | `200` | [`test_api.py:586-591`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L586-L591) | EX-01 |
| API-02 | `GET /health/ready` | `readiness_health_ready_get` | [`health.py:18-51`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/health.py#L18-L51) | `request.app.state.health_check_runner()` | `200`, `503` | [`test_api.py:594-625`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L594-L625) | EX-01 |
| API-03 | `POST /documents/text` | `ingest_text_documents_text_post` | [`documents.py:133-144`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L133-L144) | `core.ingest_text()` | `201`; `400/403/404/409/413/422/425/500/502/503/504` declared | [`test_api.py:166-187`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L166-L187), validation tests | EX-02 |
| API-04 | `POST /documents/file` | `ingest_file_documents_file_post` | [`documents.py:147-213`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L147-L213) | `core.ingest_file_stream()` | `201`; `400/403/404/409/413/422/425/500/502/503/504` declared | [`test_api.py:434-499`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L434-L499), [`test_api.py:502-704`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L502-L704) | EX-03 |
| API-05 | `GET /documents` | `list_documents_documents_get` | [`documents.py:45-52`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L45-L52) | `core.list_documents()` | `200`; document error set declared | [`test_api.py:190-206`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L190-L206) | EX-04 |
| API-06 | `GET /documents/{doc_id}` | `get_document_documents__doc_id__get` | [`documents.py:55-64`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L55-L64) | `core.get_document()` | `200`; `404 document_not_found` | [`test_api.py:209-248`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L209-L248) | EX-04, EX-07 |
| API-07 | `GET /documents/{doc_id}/chunks` | `list_document_chunks_documents__doc_id__chunks_get` | [`documents.py:67-79`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L67-L79) | `core.list_document_chunks()` | `200`; `404 document_not_found` | [`test_api.py:249-304`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L249-L304) | EX-04 |
| API-08 | `GET /documents/{doc_id}/ingestion-progress` | `list_ingestion_progress_documents__doc_id__ingestion_progress_get` | [`documents.py:81-100`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L81-L100) | `core.list_ingestion_progress()` | `200`; `404 document_not_found` | [`test_api.py:307-350`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L307-L350) | EX-04 |
| API-09 | `DELETE /documents/{doc_id}` | `delete_document_documents__doc_id__delete` | [`documents.py:122-130`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L122-L130) | `core.delete_document()` | `204`; `404 document_not_found` | [`test_api.py:392-431`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L392-L431) | EX-06, EX-07 |
| API-10 | `POST /query` | `query_query_post` | [`query.py:12-23`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/query.py#L12-L23) | `core.query()` | `200`; `400/413/422/500/503` declared | [`test_api.py:540-583`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L540-L583) | EX-05 |
| API-11 | `GET /documents/{doc_id}/ingestion-step-statuses` | `get_ingestion_step_statuses_documents__doc_id__ingestion_step_statuses_get` | [`documents.py:103-119`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L103-L119) | `core.get_ingestion_step_statuses()` | `200`; `404 document_not_found` | [`test_api.py:353-389`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L353-L389) | EX-04 |

통합 HTTP lifecycle과 user isolation은 [`test_integration.py:35-194`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_integration.py#L35-L194)에서 API-03, API-05–API-11을 함께 검증한다. OpenAPI의 user header와 공통 오류 response 참조는 [`test_app.py:56-85`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_app.py#L56-L85)에서 검증한다.

## 2. 공통 요청·scope 계약

### 2.1 `X-User-Id`

API-03부터 API-11까지의 business route에는 호출자가 제공하는 `X-User-Id` header가 필요하다.

- header 값은 양끝 공백을 제거한 뒤 `AuthenticatedUser(sub=...)`로 전달된다.
- header가 없거나 공백뿐이면 `400 user_id_required`다.
- API 자체는 Bearer token, JWT, Keycloak, identity provider를 검증하지 않는다. header의 진위·위조 방지는 trusted gateway 또는 상위 호출자의 책임이다.
- 문서 목록, 문서 조회, chunk, progress, status, delete, query는 이 `sub` scope로 실행된다.
- 다른 사용자의 `doc_id`는 존재 여부를 숨기기 위해 `404 document_not_found`가 된다.
- OpenAPI에서는 FastAPI dependency의 `str | None = None` 기본값 때문에 `required: false`로 보인다. 이것은 runtime contract가 optional이라는 뜻이 아니다.

근거: [`dependencies.py:19-29`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/dependencies.py#L19-L29), [`test_api.py:628-638`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L628-L638), [`test_integration.py:127-194`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_integration.py#L127-L194).

### 2.2 요청 크기

- `RAGFLOW_MAX_UPLOAD_BYTES` 기본값은 `10 * 1024 * 1024` bytes, 즉 10 MiB다.
- `/documents/file`은 파일 payload가 이 한도를 넘으면 `413 upload_too_large`다.
- ASGI middleware는 파일 한도에 multipart overhead `1 MiB`를 더한 전체 request body를 FastAPI parsing 전에 제한한다. 기본 전체 한도는 11 MiB이며 초과 시 `413 request_too_large`다.
- `create_app(max_upload_bytes=...)`로 주입한 값은 runtime 기본값을 override한다.
- streaming body에 `Content-Length`가 없더라도 middleware가 누적 body 크기를 검사한다.

근거: [`app.py:33-73`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L33-L73), [`middleware.py:11-99`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/middleware.py#L11-L99), [`test_middleware.py:15-109`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_middleware.py#L15-L109).

### 2.3 pagination·idempotency·retry

- HTTP list endpoint에는 pagination, cursor, page size query가 없다.
- progress endpoint만 선택 query `job_id`로 특정 ingestion history를 필터링한다.
- HTTP adapter가 별도 idempotency key를 받는 endpoint는 없다.
- `retryable`은 error response의 일부다. transport retry 가능 여부는 dependency와 `retryable` 값을 함께 판단해야 하며, 모든 `5xx`를 무조건 재시도하지 않는다.

## 3. Schema 계약

### 3.1 `TextIngestRequest`

`POST /documents/text`의 `application/json` body다.

| Field | Type | Required | Constraint |
|---|---|---:|---|
| `text` | string | yes | 최소 1자, trim 후 blank 불가 |
| `source` | string | yes | 최소 1자, trim 후 blank 불가 |

validator는 trim한 값을 application layer로 전달한다. 위반 시 `422 request_validation_failed`와 `issues`가 반환된다.

### 3.2 `/documents/file` multipart body

| Part | Type | Required | Rule |
|---|---|---:|---|
| `file` | file/binary | yes | UTF-8 text, 0-byte/whitespace-only 불가 |
| `source` | string form field | no | trim 후 사용; 비어 있으면 `file.filename` fallback |

OpenAPI generated schema 이름은 `Body_ingest_file_documents_file_post`지만 구현 세부사항이다. client는 semantic field 이름 `file`, `source`를 사용한다. `source`와 filename이 모두 비어 있으면 `422 invalid_source`다.

### 3.3 `IngestResponse` — `201`

```json
{
  "job_id": "<job-id>",
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>",
  "chunk_count": 1
}
```

`job_id`는 API-08/API-11의 선택 필터에 사용할 수 있다. `user_id`, DMS asset reference, prompt는 노출하지 않는다.

### 3.4 `DocumentResponse` — `200`

```json
{
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>"
}
```

### 3.5 `ChunkResponse` — `200`

```json
{
  "chunk_id": "<chunk-id>",
  "doc_id": "<document-id>",
  "content": "FastAPI is the transport layer.",
  "metadata": {
    "source": "architecture.txt"
  }
}
```

`metadata`는 현재 public allowlist인 `source`만 포함한다. asset reference, token, 내부 persistence 값은 제거된다. 근거: [`schemas.py:74-91`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/schemas.py#L74-L91), [`test_api.py:270-287`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L270-L287).

### 3.6 `IngestionProgressResponse` — `200`

```json
{
  "progress_id": "<progress-id>",
  "job_id": "<job-id>",
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "step_name": "embedding",
  "step_order": 3,
  "status": "completed",
  "created_at": "<ISO-8601 timestamp>"
}
```

현재 테스트 기준 pipeline 단계는 `load`, `preprocess`, `chunking`, `embedding`, `vector_store`, `chunk_persistence`다. API-08은 transition history를 반환하므로 같은 단계에 여러 row가 있을 수 있다. `job_id` query가 없으면 해당 문서의 progress를 조회한다.

### 3.7 API-11 status map — `200`

`GET /documents/{doc_id}/ingestion-step-statuses`는 `object<string, string>`을 반환한다.

```json
{
  "load": "completed",
  "preprocess": "completed",
  "chunking": "completed",
  "embedding": "completed",
  "vector_store": "completed",
  "chunk_persistence": "completed"
}
```

`job_id`를 주면 해당 job 기준이다. 문서는 보이지만 progress가 없으면 정의된 단계가 `not_started`로 계산될 수 있으며, 보이지 않는 문서는 `404 document_not_found`다.

### 3.8 `QueryRequest` / `QueryResponse`

```json
{
  "question": "What is the transport layer?",
  "top_k": 3
}
```

- `question`: required, 최소 1자, trim 후 blank 불가
- `top_k`: optional, default `3`, 허용 범위 `1..100`

```json
{
  "answer": "<generated answer>",
  "context_chunks": [
    {
      "chunk_id": "<chunk-id>",
      "doc_id": "<document-id>",
      "content": "FastAPI is the transport layer.",
      "metadata": {"source": "architecture.txt"}
    }
  ]
}
```

context는 요청 사용자의 scope에 속한 chunk만 포함한다. 내부 prompt와 `user_id`는 포함하지 않는다.

### 3.9 `ReadinessResponse`

```json
{
  "status": "ready",
  "services": [
    {
      "service": "metadata",
      "ok": true,
      "duration_seconds": 0.001,
      "error": null
    }
  ]
}
```

`status`는 `ready` 또는 `not_ready`다. 실패한 service의 `error`는 `Dependency check failed`로 정규화되며 connection string, credential, raw exception을 포함하지 않는다. API-02의 `503`도 이 `ReadinessResponse` schema를 사용한다.

### 3.10 `ApiErrorResponse`

모든 host/application 오류는 다음 공통 shape를 사용한다.

```json
{
  "code": "request_validation_failed",
  "category": "validation",
  "retryable": false,
  "message": "Request validation failed",
  "issues": [
    {
      "location": ["body", "question"],
      "message": "<validation message>",
      "type": "<validation type>"
    }
  ]
}
```

`issues`는 validation 오류에서만 포함될 수 있다. `location` item은 string 또는 integer다. client는 dependency version에 따라 바뀔 수 있는 `issues[].message/type`보다 stable top-level fields와 location을 우선 처리해야 한다.

## 4. Endpoint별 계약

### API-01 — `GET /health/live`

- `X-User-Id` 불필요
- external dependency를 호출하지 않는 liveness probe
- 성공: `200`

```json
{"status": "ok"}
```

### API-02 — `GET /health/ready`

- `X-User-Id` 불필요
- `request.app.state.health_check_runner`를 호출한다.
- runner가 없거나 예외를 발생시키면 secret-safe failed result를 사용한다.
- 성공: `200`, `ReadinessResponse.status == "ready"`
- dependency 실패: `503`, `ReadinessResponse.status == "not_ready"`

runtime이 조립한 경우 readiness runner는 DMS metadata DB, RAG metadata DB, MinIO, Ollama, Milvus를 검사할 수 있다. `create_app(core=...)` 주입 테스트에서는 metadata dependency를 검사한다. 근거: [`health.py:28-50`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/health.py#L28-L50), [`health.py:67-92`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/health.py#L67-L92).

### API-03 — `POST /documents/text`

요청:

```http
POST /documents/text
X-User-Id: user-a
Content-Type: application/json
```

```json
{"text":"FastAPI is the transport layer.","source":"architecture.txt"}
```

정상 시 `RAGCore.ingest_text(user=..., text=..., source=...)`를 호출하고 `201 IngestResponse`를 반환한다. `text`와 `source`는 handler 진입 전에 trim·blank validation을 통과해야 한다.

### API-04 — `POST /documents/file`

요청은 `multipart/form-data`다.

```bash
curl -X POST "$BASE_URL/documents/file" \
  -H 'X-User-Id: user-a' \
  -F 'file=@architecture.txt;type=text/plain' \
  -F 'source=architecture.txt'
```

처리 순서와 계약:

1. 파일 크기와 전체 request body limit을 검사한다.
2. 0-byte, whitespace-only, invalid UTF-8을 거부한다.
3. `source` form field를 trim한다.
4. 비어 있으면 upload filename을 source로 사용한다.
5. `RAGCore.ingest_file_stream()`에 caller-owned file stream을 전달한다.
6. 정상 시 `201 IngestResponse`다.

대표 입력 오류는 `empty_upload`, `invalid_file`, `invalid_utf8`, `invalid_source`, `upload_too_large`, `request_too_large`다.

### API-05 — `GET /documents`

현재 `X-User-Id` scope의 문서만 `DocumentResponse[]`로 반환한다. query filter와 pagination은 없다. 성공 status는 `200`이다.

### API-06 — `GET /documents/{doc_id}`

- `doc_id`: required path string
- 현재 사용자가 볼 수 있는 문서: `200 DocumentResponse`
- 없는 문서 또는 다른 사용자 문서: `404 document_not_found`

### API-07 — `GET /documents/{doc_id}/chunks`

- `doc_id`: required path string
- 문서가 현재 사용자에게 보이면 `200 ChunkResponse[]`
- 문서가 없거나 scope 밖이면 `404 document_not_found`
- response의 `metadata`에는 public `source`만 포함한다.

### API-08 — `GET /documents/{doc_id}/ingestion-progress`

- `doc_id`: required path string
- `job_id`: optional query string
- 성공: `200 IngestionProgressResponse[]`
- 문서가 없거나 scope 밖이면 `404 document_not_found`
- history와 job filter semantics는 Schema §3.6을 따른다.

예: `GET /documents/<document-id>/ingestion-progress?job_id=<job-id>`

### API-11 — `GET /documents/{doc_id}/ingestion-step-statuses`

- `doc_id`: required path string
- `job_id`: optional query string
- 성공: `200 object<string,string>`
- 문서가 없거나 scope 밖이면 `404 document_not_found`
- 정의된 ingestion 단계별 final status map을 반환한다.

### API-09 — `DELETE /documents/{doc_id}`

- `doc_id`: required path string
- 성공: body 없는 `204`
- 없는 문서 또는 다른 사용자 문서: `404 document_not_found`
- 성공 response body를 파싱하지 말고 HTTP status와 empty body를 확인한다.

### API-10 — `POST /query`

```http
POST /query
X-User-Id: user-a
Content-Type: application/json
```

```json
{"question":"What is the transport layer?","top_k":3}
```

`RAGCore.query(user=..., question=..., top_k=...)`를 호출하고 `200 QueryResponse`를 반환한다. `question` blank 또는 `top_k`가 `1..100` 밖이면 `422 request_validation_failed`다. 검색 context는 요청 user scope로 제한된다.

## 5. 오류·HTTP projection

### 5.1 Host가 직접 생성하는 code

| HTTP | `code` | `category` | 발생 경계 | 근거 |
|---:|---|---|---|---|
| `400` | `user_id_required` | `validation` | business route의 header 누락/공백 | [`dependencies.py:22-28`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/dependencies.py#L22-L28) |
| `400` | `invalid_request` | `validation` | framework parser가 요청을 해석하지 못함 | [`errors.py:62-85`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/errors.py#L62-L85) |
| `400` | `invalid_utf8` | `validation` | file body UTF-8 decode 실패 | [`documents.py:180-190`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L180-L190) |
| `404` | `document_not_found` | `not_found` | 없는 문서 또는 다른 사용자 문서 | [`documents.py:36-42`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L36-L42) |
| `413` | `request_too_large` | `validation` | 전체 request body limit 초과 | [`middleware.py:90-99`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/middleware.py#L90-L99) |
| `413` | `upload_too_large` | `validation` | 파일별 upload limit 초과 | [`documents.py:172-178`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L172-L178) |
| `422` | `request_validation_failed` | `validation` | JSON/multipart/Pydantic validation 실패 | [`errors.py:37-59`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/errors.py#L37-L59) |
| `422` | `empty_upload` | `validation` | 0-byte file | [`documents.py:165-171`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L165-L171) |
| `422` | `invalid_file` | `validation` | whitespace-only UTF-8 file | [`documents.py:191-197`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L191-L197) |
| `422` | `invalid_source` | `validation` | source와 filename이 모두 비어 있음 | [`documents.py:200-206`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/documents.py#L200-L206) |
| `500` | `internal_error` | `internal` | 예측하지 못한 application exception | [`errors.py:156-165`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/errors.py#L156-L165) |

### 5.2 DMS error projection

문서 route는 `dms.DmsError`의 public `code`, `category`, `retryable`만 사용한다. 원본 exception 문자열, host, endpoint, credential은 response에 복사하지 않는다.

| DMS code/category | HTTP | 비고 |
|---|---:|---|
| `idempotency_in_progress` | `425` | retryable 여부는 DMS error 값 사용 |
| `document_too_large` | `413` | document-level limit |
| category `access` | `403` | operation forbidden |
| category `validation` | `400` | DMS request validation |
| category `not_found` | `404` | resource not found |
| category `conflict`, `unavailable` | `409` | current state conflict |
| category `storage`, `health` | `503` | dependency failure |
| 그 외 | `500` | generic safe response |

근거: [`errors.py:88-153`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/errors.py#L88-L153). 현재 통합 테스트는 `object_storage_failed`/`storage` 오류를 `503`, `retryable: true`로 projection하고 원본 MinIO 상세를 숨기는 것을 확인한다([`test_api.py:728-749`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/test_ragflow/test_api.py#L728-L749)).

### 5.3 OpenAPI declared status와 observed status 구분

- document router는 `400`, `403`, `404`, `409`, `413`, `422`, `425`, `500`, `502`, `503`, `504`를 `ApiErrorResponse`로 선언한다.
- query router는 `400`, `413`, `422`, `500`, `503`을 `ApiErrorResponse`로 선언한다.
- 이 선언은 가능한 wire contract를 설명한다. 현재 테스트가 각 dependency별 `502`/`504` live 응답을 모두 관찰했다는 뜻은 아니다.
- `/health/ready`의 `503`은 error envelope가 아니라 `ReadinessResponse`다.

선언 근거: [`openapi.py:12-37`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/api/openapi.py#L12-L37).

## 6. Runtime·lifecycle 경계

- `ragflow.main:app`은 [`main.py:1-3`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/main.py#L1-L3)에서 `create_app()`으로 생성된다.
- 기본 runtime은 lifespan에서 DMS/RAG metadata engine, MinIO, Ollama/Milvus service bundle, `DocmeshRAGServiceFactory`, `RAGCore`를 조립한다.
- `create_app(core=...)` 또는 `runtime_factory=...`를 사용하면 외부 서비스 없이 HTTP boundary를 검증할 수 있다.
- API handler는 RAGCore에 ingestion/retrieval/document operation을 위임하고 public DTO와 error projection만 소유한다.
- lifecycle shutdown의 resource ownership은 [`app.py:47-64`](https://github.com/kyundae-kim/ragflow-api/blob/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa/ragflow/app.py#L47-L64)와 runtime 구현을 함께 확인해야 한다.

## 7. 버전 추적·재현 절차

### 7.1 실행 중 서버 확인

```bash
export BASE_URL="${BASE_URL:-http://localhost:8000}"
curl -fsS "$BASE_URL/openapi.json" \
  | jq '{openapi, info, paths: (.paths | keys)}'
```

이 snapshot을 선택하려면 다음 조건이 모두 맞아야 한다.

- `openapi == "3.1.0"`
- `info.title == "RAG Flow API"`
- `info.version == "0.1.0"`
- path/operation set이 이 문서와 일치

### 7.2 exact artifact 생성

source revision `d6bebafa4f83347284baa3d3c2c066ba0ce07ffa`에서 다음을 실행한다.

```bash
uv run python -c 'from ragflow.app import create_app; import json; print(json.dumps(create_app().openapi(), ensure_ascii=False, indent=2))' \
  > OpenAPI-v0.2.0.json
python3 -m json.tool OpenAPI-v0.2.0.json >/dev/null
sha256sum OpenAPI-v0.2.0.json
```

기대 checksum은 `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566`이다. 값이 달라지면 Python/FastAPI/Pydantic/runtime source가 이 snapshot과 같은지 먼저 확인한다.

### 7.3 새 문서 발행 규칙

다음 변경 시 기존 `API-Reference-v0.1.0` 또는 이 페이지를 덮어쓰지 않는다.

- package/API version 또는 source revision 변경
- endpoint, `operationId`, schema, status, header, error code 변경
- 예제 workflow의 요청/응답 가정 변경

새 pair와 JSON artifact를 추가하고 Home의 version table을 갱신하면 version별 `operationId → handler → test → example → source revision → checksum` chain이 보존된다.
