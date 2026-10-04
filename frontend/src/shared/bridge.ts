// 역할: 서버 스냅샷의 단일 전달 지점. Vue 반응형 UI와 Phaser 구독자가 같은 패킷을 읽습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { reactive } from "vue";
import type { Snapshot } from "./protocol";
// Vue에는 HUD용 최신 상태만 전달하고, 렌더링 객체는 Phaser에서 관리합니다.
export const ui = reactive({
  status: "입장 전",
  playerId: "",
  snapshot: null as Snapshot | null,
  error: "",
});
type Listener = (snapshot: Snapshot) => void;
const listeners = new Set<Listener>();
export const bridge = {
  // Vue의 최신 서버 상태를 갱신한 뒤 같은 패킷을 Phaser 구독자에게 전달합니다.
  publish(snapshot: Snapshot) {
    ui.snapshot = snapshot;
    listeners.forEach((fn) => fn(snapshot));
  },
  // 효과 이벤트 구독 해제 함수를 반환합니다. Scene 종료 시 반드시 호출하여 누적 구독을 막습니다.
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
