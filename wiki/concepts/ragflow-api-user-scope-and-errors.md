---
title: RAG Flow API User Scope and Errors
created: 2026-08-21
updated: 2026-08-31
type: concept
tags: [api, authorization, error-handling, integration, risk]
sources: [raw/articles/ragflow-api-api-reference-v0-1-0.md, raw/articles/ragflow-api-examples-v0-1-0.md, raw/articles/ragflow-api-api-reference-v0-2-0.md, raw/articles/ragflow-api-examples-v0-2-0.md]
confidence: medium
---

# RAG Flow API User Scope and Errors

## User scope

`API-03`부터 `API-11`까지의 business route는 `X-User-Id` request header를 사용한다. API는 header 양끝 공백을 제거한 값을 `AuthenticatedUser.sub`로 사용한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

- header가 없거나 공백뿐이면 `400 user_id_required`다.
- 문서·청크·ingestion progress·step status 조회와 query retrieval은 이 사용자 scope로 제한된다.
- 다른 사용자의 `doc_id`는 존재 여부를 숨기기 위해 `404 document_not_found`다.
- 삭제도 동일한 scope를 적용하며, 타 사용자 문서를 삭제하지 않는다. ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]
- `/health/live`, `/health/ready`, `/openapi.json`, `/docs`, `/redoc`에는 이 header가 필요하지 않다.

이 API 자체는 Bearer token, Keycloak, identity provider를 검증하지 않는다. header의 진위·위조 방지는 trusted gateway 또는 상위 호출자가 책임진다. 따라서 프론트엔드는 임의의 사용자 ID를 인증 수단으로 취급하지 않고, 배포 환경의 상위 인증 계층과 함께 구성해야 한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## OpenAPI/runtime discrepancy

FastAPI dependency의 기본값 때문에 OpenAPI에서 `X-User-Id`가 `required: false`로 표현될 수 있지만, runtime 계약은 business route에서 누락을 거부한다. 클라이언트 구현과 테스트는 실제 runtime 규칙인 `400 user_id_required`를 기준으로 한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## Error envelope

host/application 오류는 다음 공통 shape를 사용한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

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

`issues`는 validation 오류에만 포함될 수 있다. `location`의 각 item은 string 또는 integer다.

## Stable error mapping

| HTTP | code | category | 프론트엔드 처리 방향 |
| ---: | --- | --- | --- |
| `400` | `user_id_required` | `validation` | 인증/context 설정 확인 |
| `400` | `invalid_utf8` | `validation` | 파일 형식 안내 |
| `400` | `invalid_request` | `validation` | multipart/parser 입력 확인 |
| `404` | `document_not_found` | `not_found` | 존재 여부를 노출하지 않고 목록 재조회 |
| `413` | `request_too_large` | `validation` | 전체 요청 크기 축소 |
| `413` | `upload_too_large` | `validation` | 파일 크기 제한 안내 |
| `422` | `request_validation_failed` | `validation` | `issues[].location` 기반 필드 오류 표시 |
| `422` | `empty_upload` | `validation` | 빈 파일 선택 방지 |
| `422` | `invalid_file` | `validation` | 공백-only 파일 거부 |
| `422` | `invalid_source` | `validation` | source 또는 filename 제공 |
| `409` | DMS `conflict`/`unavailable` | dependency state | 충돌·일시 불가 상태에 대한 응답의 `retryable` 확인 |
| `425` | `idempotency_in_progress` | DMS projection | `retryable` 값에 따라 재시도 |
| `500` | `internal_error` | `internal` | 일반 오류 표시, trace는 서버 로그에서 확인 |
| `503` | readiness/storage/health 오류 | `unavailable` 계열 | 재시도 가능 상태로 표시 |

DMS 오류는 public `code`, `category`, `retryable`만 projection된다. 예외 문자열, endpoint, credential, connection string을 UI에 표시하거나 복사하지 않는다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Retry and privacy rules

- `retryable: true`일 때만 자동 재시도를 고려하고, validation·not found 오류는 자동 재시도하지 않는다.
- `409`, `425`, `503`은 API 응답의 `retryable`과 operation 종류를 함께 보고 재시도한다. OpenAPI의 `502`, `504`는 선언된 status이지 모든 dependency에서 관찰된 live 응답을 의미하지 않는다.
- `404 document_not_found`는 타 사용자 문서의 존재를 숨기는 계약이므로, UI에서 “타 사용자 문서”라고 추론하지 않는다.
- readiness 응답의 실패 service error는 `Dependency check failed`로 정규화되어 secret을 노출하지 않는다.
- `context_chunks`와 `ChunkResponse.metadata`에 허용된 공개 정보만 표시한다. ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Open questions / risk

- 실제 배포 gateway가 `X-User-Id`를 어떤 인증 주체에서 파생하는지 현재 source 문서만으로는 확인되지 않는다.
- OpenAPI의 optional header 표현과 runtime required 규칙이 계속 일치하는지 version별 contract test로 확인해야 한다.
- v0.2.0에서도 사용하는 `rag-system-core`·DMS adapter에 따라 실제 DMS error code/category가 달라질 수 있으므로 host projection 표를 live integration test로 보완해야 한다. publication 문서의 48개 테스트는 현재 배포 환경의 live dependency 상태를 대신하지 않는다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## Related pages

API 전체 경계와 endpoint 목록은 [[ragflow-api]], v0.2.0 version guard와 schema는 [[ragflow-api-contract-v0-2-0]], 이전 계약과의 비교는 [[ragflow-api-v0-1-0-v0-2-0]], ingestion·query·delete의 UI 상태 순서는 [[ragflow-api-document-lifecycle]]에 정리되어 있다.
