<script setup lang="ts">
// 역할: 전체 화면 조합. Phaser 캔버스를 유지한 채 입장 메뉴/HUD/설정/오류 안내의 표시만 전환합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import GameCanvas from "./components/GameCanvas.vue";
import JoinPanel from "./components/JoinPanel.vue";
import GameHud from "./components/GameHud.vue";
import { ui } from "./shared/bridge";
import { menuState, preferences } from "./shared/preferences";
import GameSettings from "./components/GameSettings.vue";
import { audio } from "./audio/service";
import { audioState } from "./audio/settings";
</script>
<template>
  <main :class="{ 'reduce-motion': preferences.reducedMotion }" :style="{ '--ui-scale': preferences.scale }">
    <GameCanvas />
    <Transition name="menu">
      <JoinPanel v-if="!ui.playerId" />
      <GameHud v-else />
    </Transition>
    <Transition name="overlay">
      <GameSettings v-if="menuState.settingsOpen" />
    </Transition>
    <button v-if="audioState.status === 'locked'" class="audio-notice quiet-button stone-panel" @click="audio.enable">
      클릭하여 사운드 활성화
    </button>
    <span v-else-if="audioState.status === 'unavailable'" class="audio-notice stone-panel" role="status">사운드 없이 플레이
      중</span>
    <div v-if="ui.error" class="error stone-panel" role="alert">
      <span>{{ ui.error }}</span><button class="icon-button" aria-label="오류 안내 닫기" @click="ui.error = ''">
        ×
      </button>
    </div>
  </main>
</template>
