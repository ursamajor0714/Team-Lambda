// =============================================================================
// middleware/csrf.js — CSRF 공격을 막는 "손목밴드(토큰)" 검사기
// -----------------------------------------------------------------------------
// 📌 CSRF가 뭐냐 (복습):
//   내가 로그인한 상태를 악용해서, 나쁜 사이트가 몰래 "내 이름으로" 요청을 보내는 공격.
//   이걸 막으려고 "진짜 우리 화면에서 보낸 요청만 받는다"는 증표(토큰)를 사용한다.
//
// 📌 동작 방식:
//   - Express엔 기본 내장이 아니라서 여기서 직접 만든다.
//   - 방식: "Double Submit Cookie" — 토큰을 (1)쿠키와 (2)요청 헤더 양쪽에 담게 하고,
//     서버는 그 둘이 같은지만 비교한다. 같으면 진짜 우리 화면에서 온 요청이다.
//
// 📌 프론트(client.js)와의 약속 (이미 그렇게 짜여 있어서 프론트 수정 불필요):
//   - 첫 진입 때 GET /api/csrf/ 를 부르면 → csrftoken 쿠키를 내려준다.
//   - POST 할 때 그 쿠키 값을 'X-CSRFToken' 헤더에 실어 보낸다.
//
// 📌 미들웨어(middleware)란?
//   요청이 최종 목적지(라우트)에 닿기 전에 거쳐가는 "검문소" 같은 함수.
//   (req, res, next) 형태이고, 통과시키려면 next()를 호출한다.
// =============================================================================

import crypto from "crypto"; // Node 기본 내장 모듈 — 안전한 랜덤 값 생성용

// ── 토큰 발급 핸들러 (GET /api/csrf/ 에서 사용) ───────────────────────
export function issueCsrfToken(req, res) {
  // 이미 쿠키에 토큰이 있으면 그대로 쓰고, 없으면 새로 만든다.
  let token = req.cookies.csrftoken;
  if (!token) {
    token = crypto.randomBytes(32).toString("hex"); // 64자리 랜덤 문자열
  }
  // 쿠키로 내려준다.
  //   httpOnly: false → React의 JS가 이 쿠키를 직접 읽어야 하므로 false.
  res.cookie("csrftoken", token, {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
  });
  res.json({ csrfToken: token });
}

// ── 검증 미들웨어 (모든 요청 전에 실행) ───────────────────────────────
export function csrfProtection(req, res, next) {
  // GET/HEAD/OPTIONS 처럼 "읽기만 하는" 요청은 데이터를 바꾸지 않으므로 검사 면제.
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next(); // 통과시킴
  }

  // 바꾸는 요청(POST 등)은 쿠키 토큰과 헤더 토큰을 비교한다.
  const cookieToken = req.cookies.csrftoken;
  const headerToken = req.headers["x-csrftoken"]; // 헤더 이름은 항상 소문자로 들어온다

  if (!cookieToken || cookieToken !== headerToken) {
    // 토큰이 없거나 서로 다르면 403 Forbidden으로 거절한다.
    return res.status(403).json({ detail: "CSRF 검증 실패" });
  }

  next(); // 둘이 같으면 통과
}
