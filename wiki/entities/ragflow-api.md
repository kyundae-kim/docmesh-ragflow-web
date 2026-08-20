---
title: RAG Flow API
created: 2026-08-21
updated: 2026-08-21
type: entity
tags: [api, integration, architecture, data-model, error-handling]
sources: [raw/articles/ragflow-api-api-reference-v0-1-0.md, raw/articles/ragflow-api-examples-v0-1-0.md]
confidence: medium
---

# RAG Flow API

## Overview

`ragflow-api`는 DocMesh init RAG system web이 소비하는 외부 HTTP API 프로그램이다. 이 프로젝트의 프론트엔드는 application layer와 business logic을 직접 구현하지 않고, 배포 환경별 `BASE_URL`을 통해 이 API를 호출한다.

현재 ingest된 계약은 `v0.1.0`이며, API URL path에는 `/v1` prefix를 사용하지 않는다. API 버전은 URL이 아니라 `OpenAPI info.version`, package version, release tag, source revision, 문서 suffix를 함께 사용해 식별한다.

## Contract identity

| 항목 | 값 |
| --- | --- |
| API/package version | `0.1.0` |
| release tag | `v0.1.0` |
| OpenAPI | `3.1.0` |
| source revision | `ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7` |
| generated contract SHA-256 | `86173884a223a70766eaf8072fb0f383708699fe6c8b17f9cc7449e5702336fe` |
| machine-readable contract | `/openapi.json` |
| interactive docs | `/docs`, `/redoc` |

## Public routes

### Discovery and operation routes

| Trace ID | Method | Path | 목적 | 인증/header |
| --- | --- | --- | --- | --- |
| API-D01 | `GET` | `/openapi.json` | 실행 중 OpenAPI JSON | 없음 |
| API-D02 | `GET` | `/docs` | Swagger UI | 없음 |
| API-D03 | `GET` | `/redoc` | ReDoc UI | 없음 |
| API-01 | `GET` | `/health/live` | process liveness | 없음 |
| API-02 | `GET` | `/health/ready` | dependency readiness | 없음 |
| API-03 | `POST` | `/documents/text` | JSON text ingestion | `X-User-Id` |
| API-04 | `POST` | `/documents/file` | multipart file ingestion | `X-User-Id` |
| API-05 | `GET` | `/documents` | 사용자 문서 목록 | `X-User-Id` |
| API-06 | `GET` | `/documents/{doc_id}` | 문서 metadata 조회 | `X-User-Id` |
| API-07 | `GET` | `/documents/{doc_id}/chunks` | 문서 chunk 조회 | `X-User-Id` |
| API-08 | `GET` | `/documents/{doc_id}/ingestion-progress` | ingestion progress 조회 | `X-User-Id` |
| API-09 | `DELETE` | `/documents/{doc_id}` | 문서 삭제 | `X-User-Id` |
| API-10 | `POST` | `/query` | 사용자 범위 RAG query | `X-User-Id` |

`/openapi.json`, `/docs`, `/redoc`은 FastAPI 문서 route이며 business handler가 아니다. 프론트엔드 연동 구현은 실행 중 `/openapi.json`을 machine-readable 계약의 기준으로 사용한다.

## Core integration rules

- `API-03`부터 `API-10`까지 business route는 `X-User-Id` header를 요구한다.
- 인증 provider나 Bearer token 검증은 이 API가 수행하지 않는다. header의 진위와 위조 방지는 trusted gateway 또는 상위 호출자의 책임이다.
- 문서·청크·query retrieval은 `X-User-Id` scope로 제한된다.
- 다른 사용자의 `doc_id`는 존재 여부를 숨기기 위해 `404 document_not_found`로 처리된다.
- 기본 upload limit은 `RAGFLOW_MAX_UPLOAD_BYTES = 10 MiB`이며, multipart 전체 request body에는 overhead를 포함한 별도 제한이 있다.
- API 오류는 공통 `ApiErrorResponse` envelope를 사용하며, 프론트엔드는 stable top-level fields인 `code`, `category`, `retryable`, `message`를 우선 처리한다.

## Frontend boundary

이 프로젝트에서 API client는 다음 책임을 가진다.

1. 환경별 `BASE_URL`을 선택한다.
2. `/openapi.json`의 version을 확인해 호환되지 않는 API에 연결하지 않는다.
3. business route에 `X-User-Id`를 전달한다.
4. ingestion response의 `doc_id`, `job_id`를 lifecycle 화면 상태에 연결한다.
5. `201`, `204`, `404`, `409`, `413`, `422`, `503` 등의 status와 error `code`를 UI 상태로 변환한다.
6. API가 반환하지 않는 내부 metadata, prompt, credential을 UI 모델에 추측해 추가하지 않는다.

상세 계약은 [[ragflow-api-contract-v0-1-0]], 사용자 흐름은 [[ragflow-api-document-lifecycle]], scope와 오류 처리는 [[ragflow-api-user-scope-and-errors]]에서 관리한다.

## Source verification

두 source 모두 `source revision ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7`과 `uv run pytest -q — 45 passed`를 publication verification으로 제시한다. 이는 문서에 기재된 검증 결과이며, 현재 배포 환경의 live API 상태를 대신하지 않는다.
