# [Node 전환] Node.js 백엔드용 이미지 — 기존 Dockerfile.backend(Python)를 대체한다.
# 팀원 누구든 같은 Node 20 환경에서 작업하도록 보장한다.

FROM node:20-slim

# better-sqlite3 는 C++로 만든 "네이티브 모듈"이라, 설치 시 빌드 도구가 필요할 수 있다.
# (python3 / make / g++ 가 그 빌드 도구)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# package.json 먼저 복사 → 의존성 설치 (코드만 바뀔 땐 이 단계가 캐시로 재사용됨)
COPY backend/package.json ./
RUN npm install

# 나머지 백엔드 코드 복사 (실제로는 docker-compose 볼륨 마운트가 덮어씀)
COPY backend/ ./

EXPOSE 8000

# 개발 모드로 실행 (파일 바뀌면 자동 재시작)
CMD ["npm", "run", "dev"]
