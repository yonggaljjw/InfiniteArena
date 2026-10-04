# 역할: 클라이언트가 보낼 수 있는 WS 요청 스키마. 좌표·공격력 등 임의 추가 필드는 거부합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


# 버전 1만 허용하고 추가 필드를 거부하는 모든 입력 메시지의 기반입니다.
class StrictMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    v: Literal[1] = 1


# 재사용 가능한 게스트 토큰만 받습니다. 닉네임/ID를 클라이언트 요청으로 바꾸지 않습니다.
class Join(StrictMessage):
    type: Literal["join"]
    token: str = Field(min_length=32, max_length=128)


# seq와 -1/0/1 방향만 허용합니다. bool과 클라이언트 좌표/피해값은 거부합니다.
class Input(StrictMessage):
    type: Literal["input"]
    seq: int = Field(ge=0, le=2147483647, strict=True)
    dx: int = Field(ge=-1, le=1, strict=True)
    dy: int = Field(ge=-1, le=1, strict=True)


# 강화 ID와 제안 번호를 받습니다. 해당 플레이어에게 유효한 제안인지는 World가 검사합니다.
class Upgrade(StrictMessage):
    type: Literal["upgrade_selected"]
    offer_id: int = Field(ge=0, le=2147483647, strict=True)
    choice: Literal["damage", "haste", "health", "spread", "orbit"]


# 리스폰 의사만 전달합니다. 실제 대기 시간과 상태 초기화는 World에서 결정합니다.
class Respawn(StrictMessage):
    type: Literal["respawn"]
