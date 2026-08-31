---
title: RAG Flow API v0.1.0 and v0.2.0 Comparison
created: 2026-08-31
updated: 2026-08-31
type: comparison
tags: [api, integration, architecture, decision, risk, testing]
sources: [raw/articles/ragflow-api-api-reference-v0-1-0.md, raw/articles/ragflow-api-examples-v0-1-0.md, raw/articles/ragflow-api-api-reference-v0-2-0.md, raw/articles/ragflow-api-examples-v0-2-0.md]
confidence: medium
---

# RAG Flow API v0.1.0 and v0.2.0 Comparison

## Scope and verdict

이 비교는 release/API snapshot `v0.1.0`과 package/source snapshot `v0.2.0`을 구분해 프론트엔드 호환성 판단에 사용한다. 두 문서군 모두 URL path에 version prefix를 두지 않으므로, client는 실행 중 `/openapi.json`과 source/artifact identity를 함께 검사해야 한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

`v0.2.0`은 기존 HTTP `info.version: 0.1.0`을 유지한 채 source revision과 package version이 바뀐 snapshot이다. 따라서 이를 wire-level `0.2.0`으로 가정하면 안 되지만, v0.1.0 문서와 동일하다고 취급해서도 안 된다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Version identity

| Dimension | v0.1.0 | v0.2.0 snapshot | Frontend implication |
| --- | --- | --- | --- |
| package/source suffix | `0.1.0` | `0.2.0` | snapshot을 별도 artifact/page로 선택 |
| package version | `0.1.0` | `0.2.0` | dependency/source 검증 시 구분 |
| HTTP/OpenAPI `info.version` | `0.1.0` | `0.1.0` | runtime guard는 두 snapshot 모두 `0.1.0` |
| source revision | `ca7ea84cefe958e5fdcd2054c26f8bb74b673ab7` | `d6bebafa4f83347284baa3d3c2c066ba0ce07ffa` | exact source와 generated artifact 비교 |
| release identity | `v0.1.0` tag | release tag 없음; `v0.1.0-6-gd6bebaf` snapshot | release tag만으로 v0.2를 판별하지 않음 |
| artifact checksum | `86173884a223a70766eaf8072fb0f383708699fe6c8b17f9cc7449e5702336fe` | `948be1955a617d6077f4859b9af2867cce982dedf7d37cb8bc41740ec6361566` | checksum drift를 배포 검증에 사용 |

이 version tuple은 API Reference의 source revision·artifact checksum과 Examples의 실행 전 version guard가 함께 정의한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Contract surface changes

| Dimension | v0.1.0 | v0.2.0 snapshot | Change |
| --- | --- | --- | --- |
| application operations | 10 | 11 | API-11 added |
| business paths | 9개 unique business path | 10개 business path | API-11 추가로 unique path와 operation 수가 각각 1개 증가 |
| ingestion progress | transition history, optional `job_id` | same | 유지 |
| ingestion status | 별도 final status route 없음 | `GET /documents/{doc_id}/ingestion-step-statuses` | final step map 추가 |
| readiness delegation | `core.health_check()` | `request.app.state.health_check_runner()` | app/runtime boundary 변경 |
| upload limits | file 10 MiB, request middleware details | file 10 MiB + multipart overhead 1 MiB의 11 MiB 기본 body limit 명시 | client error handling을 구체화 |
| verification | `45 passed` | `48 passed in 1.92s` 및 ruff/format/pyright 통과 | publication evidence 갱신 |

v0.2.0의 API-11은 progress history와 final status를 분리하므로, UI는 history row를 마지막 상태로 추정하지 말고 status map endpoint를 별도로 조회할 수 있다. ^[raw/articles/ragflow-api-api-reference-v0-2-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

v0.2.0 Examples의 EX-04와 EX-08은 `job_id`를 사용한 progress/status 조회를 end-to-end workflow에 포함한다. v0.1.0 Examples의 lifecycle에는 status-map 호출이 없었다. ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Shared compatibility rules

두 snapshot 모두 business route에서 `X-User-Id` scope를 적용하고, 다른 사용자의 문서를 `404 document_not_found`로 숨기며, `code`, `category`, `retryable`, `message` 중심의 오류 처리를 요구한다. v0.2.0은 OpenAPI의 optional header 표현과 runtime required 규칙의 차이를 계속 명시한다. ^[raw/articles/ragflow-api-api-reference-v0-1-0.md] ^[raw/articles/ragflow-api-api-reference-v0-2-0.md]

두 snapshot 모두 `/openapi.json`의 `info.version`을 실행 전 확인해야 한다. v0.2.0 Examples는 `0.1.0`을 expected value로 사용하고, `v0.2.0`을 wire-level API version으로 사용하지 않도록 경고한다. ^[raw/articles/ragflow-api-examples-v0-1-0.md] ^[raw/articles/ragflow-api-examples-v0-2-0.md]

## Frontend migration checklist

1. 기존 runtime guard `info.version == "0.1.0"`는 유지한다.
2. source/package identity가 필요한 배포에서는 v0.2.0 revision과 artifact checksum을 별도로 기록한다.
3. ingestion `201`에서 받은 `doc_id`, `job_id`를 유지하고 progress history와 API-11 status map을 구분한다.
4. `/documents/{doc_id}/ingestion-step-statuses`를 지원하지 않는 서버에 호출하지 않도록 capability 또는 snapshot 선택을 둔다.
5. `204` delete, scope 기반 `404`, stable error top-level field, 10 MiB/11 MiB limit을 기존 UI 상태 매핑에 반영한다.

## Related pages

현재 통합 경계는 [[ragflow-api]], v0.2.0의 상세 계약은 [[ragflow-api-contract-v0-2-0]], v0.1.0의 기준은 [[ragflow-api-contract-v0-1-0]], UI lifecycle은 [[ragflow-api-document-lifecycle]], 오류·scope 규칙은 [[ragflow-api-user-scope-and-errors]]를 참조한다.
