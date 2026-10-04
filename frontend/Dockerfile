# 역할: Node 단계에서 dist를 빌드하고 Nginx 단계에는 배포 산출물만 복사합니다. 소스 변경은 이미지 재빌드가 필요합니다.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
