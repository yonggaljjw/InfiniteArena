# 역할: Alembic과 비동기 DB 엔진을 연결합니다. 모델 import는 메타데이터에 테이블을 등록하기 위해 필요합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import asyncio
from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from app.core.config import settings
from app.persistence.database import Base
from app.persistence import models

config = context.config


# 동기 연결 위에서 모델 메타데이터와 revision을 연결하고 트랜잭션 안에서 적용합니다.
def configure(connection):
    context.configure(
        connection=connection, target_metadata=Base.metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()


# 비동기 마이그레이션 엔진에서 동기 Alembic 실행을 연결한 후 엔진을 해제합니다.
async def run():
    engine = async_engine_from_config(
        {"sqlalchemy.url": settings.database_url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with engine.connect() as connection:
        await connection.run_sync(configure)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(
        url=settings.database_url, target_metadata=Base.metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(run())
