# 역할: 테스트 전용 임시 SQLite와 세션 단위 스키마 생성·정리. 실제 MySQL 데이터에 접근하지 않습니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""테스트 전용 SQLite를 사용하여 실제 MySQL 데이터에 영향을 주지 않습니다."""

import asyncio
import os
import tempfile
from pathlib import Path
import pytest

folder = tempfile.TemporaryDirectory(prefix="arena-tests-")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + str(Path(folder.name) / "test.db")


# 테스트 세션에 임시 스키마를 만들고 종료 시 엔진과 임시 폴더를 정리합니다.
@pytest.fixture(scope="session", autouse=True)
def database():
    from app.persistence.database import Base, engine
    from app.persistence import models

    # 비동기 연결에서 테스트 스키마를 생성합니다. 운영 서버 시작 코드에는 create_all을 사용하지 않습니다.
    async def create():
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(create())
    yield
    asyncio.run(engine.dispose())
    folder.cleanup()
