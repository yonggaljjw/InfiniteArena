# 역할: Alembic이 새 revision 파일을 만들 때 사용하는 Python 템플릿입니다.
# upgrade/downgrade와 revision 연결을 작성하고 생성 후 DB 영향 범위를 검토하세요.
"""${message}"""
from alembic import op
import sqlalchemy as sa
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}
def upgrade():
    ${upgrades if upgrades else "pass"}
def downgrade():
    ${downgrades if downgrades else "pass"}
