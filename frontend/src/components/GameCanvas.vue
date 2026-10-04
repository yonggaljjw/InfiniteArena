<script setup lang="ts">
// 역할: Vue와 Phaser 수명 연결. 폰트 준비 후 게임을 만들고 컴포넌트 제거 시 렌더링 자원을 해제합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { onMounted, onUnmounted, ref } from "vue";
import { createGame } from "../game/createGame";
import type Phaser from "phaser";
const parent = ref<HTMLDivElement>();
let game: Phaser.Game | undefined;
// 한글 이름표가 폰트 준비 전에 잘못 측정되지 않도록 기다리고, 부모 DOM이 남아 있을 때만 생성합니다.
onMounted(async () => {
    await document.fonts.ready;
    if (parent.value) game = createGame(parent.value);
});
// 캔버스 제거 시 Scene 종료 정리까지 실행하여 구독/입력 타이머/효과 객체를 회수합니다.
onUnmounted(() => game?.destroy(true));
</script>
<template>
    <div ref="parent" class="game-canvas" />
</template>
