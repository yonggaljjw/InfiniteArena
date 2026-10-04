# 역할: 비동기 DB 엔진·세션 팩토리·ORM 기반 클래스. 실제 스키마 생성은 Alembic이 담당합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


# 모든 ORM 모델이 공유하는 메타데이터입니다. Alembic이 이를 읽어 스키마 차이를 계산합니다.
class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, pool_pre_ping=True)
Session = async_sessionmaker(engine, expire_on_commit=False)
