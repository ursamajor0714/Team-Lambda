# welcome Team "Lambda" Repository

<img width="1900" height="900" alt="image" src="https://github.com/user-attachments/assets/63aa503c-3de1-4f0f-b3ca-31cf9fd4cb0c" />

Fun ! Share! Play!

We are building a fun community for everyone!
Our goal is to make a simple and easy-to-visit community!

---

## 🛠 기술 스택

익명 게시판 프로젝트 (Django REST + React + Docker)

---

## 🚀 팀원 시작 가이드 (가장 빠른 방법)

### 사전 준비물 (한 번만)

각자 컴퓨터에 **Docker Desktop** 설치:
- Windows/Mac: <https://www.docker.com/products/docker-desktop>
- 설치 후 한 번 실행해서 켜둔 상태로 둡니다.

### 실행 (clone → docker compose up, 끝)

```bash
git clone https://github.com/ursamajor0714/Team-Lambda.git Lambda
cd Lambda
docker compose up
```

처음엔 이미지 빌드하느라 5~10분 정도 걸립니다. 두 번째부턴 캐시 덕분에 30초 이내.

다 뜨면:
- 프론트엔드: <http://localhost:5173>
- 백엔드 API: <http://localhost:8000/api/posts/>
- Django admin: <http://localhost:8000/admin/>

종료는 `Ctrl+C` → `docker compose down`.

### 코드 수정하면?

볼륨 마운트 덕분에 **자동으로 hot reload** 됩니다. 컨테이너 재시작 안 해도 됨.

### DB 초기화하고 싶을 때

```bash
docker compose down
rm db.sqlite3
docker compose up
```
(첫 실행 때 마이그레이션이 자동으로 돌면서 새 DB가 생깁니다)

---

## 🛠 Cursor에서 컨테이너 안에서 개발하기 (선택)

Cursor가 컨테이너 환경 그대로 들고 들어가서, 자동완성·타입체크가 컨테이너 기준으로 동작하게 만드는 방법입니다.

1. Cursor에 **Dev Containers** 확장 설치
2. Cursor로 `Lambda/` 폴더 열기
3. 우측 하단에 **"Reopen in Container"** 알림 → 클릭
4. 자동으로 컨테이너 빌드되고, Cursor가 컨테이너 안에서 열림

> `.devcontainer/devcontainer.json`이 설정 파일입니다. 확장 프로그램까지 통일됨.

---

## 📁 프로젝트 구조

```
Lambda/
├── config/              ← Django 프로젝트 설정
├── myapp/               ← Django 앱 (모델/뷰/시리얼라이저)
│   ├── models.py
│   ├── views.py         ← JSON API
│   ├── serializers.py
│   └── urls.py
├── frontend/            ← React (Vite)
│   ├── package.json
│   └── src/
│       ├── pages/       ← 화면 컴포넌트
│       ├── api/         ← API 호출 클라이언트
│       ├── context/     ← 인증 컨텍스트
│       └── components/  ← 공통 레이아웃
├── .devcontainer/       ← Cursor용 컨테이너 설정
├── Dockerfile.backend   ← Python 3.12 환경
├── Dockerfile.frontend  ← Node 20 환경
├── docker-compose.yml   ← 둘 한 번에 띄우기
├── requirements.txt
└── manage.py
```

---

## 🐳 Docker 없이 직접 띄우기 (선택)

Docker 안 쓰고 싶을 때 (Python 3.12 / Node 20 직접 설치 필요):

```bash
# 터미널 1: Django
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# 터미널 2: React
cd frontend
npm install
npm run dev
```

---

## 🔍 변경된 부분(공부용)

Django 풀스택 → REST API + React로 전환한 흔적이 코드에 주석으로 남아있습니다:

```bash
# 백엔드/프론트엔드의 React 전환 표시 찾기
grep -rn "React 전환" . --include="*.py" --include="*.js" --include="*.jsx"

# Docker 추가 표시 찾기
grep -rn "Docker 추가" . --include="*.py" --include="*.js" --include="*.jsx" \
  --include="Dockerfile*" --include="*.yml" --include="*.json"
```

---

## 🌐 API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/csrf/` | CSRF 토큰 발급 (첫 진입 시 1회) |
| GET | `/api/auth/me/` | 현재 로그인 상태 |
| POST | `/api/auth/register/` | 회원가입 |
| POST | `/api/auth/login/` | 로그인 |
| POST | `/api/auth/logout/` | 로그아웃 |
| GET | `/api/posts/` | 글 목록 (검색·페이지네이션) |
| GET | `/api/posts/<pk>/` | 글 상세 (+ 댓글, 이전/다음) |
| POST | `/api/posts/create/` | 글 작성 |
| POST | `/api/posts/<pk>/like/` | 좋아요 |
| POST | `/api/posts/<pk>/hate/` | 싫어요 (로그인 필요) |
| POST | `/api/posts/<pk>/comments/` | 댓글 작성 |
