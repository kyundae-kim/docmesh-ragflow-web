---
title: RAG Flow API Contract v0.1.0
created: 2026-08-21
updated: 2026-08-21
type: concept
tags: [api, data-model, integration, testing, decision]
sources: [raw/articles/ragflow-api-api-reference-v0-1-0.md, raw/articles/ragflow-api-examples-v0-1-0.md]
confidence: medium
---

# RAG Flow API Contract v0.1.0

## Definition

이 페이지는 프론트엔드가 `ragflow-api` `0.1.0`과 통신할 때 사용하는 versioned HTTP contract의 핵심을 정리한다. Normative contract는 API Reference와 생성된 `OpenAPI-v0.1.0.json`이며, Examples 문서는 실제 호출 순서와 smoke flow를 보완한다.

## Version and compatibility

| 확인 대상 | 기대 값 |
| --- | --- |
| `openapi` | `3.1.0` |
| `info.version` | `0.1.0` |
| release tag | `v0.1.0` |
| source revision | `ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7` |
| path prefix | 없음 (`/v1` 미사용) |

클라이언트는 연결 시 다음을 확인하는 version guard를 둘 수 있다.

```sh
SERVER_VERSION="$(curl -sS "$BASE_URL/openapi.json" | jq -r '.info.version')"
if [ "$SERVER_VERSION" != "0.1.0" ]; then
  printf 'Unsupported RAG Flow API version: %s\\n' "$SERVER_VERSION" >&2
  exit 1
fi
```

서버 version이 바뀌면 v0.1.0의 request body, response shape, error assumption을 재사용하지 않는다. 새 버전은 기존 페이지를 덮어쓰지 않고 별도 suffix로 추가해 계약 이력을 보존한다.

## Main schemas

| Schema | 핵심 필드 | 사용 endpoint |
| --- | --- | --- |
| `TextIngestRequest` | `text`, `source` — trim 후 blank 불가 | `POST /documents/text` |
| `IngestResponse` | `job_id`, `doc_id`, `source`, `created_at`, `chunk_count` | `POST /documents/text`, `POST /documents/file` |
| `DocumentResponse` | `doc_id`, `source`, `created_at` | documents 조회 |
| `ChunkResponse` | `chunk_id`, `doc_id`, `content`, `metadata.source` | chunks 조회, query context |
| `IngestionProgressResponse` | `progress_id`, `job_id`, `doc_id`, `step_name`, `step_order`, `status` | progress 조회 |
| `QueryRequest` | `question`, `top_k` — default `3`, 범위 `1..100` | `POST /query` |
| `QueryResponse` | `answer`, `context_chunks` | `POST /query` |
| `ReadinessResponse` | `status`, `services[]` | `GET /health/ready` |
| `ApiErrorResponse` | `code`, `category`, `retryable`, `message`, 선택적 `issues[]` | host/application 오류 |

`ChunkResponse.metadata`의 public allowlist는 현재 `source`다. `asset_reference`, token, 내부 prompt와 `user_id`는 공개 response에 포함되지 않는다.

## Status contract

- `GET /health/live`: 항상 `200`, `{"status":"ok"}`
- `GET /health/ready`: ready이면 `200`, dependency 미준비이면 같은 schema의 `503`
- ingestion 성공: `201 IngestResponse`
- 문서·청크·progress 조회 성공: `200`
- 문서 삭제 성공: body 없는 `204`
- validation: 보통 `400` 또는 `422`; 세부 code는 오류 경계에 따라 다름
- upload/request limit 초과: `413`
- dependency/storage health 문제: `503`
- 예측하지 못한 application 오류: `500`

## Operation traceability

API Reference는 각 route를 `operationId → handler → core call → test → example`로 연결한다. 프론트엔드에서 contract 변경을 검토할 때 path만 비교하지 말고 다음도 함께 비교한다.

- `operationId` 변경 여부
- request/response schema 변경 여부
- 성공 status와 오류 status 변경 여부
- `X-User-Id` dependency와 사용자 scope 변경 여부
- Examples의 end-to-end flow가 계속 실행되는지 여부

## Reproducibility

실행 중 서버에서 계약을 확인한다.

```sh
curl -sS "$BASE_URL/openapi.json" | jq '{openapi, info, paths: (.paths | keys)}'
```

source-level 계약을 재생성할 때는 다음 명령과 문서에 기록된 SHA-256을 비교한다.

```sh
uv run python -c 'from ragflow.app import create_app; import json; print(json.dumps(create_app().openapi(), ensure_ascii=False, indent=2))' \\
  > OpenAPI-v0.1.0.json
sha256sum OpenAPI-v0.1.0.json
```

## Related pages

외부 API의 전체 범위는 [[ragflow-api]], 실제 문서 처리 순서는 [[ragflow-api-document-lifecycle]], header scope와 오류 안정성 규칙은 [[ragflow-api-user-scope-and-errors]]를 함께 참조한다.
