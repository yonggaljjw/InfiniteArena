<script setup lang="ts">
// 역할: 서버가 해금한 무기·총알 피해·공격 간격·이동 속도와 보호 상태 표시. 무기 레벨을 임의로 만들지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import type { PlayerState } from "../../shared/protocol";
import { weapons } from "../../shared/presentation";
import { preferences } from "../../shared/preferences";
import GameIcon from "./GameIcon.vue";
defineProps<{ player: PlayerState; protected: boolean }>();
</script>
<template>
  <section class="weapon-panel stone-panel" aria-label="현재 무기">
    <div class="weapon-list">
      <div class="weapon-slot" v-for="weapon in player.weapons" :key="weapon">
        <GameIcon :name="weapons[weapon]?.icon ?? 'sword'" />
        <div>
          <strong>{{ weapons[weapon]?.title ?? weapon }}</strong><small>해금 · 자동 공격</small>
        </div>
      </div>
    </div>
    <div v-if="preferences.showStats" class="weapon-stats" data-testid="weapon-stats">
      <span>총알 피해 <b>{{ player.damage.toFixed(1) }}</b></span><span>공격 간격 <b>{{ player.cooldown.toFixed(2)
          }}초</b></span><span>이동 <b>{{ player.speed }}</b></span>
    </div>
    <div class="combat-status" :class="{ safe: protected && player.alive }">
      <i />{{
        protected && player.alive
          ? "안전구역 / 리스폰 보호"
          : player.alive
            ? "PvP 활성 · 자동 공격"
            : "전투 종료"
      }}
    </div>
  </section>
</template>
