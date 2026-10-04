# frontend/src/network

client.ts는 게스트 REST와 WebSocket을 담당합니다. URL은 location.host 기준이며 HTTPS에서는 WSS입니다. 원본 토큰은 이 페이지 메모리에만 유지합니다.

## 폴더 역할과 유지보수 안내

REST 게스트 발급과 WS 연결·재접속·입력 송신. 서버 패킷을 shared/bridge로 전달합니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [client.ts](client.ts) | 동일 출처 REST/WS 연결과 입력 시퀀스 관리. 받은 스냅샷은 bridge를 통해 Vue와 Phaser에 함께 전달합니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.
