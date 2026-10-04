// 역할: 브라우저 회귀 테스트의 기본 주소·단일 worker·시간 제한·PC 뷰포트 설정.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.ARENA_URL ?? "http://127.0.0.1:8080",
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ["--no-sandbox"] },
  },
  reporter: "list",
});
