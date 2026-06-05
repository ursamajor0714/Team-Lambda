# Lambda 백엔드 (Node.js + Express)

> 익명 게시판의 백엔드입니다. Node.js(Express) + SQLite로 동작합니다.

## 🛠 기술 스택

| 역할 | 사용 기술 |
|---|---|
| 웹 서버 | **Express** |
| DB 접근 | **better-sqlite3** (직접 SQL) |
| 로그인 세션 | **express-session** |
| 비밀번호 암호화 | **bcryptjs** |
| CSRF 보호 | **직접 구현** (`middleware/csrf.js`) |

## 📁 폴더 구조

```
backend/
├── server.js          ← 시작점 (서버/미들웨어/라우트 연결)
├── db.js              ← DB 연결 + 테이블 생성
├── middleware/
│   └── csrf.js        ← CSRF 검사
└── routes/
    ├── auth.js        ← 회원가입/로그인/로그아웃/내정보
    └── posts.js       ← 글/댓글
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

> 참고: `better-sqlite3`는 네이티브 모듈이라, 직접 설치 시 OS에 빌드 도구
> (Windows는 Visual Studio C++ Build Tools)가 필요할 수 있습니다. 그래서 Docker 방식을 권장합니다.

다 뜨면:
- 백엔드 API: <http://localhost:8000/api/posts/>
- 프론트엔드: <http://localhost:5173>

## ℹ️ DB 안내

- 첫 실행 시 `db.js`가 필요한 테이블(`users`, `myapp_post`, `myapp_comment`, `myapp_visitor`, `myapp_comment_like`)을 자동으로 생성합니다.
- DB 파일은 프로젝트 루트의 `db.sqlite3`입니다. 초기화하려면 이 파일을 지우고 다시 실행하면 됩니다.

## 🌐 API 엔드포인트

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
