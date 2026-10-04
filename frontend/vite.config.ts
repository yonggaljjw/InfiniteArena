// 역할: Vue 빌드와 개발 API/WS 프록시 설정. 운영 프록시는 nginx.conf가 담당합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
const target = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": { target },
      "/ws": { target, ws: true },
    },
  },
});
