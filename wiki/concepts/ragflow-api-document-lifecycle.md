---
title: RAG Flow API Document Lifecycle
created: 2026-08-21
updated: 2026-08-31
type: concept
tags: [api, user-flow, state-management, data-model, integration, ui]
sources: [raw/articles/ragflow-api-api-reference-v0-1-0.md, raw/articles/ragflow-api-examples-v0-1-0.md, raw/articles/ragflow-api-api-reference-v0-2-0.md, raw/articles/ragflow-api-examples-v0-2-0.md]
confidence: medium
---

# RAG Flow API Document Lifecycle

## Purpose

프론트엔드에서 문서가 ingestion된 뒤 조회·검색·삭제되는 전체 lifecycle을 관리하기 위한 API 호출 순서다. API는 application/business logic을 제공하고, web UI는 각 response와 status를 화면 상태로 매핑한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## End-to-end sequence

```text
health/live → health/ready
    → POST /documents/text 또는 POST /documents/file
    → doc_id, job_id 확보
    → GET /documents/{doc_id}
    → GET /documents/{doc_id}/chunks
    → GET /documents/{doc_id}/ingestion-progress?job_id=...
    → GET /documents/{doc_id}/ingestion-step-statuses?job_id=...
    → POST /query
    → DELETE /documents/{doc_id}
```

v0.2.0은 progress history와 final step status map을 분리해 lifecycle에 추가한다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

전체 smoke flow는 ingestion → read → query → delete 순서이며, 실제 production cleanup 정책이 있는 환경에서만 삭제 단계까지 실행한다. v0.2.0 Examples는 read 단계에 progress와 step status 확인을 포함한다. ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Endpoint mapping

다음 mapping은 두 snapshot의 공통 lifecycle에 v0.2.0의 API-11을 추가한 것이다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

| 단계 | Endpoint | 성공 | 프론트엔드가 보존할 값 |
| --- | --- | --- | --- |
| process 확인 | `GET /health/live` | `200` | `status` |
| dependency 확인 | `GET /health/ready` | `200` / `503` | `status`, `services[]` |
| text ingestion | `POST /documents/text` | `201` | `doc_id`, `job_id`, `source`, `chunk_count` |
| file ingestion | `POST /documents/file` | `201` | `doc_id`, `job_id`, `source`, `chunk_count` |
| 문서 목록 | `GET /documents` | `200` | `DocumentResponse[]` |
| 문서 상세 | `GET /documents/{doc_id}` | `200` | `DocumentResponse` |
| chunk 목록 | `GET /documents/{doc_id}/chunks` | `200` | `ChunkResponse[]` |
| progress | `GET /documents/{doc_id}/ingestion-progress` | `200` | `IngestionProgressResponse[]` |
| step status | `GET /documents/{doc_id}/ingestion-step-statuses` | `200` | `object<string, string>` |
| RAG query | `POST /query` | `200` | `answer`, `context_chunks[]` |
| 문서 삭제 | `DELETE /documents/{doc_id}` | `204` | response body 없음 |

## Ingestion inputs

### Text

`POST /documents/text`는 다음 JSON body를 받는다.

```json
{
  "text": "FastAPI is the transport layer.",
  "source": "architecture.txt"
}
```

`text`와 `source`는 trim 후 blank일 수 없다. 성공 시 `job_id`는 ingestion progress와 step status 조회에, `doc_id`는 이후 문서 lifecycle에 사용한다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

### File

`POST /documents/file`은 multipart field `file`과 선택적 `source`를 사용한다.

- 파일은 UTF-8 text여야 한다.
- `source`가 비어 있으면 upload filename을 source로 사용한다.
- source와 filename이 모두 비어 있으면 `422 invalid_source`다.
- 0-byte 파일은 `422 empty_upload`다.
- whitespace-only UTF-8 파일은 `422 invalid_file`이다.
- UTF-8 decode 실패는 `400 invalid_utf8`다.
- 파일별 한도 초과는 `413 upload_too_large`다.
- multipart overhead `1 MiB`를 포함한 전체 body 기본 한도는 11 MiB이며 초과 시 `413 request_too_large`다.

기본 파일 제한은 `RAGFLOW_MAX_UPLOAD_BYTES`의 `10 MiB`다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## Progress and UI state

한 문서에 여러 ingestion progress row가 생길 수 있다. 문서별 progress 화면은 `job_id`로 특정 ingestion을 필터링하고, `step_order`를 이용해 transition 순서를 표시한다. API-08은 history를 반환하고 API-11은 같은 job의 단계별 final status map을 반환하므로, UI는 history의 마지막 row를 status map의 대체물로 사용하지 않는다. 문서에서 관찰되는 단계는 다음과 같다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

`load → preprocess → chunking → embedding → vector_store → chunk_persistence`

권장 UI 상태:

- **idle**: 아직 ingestion 요청 전
- **submitting**: text/file 요청 중
- **accepted**: `201`을 받고 `doc_id`, `job_id`를 저장한 상태
- **processing**: progress row와 step status map을 조회해 ingestion 단계를 표시하는 상태
- **ready**: 문서·chunk 조회 및 query가 가능한 상태
- **failed**: `ApiErrorResponse`를 사용자 메시지와 복구 액션으로 매핑한 상태
- **deleted**: `204` 이후 목록에서 제거하고 상세 캐시를 무효화한 상태 ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Query

`POST /query`는 현재 사용자 scope의 vector context를 사용한다. v0.2.0 Examples의 전체 workflow는 ingestion 후 문서·chunk·progress·step status를 순서대로 확인한 뒤 query를 실행한다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

```json
{
  "question": "What is the transport layer?",
  "top_k": 3
}
```

`question`은 trim 후 blank일 수 없고 `top_k`는 생략 시 `3`, 허용 범위는 `1..100`이다. 응답의 `context_chunks`에는 내부 prompt나 `user_id`가 포함되지 않는다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Deletion

`DELETE /documents/{doc_id}` 성공은 body 없는 `204`다. 삭제 후 같은 사용자의 상세 조회는 `404 document_not_found`가 된다. 다른 사용자의 문서나 존재하지 않는 문서도 같은 `404` 계약이므로 UI는 존재 여부를 추측하지 않는다. ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Related pages

전체 외부 API route와 책임 경계는 [[ragflow-api]], v0.2.0 schema와 status는 [[ragflow-api-contract-v0-2-0]], 이전 계약과의 차이는 [[ragflow-api-v0-1-0-v0-2-0]], `X-User-Id` scope와 오류 응답 처리는 [[ragflow-api-user-scope-and-errors]]를 참조한다.
