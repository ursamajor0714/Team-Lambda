# Lambda 백엔드 (Node.js + Express)

> **[Node 전환]** 기존 Django 백엔드를 Node.js로 갈아끼운 버전입니다.
> 공부용으로, 기존 Django 파일(`../myapp`, `../config`)은 지우지 않고 비교용으로 남겨뒀습니다.

## 🛠 기술 스택 (Django와 1:1 비교)

| 역할 | Django (이전) | Node (현재) |
|---|---|---|
| 웹 서버 | Django | **Express** |
| DB 접근 | ORM (`Post.objects...`) | **better-sqlite3** (직접 SQL) |
| 로그인 세션 | SessionMiddleware | **express-session** |
| 비밀번호 암호화 | PBKDF2 | **bcryptjs** |
| CSRF 보호 | CsrfViewMiddleware | **직접 구현** (`middleware/csrf.js`) |

## 📁 폴더 구조

```
backend/
├── server.js          ← 시작점 (Django: manage.py + settings.py + urls.py)
├── db.js              ← DB 연결 (Django: settings DATABASES + models.py)
├── middleware/
│   └── csrf.js        ← CSRF 검사 (Django: CsrfViewMiddleware)
└── routes/
    ├── auth.js        ← 회원가입/로그인/로그아웃/내정보 (Django: views 인증 부분)
    └── posts.js       ← 글/댓글 (Django: views 글 부분 + serializers)
```

## 🚀 실행 방법

### Docker로 (루트에서, 권장)
```bash
docker compose up
```

### 직접 실행
```bash
cd backend
npm install
npm run dev      # 8000번 포트에서 실행
```

다 뜨면:
- 백엔드 API: <http://localhost:8000/api/posts/>
- 프론트엔드: <http://localhost:5173>

## ⚠️ 회원 데이터 안내 (중요)

기존 Django 회원(`auth_user` 테이블)은 비밀번호 암호화 방식(PBKDF2)이 달라서
Node에서 그대로 로그인할 수 없습니다.

- **글/댓글 데이터는 그대로 유지**됩니다 (`myapp_post`, `myapp_comment`).
- **회원은 새로 가입**해야 합니다 → Node가 만든 새 `users` 테이블 + bcrypt 방식으로 저장됩니다.

## 🌐 API 엔드포인트 (Django 때와 동일하게 유지)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/csrf/` | CSRF 토큰 발급 |
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
