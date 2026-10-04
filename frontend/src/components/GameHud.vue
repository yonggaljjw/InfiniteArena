<script setup lang="ts">
// 역할: 서버 스냅샷에서 본인 상태를 읽어 HUD·강화 선택·사망 화면을 조합합니다. HP를 별도 상태로 복제하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { computed } from "vue";
import { ui } from "../shared/bridge";
import { client } from "../network/client";
import { menuState } from "../shared/preferences";
import VitalBars from "./ui/VitalBars.vue";
import Leaderboard from "./ui/Leaderboard.vue";
import WeaponPanel from "./ui/WeaponPanel.vue";
import GameIcon from "./ui/GameIcon.vue";
import UpgradeSelection from "./UpgradeSelection.vue";
import DeathOverlay from "./DeathOverlay.vue";
// ID로 본인을 찾아 같은 스냅샷의 HP/EXP/레벨을 자식에게 전달합니다. computed는 서버 값을 복사하지 않습니다.
const me = computed(() =>
  ui.snapshot?.players.find((player) => player.id === ui.playerId),
);
</script>
<template>
  <div class="hud-surface">
    <section v-if="me" class="player-panel stone-panel" aria-label="플레이어 상태">
      <div class="player-heading">
        <div class="portrait">
          <GameIcon name="sword" :size="26" />
        </div>
        <div class="player-name">
          <span class="eyebrow">WANDERER</span><strong :title="me.nickname">{{ me.nickname }}</strong>
        </div>
        <Transition name="level" mode="out-in"><span class="level-badge" :key="me.level"><small>LV.</small>{{ me.level
            }}</span></Transition>
      </div>
      <VitalBars :player="me" />
    </section>
    <div class="session-bar">
      <span class="connection-state" :class="{ connected: ui.status === '접속 완료' }"><i />{{ ui.status }}</span><button
        v-if="ui.status === '연결 종료'" class="quiet-button" @click="client.connect()">
        재접속</button><button class="icon-button" aria-label="설정" @click="menuState.settingsOpen = true">
        <GameIcon name="settings" :size="17" />
      </button><button class="quiet-button leave-button" @click="client.leave()">
        나가기
      </button>
    </div>
    <Leaderboard />
    <WeaponPanel v-if="me" :player="me" :protected="Boolean(ui.snapshot?.protected)" />
    <div class="help">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</span><span>안전구역 밖에서 자동 공격</span>
    </div>
    <div class="feed" aria-label="최근 전투">
      <TransitionGroup name="feed">
        <div v-for="event in ui.snapshot?.events.slice(-3)" :key="event.id">
          {{ event.text }}
        </div>
      </TransitionGroup>
    </div>
    <Transition name="overlay">
      <UpgradeSelection v-if="me?.alive && ui.snapshot?.choices.length" :player="me" />
    </Transition>
    <Transition name="overlay">
      <DeathOverlay v-if="me && !me.alive" :player="me" />
    </Transition>
  </div>
</template>
