<script setup lang="ts">
// 역할: 스냅샷 TOP5 랭킹. 본인 ID로 강조하고 목록 밖의 정확한 순위는 추측하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { computed } from "vue";
import { ui } from "../../shared/bridge";
import GameIcon from "./GameIcon.vue";
// TOP5 안의 실제 인덱스만 순위로 사용합니다. findIndex=-1이면 0으로 바꿔 목록 밖으로 표시합니다.
const myRank = computed(
  () =>
    (ui.snapshot?.leaderboard.findIndex((p) => p.id === ui.playerId) ?? -1) + 1,
);
</script>
<template>
  <aside class="ranking stone-panel" aria-label="실시간 랭킹">
    <div class="panel-heading">
      <GameIcon name="crown" :size="18" />
      <h2>월드 랭킹</h2>
      <span class="caption">TOP 5</span>
    </div>
    <div class="ranking-meta">
      <span data-testid="player-count">접속 {{ ui.snapshot?.online ?? 0 }}명</span><span>PvP 처치 · 레벨순</span>
    </div>
    <TransitionGroup name="rank" tag="ol" class="ranking-list">
      <li v-for="(p, i) in ui.snapshot?.leaderboard" :key="p.id" :class="{ 'is-self': p.id === ui.playerId }"
        :data-player-id="p.id" :aria-current="p.id === ui.playerId ? 'true' : undefined">
        <span class="rank-index">{{ String(i + 1).padStart(2, "0") }}</span><span class="rank-name">{{ p.nickname
        }}<small>Lv.{{ p.level }}
            <span v-if="p.id === ui.playerId">· 나</span></small></span><strong>{{ p.kills }}<small>처치</small></strong>
      </li>
    </TransitionGroup>
    <div class="my-rank" data-testid="my-rank">
      내 순위 <strong>{{ myRank ? myRank + "위" : "상위 5위 밖" }}</strong>
    </div>
  </aside>
</template>
