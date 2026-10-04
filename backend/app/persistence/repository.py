# 역할: 게스트 토큰 생성/인증과 누적 킬·데스·최고 레벨 저장. SQL 처리는 이 계층에서 수행합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import hashlib
import secrets
import uuid
from sqlalchemy import select, update, func
from app.persistence.database import Session
from app.persistence.models import Guest


# 평문 토큰을 SHA-256 해시로 바꿔 DB 조회에 사용합니다.
def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# 임의 토큰과 UUID를 생성해 DB에 저장합니다. 평문 토큰은 호출자에게만 반환합니다.
async def create_guest(nickname: str):
    token = secrets.token_urlsafe(32)
    guest = Guest(id=str(uuid.uuid4()), nickname=nickname, token_hash=digest(token))
    async with Session() as db:
        db.add(guest)
        await db.commit()
    return guest.id, token


# 토큰 해시로 계정을 찾습니다. 일치하지 않으면 None을 반환해 WS가 연결을 거부합니다.
async def authenticate(token: str):
    async with Session() as db:
        return await db.scalar(select(Guest).where(Guest.token_hash == digest(token)))


# DB에서 킬/데스를 증가시키고 최고 레벨을 큰 값으로 유지합니다. MySQL/SQLite 함수 차이를 분기합니다.
async def save_statistics(player_id: str, kills: int, deaths: int, best_level: int):
    async with Session() as db:
        await db.execute(
            update(Guest)
            .where(Guest.id == player_id)
            .values(
                kills=Guest.kills + kills,
                deaths=Guest.deaths + deaths,
                best_level=(
                    func.greatest(Guest.best_level, best_level)
                    if db.bind.dialect.name == "mysql"
                    else func.max(Guest.best_level, best_level)
                ),
            )
        )
        await db.commit()
