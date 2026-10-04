<script setup lang="ts">
// 역할: 서버 HP·EXP 수치와 접근성 속성을 표시합니다. 게이지 전환은 CSS 표현이며 실제 값은 즉시 갱신됩니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import type { PlayerState } from "../../shared/protocol";
import { percentage } from "../../shared/presentation";
// 숫자/ARIA는 서버 값을 즉시 쓰고 CSS 전환만 부드럽게 합니다. 레벨 key는 EXP 게이지 역방향 전환을 막습니다.
defineProps<{ player: PlayerState }>();
</script>
<template>
  <div class="vital health" data-testid="health">
    <div class="meter-label">
      <span>체력 <small>HP</small></span><strong>{{ Math.ceil(Math.max(0, player.hp)) }}
        <small>/ {{ player.max_hp }}</small></strong>
    </div>
    <div class="meter" role="progressbar" aria-label="체력" :aria-valuenow="Math.max(0, player.hp)"
      :aria-valuemax="player.max_hp" :aria-valuemin="0">
      <div class="meter-fill" :style="{ width: percentage(player.hp, player.max_hp) + '%' }" />
    </div>
  </div>
  <div class="vital experience" data-testid="experience" :key="player.level">
    <div class="meter-label">
      <span>경험치 <small>EXP</small></span><strong>{{ player.exp }} <small>/ {{ player.exp_next }}</small></strong>
    </div>
    <div class="meter" role="progressbar" aria-label="경험치" :aria-valuenow="player.exp" :aria-valuemax="player.exp_next"
      :aria-valuemin="0">
      <div class="meter-fill" :style="{ width: percentage(player.exp, player.exp_next) + '%' }" />
    </div>
    <small class="next-level">다음 레벨까지 {{ Math.max(0, player.exp_next - player.exp) }} EXP</small>
  </div>
</template>
