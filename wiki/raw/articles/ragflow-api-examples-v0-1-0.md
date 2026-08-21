---
source_url: https://github.com/kyundae-kim/ragflow-api/wiki/Examples-v0.1.0
ingested: 2026-08-21
sha256: 30a6221e8ef381de57a3df39cbd69b4577591af01af4c0c828af8f22ea33289f
---

# RAG Flow API — Examples v0.1.0

`ragflow-api` HTTP 공개 API `0.1.0`을 실제 호출 순서로 확인하는 예제다. API의 normative contract는 [API Reference v0.1.0](API-Reference-v0.1.0)과 [OpenAPI-v0.1.0.json](OpenAPI-v0.1.0.json)을 기준으로 한다.

## 예제 식별 정보

| 항목 | 값 |
|---|---|
| API/package version | `0.1.0` |
| source revision | [`ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7`](https://github.com/kyundae-kim/ragflow-api/tree/ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7) |
| OpenAPI version | `3.1.0` |
| base URL | 배포 환경에 따라 다름; 아래에서는 `http://localhost:8000` |
| prerequisite | 실행 중인 API, `curl`; EX-00와 ID 추출에는 `jq` 권장 |
| source verification | `uv run pytest -q` — `45 passed` |
모든 ID·timestamp·answer는 실행마다 달라질 수 있다. 아래의 `<...>` 값은 예제 placeholder이며 실제 값을 하드코딩하지 않는다.

## 0. 환경과 버전 확인

```
export BASE_URL="${BASE_URL:-http://localhost:8000}"
export USER_ID="${USER_ID:-user-a}"

# 기계 판독 가능한 API version과 전체 path 확인
curl -sS "$BASE_URL/openapi.json" \
  | jq '{openapi, info, paths: (.paths | keys)}'
```

기대되는 핵심 값은 다음과 같다.

```
{
  "openapi": "3.1.0",
  "info": {
    "title": "RAG Flow API",
    "version": "0.1.0"
  }
}
```

`/openapi.json`의 `info.version`이 `0.1.0`이 아니면 이 페이지의 예제를 다른 API version에 그대로 적용하지 말고 해당 version의 Wiki page를 선택한다.

## EX-01. liveness와 readiness 확인

`/health/live`는 user header 없이 호출할 수 있으며 process liveness만 확인한다.

```
curl -sS "$BASE_URL/health/live"
# {"status":"ok"}
```

`/health/ready`는 application dependency를 검사한다. 성공 여부와 관계없이 HTTP status를 확인한다.

```
curl -sS -w '\nHTTP %{http_code}\n' "$BASE_URL/health/ready"
```

정상 예시:

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

dependency가 준비되지 않으면 `503`과 함께 `status: "not_ready"`가 반환된다. `services[].error`는 `Dependency check failed`로 정규화되어 connection string이나 secret을 노출하지 않는다.

관련 API trace: `API-01`, `API-02`.

## EX-02. JSON text 문서 ingestion

`POST /documents/text`는 UTF-8 JSON body와 `X-User-Id`를 사용한다.

```
INGEST_RESPONSE="$({
  curl -sS -X POST "$BASE_URL/documents/text" \
    -H "X-User-Id: $USER_ID" \
    -H 'Content-Type: application/json' \
    -d '{"text":"FastAPI is the transport layer.","source":"architecture.txt"}'
})"
printf '%s\n' "$INGEST_RESPONSE" | jq .

DOC_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.doc_id')"
JOB_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.job_id')"
printf 'DOC_ID=%s\nJOB_ID=%s\n' "$DOC_ID" "$JOB_ID"
```

정상 응답은 `201`이다.

```
{
  "job_id": "<job-id>",
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>",
  "chunk_count": 1
}
```

`text`와 `source`가 trim 후 공백이면 `422 request_validation_failed`다. 성공 응답의 `job_id`와 `doc_id`를 다음 문서 lifecycle 예제에서 재사용한다.

관련 API trace: `API-03`; application call: `RAGCore.ingest_text()`.

## EX-03. multipart 파일 ingestion

파일은 UTF-8 text여야 한다. `source`를 명시하면 해당 값이 사용되고, 생략하면 multipart filename이 source가 된다.

```
printf 'FastAPI delegates retrieval to RAGCore.\n' > architecture.txt

curl -sS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@architecture.txt;type=text/plain' \
  -F 'source=architecture.txt' \
  | jq .
```

filename fallback을 확인하려면 source part를 생략한다.

```
curl -sS -X POST "$BASE_URL/documents/file" \
  -H "X-User-Id: $USER_ID" \
  -F 'file=@architecture.txt;type=text/plain' \
  | jq '{doc_id, source, chunk_count}'
# source는 architecture.txt
```

입력 경계 예시:

| 상황 | HTTP | code |
|---|---|---|
| 0-byte upload | `422` | `empty_upload` |
| whitespace-only UTF-8 file | `422` | `invalid_file` |
| invalid UTF-8 bytes | `400` | `invalid_utf8` |
| 파일별 `RAGFLOW_MAX_UPLOAD_BYTES` 초과 | `413` | `upload_too_large` |
| multipart를 포함한 전체 body limit 초과 | `413` | `request_too_large` |
관련 API trace: `API-04`; application call: `RAGCore.ingest_file_stream()`.

## EX-04. 문서·청크·ingestion progress 조회

EX-02에서 저장한 ID를 사용한다. 모든 business call에는 같은 사용자의 `X-User-Id`를 넣는다.

```
# 현재 사용자의 문서 목록
curl -sS "$BASE_URL/documents" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# 문서 public metadata
curl -sS "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# 공개 chunk: metadata에는 현재 source만 포함
curl -sS "$BASE_URL/documents/$DOC_ID/chunks" \
  -H "X-User-Id: $USER_ID" \
  | jq .

# 특정 ingestion job의 progress
curl -sS "$BASE_URL/documents/$DOC_ID/ingestion-progress?job_id=$JOB_ID" \
  -H "X-User-Id: $USER_ID" \
  | jq .
```

문서 응답 예시:

```
{
  "doc_id": "<document-id>",
  "source": "architecture.txt",
  "created_at": "<ISO-8601 timestamp>"
}
```

chunk 응답 예시:

```
[
  {
    "chunk_id": "<chunk-id>",
    "doc_id": "<document-id>",
    "content": "FastAPI is the transport layer.",
    "metadata": {"source": "architecture.txt"}
  }
]
```

progress 응답은 `load`, `preprocess`, `chunking`, `embedding`, `vector_store`, `chunk_persistence` 등 여러 row를 포함할 수 있다. 문서가 없거나 현재 사용자 소유가 아니면 세 조회 endpoint 모두 `404 document_not_found`다.

관련 API trace: `API-05`, `API-06`, `API-07`, `API-08`.

## EX-05. 사용자 범위 RAG query

```
curl -sS -X POST "$BASE_URL/query" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is the transport layer?","top_k":3}' \
  | jq .
```

응답은 answer와 현재 사용자 scope의 context만 반환한다.

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

`top_k`를 생략하면 `3`, 허용 범위는 `1..100`이다. question이 blank이거나 `top_k`가 범위를 벗어나면 `422 request_validation_failed`다. 다른 사용자의 문서는 query context에 포함되지 않는다.

관련 API trace: `API-10`; application call: `RAGCore.query()`.

## EX-06. 문서 삭제와 lifecycle 종료

삭제 성공은 body가 없는 `204`다. `-i`로 status와 empty body를 확인할 수 있다.

```
curl -sS -i -X DELETE "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID"
```

삭제 후 같은 사용자의 조회는 `404`다.

```
curl -sS -i "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID"
# HTTP/1.1 404 ...
# {"code":"document_not_found",...}
```

삭제는 사용자 scope를 적용한다. 삭제할 문서가 없거나 다른 사용자의 문서면 `404`이며 해당 문서는 삭제되지 않는다.

관련 API trace: `API-09`; application call: `RAGCore.delete_document()`.

## EX-07. scope와 오류 envelope 확인

### header 누락

```
curl -sS -i "$BASE_URL/documents"
```

```
{
  "code": "user_id_required",
  "category": "validation",
  "retryable": false,
  "message": "X-User-Id header is required"
}
```

### 다른 사용자의 문서 접근

`USER_ID`로 만든 `DOC_ID`를 다른 사용자 header로 조회하면 존재 여부를 숨기는 같은 `404` 계약을 확인할 수 있다.

```
curl -sS -i "$BASE_URL/documents/$DOC_ID" \
  -H 'X-User-Id: user-b'
```

```
{
  "code": "document_not_found",
  "category": "not_found",
  "retryable": false,
  "message": "Document was not found"
}
```

### blank query validation

```
curl -sS -i -X POST "$BASE_URL/query" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"question":"   "}'
```

응답 status는 `422`이고 `code`는 `request_validation_failed`, `category`는 `validation`, `issues[0].location`은 `['body', 'question']`다. Pydantic/FastAPI dependency version에 따라 `issues[].message`와 `issues[].type`의 세부 문자열은 달라질 수 있으므로 client는 `location`과 stable top-level fields를 기준으로 처리한다.

## EX-08. version-aware client guard

client가 문서화한 계약과 서버 계약을 연결하기 위한 최소 guard다.

```
SERVER_VERSION="$(curl -sS "$BASE_URL/openapi.json" | jq -r '.info.version')"
if [ "$SERVER_VERSION" != "0.1.0" ]; then
  printf 'Unsupported RAG Flow API version: %s\n' "$SERVER_VERSION" >&2
  exit 1
fi
printf 'Using RAG Flow API %s\n' "$SERVER_VERSION"
```

API version이 바뀌면 이 page의 curl body·response·error assumption을 재사용하지 말고 해당 version의 `API-Reference`와 `Examples`를 선택한다. source-level exact contract가 필요하면 API Reference에 기록된 source revision과 OpenAPI SHA-256도 함께 확인한다.

## 전체 workflow 한 번에 실행하기

다음 순서는 ingestion → read → query → delete의 최소 end-to-end smoke flow다. 실제 production cleanup 정책이 있는 환경에서만 실행한다.

```
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
USER_ID="${USER_ID:-workflow-user}"

curl -sS "$BASE_URL/health/live" | jq -e '.status == "ok"' >/dev/null

INGEST_RESPONSE="$(curl -sS -X POST "$BASE_URL/documents/text" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"text":"FastAPI delegates document retrieval to RAGCore.","source":"workflow.txt"}')"
DOC_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.doc_id')"
JOB_ID="$(printf '%s' "$INGEST_RESPONSE" | jq -r '.job_id')"

curl -sS "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID" | jq -e --arg id "$DOC_ID" '.doc_id == $id' >/dev/null
curl -sS "$BASE_URL/documents/$DOC_ID/chunks" \
  -H "X-User-Id: $USER_ID" | jq -e 'length > 0' >/dev/null
curl -sS "$BASE_URL/documents/$DOC_ID/ingestion-progress?job_id=$JOB_ID" \
  -H "X-User-Id: $USER_ID" | jq -e 'length > 0' >/dev/null
curl -sS -X POST "$BASE_URL/query" \
  -H "X-User-Id: $USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What does FastAPI delegate?"}' \
  | jq -e '.answer != null' >/dev/null

curl -sS -o /dev/null -w 'delete HTTP %{http_code}\n' \
  -X DELETE "$BASE_URL/documents/$DOC_ID" \
  -H "X-User-Id: $USER_ID"
```

이 workflow가 전제하는 각 route와 source/test 연결은 [API Reference v0.1.0](API-Reference-v0.1.0)의 `API-01`–`API-10` traceability matrix에 있다.
