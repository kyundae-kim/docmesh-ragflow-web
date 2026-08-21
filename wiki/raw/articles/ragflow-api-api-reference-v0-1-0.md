---
source_url: https://github.com/kyundae-kim/ragflow-api/wiki/API-Reference-v0.1.0
ingested: 2026-08-21
sha256: 6324fbc4307db95c24eaa0286bba66680c54d15731d993410cd1b0af0a6465e5
---

# RAG Flow API — API Reference v0.1.0

이 문서는 `ragflow-api`의 **HTTP 공개 API v0.1.0**을 현재 구현·OpenAPI·통합 테스트·예제까지 추적할 수 있도록 고정한 버전 문서다.

## 계약 식별 정보

| 항목 | 값 |
|---|---|
| API/package version | `0.1.0` |
| release tag | [`v0.1.0`](https://github.com/kyundae-kim/ragflow-api/releases/tag/v0.1.0) |
| source repository | [`kyundae-kim/ragflow-api`](https://github.com/kyundae-kim/ragflow-api) |
| source revision | [`ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7`](https://github.com/kyundae-kim/ragflow-api/tree/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7) |
| OpenAPI document | `3.1.0` |
| generated contract | [`OpenAPI-v0.1.0.json`](OpenAPI-v0.1.0.json) |
| generated contract SHA-256 | `86173884a223a70766eaf8072fb0f383708699fe6c8b17f9cc7449e5702336fe` |
| source of version | [`pyproject.toml:1-4`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/pyproject.toml#L1-L4), [`ragflow/app.py:59`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/app.py#L59) |
| verification at publication | `uv run pytest -q` — `45 passed` |
현재 API는 URL에 `/v1` prefix를 사용하지 않는다. 따라서 이 계약의 버전은 `OpenAPI info.version`, package version, release tag, source revision, 이 페이지의 버전 suffix로 식별한다. 배포자는 base URL만 바꾸고 path는 아래 표 그대로 사용한다.

## 1. 공개 경계

### 1.1 탐색·운영 route

다음 route는 FastAPI가 application 생성 시 자동으로 제공한다. 연동 코드는 UI보다 `/openapi.json`을 기계 판독 가능한 계약으로 사용해야 한다.

| Trace ID | Method | Path | 의미 | 인증 |
|---|---|---|---|---|
| API-D01 | `GET` | `/openapi.json` | 현재 실행 중인 OpenAPI JSON | 없음 |
| API-D02 | `GET` | `/docs` | Swagger UI | 없음 |
| API-D03 | `GET` | `/redoc` | ReDoc UI | 없음 |
| API-D04 | `GET` | `/docs/oauth2-redirect` | Swagger UI 보조 callback route | 없음 |
근거: [`ragflow/app.py:59-75`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/app.py#L59-L75). 이 route들은 `FastAPI(...)` 기본 문서 설정에서 생성되며 business handler는 아니다.

### 1.2 business API 전체 목록

`operationId`는 실행 중 `/openapi.json`에서 확인할 수 있는 값이다. `Handler`는 실제 HTTP adapter 함수, `Core call`은 handler가 위임하는 application 작업, `Test`와 `Example`은 같은 계약을 검증·사용하는 근거다.

| Trace ID | Method / path | operationId | Handler | Core call | Success | Test | Example |
|---|---|---|---|---|---|---|---|
| API-01 | `GET /health/live` | `liveness_health_live_get` | [`health.py:12-14`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/health.py#L12-L14) | 없음 | `200` | [`test_api.py:549-554`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L549-L554) | EX-01 |
| API-02 | `GET /health/ready` | `readiness_health_ready_get` | [`health.py:17-43`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/health.py#L17-L43) | `core.health_check()` | `200` / `503` | [`test_api.py:557-588`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L557-L588) | EX-01 |
| API-03 | `POST /documents/text` | `ingest_text_documents_text_post` | [`documents.py:114-125`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L114-L125) | `core.ingest_text()` | `201` | [`test_api.py:168-190`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L168-L190) | EX-02 |
| API-04 | `POST /documents/file` | `ingest_file_documents_file_post` | [`documents.py:128-194`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L128-L194) | `core.ingest_file_stream()` | `201` | [`test_api.py:397-500`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L397-L500) | EX-03 |
| API-05 | `GET /documents` | `list_documents_documents_get` | [`documents.py:45-52`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L45-L52) | `core.list_documents()` | `200` | [`test_api.py:192-209`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L192-L209) | EX-04 |
| API-06 | `GET /documents/{doc_id}` | `get_document_documents__doc_id__get` | [`documents.py:55-64`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L55-L64) | `core.get_document()` | `200` | [`test_api.py:211-248`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L211-L248) | EX-04, EX-07 |
| API-07 | `GET /documents/{doc_id}/chunks` | `list_document_chunks_documents__doc_id__chunks_get` | [`documents.py:67-79`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L67-L79) | `core.list_document_chunks()` | `200` | [`test_api.py:251-306`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L251-L306) | EX-04 |
| API-08 | `GET /documents/{doc_id}/ingestion-progress` | `list_ingestion_progress_documents__doc_id__ingestion_progress_get` | [`documents.py:81-100`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L81-L100) | `core.list_ingestion_progress()` | `200` | [`test_api.py:309-352`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L309-L352) | EX-04 |
| API-09 | `DELETE /documents/{doc_id}` | `delete_document_documents__doc_id__delete` | [`documents.py:103-111`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L103-L111) | `core.delete_document()` | `204` | [`test_api.py:355-395`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L355-L395) | EX-06, EX-07 |
| API-10 | `POST /query` | `query_query_post` | [`query.py:12-23`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/query.py#L12-L23) | `core.query()` | `200` | [`test_api.py:503-546`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_api.py#L503-L546) | EX-05 |

## 2. 공통 요청 규칙

### `X-User-Id` scope header

`API-03`부터 `API-10`까지의 business route는 `X-User-Id`를 요청 header로 사용한다.

- 값은 양끝 공백을 제거한 뒤 `AuthenticatedUser.sub`가 된다.
- header가 없거나 공백뿐이면 `400`과 `user_id_required`를 반환한다.
- 이 API는 Bearer token, Keycloak, identity provider를 검증하지 않는다. header의 진위와 위조 방지는 trusted gateway 또는 상위 호출자의 책임이다.
- 문서·청크·query retrieval은 이 사용자 scope로 제한된다.
- 다른 사용자의 `doc_id`는 존재 여부를 숨기기 위해 `404 document_not_found`로 응답한다.
구현 근거: [`dependencies.py:19-29`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/dependencies.py#L19-L29), scope 격리 통합 테스트 [`test_integration.py:113-180`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/test_ragflow/test_integration.py#L113-L180).

OpenAPI에는 FastAPI dependency의 기본값 때문에 header `required: false`로 표현되지만, runtime 계약은 위와 같이 누락을 거부한다. 이 차이는 의도된 validation 경계이며 `test_app.py`의 OpenAPI 계약 테스트에도 기록되어 있다.

### 요청 크기

- `RAGFLOW_MAX_UPLOAD_BYTES` 기본값은 `10 MiB` (`10 * 1024 * 1024`)다.
- `/documents/file`은 파일 자체가 이 한도를 넘으면 `413 upload_too_large`를 반환한다.
- ASGI middleware는 multipart overhead `1 MiB`를 더한 전체 request body를 FastAPI parsing 전에 제한한다. 초과 시 `413 request_too_large`다.
- 빈 파일은 `422 empty_upload`, whitespace-only UTF-8 파일은 `422 invalid_file`, UTF-8이 아닌 파일은 `400 invalid_utf8`다.
구현 근거: [`runtime.py:28-43`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/runtime.py#L28-L43), [`documents.py:140-179`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/documents.py#L140-L179), [`middleware.py:11-18`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/middleware.py#L11-L18).

## 3. 입력·출력 schema

### `TextIngestRequest`

`POST /documents/text`의 JSON body다.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `text` | string | yes | 최소 1자, trim 후 blank 불가 |
| `source` | string | yes | 최소 1자, trim 후 blank 불가 |

### `/documents/file` multipart

| Part | Type | Required | Rule |
|---|---|---|---|
| `file` | file/binary | yes | UTF-8 text, empty/whitespace-only 불가 |
| `source` | string form field | no | trim 후 사용; 비어 있으면 업로드 filename 사용 |
`source`와 filename이 모두 비어 있으면 `422 invalid_source`다. 실제 OpenAPI의 generated multipart schema 이름은 구현 세부사항이므로 소비자는 semantic field 이름 `file`과 `source`를 사용한다.

### `IngestResponse` — `201`

```
{
  "job_id": "<job-id>",
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>",
  "chunk_count": 1
}
```

`job_id`는 ingestion progress 조회에 사용할 수 있다. 내부 `user_id`, DMS asset reference, prompt는 포함하지 않는다.

### `DocumentResponse`

```
{
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>"
}
```

### `ChunkResponse`

```
{
  "chunk_id": "<chunk-id>",
  "doc_id": "<document-id>",
  "content": "FastAPI is the transport layer.",
  "metadata": {
    "source": "architecture.txt"
  }
}
```

`metadata`는 현재 public allowlist인 `source`만 노출한다. `asset_reference`, token 등 내부 metadata는 제거된다.

### `IngestionProgressResponse`

```
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

`GET /documents/{doc_id}/ingestion-progress`는 선택 query parameter `job_id`로 특정 ingestion을 필터링한다. 현재 pipeline에서 관찰되는 단계는 `load`, `preprocess`, `chunking`, `embedding`, `vector_store`, `chunk_persistence`이며 한 문서의 진행 row가 여러 개일 수 있다.

### `QueryRequest` / `QueryResponse`

```
{
  "question": "What is the transport layer?",
  "top_k": 3
}
```

- `question`: required, trim 후 blank 불가
- `top_k`: optional, default `3`, 허용 범위 `1..100`

```
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

query의 context는 요청 사용자의 scope에 속한 chunk만 포함하며 내부 prompt와 `user_id`는 포함하지 않는다. pagination은 제공하지 않는다.

### `ReadinessResponse`

```
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

`/health/ready`가 실패하면 같은 schema로 `503`을 반환하고 `status`는 `not_ready`다. 실패한 service의 error는 `Dependency check failed`로 정규화되어 connection string이나 secret을 노출하지 않는다.

## 4. endpoint 계약

### `API-01 GET /health/live`

외부 dependency를 호출하지 않는 liveness probe다. header 없이 호출하며 항상 다음 shape의 `200`을 반환한다.

```
{"status": "ok"}
```

### `API-02 GET /health/ready`

application dependency health check를 수행한다.

- `200`: `ReadinessResponse.status == "ready"`
- `503`: `ReadinessResponse.status == "not_ready"`
- 인증 header 불필요

### `API-03 POST /documents/text`

```
curl -X POST "$BASE_URL/documents/text" \
  -H 'X-User-Id: user-a' \
  -H 'Content-Type: application/json' \
  -d '{"text":"FastAPI is the transport layer.","source":"architecture.txt"}'
```

정상 ingestion이 끝나면 `201 IngestResponse`를 반환한다. text와 source는 handler 진입 전에 Pydantic validator로 trim·blank 검사를 받는다.

### `API-04 POST /documents/file`

```
curl -X POST "$BASE_URL/documents/file" \
  -H 'X-User-Id: user-a' \
  -F 'file=@architecture.txt;type=text/plain' \
  -F 'source=architecture.txt'
```

`source` form field를 생략하면 `file.filename`이 source가 된다. 파일은 UTF-8 text로 먼저 확인한 뒤 `RAGCore.ingest_file_stream()`으로 전달된다.

### `API-05 GET /documents`

현재 `X-User-Id` 사용자의 문서만 `DocumentResponse[]`로 반환한다. 현재 pagination/query filter는 없다.

### `API-06 GET /documents/{doc_id}`

문서가 현재 사용자에게 보이면 `200 DocumentResponse`, 없거나 다른 사용자 소유면 `404 document_not_found`다.

### `API-07 GET /documents/{doc_id}/chunks`

문서가 현재 사용자에게 보이면 `200 ChunkResponse[]`를 반환한다. 문서가 보이지 않으면 `404 document_not_found`다.

### `API-08 GET /documents/{doc_id}/ingestion-progress`

선택 query parameter `job_id`를 받으며 `200 IngestionProgressResponse[]`를 반환한다. 문서 scope 검사를 먼저 하므로 다른 사용자의 document ID는 `404 document_not_found`다.

### `API-09 DELETE /documents/{doc_id}`

삭제 성공은 body 없는 `204`다. 없는 문서 또는 다른 사용자의 문서는 `404 document_not_found`이며 삭제되지 않는다.

### `API-10 POST /query`

`QueryRequest`를 받아 현재 사용자의 vector context로 `RAGCore.query()`를 호출한다. 성공은 `200 QueryResponse`다. `top_k`가 `1..100` 밖이거나 question이 blank면 `422 request_validation_failed`다.

## 5. 오류 계약

### 공통 body

`ApiErrorResponse`는 모든 host/application 오류에서 다음 필드를 사용한다.

```
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

`issues`는 validation error일 때만 포함될 수 있다. `ApiErrorIssue.location`의 각 item은 string 또는 integer다.

### host가 직접 생성하는 대표 code

| HTTP | code | category | 발생 경계 |
|---|---|---|---|
| `400` | `user_id_required` | `validation` | business route의 header 누락/공백 |
| `400` | `invalid_utf8` | `validation` | file body UTF-8 decode 실패 |
| `400` | `invalid_request` | `validation` | multipart/parser 등 framework parsing 실패 |
| `404` | `document_not_found` | `not_found` | 없는 문서 또는 다른 사용자 문서 |
| `413` | `request_too_large` | `validation` | 전체 request body limit 초과 |
| `413` | `upload_too_large` | `validation` | 파일별 upload limit 초과 |
| `422` | `request_validation_failed` | `validation` | JSON/multipart 필드 validation 실패 |
| `422` | `empty_upload` | `validation` | 0-byte file |
| `422` | `invalid_file` | `validation` | whitespace-only UTF-8 file |
| `422` | `invalid_source` | `validation` | source와 filename이 모두 비어 있음 |
| `500` | `internal_error` | `internal` | 예측하지 못한 application exception |

### DMS 오류 projection

문서 route는 DMS error의 public `code`, `category`, `retryable`만 사용하고 예외 문자열·endpoint·credential을 response에 복사하지 않는다. 현재 host mapping은 다음과 같다.

| DMS code/category | HTTP |
|---|---|
| `idempotency_in_progress` | `425` |
| `document_too_large` | `413` |
| category `access` | `403` |
| category `validation` | `400` |
| category `not_found` | `404` |
| category `conflict`, `unavailable` | `409` |
| category `storage`, `health` | `503` |
| 그 외 | `500` |
OpenAPI의 document route에는 `400`, `403`, `404`, `409`, `413`, `422`, `425`, `500`, `502`, `503`, `504`의 `ApiErrorResponse`가 선언되어 있다. 실제 dependency가 어떤 category/code를 발생시키는지는 사용 중인 `rag-system-core`·DMS adapter에 따라 달라질 수 있으며, 이 표는 host의 projection 규칙이다.

근거: [`errors.py:105-153`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/errors.py#L105-L153), [`openapi.py:12-37`](https://github.com/kyundae-kim/ragflow-api/blob/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7/ragflow/api/openapi.py#L12-L37).

## 6. 버전별 추적 절차

특정 배포의 API가 이 문서와 일치하는지 다음 세 값을 함께 확인한다.

```
# 1) 실행 중 계약 버전
curl -s "$BASE_URL/openapi.json" | jq '.info.version'

# 2) route와 operationId
curl -s "$BASE_URL/openapi.json" | jq '.paths'

# 3) 소스 checkout과 정적 계약 checksum
# git checkout ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7
sha256sum OpenAPI-v0.1.0.json
```

재현 가능한 source-level contract 생성 명령은 다음과 같다.

```
uv run python -c 'from ragflow.app import create_app; import json; print(json.dumps(create_app().openapi(), ensure_ascii=False, indent=2))' \
  > OpenAPI-v0.1.0.json
```

다음 버전에서 endpoint·schema·status가 바뀌면 기존 `API-Reference-v0.1.0`과 `Examples-v0.1.0`을 덮어쓰지 말고 새 버전 suffix를 가진 페이지와 JSON artifact를 추가한다. 그러면 `operationId → handler → core call → test → example → source revision` chain을 버전별로 보존할 수 있다.

관련 문서: [Examples v0.1.0](Examples-v0.1.0), [OpenAPI v0.1.0 JSON](OpenAPI-v0.1.0.json).
