---
title: RAG Flow API
created: 2026-08-21
updated: 2026-08-31
type: entity
tags: [api, integration, architecture, data-model, error-handling]
sources: [raw/articles/ragflow-api-api-reference-v0-1-0.md, raw/articles/ragflow-api-examples-v0-1-0.md, raw/articles/ragflow-api-api-reference-v0-2-0.md, raw/articles/ragflow-api-examples-v0-2-0.md]
confidence: medium
---

# RAG Flow API

## Overview

`ragflow-api`는 DocMesh init RAG system web이 소비하는 외부 HTTP API 프로그램이다. 이 프로젝트의 프론트엔드는 application layer와 business logic을 직접 구현하지 않고, 배포 환경별 `BASE_URL`을 통해 이 API를 호출한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

현재 wiki는 release/API snapshot `v0.1.0`과 package/source snapshot `v0.2.0`을 함께 보존한다. v0.2.0에서 package version은 `0.2.0`이지만 현재 FastAPI 앱의 wire-level `OpenAPI info.version`은 `0.1.0`이므로 두 값을 합치지 않는다. API 버전은 URL이 아니라 snapshot suffix, `OpenAPI info.version`, package version, release/source identity를 함께 사용해 식별한다.

## Contract identity

| 항목 | 현재 v0.2.0 snapshot |
| --- | --- |
| package/source snapshot | `v0.2.0` |
| package version | `0.2.0` |
| HTTP/OpenAPI `info.version` | `0.1.0` |
| release identity | 없음; `git describe --tags --always --dirty` = `v0.1.0-6-gd6bebaf` |
| OpenAPI | `3.1.0` |
| source revision | `d6bebafa4f83347284baa3d3c2c066ba0ce07ffa` |
| generated contract SHA-256 | `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566` |
| machine-readable contract | `/openapi.json` |
| interactive docs | `/docs`, `/docs/oauth2-redirect`, `/redoc` |

현재 identity 표는 v0.2.0 API Reference의 package/source, HTTP, revision, artifact 구분을 따른다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## Public routes

### Discovery and operation routes

| Trace ID | Method | Path | 목적 | 인증/header |
| --- | --- | --- | --- | --- |
| API-D01 | `GET`/`HEAD` | `/openapi.json` | 실행 중 OpenAPI JSON | 없음 |
| API-D02 | `GET`/`HEAD` | `/docs` | Swagger UI | 없음 |
| API-D03 | `GET`/`HEAD` | `/docs/oauth2-redirect` | Swagger UI callback | 없음 |
| API-D04 | `GET`/`HEAD` | `/redoc` | ReDoc UI | 없음 |
| API-01 | `GET` | `/health/live` | process liveness | 없음 |
| API-02 | `GET` | `/health/ready` | dependency readiness | 없음 |
| API-03 | `POST` | `/documents/text` | JSON text ingestion | `X-User-Id` |
| API-04 | `POST` | `/documents/file` | multipart file ingestion | `X-User-Id` |
| API-05 | `GET` | `/documents` | 사용자 문서 목록 | `X-User-Id` |
| API-06 | `GET` | `/documents/{doc_id}` | 문서 metadata 조회 | `X-User-Id` |
| API-07 | `GET` | `/documents/{doc_id}/chunks` | 문서 chunk 조회 | `X-User-Id` |
| API-08 | `GET` | `/documents/{doc_id}/ingestion-progress` | ingestion progress 조회 | `X-User-Id` |
| API-11 | `GET` | `/documents/{doc_id}/ingestion-step-statuses` | ingestion 단계별 status 조회 | `X-User-Id` |
| API-09 | `DELETE` | `/documents/{doc_id}` | 문서 삭제 | `X-User-Id` |
| API-10 | `POST` | `/query` | 사용자 범위 RAG query | `X-User-Id` |

`/openapi.json`, `/docs`, `/docs/oauth2-redirect`, `/redoc`은 FastAPI 문서 route이며 business handler가 아니다. v0.2.0 OpenAPI artifact는 10개 business path와 11개 application operation을 가지며, discovery route까지 포함하면 unique public path는 14개다. 프론트엔드 연동 구현은 실행 중 `/openapi.json`을 machine-readable 계약의 기준으로 사용한다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## Core integration rules

- `API-03`부터 `API-11`까지 business route는 `X-User-Id` header를 요구한다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]
- 인증 provider나 Bearer token 검증은 이 API가 수행하지 않는다. header의 진위와 위조 방지는 trusted gateway 또는 상위 호출자의 책임이다.
- 문서·청크·progress·step status·query retrieval은 `X-User-Id` scope로 제한된다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]
- 다른 사용자의 `doc_id`는 존재 여부를 숨기기 위해 `404 document_not_found`로 처리된다.
- 기본 upload limit은 `RAGFLOW_MAX_UPLOAD_BYTES = 10 MiB`이며, multipart 전체 request body는 overhead `1 MiB`를 더한 기본 11 MiB 제한을 사용한다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]
- API 오류는 공통 `ApiErrorResponse` envelope를 사용하며, 프론트엔드는 stable top-level fields인 `code`, `category`, `retryable`, `message`를 우선 처리한다.

## Frontend boundary

이 프로젝트에서 API client는 다음 책임을 가진다.

1. 환경별 `BASE_URL`을 선택한다.
2. `/openapi.json`의 version을 확인해 호환되지 않는 API에 연결하지 않는다.
3. business route에 `X-User-Id`를 전달한다.
4. ingestion response의 `doc_id`, `job_id`를 lifecycle 화면 상태에 연결하고 progress history와 API-11 status map을 구분한다.
5. `201`, `204`, `404`, `409`, `413`, `422`, `503` 등의 status와 error `code`를 UI 상태로 변환한다.
6. API가 반환하지 않는 내부 metadata, prompt, credential을 UI 모델에 추측해 추가하지 않는다. ^[raw/articles/ragflow-api-examples-v0-2-0.md]

상세 계약은 [[ragflow-api-contract-v0-2-0]]과 [[ragflow-api-contract-v0-1-0]], 버전 차이는 [[ragflow-api-v0-1-0-v0-2-0]], 사용자 흐름은 [[ragflow-api-document-lifecycle]], scope와 오류 처리는 [[ragflow-api-user-scope-and-errors]]에서 관리한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

## Source verification

v0.2.0 source는 `source revision d6bebafa4f83347284baa3d3c2c066ba0ce07ffa`, `uv run pytest -q — 48 passed in 1.92s`, `ruff check`, `ruff format --check`, `pyright` 통과를 publication verification으로 제시한다. v0.1.0의 release/source identity와 `45 passed` 기록은 [[ragflow-api-v0-1-0-v0-2-0]]에서 보존한다. 문서에 기재된 검증 결과는 현재 배포 환경의 live API 상태를 대신하지 않는다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]
