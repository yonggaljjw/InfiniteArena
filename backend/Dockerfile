# 역할: 서버 의존성을 설치하고 비특권 사용자로 Alembic 마이그레이션 후 단일 uvicorn worker를 실행합니다.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd -m arena && chown -R arena:arena /app
USER arena
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --ws-max-size 2048"]
