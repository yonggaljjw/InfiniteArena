// 역할: 동일 출처 REST/WS 연결과 입력 시퀀스 관리. 받은 스냅샷은 bridge를 통해 Vue와 Phaser에 함께 전달합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { ui, bridge } from "../shared/bridge";
import type { Snapshot } from "../shared/protocol";

class ArenaClient {
  private socket: WebSocket | null = null;
  private sequence = 0;
  private token = "";
  // 브라우저 offline 시 연결을 닫고 공통 UI에 상태를 표시합니다. 앱 수명 동안 하나의 client를 사용합니다.
  constructor() {
    window.addEventListener("offline", () => {
      this.socket?.close();
      ui.status = "연결 종료";
      ui.error = "네트워크 연결이 끊겼습니다. 연결 복구 후 재접속하세요.";
    });
  }
  // REST로 게스트를 생성해 토큰을 보관한 뒤 WS를 엽니다. 평문 토큰을 localStorage에 저장하지 않습니다.
  async enter(nickname: string) {
    ui.error = "";
    const response = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "입장 요청이 많습니다. 1분 뒤 다시 시도하세요."
          : response.status >= 500
            ? "서버 또는 DB에 연결할 수 없습니다. 잠시 후 다시 시도하세요."
            : "닉네임은 한글·영문·숫자·밑줄 2~16자로 입력하세요.",
      );
    const guest = await response.json();
    this.token = guest.token;
    this.connect();
  }
  // 현재 HTTP/HTTPS와 같은 호스트로 WS/WSS를 엽니다. welcome에서 ID/seq를 설정하고 snapshot은 bridge로 전달합니다.
  connect() {
    if (!this.token || (this.socket && this.socket.readyState < 2)) return;
    ui.status = "연결 중";
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
    );
    this.socket = ws;
    ws.onopen = () =>
      ws.send(JSON.stringify({ v: 1, type: "join", token: this.token }));
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "welcome") {
        ui.playerId = data.player_id;
        this.sequence = data.next_seq;
        ui.status = "접속 완료";
        ui.error = "";
      }
      if (data.type === "snapshot") bridge.publish(data as Snapshot);
    };
    ws.onclose = (event) => {
      if (this.socket !== ws) return;
      ui.status = "연결 종료";
      ui.error = `연결이 종료되었습니다 (${event.code}). 재접속 버튼을 누르세요.`;
    };
    ws.onerror = () => {
      ui.error = "서버 연결을 확인하세요.";
    };
  }
  // 열린 연결에서만 seq를 증가시켜 정수 방향을 보내고 예측 보정용 seq를 반환합니다.
  input(dx: number, dy: number): number | null {
    if (this.socket?.readyState !== WebSocket.OPEN) return null;
    const seq = this.sequence++;
    this.send({ v: 1, type: "input", seq, dx, dy });
    return seq;
  }
  // 열린 WS에만 메시지를 직렬화해 보냅니다. 닫힌 연결에 요청을 무한 큐잉하지 않습니다.
  send(message: object) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(message));
  }
  // 소켓·ID·스냅샷·토큰을 초기화해 메뉴로 돌아갑니다. 배경 캔버스는 Scene에서 따로 유지합니다.
  leave() {
    this.socket?.close();
    this.socket = null;
    ui.playerId = "";
    ui.snapshot = null;
    ui.status = "입장 전";
    ui.error = "";
    this.token = "";
  }
}
export const client = new ArenaClient();
