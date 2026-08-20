# Wiki Schema

## Domain

DocMesh의 **RAG system web 프로젝트**를 다룬다. 이 프로젝트는 프론트엔드 web UI와 외부 프로그램이 제공하는 RESTful API의 소비 계층이다. 애플리케이션 계층과 비즈니스 로직은 이 프로젝트의 책임 범위가 아니며, 별도 프로그램의 API 계약과 실제 동작을 기준으로 기록한다.

주요 기록 범위:

- 프론트엔드 구조와 UI 구성
- 사용자 흐름과 화면 상태
- RESTful API 계약 및 API 소비 방식
- 인증·인가, 요청 상태, 오류 처리
- 외부 시스템과의 통합 결정
- 테스트, 배포, 관측성 및 알려진 위험

## Conventions

- 파일 이름은 소문자와 하이픈을 사용한다. 예: `rest-api-integration.md`
- 일반 설명은 한국어로 작성하되, API 경로·JSON 필드명·코드 식별자·제품명은 원문 표기를 보존한다.
- 모든 wiki 페이지는 아래 YAML frontmatter를 사용한다.
- 모든 새 페이지는 `index.md`의 올바른 섹션에 알파벳순으로 추가한다.
- 모든 생성·수정·질의·lint 작업은 `log.md`에 append-only 방식으로 기록한다.
- 페이지를 수정할 때 `updated` 날짜를 갱신한다.
- 각 페이지는 가능한 한 최소 2개의 유효한 `[[wikilinks]]`를 갖도록 작성한다.
- 확인되지 않은 백엔드 동작을 추측해 사실처럼 기록하지 않는다. API 문서, 실제 응답, 테스트 결과 등 근거가 없으면 `confidence: low` 또는 `contested: true`를 사용한다.
- raw source는 immutable이다. 원문 수정이 필요하면 raw 파일을 고치지 않고 wiki 페이지에 정정 내용을 기록한다.
- 3개 이상의 source를 종합한 문단에는 해당 raw 파일을 가리키는 provenance marker를 붙인다. 예: `^[raw/articles/source-name.md]`

## Frontmatter

```yaml
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary
tags: [from taxonomy below]
sources: [raw/articles/source-name.md]
confidence: high | medium | low
contested: true
contradictions: [other-page-slug]
---
```

`confidence`, `contested`, `contradictions`는 선택 필드지만 단일 source, 빠르게 바뀌는 API 계약, 해석이 필요한 설계 결정에는 적극적으로 사용한다.

### Raw source frontmatter

```yaml
---
source_url: https://example.com/source
ingested: YYYY-MM-DD
sha256: <hex digest of the body below the frontmatter>
---
```

`sha256`는 frontmatter 아래 body만 대상으로 계산한다. 동일 source를 재수집할 때 hash가 같으면 처리를 건너뛰고, 달라지면 drift를 기록한 뒤 wiki 페이지를 검토한다.

## Tag Taxonomy

- `frontend` — 프론트엔드 구조와 구현
- `ui` — 화면, 컴포넌트, 시각적 상호작용
- `api` — RESTful API 계약과 endpoint
- `integration` — 외부 시스템 연동
- `architecture` — 구조와 경계
- `state-management` — 로딩·성공·실패·캐시·폼 상태
- `authentication` — 로그인과 credential 처리
- `authorization` — 권한과 접근 제어
- `error-handling` — 오류 분류·표시·복구
- `data-model` — 요청·응답·도메인 데이터 형태
- `user-flow` — 사용자 여정과 화면 전환
- `testing` — 테스트 전략과 검증 결과
- `deployment` — 빌드·배포·환경 설정
- `observability` — 로그·모니터링·추적
- `decision` — 설계 결정과 근거
- `risk` — 미확정 사항·제약·기술적 위험

## Page Thresholds

- 하나의 source에서 핵심적으로 다뤄지거나 2개 이상의 source에 등장하는 entity/concept만 페이지로 만든다.
- 이미 존재하는 entity/concept는 새 페이지를 만들지 말고 기존 페이지를 갱신한다.
- 단순 언급, 검증되지 않은 추정, 프로젝트 범위 밖의 백엔드 내부 구현은 별도 페이지로 만들지 않는다.
- 약 200줄을 넘는 페이지는 주제별 하위 페이지로 분리한다.
- 완전히 대체된 페이지는 `_archive/`로 이동하고 index와 링크를 정리한다.

## Page Types

### Entity pages

외부 API, 프론트엔드 애플리케이션, 주요 컴포넌트, 외부 시스템처럼 독립적으로 식별되는 대상을 기록한다. 개요, 책임 경계, 주요 속성, 다른 entity와의 관계, source를 포함한다.

### Concept pages

API 소비, 요청 상태, 오류 처리, 인증 흐름, 사용자 여정처럼 여러 구현에 적용되는 주제를 기록한다. 정의, 현재 이해, 적용 규칙, 열린 질문, 관련 개념을 포함한다.

### Comparison pages

두 가지 이상의 UI/API 연동 방식이나 설계안을 비교한다. 비교 기준을 표로 제시하고, 선택 결과와 trade-off를 명시한다.

### Query pages

나중에 다시 도출하기 어려운 아키텍처 분석, 통합 조사, 결정 요약을 보존한다. 단순 lookup은 저장하지 않는다.

## API Contract Rules

API 관련 페이지는 가능한 경우 다음 항목을 명시한다.

- HTTP method와 path
- request headers, query/path parameters, request body
- 성공 response와 오류 response
- 인증·인가 요구사항
- 프론트엔드에서의 loading/success/error 상태 매핑
- source와 확인 날짜

API 계약이 애플리케이션 계층의 문서 또는 실제 응답과 충돌하면 양쪽 주장을 날짜와 source와 함께 남기고 `contested: true` 및 `contradictions`를 설정한다.

## Update Policy

새 정보가 기존 내용과 충돌하면 다음 순서로 처리한다.

1. source 날짜와 실제 검증 여부를 확인한다.
2. 최신 source가 이전 내용을 명확히 대체하면 기존 내용을 갱신하고 변경 이유를 기록한다.
3. 양립할 수 없는 주장이라면 양쪽을 날짜·source와 함께 보존한다.
4. 관련 페이지에 `contested: true`와 `contradictions`를 표시한다.
5. `log.md`에 영향을 받은 파일과 검토 필요성을 기록한다.
