# REST API와 WebSocket v1

## REST

| 경로 | 응답/역할 |
|---|---|
| GET /api/health | 프로세스·게임 루프 상태, 플레이어 수, tick_ms, overruns, 통계 저장 실패 수 |
| GET /api/ready | SELECT 1로 DB 연결 확인, 실패 시503 |
| POST /api/guests | nickname 검증, UUID·게스트 토큰 생성,201 |
| GET /api/leaderboard | MySQL 영구 누적 킬 상위10명 |
| GET /docs | FastAPI OpenAPI 문서(컨테이너 내부 8000에서 접근) |

Nginx는 `/docs`를 프록시하지 않습니다. 공개 URL에서 API 문서 대신 Vue 화면이 뜨는 것은 현재 설정의 동작입니다.

생성 요청은 한 IP 기준40회/분입니다. 현재 프록시에서는 연결 IP가 공유되므로 Nginx를 통해 들어온 요청이 같은 버킷으로 계산됩니다. 작은 공개 테스트에는 사용할 수 있지만 많은 사용자를 받으려면 신뢰 프록시 범위를 제한한 실제 IP 전달 설계로 변경해야 합니다.

## 연결과 메시지

같은 출처 `/ws`에 연결하고5초 안에 join을 보내야 합니다. token은 URL/query에 넣지 않습니다. Origin은 `.env`의 ALLOWED_ORIGINS와 정확히 비교합니다. 쉼표 사이에 공백을 넣지 마세요. HTTPS에서 접속하면 브라우저가 자동으로 WSS를 사용합니다.

```json
{"v":1,"type":"join","token":"REST에서_발급한_게스트_토큰"}
```

서버 응답:

```json
{"v":1,"type":"welcome","player_id":"UUID","next_seq":0,"tick_rate":20}
```

클라이언트 메시지:

| type | 필드/규칙 |
|---|---|
| input | seq: 엄격한 정수0~2147483647, dx/dy: -1/0/1 |
| upgrade_selected | offer_id: 현재 선택 번호, choice: damage/haste/health/spread/orbit |
| respawn | 사망 후 서버 대기시간이 끝나면 요청 |
| ping | 서버 pong 응답. 기본 클라이언트는 정기 input을 heartbeat로 사용 |

```json
{"v":1,"type":"input","seq":1,"dx":1,"dy":0}
```

```json
{"v":1,"type":"upgrade_selected","offer_id":1,"choice":"damage"}
```

v는1만 허용하고 생략 시1로 해석합니다. 정의되지 않은 input/join/upgrade/respawn 필드는 거부합니다. 서버가 player_id, 좌표, 피해량, EXP를 클라이언트에게 받지 않습니다. 입력 seq가 이전보다 작거나 같으면 무시합니다. 입력 큐는최대8개, 틱마다한 입력만 이동에 사용하므로 패킷을 늘려도 이동 속도가 증가하지 않습니다. ack seq는 실제 처리한 번호입니다.

강화 선택은 offer_id로 중복 처리를 억제합니다. 이미 처리된 선택 번호는 무시하고, 미래 번호나 현재 선택지에 없는 강화는 거부합니다. 사망 후 뒤늦게 도착한 강화는 무시합니다. 리스폰의 중복 요청도 이미 살아 있으면 무시합니다.

snapshot은10회/초 전송합니다. you/size/tick, 주변 players/monsters/projectiles, choices/offer_id, 보호 여부, 리스폰 남은 시간, 장애물/안전구역, 전체 접속 수, 상위5명 월드 랭킹, 최근12개 킬 이벤트를 포함합니다. 클라이언트의 렌더링 소멸은 해당 snapshot에서 빠진 엔티티를 제거하는 방식입니다. 별도 spawn/despawn/hit 메시지를 아직 구현하지 않았습니다.

2개까지만 snapshot을 대기시킵니다. 큐가 차면 오래된 것을 버립니다. 송신에2초가 넘으면 느린 연결을 종료하고 다른 플레이어의 월드 계산은 계속합니다.2048바이트 초과 메시지, 초당60개 초과, 잘못된 스키마,15초 무입력 연결은 닫습니다. 종료 코드1008은 정책/입력 거부,1011은 서버 연결 처리 오류입니다.

프로토콜 변경 시 v를 올리고 서버/TS 타입/테스트를 함께 갱신하세요. 일단 변경된 규칙을 v1에서 고정한 초기 배포입니다.

## V3 추가 관측 필드

snapshot v:1에combat_epoch(UUID),combat_events 배열을추가했습니다. 각이벤트는id,tick,kind,x,y와종류별데이터를포함하며fire/hit/death/experience/level_up입니다. projectile에는owner,vx,vy,kind(bullet/spread)가추가됩니다. 입력/조인/강화/리스폰메시지는그대로입니다. 전투규칙을변경한명령은없습니다. 기존kill-feed events와분리하며상세스키마·재전송/누락범위는phase-v3.md를참고하세요.
