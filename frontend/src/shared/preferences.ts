// 역할: 로컬 UI 설정 복원·검증·저장. 서버 전투 상태와 무관하며 저장 실패 시 기본 표시로 계속 실행합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { reactive, watch } from "vue";

const KEY = "infinite-arena-ui-v4";
const scales = [0.9, 1, 1.15, 1.25];
const defaults = {
  scale: 1,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  showStats: true,
};
// 저장된 값의 타입과 허용 배율을 검사합니다. 손상/저장소 접근 실패는 기본값으로 복구합니다.
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      scale: scales.includes(saved.scale) ? saved.scale : defaults.scale,
      reducedMotion:
        typeof saved.reducedMotion === "boolean"
          ? saved.reducedMotion
          : defaults.reducedMotion,
      showStats:
        typeof saved.showStats === "boolean"
          ? saved.showStats
          : defaults.showStats,
    };
  } catch {
    return { ...defaults };
  }
}
export const preferences = reactive(restore());
export const menuState = reactive({ settingsOpen: false });
watch(
  preferences,
  (value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* 비공개 모드 등에서 저장소가 막혀도 기본 UI로 계속 실행합니다. */
    }
  },
  { deep: true },
);
// UI 표시 설정만 기본값으로 되돌립니다. 서버 캐릭터 능력치와는 무관합니다.
export function resetPreferences() {
  Object.assign(preferences, defaults);
}
