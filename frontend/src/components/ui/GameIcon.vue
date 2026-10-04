<script setup lang="ts">
// 역할: 직접 작성한 SVG 경로를 공유하는 UI 아이콘. 알 수 없는 키는 crest로 표시합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 24 });
const shapes: Record<string, string> = {
  sword: "M16 2h6v6L10 20l-2-2-4 4-2-2 4-4-2-2L16 2Zm1 3L7 15l2 2L19 7V5h-2Z",
  bolt: "M3 10h12V6l7 6-7 6v-4H3v-4Z",
  spread: "M2 10h10V6l6 6-6 6v-4H2v-4Zm13-7 6-1 1 6-7-5Zm0 18 7-5-1 6-6-1Z",
  heart:
    "M4 3h5l3 3 3-3h5l3 3v7L12 23 1 13V6l3-3Zm2 3L4 8v4l8 7 8-7V8l-2-2h-2l-4 4-4-4H6Z",
  haste: "M13 1h6l-5 8h7L9 23l2-10H4l9-12Z",
  orbit: "M16 1 9 4 5 10l1 7 5 5h8l4-4-7 1-6-4-1-6 7-8Z",
  crown: "M2 5 7 9l5-7 5 7 5-4-2 14H4L2 5Zm3 16h14v2H5v-2Z",
  skull:
    "M6 2h12l4 4v9l-4 2v5H6v-5l-4-2V6l4-4Zm0 7v5h4V9H6Zm8 0v5h4V9h-4Zm-4 8v4h4v-4h-4Z",
  settings:
    "M9 1h6l1 4 3-1 4 5-3 3 3 3-4 5-3-1-1 4H9l-1-4-3 1-4-5 3-3-3-3 4-5 3 1 1-4Zm3 7-4 4 4 4 4-4-4-4Z",
  crest:
    "M10 1h4v4h4v4h4v6h-4v4h-4v4h-4v-4H6v-4H2V9h4V5h4V1Zm2 6-5 5 5 5 5-5-5-5Z",
};
</script>
<template>
  <svg class="game-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor"
    shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <path :d="shapes[name] ?? shapes.crest" />
  </svg>
</template>
