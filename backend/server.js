// =============================================================================
// [Node 전환] server.js — Node.js 백엔드의 "시작점(entry point)"
// -----------------------------------------------------------------------------
// 📌 이 파일이 하는 일 (Django와 비교):
//   Django에서는 manage.py + config/settings.py + config/urls.py 세 파일이
//   나눠서 하던 일을, Express에서는 보통 이 server.js 한 곳에서 시작한다.
//   "① 서버를 켜고 → ② 공통 설정(미들웨어)을 끼우고 → ③ 주소(라우트)를 연결"하는 곳.
//
// 📌 JS 문법 메모:
//   - import X from '...'  : 다른 파일/패키지를 가져오는 문법 (Python의 import와 비슷).
//   - package.json에 "type": "module"이 있어서 이 import/export 문법을 쓸 수 있다.
//   - app.use(...) : "모든 요청이 거쳐갈 공통 처리(미들웨어)"를 끼우는 명령.
// =============================================================================

import express from "express"; // 웹 서버 프레임워크 (Django 자리)
import session from "express-session"; // 세션(로그인 유지) 기능
import cookieParser from "cookie-parser"; // 쿠키 읽기 도구 (CSRF에 필요)
import cors from "cors"; // 다른 주소(React)에서 오는 요청 허용

import { csrfProtection } from "./middleware/csrf.js";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";

// express()를 호출하면 "앱(서버)" 하나가 만들어진다.
const app = express();

// -----------------------------------------------------------------------------
// 1) CORS — React(5173)와 백엔드(8000)는 주소가 달라서 허용 설정이 필요하다.
//    Django settings.py의 CORS_ALLOWED_ORIGINS / CORS_ALLOW_CREDENTIALS 와 같은 역할.
// -----------------------------------------------------------------------------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // 이 주소들의 요청만 허용
    credentials: true, // 쿠키(세션, CSRF)를 주고받으려면 반드시 true
  }),
);

// -----------------------------------------------------------------------------
// 2) JSON 본문 파싱 — React가 보낸 JSON을 자동으로 읽어 req.body에 담아준다.
//    Django REST의 request.data 와 같은 역할. 이게 있어야 req.body.title 등을 꺼낼 수 있다.
// -----------------------------------------------------------------------------
app.use(express.json());

// 3) 쿠키 파싱 — req.cookies로 쿠키를 읽게 해준다 (CSRF 토큰 비교에 사용).
app.use(cookieParser());

// -----------------------------------------------------------------------------
// 4) 세션 — 로그인 상태를 서버가 기억하게 해준다.
//    Django의 SessionMiddleware + django_session 테이블 역할.
//    로그인하면 req.session에 정보를 넣고, 브라우저엔 세션 쿠키가 자동으로 저장된다.
// -----------------------------------------------------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production", // 세션 서명용 비밀키 (Django SECRET_KEY 역할)
    resave: false, // 변경 없으면 다시 저장 안 함 (권장값)
    saveUninitialized: false, // 빈 세션은 저장 안 함 (권장값)
    cookie: {
      httpOnly: true, // JS에서 세션 쿠키를 못 읽게 막음 (보안)
      sameSite: "lax", // 다른 주소 요청에도 쿠키 허용 (Django SESSION_COOKIE_SAMESITE='Lax'와 동일)
      secure: false, // https에서만 보낼지 여부. 지금은 개발(http)이라 false
    },
  }),
);
// ⚠️ 참고: 지금은 세션을 "서버 메모리"에 저장해서, 서버를 재시작하면 로그인이 풀린다.
//    실제 서비스에선 connect-sqlite3 같은 걸로 DB에 저장한다. (공부용이라 기본값 사용)

// -----------------------------------------------------------------------------
// 5) CSRF 검증 — POST 같은 "바꾸는 요청"에 손목밴드(토큰)를 검사한다.
//    Django의 CsrfViewMiddleware 역할. (자세한 동작은 middleware/csrf.js 참고)
// -----------------------------------------------------------------------------
app.use(csrfProtection);

// -----------------------------------------------------------------------------
// 6) 라우트(주소) 연결 — Django의 urls.py 역할.
//    '/api'로 시작하는 주소를 각 라우터 파일로 넘긴다.
//    (세부 주소 '/auth/login/', '/posts/' 등은 각 라우터 파일 안에서 처리)
// -----------------------------------------------------------------------------
app.use("/api", authRoutes);
app.use("/api", postRoutes);

// -----------------------------------------------------------------------------
// 7) 서버 켜기 — 8000번 포트에서 요청을 기다린다.
//    Django의 `runserver 0.0.0.0:8000` 과 같다. 0.0.0.0이라야 컨테이너 밖에서도 접속 가능.
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Node 백엔드 실행 중 → http://localhost:${PORT}`);
});
