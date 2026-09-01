---
source_url: https://github.com/kyundae-kim/ragflow-api/wiki/Examples-v0.2.0
ingested: 2026-08-31
sha256: 0ff5c7fe3ae7507ba46b3e14c2fab862ad83536a09b3b345cc3e39b898b2448f
---

# RAG Flow API — Examples v0.2.0

이 문서는 `ragflow-api` package/source snapshot `v0.2.0`의 HTTP 공개 API 예제다. 실제 wire-level API 식별자는 현재 구현의 `OpenAPI info.version = 0.1.0`이며, 예제 실행 전에 EX-00에서 확인한다.

normative contract는 [API Reference v0.2.0](API-Reference-v0.2.0)과 [OpenAPI-v0.2.0.json](OpenAPI-v0.2.0.json)을 기준으로 한다. 과거 snapshot은 [API Reference v0.1.0](API-Reference-v0.1.0)과 [Examples v0.1.0](Examples-v0.1.0)에서 확인한다.

## 예제 식별 정보

| 항목 | 값 |
|---|---|
| package/source snapshot | `v0.2.0` |
| package version | `0.2.0` |
| HTTP/OpenAPI `info.version` | `0.1.0` |
| source revision | [`d6bebafa4f83347284baa3d3c2c066ba0ce07ffa`](https://github.com/kyundae-kim/ragflow-api/tree/d6bebafa4f83347284baa3d3c2c066ba0ce07ffa) |
| release tag | 없음; `v0.1.0-6-gd6bebaf` snapshot |
| OpenAPI version | `3.1.0` |
| artifact | [OpenAPI-v0.2.0.json](OpenAPI-v0.2.0.json) |
| artifact SHA-256 | `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566` |
| source verification | `uv run pytest -q` — `48 passed in 1.92s` |
| prerequisites | 실행 중인 API, `curl`, EX-00/ID 추출에는 `jq` 권장 |
| base URL | 배포 환경에 따라 다름; 예제 기본값은 `http://localhost:8000` |

모든 ID·timestamp·answer는 실행마다 달라진다. `<...>`는 placeholder이며 실제 production ID, credential, endpoint를 문서에 기록하지 않는다. `X-User-Id`는 API가 인증하지 않으므로 trusted gateway 또는 테스트 환경에서만 사용한다.

## EX-00. discovery route와 HTTP version guard

**Trace:** API-D01, API-D02, API-D03, API-D04.

```bash
set -euo pipefail

export BASE_URL="${BASE_URL:-http://localhost:8000}"
export EXPECTED_OPENAPI_VERSION="0.1.0"

CONTRACT="$(curl -fsS "$BASE_URL/openapi.json")"
printf '%s\n' "$CONTRACT" | jq '{openapi, info, paths: (.paths | keys)}'

SERVER_VERSION="$(printf '%s' "$CONTRACT" | jq -r '.info.version')"
if [ "$SERVER_VERSION" != "$EXPECTED_OPENAPI_VERSION" ]; then
  printf 'Unsupported RAG Flow HTTP API info.version: %s\n' "$SERVER_VERSION" >&2
  exit 1
fi

# FastAPI public discovery UI/callback routes
curl -fsS -o /dev/null -w 'docs HTTP %{http_code}\n' "$BASE_URL/docs"
curl -fsS -o /dev/null -w 'oauth2 redirect HTTP %{http_code}\n' "$BASE_URL/docs/oauth2-redirect"
curl -fsS -o /dev/null -w 'redoc HTTP %{http_code}\n' "$BASE_URL/redoc"
printf 'Using package snapshot v0.2.0 / HTTP API %s\n' "$SERVER_VERSION"
```

`v0.2.0`은 package/source snapshot 이름이고, 위 guard는 서버의 wire-level `info.version`인 `0.1.0`을 검사한다. 두 값을 하나의 API version으로 취급하지 않는다.

## EX-01. liveness와 readiness

**Trace:** API-01, API-02.

`/health/live`는 user header와 외부 dependency 없이 호출한다.

```bash
curl -fsS "$BASE_URL/health/live" | jq -e '.status == "ok"'
```

정상 shape:

```json
{"status":"ok"}
```

`/health/ready`는 dependency 상태에 따라 `200` 또는 `503`일 수 있으므로 status와 body를 함께 확인한다.

```bash
READY_BODY="$(mktemp)"
READY_STATUS="$(curl -sS -o "$READY_BODY" -w '%{http_code}' "$BASE_URL/health/ready")"
jq . "$READY_BODY"
printf 'HTTP %s\n' "$READY_STATUS"
rm -f "$READY_BODY"
```

형식 예시(환경에 따라 달라짐):

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

실패 시 `status`는 `not_ready`, HTTP status는 `503`이며 `services[].error`는 `Dependency check failed`로 정규화된다.

## EX-02. JSON text ingestion

**Trace:** API-03.

```bash
export USER_ID="${USER_ID:-user-a}"

INGEST_RESPONSE="$(curl -fsS -X POST "$BASE_URL/documents/text" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"text":"FastAPI is the transport layer.","source":"architecture.txt"}')"
printf '%s\n' "$INGEST_RESPONSE" | jq .

DOC_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.doc_id')"
JOB_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.job_id')"
printf 'DOC_ID=%s\nJOB_ID=%s\n' "$DOC_ID" "$JOB_ID"
```

정상 응답은 `201`이며 shape는 다음과 같다.

```json
{
  "job_id": "<job-id>",
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>",
  "chunk_count": 1
}
```

`text` 또는 `source`가 trim 후 blank이면 `422 request_validation_failed`다. 성공 응답의 `DOC_ID`, `JOB_ID`를 EX-04–EX-06에서 재사용한다.

## EX-03. multipart UTF-8 file ingestion

**Trace:** API-04.

`source`를 명시하는 기본 호출:

```bash
printf 'FastAPI delegates retrieval to RAGCore.\n' > architecture.txt

FILE_INGEST_RESPONSE="$(curl -fsS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@architecture.txt;type=text/plain' \
  -F 'source=architecture.txt')"
printf '%s\n' "$FILE_INGEST_RESPONSE" | jq '{doc_id, job_id, source, chunk_count}'
```

`source`를 생략하면 upload filename을 사용한다.

```bash
curl -fsS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@architecture.txt;type=text/plain' \
  | jq '{doc_id, source, chunk_count}'
# source는 architecture.txt
```

입력 경계와 계약:

| 상황 | HTTP | code |
|---|---:|---|
| 0-byte upload | `422` | `empty_upload` |
| whitespace-only UTF-8 file | `422` | `invalid_file` |
| invalid UTF-8 bytes | `400` | `invalid_utf8` |
| `source`와 filename 모두 blank | `422` | `invalid_source` |
| 파일별 `RAGFLOW_MAX_UPLOAD_BYTES` 초과 | `413` | `upload_too_large` |
| multipart를 포함한 전체 body limit 초과 | `413` | `request_too_large` |

재현 입력 예시(응답 body를 production 결과로 가정하지 말고 HTTP status와 stable `code`를 확인한다):

```bash
: > empty.txt
curl -sS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@empty.txt;type=text/plain' \
  | jq .

printf ' \n\t' > whitespace.txt
curl -sS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@whitespace.txt;type=text/plain' \
  | jq .

printf '\xff\xfe' > binary.txt
curl -sS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@binary.txt;type=application/octet-stream' \
  | jq .
```

## EX-04. 문서·chunk·progress·step status 조회

**Trace:** API-05, API-06, API-07, API-08, API-11.

EX-02의 `DOC_ID`, `JOB_ID`와 같은 `USER_ID`를 사용한다.

```bash
# 현재 사용자의 문서 목록
curl -fsS "$BASE_URL/documents" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# public document metadata
curl -fsS "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# public chunks; metadata에는 source만 노출
curl -fsS "$BASE_URL/documents/$DOC_ID/chunks" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# transition history; 특정 job filter
curl -fsS "$BASE_URL/documents/$DOC_ID/ingestion-progress?job_id=$JOB_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# final status map
curl -fsS "$BASE_URL/documents/$DOC_ID/ingestion-step-statuses?job_id=$JOB_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq .
```

문서 shape:

```json
{
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>"
}
```

chunk shape:

```json
[
  {
    "chunk_id": "<chunk-id>",
    "doc_id": "<document-id>",
    "content": "FastAPI is the transport layer.",
    "metadata": {"source": "architecture.txt"}
  }
]
```

progress는 `load`, `preprocess`, `chunking`, `embedding`, `vector_store`, `chunk_persistence` 등의 transition row를 포함할 수 있다. step status는 다음과 같은 map이다.

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

문서가 없거나 현재 `X-User-Id` scope 밖이면 API-06–API-09/API-11은 `404 document_not_found`다.

## EX-05. 사용자 scope RAG query

**Trace:** API-10.

```bash
curl -fsS -X POST "$BASE_URL/query" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is the transport layer?","top_k":3}' \
  | jq .
```

응답 shape:

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

`top_k`를 생략하면 `3`, 허용 범위는 `1..100`이다. question이 blank이거나 범위를 벗어나면 `422 request_validation_failed`다. context에는 요청 user scope의 chunk만 포함된다.

## EX-06. 문서 삭제와 lifecycle 종료

**Trace:** API-09.

성공은 body 없는 `204`다.

```bash
curl -sS -i -X DELETE "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID"
```

삭제 후 같은 사용자의 조회는 `404 document_not_found`다.

```bash
curl -sS -i "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID"
```

삭제 대상이 없거나 다른 사용자의 문서면 `404`이며 다른 사용자의 문서는 삭제되지 않는다.

## EX-07. scope isolation과 stable error envelope

**Trace:** API-03, API-06, API-07, API-08, API-09, API-10, API-11.

### header 누락

```bash
curl -sS -i "$BASE_URL/documents"
```

stable top-level shape:

```json
{
  "code": "user_id_required",
  "category": "validation",
  "retryable": false,
  "message": "X-User-Id header is required"
}
```

### 다른 사용자 문서 접근

`USER_ID`로 만든 `DOC_ID`를 `user-b`로 조회한다.

```bash
curl -sS -i "$BASE_URL/documents/$DOC_ID" \
  -H 'X-User-Id: user-b'
```

응답은 존재 여부를 숨기는 `404`다.

```json
{
  "code": "document_not_found",
  "category": "not_found",
  "retryable": false,
  "message": "Document was not found"
}
```

### blank query validation

```bash
curl -sS -i -X POST "$BASE_URL/query" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"question":"   "}'
```

status는 `422`, `code`는 `request_validation_failed`, `category`는 `validation`이며 `issues[0].location`은 `['body', 'question']`다. Pydantic/FastAPI dependency version에 따라 issue message/type의 세부 문자열은 달라질 수 있다.

### multipart parser validation

```bash
curl -sS -i -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: multipart/form-data' \
  --data-binary 'not-a-valid-multipart-body'
```

잘못된 parser request는 `400 invalid_request`이고 raw boundary/parser detail을 그대로 노출하지 않는다.

## EX-08. 전체 smoke workflow

**Trace:** API-01–API-11 중 discovery route를 제외한 전체 business lifecycle.

다음 예제는 ingestion → read → query → delete를 한 번에 확인한다. production cleanup 정책이 있는 테스트 환경에서만 실행한다.

```bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
USER_ID="${USER_ID:-workflow-user}"
EXPECTED_OPENAPI_VERSION="0.1.0"

CONTRACT="$(curl -fsS "$BASE_URL/openapi.json")"
printf '%s' "$CONTRACT" | jq -e --arg expected "$EXPECTED_OPENAPI_VERSION" '.info.version == $expected' >/dev/null

curl -fsS "$BASE_URL/health/live" | jq -e '.status == "ok"' >/dev/null

INGEST_RESPONSE="$(curl -fsS -X POST "$BASE_URL/documents/text" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"text":"FastAPI delegates document retrieval to RAGCore.","source":"workflow.txt"}')"
DOC_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.doc_id')"
JOB_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.job_id')"

curl -fsS "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq -e --arg id "$DOC_ID" '.doc_id == $id' >/dev/null
curl -fsS "$BASE_URL/documents" \
  -H "X-User-Id: $USER_ID" \
  | jq -e --arg id "$DOC_ID" 'map(.doc_id) | index($id) != null' >/dev/null
curl -fsS "$BASE_URL/documents/$DOC_ID/chunks" \
  -H "X-User-Id: $USER_ID" \
  | jq -e 'length > 0' >/dev/null
curl -fsS "$BASE_URL/documents/$DOC_ID/ingestion-progress?job_id=$JOB_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq -e 'length > 0' >/dev/null
curl -fsS "$BASE_URL/documents/$DOC_ID/ingestion-step-statuses?job_id=$JOB_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq -e '.load != null and .chunk_persistence != null' >/dev/null
curl -fsS -X POST "$BASE_URL/query" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What does FastAPI delegate?"}' \
  | jq -e '.answer != null and .context_chunks != null' >/dev/null

DELETE_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' \
  -X DELETE "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID")"
[ "$DELETE_STATUS" = "204" ]
printf 'Smoke workflow passed for HTTP API %s\n' "$EXPECTED_OPENAPI_VERSION"
```

## EX-09. source/artifact 재현 확인

**Trace:** API-D01, version tuple 전체.

실행 중 계약의 version/path와 Wiki artifact의 checksum을 분리해 확인한다.

```bash
# 서버가 제공하는 wire contract
curl -fsS "$BASE_URL/openapi.json" \
  | jq '{openapi, title: .info.title, api_version: .info.version, operation_count: ([.paths[] | to_entries[] | select(.key | IN("get","post","put","patch","delete"))] | length)}'

# source checkout 후 Wiki artifact와 비교할 때
sha256sum OpenAPI-v0.2.0.json
```

기대 operation 수는 `11`, artifact checksum은 `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566`이다. source revision, package version, HTTP `info.version`, OpenAPI spec version, checksum 중 하나라도 다르면 이 예제를 다른 snapshot에 적용하지 않는다.

## 예제 coverage index

| Example | API trace |
|---|---|
| EX-00 | API-D01–API-D04 |
| EX-01 | API-01, API-02 |
| EX-02 | API-03 |
| EX-03 | API-04 |
| EX-04 | API-05–API-08, API-11 |
| EX-05 | API-10 |
| EX-06 | API-09 |
| EX-07 | API-03, API-06–API-11의 scope/error branches |
| EX-08 | API-01–API-11 business smoke workflow |
| EX-09 | API-D01 및 version/checksum trace |
