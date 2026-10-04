# world — V1 환경 렌더링

assets.ts는 실제 PNG preload와 실패 대체,layout.ts는 결정적 지형/장식/depth,environment.ts는 Phaser 타일맵·그림자·폐허·수관·가림·culling을 관리합니다. 데이터는 렌더링 전용이며 physics body나 서버 게임 규칙은 추가하지 않습니다. 실제 점유 장애물은 snapshot.obstacles만 사용합니다.

Ground/Detail은 별도 TilemapLayer입니다. 투명도 변경과 바람은 보이는 prop만 처리하며 화면 밖 prop은 숨깁니다. scene shutdown에서 리소스를 정리합니다.

## 폴더 역할과 유지보수 안내

V1 타일/장식 생성·레이어/depth·장애물 외형·수관 가림·culling/먼지.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [assets.ts](assets.ts) | V1 환경 PNG 키와 경로. 대체 텍스처는 파일 로딩 실패 시에만 사용합니다. |
| [environment.ts](environment.ts) | V1 다층 지형·서버 장애물 외형·수관 투명도·먼지·culling. 고정 월드 배경은 한 번만 생성합니다. |
| [layout.ts](layout.ts) | 결정적 지형/장식 배치와 공통 depth. 장식은 클라이언트 표현이며 새 서버 충돌체를 만들지 않습니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.
