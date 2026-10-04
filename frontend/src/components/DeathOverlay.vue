<script setup lang="ts">
// 역할: 서버 사망 상태·세션 기록·리스폰 대기 표시. 재생성은 서버 응답으로 확정합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { ui } from "../shared/bridge";
import { client } from "../network/client";
import type { PlayerState } from "../shared/protocol";
import GameIcon from "./ui/GameIcon.vue";
import { onUnmounted, ref } from "vue";
defineProps<{ player: PlayerState }>();
const pending = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
onUnmounted(() => clearTimeout(timer));
// 최신 서버 사망/대기 상태를 검사한 뒤 요청을 한 번만 보냅니다. 3초 무응답 안내 타이머는 제거 시 해제합니다.
function respawn() {
  const snapshot = ui.snapshot;
  const current = snapshot?.players.find((player) => player.id === ui.playerId);
  if (
    !current ||
    current.alive ||
    !snapshot ||
    snapshot.respawn_in > 0 ||
    pending.value ||
    ui.status !== "접속 완료"
  )
    return;
  pending.value = true;
  client.send({ v: 1, type: "respawn" });
  timer = setTimeout(() => {
    pending.value = false;
    ui.error = "리스폰 응답을 확인하지 못했습니다. 연결 상태를 확인하세요.";
  }, 3000);
}
</script>
<template>
  <div class="death-layer">
    <div class="death-shade" />
    <section class="death-overlay stone-panel" aria-labelledby="death-title" data-testid="death-overlay">
      <GameIcon name="skull" :size="40" /><span class="eyebrow">THE ARENA REMAINS</span>
      <h2 id="death-title">이번 생존 종료</h2>
      <p>쓰러져도, 세계는 계속됩니다.</p>
      <dl class="death-summary">
        <div>
          <dt>최종 레벨</dt>
          <dd>{{ player.level }}</dd>
        </div>
        <div>
          <dt>세션 PvP 처치</dt>
          <dd>{{ player.kills }}</dd>
        </div>
        <div>
          <dt>세션 사망</dt>
          <dd>{{ player.deaths }}</dd>
        </div>
      </dl>
      <p class="respawn-note">
        리스폰 시 전투 레벨과 강화가 초기화됩니다.<br />누적 세션 기록은
        유지됩니다.
      </p>
      <button class="primary-button" :disabled="pending ||
        (ui.snapshot?.respawn_in ?? 1) > 0 ||
        ui.status !== '접속 완료'
        " @click="respawn">
        {{
          pending
            ? "리스폰 확인 중…"
            : (ui.snapshot?.respawn_in ?? 0) > 0
              ? `리스폰 대기 ${ui.snapshot?.respawn_in}초`
              : "다시 생존하기"
        }}
      </button>
      <small role="status">{{
        ui.status === "접속 완료"
          ? "뒤의 월드와 다른 플레이어는 계속 움직입니다."
          : "재접속 후 리스폰할 수 있습니다."
      }}</small>
    </section>
  </div>
</template>
