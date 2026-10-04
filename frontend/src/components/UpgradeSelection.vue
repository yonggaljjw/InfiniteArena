<script setup lang="ts">
// 역할: 서버가 제공한 choices와 offer_id만 보내는 강화 카드. 클릭 직후 능력치를 임의로 올리지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { computed, onUnmounted, ref, watch } from "vue";
import { ui } from "../shared/bridge";
import { client } from "../network/client";
import { upgrades, currentUpgrade } from "../shared/presentation";
import type { PlayerState } from "../shared/protocol";
import GameIcon from "./ui/GameIcon.vue";
const props = defineProps<{ player: PlayerState }>();
const pending = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
const offer = computed(() => ui.snapshot?.offer_id);
// 서버가 다음 제안을 확정했을 때 pending과 무응답 타이머를 정리합니다. 멀티플레이는 일시정지하지 않습니다.
watch(offer, () => {
  pending.value = "";
  clearTimeout(timer);
});
onUnmounted(() => clearTimeout(timer));
// 서버 choices와 현재 offer_id를 검사해 선택 의사만 보냅니다. 새 offer 수신으로 pending을 해제합니다.
function choose(choice: string) {
  const snapshot = ui.snapshot;
  if (
    !snapshot ||
    !props.player.alive ||
    pending.value ||
    !snapshot.choices.includes(choice) ||
    ui.status !== "접속 완료"
  )
    return;
  pending.value = choice;
  client.send({
    v: 1,
    type: "upgrade_selected",
    offer_id: snapshot.offer_id,
    choice,
  });
  timer = setTimeout(() => {
    pending.value = "";
    ui.error =
      "강화 응답을 확인하지 못했습니다. 연결 상태를 확인하고 다시 선택하세요.";
  }, 3000);
}
</script>
<template>
  <section class="upgrade" aria-labelledby="upgrade-title" data-testid="upgrade-selection">
    <div class="upgrade-heading">
      <span class="eyebrow">ASCENSION · LEVEL {{ player.level }}</span>
      <h2 id="upgrade-title">힘을 선택하세요</h2>
      <p>선택 중에도 월드는 계속 진행됩니다.</p>
    </div>
    <div class="upgrade-cards" :key="offer">
      <button v-for="(choice, index) in ui.snapshot?.choices" :key="choice" class="upgrade-card stone-panel"
        :class="{ chosen: pending === choice }" :disabled="Boolean(pending) || ui.status !== '접속 완료'"
        :data-choice="choice" @click="choose(choice)">
        <span class="card-number">0{{ index + 1 }}</span>
        <GameIcon :name="upgrades[choice]?.icon ?? 'crest'" :size="34" /><span class="card-category">{{
          upgrades[choice]?.category ?? "서버 강화" }}</span><strong>{{ upgrades[choice]?.title ?? choice }}</strong><span
          class="card-description">{{
            upgrades[choice]?.description ?? "서버에서 제공한 강화 항목입니다."
          }}</span><span class="card-current">{{ currentUpgrade(choice, player) }}</span><span class="card-select">{{
            pending === choice ? "선택 확인 중…" : "선택하기" }}
          <span aria-hidden="true">→</span></span>
      </button>
    </div>
    <span class="sr-only" role="status">{{
      pending
        ? "서버에서 강화 선택을 확인하는 중입니다."
        : "서버가 제공한 강화 중 하나를 선택하세요."
    }}</span>
  </section>
</template>
