# frontend/src

main.ts는 Vue·스타일·로컬 Noto Sans KR 폰트를 로딩하고 App.vue는 화면을 조합합니다. 실제 렌더링과 네트워크 로직은 하위 폴더로 분리합니다.

## 폴더 역할과 유지보수 안내

Vue UI·공유 스냅샷·네트워크·Phaser 렌더링의 소스 루트. main.ts에서 시작합니다.

[프로젝트 루트 안내](../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [App.vue](App.vue) | 전체 화면 조합. Phaser 캔버스를 유지한 채 입장 메뉴/HUD/설정/오류 안내의 표시만 전환합니다. |
| [main.ts](main.ts) | Vue 앱의 진입점. 공통 스타일을 로딩하고 index.html의 #app에 화면을 연결합니다. |
| [style.css](style.css) | 폰트와 V4 공통 스타일 진입점. 화면 전체 크기와 캔버스/오류 패널 기본 배치를 정의합니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [components](components/README.md) | 화면 단위 Vue 컴포넌트. 메인 메뉴·HUD·강화·사망·설정과 Phaser 캔버스 수명을 관리합니다. |
| [game](game/README.md) | Phaser 설정·Scene·키 입력·예측 보정과 V1/V2/V3 렌더링 모듈. |
| [network](network/README.md) | REST 게스트 발급과 WS 연결·재접속·입력 송신. 서버 패킷을 shared/bridge로 전달합니다. |
| [shared](shared/README.md) | 서버 계약·스냅샷 전달·로컬 표시 설정·UI 문구. 서버 상태와 로컬 설정을 분리합니다. |
| [ui](ui/README.md) | V4 디자인 토큰과 화면 배치 CSS. Vue의 화면 공간 UI를 꾸미며 Phaser 월드 depth와 별개입니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.

## V5 추가

[audio/](audio/README.md)는 BGM/SFX의 단일 재생 책임을 가집니다. App.vue는 활성화 안내만 조합하고 GameSettings는 채널 설정만 편집합니다. Scene은 프리로드·생성·업데이트·종료와 확정 이벤트 전달을 담당합니다.
