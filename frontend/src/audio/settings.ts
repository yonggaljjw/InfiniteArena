// 역할: 서버 상태와 분리된 표시용 오디오 설정. 저장 데이터는 타입/범위를 검증하고 즉시 반영합니다.
import { reactive, watch } from "vue";
export const AUDIO_DEFAULTS = { master: 80, bgm: 40, sfx: 70, muted: false };
const KEY = "infinite-arena-audio-v5";
// 저장된 값이 손상되었거나 저장소가 차단되면 안전한 기본값으로 복원합니다.
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const volume = (key: "master" | "bgm" | "sfx") =>
      typeof saved[key] === "number" && Number.isFinite(saved[key])
        ? Math.max(0, Math.min(100, saved[key]))
        : AUDIO_DEFAULTS[key];
    return {
      master: volume("master"),
      bgm: volume("bgm"),
      sfx: volume("sfx"),
      muted: typeof saved.muted === "boolean" ? saved.muted : false,
    };
  } catch {
    return { ...AUDIO_DEFAULTS };
  }
}
export const audioSettings = reactive(restore());
export const audioState = reactive({
  status: "loading" as "loading" | "locked" | "ready" | "unavailable",
  missing: 0,
});
watch(
  audioSettings,
  (settings) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* 비공개 저장소 제한은 게임 실행을 막지 않습니다. */
    }
  },
  { deep: true },
);
// 설정 초기화는 반응형 구독을 통해 재생 중인 채널에도 즉시 적용됩니다.
export function resetAudioSettings() {
  Object.assign(audioSettings, AUDIO_DEFAULTS);
}
