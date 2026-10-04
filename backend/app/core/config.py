# 역할: 환경변수와 .env에서 서버 설정을 읽습니다. 월드 크기와 송신 주기는 현재 프로토콜의 고정값입니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# 환경 설정을 검증합니다. 주기/월드 크기는 예측 이동과 렌더링에 연결되어 임의 변경할 수 없습니다.
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite+aiosqlite:///./arena.db"
    allowed_origins: str = "http://localhost:8080,http://127.0.0.1:8080"
    world_size: Literal[4096] = 4096
    tick_rate: Literal[20] = 20
    snapshot_rate: Literal[10] = 10
    max_players: int = Field(default=20, ge=1, le=20)


settings = Settings()
