// 역할: 성장/PvP용 독립 실제 서버 fixture. 임시 SQLite·포트·프로세스를 만들고 테스트 종료 시 정리합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test as base } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:net";

const frontend = fileURLToPath(new URL("../..", import.meta.url));
const backend = resolve(frontend, "../backend");
// OS가 제공한 빈 로컬 포트를 얻어 테스트 서버 간 충돌을 줄입니다.
async function freePort() {
  const server = createServer();
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No TCP port allocated");
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
  return address.port;
}
// 별도 프로세스를 시작하고 마지막 로그만 제한된 크기로 보관해 실패 원인을 확인합니다.
function processWithLog(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) {
  let log = "";
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (data) => {
    log = (log + data).slice(-8000);
  });
  child.stderr?.on("data", (data) => {
    log = (log + data).slice(-8000);
  });
  child.on("error", (error) => {
    log += error.message;
  });
  return { child, log: () => log };
}
// 종료 신호를 보내고 6초 뒤에도 남아 있으면 강제 종료합니다. 테스트의 프로세스 누적을 막습니다.
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid)
    return;
  await new Promise<void>((done) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 6000);
    child.once("exit", () => {
      clearTimeout(timer);
      done();
    });
    child.kill("SIGTERM");
  });
}
// 실제 ready 응답이 성공할 때까지 제한된 시간만 기다립니다. 프로세스 종료/준비 실패는 로그와 함께 보고합니다.
async function ready(url: string, process: ReturnType<typeof processWithLog>) {
  for (let i = 0; i < 200; i++) {
    if (process.child.exitCode !== null || !process.child.pid)
      throw new Error(process.log());
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(500) })).ok) return;
    } catch {
      /* 서버 시작 대기 중의 연결 실패는 다음 제한된 시도에서 재확인합니다. */
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`Arena startup timed out: ${process.log()}`);
}

// 실제 성장/PvP는 독립 월드를 사용합니다. 이전 테스트의 생존 몬스터가 이번 결과를 좌우하면 안 됩니다.
// 기존 규칙을 그대로 실행하는 FastAPI/Vite 프로세스이며 서버 상태를 주입하지 않습니다.
export const test = base.extend<{ arenaUrl: string }>({
  arenaUrl: async ({}, use) => {
    if (process.env.ARENA_URL) {
      await use(process.env.ARENA_URL);
      return;
    }
    const folder = await mkdtemp(resolve(tmpdir(), "arena-e2e-"));
    const apiPort = await freePort(),
      frontPort = await freePort();
    const url = `http://127.0.0.1:${frontPort}`;
    const python = process.env.ARENA_PYTHON ?? "python";
    const env = {
      ...process.env,
      DATABASE_URL: `sqlite+aiosqlite:///${folder}/arena.db`,
      ALLOWED_ORIGINS: url,
      API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
    };
    const children: ChildProcess[] = [];
    try {
      const migration = processWithLog(
        python,
        ["-m", "alembic", "upgrade", "head"],
        backend,
        env,
      );
      const status = await new Promise<number | null>((done, reject) => {
        migration.child.once("error", reject);
        migration.child.once("exit", done);
      });
      if (status !== 0) throw new Error(migration.log());
      // 일반 스폰/강화 후보를 재현하기 위해 테스트 RNG 시드만 고정합니다.
      const bootstrap = `import random,uvicorn; from app.main import app; random.seed(83); uvicorn.run(app,host='127.0.0.1',port=${apiPort},ws_max_size=2048)`;
      const api = processWithLog(python, ["-c", bootstrap], backend, env);
      children.push(api.child);
      await ready(`${env.API_PROXY_TARGET}/api/ready`, api);
      const config = resolve(folder, "vite.config.mjs");
      await writeFile(
        config,
        `import base from ${JSON.stringify(pathToFileURL(resolve(frontend, "vite.config.ts")).href)}; export default {...base, cacheDir:${JSON.stringify(resolve(folder, "vite-cache"))}}`,
      );
      const vite = processWithLog(
        process.execPath,
        [
          resolve(frontend, "node_modules/vite/bin/vite.js"),
          "--config",
          config,
          "--host",
          "127.0.0.1",
          "--port",
          String(frontPort),
          "--strictPort",
        ],
        frontend,
        env,
      );
      children.push(vite.child);
      await ready(`${url}/api/ready`, vite);
      await use(url);
    } finally {
      for (const child of children.reverse()) await stop(child);
      await rm(folder, { recursive: true, force: true });
    }
  },
});
