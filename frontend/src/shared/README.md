# frontend/src/shared

protocol.ts는 snapshot 타입, bridge.ts는 Vue용 상태와 Phaser 구독을 연결합니다. 스프라이트 객체를 Vue reactive에 넣지 않습니다.

V4 preferences.ts는 검증된 localStorage UI 설정과 설정 열림 상태만 관리합니다. presentation.ts는 기존 서버 choice/무기의 표시 명칭·설명·현재 스탯을 정의합니다. HP/EXP/레벨/랭킹을 복제하지 않습니다.

## 폴더 역할과 유지보수 안내

서버 계약·스냅샷 전달·로컬 표시 설정·UI 문구. 서버 상태와 로컬 설정을 분리합니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [bridge.ts](bridge.ts) | 서버 스냅샷의 단일 전달 지점. Vue 반응형 UI와 Phaser 구독자가 같은 패킷을 읽습니다. |
| [preferences.ts](preferences.ts) | 로컬 UI 설정 복원·검증·저장. 서버 전투 상태와 무관하며 저장 실패 시 기본 표시로 계속 실행합니다. |
| [presentation.ts](presentation.ts) | 서버 강화/무기 ID의 한국어 표시 문구와 게이지 계산. 규칙이 바뀌면 progression.py와 설명을 맞추세요. |
| [protocol.ts](protocol.ts) | 서버 스냅샷과 V3 표시 이벤트의 TypeScript 계약. 서버 스키마 변경 시 함께 점검하세요. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.
