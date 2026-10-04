// 역할: Vue 앱의 진입점. 공통 스타일을 로딩하고 index.html의 #app에 화면을 연결합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { createApp } from "vue";
import App from "./App.vue";
import "@fontsource/noto-sans-kr/400.css";
import "./style.css";
createApp(App).mount("#app");
