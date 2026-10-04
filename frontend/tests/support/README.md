# frontend/tests/support

## 폴더 역할과 유지보수 안내

성장/PvP 테스트용 실제 독립 FastAPI/Vite fixture. 고정 RNG로 재현성을 확보하고 자원을 정리합니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [isolatedArena.ts](isolatedArena.ts) | 성장/PvP용 독립 실제 서버 fixture. 임시 SQLite·포트·프로세스를 만들고 테스트 종료 시 정리합니다. |

### 변경 시 점검

실제 서버 플레이 검증과 표시 패킷 재생 검증을 구분하세요. 임시 DB와 종료 정리를 유지하고 과거 측정 JSON을 새 테스트 실행으로 간주하지 않습니다. 브라우저 테스트는 실제 FastAPI와 Vite를 함께 실행한 뒤 수행합니다.
