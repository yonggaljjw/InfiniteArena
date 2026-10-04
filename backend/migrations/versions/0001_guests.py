# 역할: 최초 게스트 계정 테이블과 닉네임 인덱스 생성. 이미 적용한 마이그레이션 변경 대신 새 revision을 추가하세요.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


# 최초 게스트 테이블과 닉네임 인덱스를 생성합니다.
def upgrade():
    op.create_table(
        "guest_accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("nickname", sa.String(16), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("kills", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deaths", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("best_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_guest_accounts_nickname", "guest_accounts", ["nickname"])


# 게스트 테이블을 제거하는 역방향 스키마 변경입니다. 저장된 계정/누적 기록도 사라집니다.
def downgrade():
    op.drop_table("guest_accounts")
