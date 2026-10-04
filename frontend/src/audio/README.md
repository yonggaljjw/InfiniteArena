# frontend/src/audio

Vue와 Phaser가 공유하는 단일 오디오 서비스입니다. 별도 HTML Audio 플레이어나 외부 런타임 라이브러리를 만들지 않습니다.

| 파일 | 책임 |
|---|---|
| manifest.ts | 공개 JSON의 파일 경로·볼륨·쿨다운·우선순위·풀 상한과 Phaser 프리로드 |
| service.ts | Phaser Sound 소유, 사용자 활성화, 교차 페이드, 전투/서버 스냅샷/UI 연결, 거리 감쇠, 제한기, 자원 정리 |
| settings.ts | Master/BGM/SFX/Mute의 검증·반응형 상태·localStorage 저장 |

`game/scene.ts`의 preload/create/update/shutdown에서 preloadAudio/attach/update/detach를 호출합니다. V3 CombatEffectManager가 이벤트 ID 중복을 제거한 뒤 combat에 전달합니다. 설정 UI는 settings만 수정하고 재생 객체는 생성하지 않습니다.

음원 교체는 `public/assets/audio/manifest-v5.json`에서 ID를 유지해 수행하세요. 생성 도구를 다시 실행하면 manifest의 수동 수정도 덮어씁니다. [전체 V5 설계·검증](../../../docs/phase-v5.md)을 확인하세요.
