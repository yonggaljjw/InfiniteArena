# 역할: 기존 .env를 유지하면서 첫 실행용 무작위 DB 비밀번호를 생성합니다. Python 표준 라이브러리만 사용합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""외부 Python 의존성 없이 최초 .env를 생성합니다. 기존 파일은 덮어쓰지 않습니다."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    print(".env가 이미 있어 유지합니다.")
else:
    text = (root / ".env.example").read_text(encoding="utf-8")
    text = text.replace("arena_dev_password", secrets.token_hex(24)).replace(
        "arena_dev_root_password", secrets.token_hex(24)
    )
    target.write_text(text, encoding="utf-8")
    print(".env 생성 완료")
