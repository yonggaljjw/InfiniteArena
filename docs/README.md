# docs

architecture는 설계·전체 경로, protocol은 API/WS 계약, operations는 실행, validation은 단계별 실제 검증 결과, roadmap은 남은 조건입니다. 현재 시각 개선 단계는 phase-v4.md입니다. V1/V2/V3 문서는 각 단계의 역사적 기록입니다.

- assets-v3.md: 실제 PNG 경로·크기·프레임·출처·한계
- v3-changes.json: V2 대비 수정/추가 파일
- v3-preservation.json: 보존한 V1/V2 파일의 바이트 동일성
- v3-rule-comparison.json: 서버 권위 상태 3600틱 비교 결과
- v3-soak.json / v3-soak-samples.jsonl: 실제 20연결·120초 렌더링과 객체 정리 검증
- v3-performance.json: V2/V3의 4초 RAF 표본 비교
- combat-replay-v3.png: 확정 이벤트 패킷을 재생한 효과 시연, 실전 스크린샷과 구분
- pvp-v3.png / respawn-v3.png / soak-v3.png: 실제 서버 전투 화면

Docker/MySQL, 외부 WSS, 30분 검증은 미실행입니다.

V4 문서: phase-v4.md(구조/데이터/완료 판정), design-system-v4.md(토큰/레이아웃/접근성), v4-preservation.json(V3 보존), v4-changes.json(실제 변경 목록), v4-performance.json(실제1플레이어 화면 표본), v4-validation.json(검증 요약). upgrade/death-v4 화면은 표시 재생, upgrade-live-v4와hud-live-v4는 실제 서버 화면입니다.

## 폴더 역할과 유지보수 안내

설계·통신 계약·단계별 결과·에셋 명세·측정 기록. 과거 측정은 새 실행 결과로 오해하지 않도록 유지합니다.

[프로젝트 루트 안내](../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [architecture.md](architecture.md) | `architecture` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [assets-v1.md](assets-v1.md) | `assets-v1` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [assets-v2.md](assets-v2.md) | `assets-v2` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [assets-v3.md](assets-v3.md) | `assets-v3` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [benchmark-before.png](benchmark-before.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [benchmark-v1-baseline.png](benchmark-v1-baseline.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [benchmark-v1.png](benchmark-v1.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [benchmark-v2-baseline.png](benchmark-v2-baseline.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [benchmark-v2.png](benchmark-v2.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [benchmark-v3.png](benchmark-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [combat-replay-v3.png](combat-replay-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [death-live-v4.png](death-live-v4.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [death-v4-1366.png](death-v4-1366.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [design-system-v4.md](design-system-v4.md) | `design-system-v4` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [hud-live-v4-1366.png](hud-live-v4-1366.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [hud-live-v4-1920.png](hud-live-v4-1920.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [hud-live-v4-2560.png](hud-live-v4-2560.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [hud-v4-1366-1.25.png](hud-v4-1366-1.25.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [imagegen-prompt-v1.txt](imagegen-prompt-v1.txt) | 폴더의 보조 설정/자료. 변경 시 이 폴더 역할과 실행 명령을 함께 확인하세요. |
| [imagegen-prompt-v3.txt](imagegen-prompt-v3.txt) | 폴더의 보조 설정/자료. 변경 시 이 폴더 역할과 실행 명령을 함께 확인하세요. |
| [imagegen-prompts-v2.json](imagegen-prompts-v2.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [load-result.json](load-result.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [menu-live-v4.png](menu-live-v4.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [operations.md](operations.md) | `operations` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [phase-v1.md](phase-v1.md) | `phase-v1` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [phase-v2.md](phase-v2.md) | `phase-v2` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [phase-v3.md](phase-v3.md) | `phase-v3` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [phase-v4.md](phase-v4.md) | `phase-v4` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [preview-after-v1.png](preview-after-v1.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [preview-after-v2.png](preview-after-v2.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [preview-after-v3.png](preview-after-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [preview-after-v4.png](preview-after-v4.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [preview-before-v1.png](preview-before-v1.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [preview.png](preview.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [protocol.md](protocol.md) | `protocol` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [pvp-v3.png](pvp-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [respawn-v2.png](respawn-v2.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [respawn-v3.png](respawn-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [roadmap.md](roadmap.md) | `roadmap` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [settings-v4.png](settings-v4.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [soak-v3.png](soak-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [upgrade-applied-live-v4.png](upgrade-applied-live-v4.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [upgrade-v4-1366.png](upgrade-v4-1366.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [v1-asset-validation.json](v1-asset-validation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v1-performance.json](v1-performance.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v2-asset-validation.json](v2-asset-validation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v2-changes.json](v2-changes.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v2-performance.json](v2-performance.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v2-preservation.json](v2-preservation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-asset-validation.json](v3-asset-validation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-changes.json](v3-changes.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-performance-initial.json](v3-performance-initial.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-performance.json](v3-performance.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-preservation.json](v3-preservation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-rule-comparison.json](v3-rule-comparison.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-soak-samples.jsonl](v3-soak-samples.jsonl) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-soak.json](v3-soak.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v3-validation.json](v3-validation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v4-changes.json](v4-changes.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v4-performance.json](v4-performance.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v4-preservation.json](v4-preservation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [v4-validation.json](v4-validation.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [validation.md](validation.md) | `validation` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [zip-production-check.json](zip-production-check.json) | 해당 단계의 검사/측정 기록. 과거 결과이며 현재 실행 결과와 구분하세요. |
| [zip-recheck.md](zip-recheck.md) | `zip-recheck` 설계/운영/단계 결과 문서. 명시된 구현 범위와 미검증 항목을 확인하세요. |
| [documentation-update.md](documentation-update.md) | 한글 주석·폴더 README 정리 범위와 실행 구문 동일성 검증. |
| [documentation-validation.json](documentation-validation.json) | 이번 문서 변경의 실제 빌드/테스트/주석 적용 검사 기록. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.

## V5 기록

현재 최신 단계는 phase-v5.md입니다. v5-asset-validation.json은36실제 음원 해시·디코딩·PCM·루프 경계 확인, v5-validation.json은 실제 수행/미수행, v5-changes.json은 변경 목록, v5-preservation.json은 V1~V4 서버/PNG 보존 근거입니다. 과거 결과는 역사적 기록입니다.
