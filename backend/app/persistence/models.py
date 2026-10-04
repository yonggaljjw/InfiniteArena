# 역할: guest_accounts ORM 모델. 접속 토큰 해시와 누적 기록만 저장하며 실시간 좌표는 저장하지 않습니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.persistence.database import Base


# 누적 기록과 토큰 해시를 저장하는 모델입니다. 평문 토큰은 DB에 저장하지 않습니다.
class Guest(Base):
    __tablename__ = "guest_accounts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nickname: Mapped[str] = mapped_column(String(16), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    kills: Mapped[int] = mapped_column(Integer, default=0)
    deaths: Mapped[int] = mapped_column(Integer, default=0)
    best_level: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
