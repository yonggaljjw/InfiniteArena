# infra

nginx.tls.conf는 선택적인 직접 TLS 종료 설정입니다. 인증서 발급과 실제 외부 배포는 별도입니다. 기본 HTTP 설정은 frontend/nginx.conf입니다.

## 폴더 역할과 유지보수 안내

선택적 HTTPS용 Nginx 설정. 기본 HTTP 실행은 frontend/nginx.conf를 사용합니다.

[프로젝트 루트 안내](../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [nginx.tls.conf](nginx.tls.conf) | 선택적 HTTPS 종료 프록시. 인증서 경로와 WS Upgrade를 실제 배포 도메인에 맞춰 설정합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
