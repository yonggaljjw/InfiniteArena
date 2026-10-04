<script setup lang="ts">
// 역할: 표시 설정 대화상자. Tab 포커스 순환과 Escape 닫기를 제공하며 멀티플레이 월드는 멈추지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  menuState,
  preferences,
  resetPreferences,
} from "../shared/preferences";
import GameIcon from "./ui/GameIcon.vue";
import {
  audioSettings,
  audioState,
  resetAudioSettings,
} from "../audio/settings";
const volumeLabels = {
  master: "전체 볼륨",
  bgm: "배경음악 볼륨",
  sfx: "효과음 볼륨",
};
// 기존 표시 설정과 오디오 채널을 같은 기본값 복원 동작으로 초기화합니다.
function resetAll() {
  resetPreferences();
  resetAudioSettings();
}
const dialog = ref<HTMLElement>();
// 닫을 때 설정을 열었던 버튼으로 포커스를 돌려 키보드 사용 흐름을 유지합니다.
const previousFocus = document.activeElement as HTMLElement | null;
// 대화상자 표시 상태만 닫습니다. 서버 게임 루프나 전투 상태는 변경하지 않습니다.
function close() {
  menuState.settingsOpen = false;
}
// Escape로 닫고 Tab/Shift+Tab 포커스를 대화상자 안에서 순환시킵니다.
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
  }
  if (event.key !== "Tab") return;
  const elements = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      "button:not(:disabled),select,input",
    ) ?? [],
  );
  const first = elements[0],
    last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(async () => {
  await nextTick();
  dialog.value?.querySelector<HTMLElement>("button")?.focus();
  document.addEventListener("keydown", keydown);
});
// 전역 키 리스너를 제거한 뒤 아직 연결된 이전 요소에만 포커스를 복원합니다.
onUnmounted(() => {
  document.removeEventListener("keydown", keydown);
  previousFocus?.isConnected && previousFocus.focus();
});
</script>
<template>
  <div class="settings-backdrop" @click.self="close">
    <section ref="dialog" class="settings-dialog stone-panel" role="dialog" aria-modal="true"
      aria-labelledby="settings-title">
      <div class="panel-heading">
        <GameIcon name="settings" />
        <h2 id="settings-title">설정</h2>
        <button class="icon-button" aria-label="설정 닫기" @click="close">
          ×
        </button>
      </div>
      <p>월드는 멈추지 않습니다. 화면과 사운드를 조절합니다.</p>
      <label class="setting-row" for="ui-scale"><span>UI 크기<small>HUD와 메뉴 크기</small></span><select id="ui-scale"
          v-model.number="preferences.scale">
          <option :value="0.9">90%</option>
          <option :value="1">100%</option>
          <option :value="1.15">115%</option>
          <option :value="1.25">125%</option>
        </select></label>
      <label class="setting-row" for="reduced-motion"><span>UI 동작 감소<small>전환·게이지·랭킹 애니메이션 줄이기</small></span><input
          id="reduced-motion" type="checkbox" v-model="preferences.reducedMotion" /></label>
      <label class="setting-row" for="show-stats"><span>상세 능력치 표시<small>총알 피해·공격 간격·이동 속도</small></span><input
          id="show-stats" type="checkbox" v-model="preferences.showStats" /></label>
      <fieldset class="audio-options">
        <legend>사운드</legend>
        <label v-for="(label, key) in volumeLabels" :key="key" class="audio-slider" :for="'audio-' + key"><span>{{ label
            }} <output>{{ audioSettings[key] }}%</output></span><input :id="'audio-' + key"
            v-model.number="audioSettings[key]" type="range" min="0" max="100" step="1" /></label>
        <label class="setting-row" for="audio-mute"><span>전체 음소거</span><input id="audio-mute" type="checkbox"
            v-model="audioSettings.muted" /></label>
        <small role="status">{{
          audioState.status === "ready"
            ? "사운드 활성화됨"
            : audioState.status === "unavailable"
              ? "오디오를 사용할 수 없습니다. 게임은 계속됩니다."
              : "버튼을 클릭하면 사운드가 활성화됩니다."
        }}{{
            audioState.missing ? ` · 로딩 실패 ${audioState.missing}개` : ""
          }}</small>
      </fieldset>
      <div class="settings-actions">
        <button class="quiet-button" @click="resetAll">기본값 복원</button><button class="primary-button"
          @click="close">완료</button>
      </div>
    </section>
  </div>
</template>
