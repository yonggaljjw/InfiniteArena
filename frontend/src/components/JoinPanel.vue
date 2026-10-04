<script setup lang="ts">
// 역할: 닉네임 입력과 게스트 입장 메뉴. 중복 클릭을 막고 REST/WS 오류를 공통 안내에 전달합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { ref } from "vue";
import { client } from "../network/client";
import { ui } from "../shared/bridge";
import { menuState } from "../shared/preferences";
import GameIcon from "./ui/GameIcon.vue";
const nickname = ref("");
const busy = ref(false);
// 중복 입장을 막고 닉네임으로 게스트를 생성합니다. 실패는 ui.error에 표시하고 busy는 항상 해제합니다.
async function join() {
  if (ui.playerId || busy.value || ui.status === "연결 중") return;
  busy.value = true;
  try {
    await client.enter(nickname.value);
  } catch (error) {
    ui.error = (error as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="game-menu-shell">
    <div class="menu-backdrop" />
    <section class="join-panel game-menu" aria-labelledby="game-title">
      <div class="menu-crest">
        <GameIcon name="crest" :size="48" />
      </div>
      <span class="eyebrow">A SHARED WORLD OF RUIN</span>
      <h1 id="game-title">INFINITE<span>ARENA</span></h1>
      <div class="title-rule" />
      <p class="menu-tagline">끝없는 세계, 새로운 생존.</p>
      <form class="menu-form stone-panel" @submit.prevent="join">
        <label for="nickname">모험가의 이름 <span>닉네임</span></label>
        <input id="nickname" v-model="nickname" aria-label="닉네임" minlength="2" maxlength="16" required
          pattern="[가-힣A-Za-z0-9_]{2,16}" autocomplete="nickname" spellcheck="false" placeholder="한글·영문·숫자·밑줄"
          :disabled="busy || ui.status === '연결 중'" aria-describedby="nickname-help" />
        <small id="nickname-help">2~16자 · 별도 가입 없이 게스트로 플레이</small>
        <button class="primary-button start-button" :disabled="busy || ui.status === '연결 중'" type="submit">
          <span>{{
            busy || ui.status === "연결 중"
              ? "세계에 연결하는 중…"
              : "월드 입장"
          }}</span><span aria-hidden="true">→</span>
        </button>
      </form>
      <button class="quiet-button menu-settings" @click="menuState.settingsOpen = true">
        <GameIcon name="settings" :size="16" />설정
      </button>
      <div class="menu-status" role="status">
        <i :class="{ connected: ui.status === '접속 완료' }" />{{
          ui.status === "입장 전"
            ? "게스트 플레이 · 입장 후 서버에 연결됩니다."
            : ui.status
        }}
      </div>
      <div class="menu-controls">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 방향키 이동</span><span>안전구역 밖에서 자동 공격 · PvPvE</span>
      </div>
    </section>
    <div class="menu-footer">
      <span>INFINITE ARENA</span><span>숲과 유적 사이, 마지막까지 살아남으세요.</span>
    </div>
  </div>
</template>
