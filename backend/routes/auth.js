// =============================================================================
// routes/auth.js — 회원가입 / 로그인 / 로그아웃 / 내 정보 / CSRF
// -----------------------------------------------------------------------------
// 📌 이 파일이 하는 일:
//   Express "라우터(Router)"에 인증 관련 주소별 처리 함수를 등록한다.
//
// 📌 JS 문법 메모:
//   - express.Router() : 주소 묶음을 만드는 도구. server.js에서 '/api'에 연결된다.
//   - router.post('/auth/login/', (req, res) => { ... }) :
//       "POST 방식으로 /api/auth/login/ 이 들어오면 이 함수를 실행해라" 라는 뜻.
//   - req = 요청(들어온 것),  res = 응답(돌려줄 것)
//   - (req, res) => { ... } 는 "화살표 함수".
// =============================================================================

import express from "express";
import bcrypt from "bcryptjs"; // 비밀번호 암호화/비교 라이브러리
import db from "../db.js"; // 우리가 만든 DB 연결
import { issueCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

// ── CSRF 토큰 발급 (GET /api/csrf/) ──────────────────────────────────
//    React가 첫 진입 때 1회 호출한다.
router.get("/csrf/", issueCsrfToken);

// ── 회원가입 (POST /api/auth/register/) ──────────────────────────────
router.post("/auth/register/", (req, res) => {
  // req.body 에 React가 보낸 JSON이 들어있다 (server.js의 express.json() 덕분).
  const username = (req.body.username || "").trim(); // trim(): 앞뒤 공백 제거
  const password1 = req.body.password1 || "";
  const password2 = req.body.password2 || "";

  // 입력값 검증
  if (username.length > 13) {
    return res
      .status(400)
      .json({ detail: "아이디는 13자리 이하로 입력해주세요." });
  }
  // /^[A-Za-z0-9]+$/ 는 "영문 대소문자와 숫자만"을 뜻하는 정규식. .test()는 맞으면 true.
  if (!/^[A-Za-z0-9]+$/.test(username)) {
    return res
      .status(400)
      .json({ detail: "아이디는 영어 대소문자와 숫자만 가능합니다." });
  }
  if (password1 !== password2) {
    return res.status(400).json({ detail: "비밀번호가 일치하지 않습니다." });
  }

  // 아이디 중복 확인 — SQL로 직접 조회. '?' 자리에 username이 안전하게 들어간다.
  const exists = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (exists) {
    return res.status(400).json({ detail: "이미 사용중인 아이디입니다." });
  }

  // 비밀번호 암호화 후 저장 (절대 평문으로 저장하면 안 됨!).
  //   bcrypt.hashSync(원본, 강도) → 뒤섞인 문자열을 만든다. 10은 암호화 강도.
  const hashed = bcrypt.hashSync(password1, 10);
  const result = db
    .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run(username, hashed);

  // 가입 후 자동 로그인 — 세션에 사용자 정보를 저장한다.
  req.session.userId = result.lastInsertRowid; // 방금 INSERT된 행의 id
  req.session.username = username;

  res.status(201).json({ username }); // 201 = "새로 만들어짐"
});

// ── 로그인 (POST /api/auth/login/) ───────────────────────────────────
router.post("/auth/login/", (req, res) => {
  const { username, password } = req.body; // 구조분해: req.body.username, req.body.password를 한 번에 꺼냄
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  // 사용자가 없거나, 비번이 안 맞으면 거절.
  //   bcrypt.compareSync(입력비번, 저장된암호화비번) → 맞으면 true.
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res
      .status(400)
      .json({ detail: "아이디 또는 비밀번호가 올바르지 않습니다." });
  }

  // 정지 기간이 안 끝났으면 로그인 거부 (banned_until이 지금보다 미래면 정지중)
  const banned = db
    .prepare(
      "SELECT banned_until FROM users WHERE id = ? AND banned_until > datetime('now','localtime')",
    )
    .get(user.id);
  if (banned) {
    return res
      .status(403)
      .json({ detail: `정지된 계정입니다. (${banned.banned_until}까지)` });
  }

  // 세션에 저장 → 로그인 상태가 유지된다.
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ username: user.username });
});

// ── 로그아웃 (POST /api/auth/logout/) ────────────────────────────────
router.post("/auth/logout/", (req, res) => {
  req.session.destroy(() => {}); // 세션을 통째로 삭제 → 로그인 풀림
  res.json({ detail: "로그아웃 되었습니다." });
});

// ── 내 정보 (GET /api/auth/me/) ──────────────────────────────────────
//    React가 새로고침될 때마다 "나 로그인 돼 있어?" 하고 물어보는 곳.
router.get("/auth/me/", (req, res) => {
  if (req.session.userId) {
    // 관리자 여부도 같이 내려줘서, 프론트가 관리자 메뉴를 보여줄지 결정할 수 있게 한다.
    const u = db
      .prepare("SELECT is_admin, is_super FROM users WHERE id = ?")
      .get(req.session.userId);
    return res.json({
      username: req.session.username,
      is_authenticated: true,
      is_admin: !!(u && u.is_admin),
      is_super: !!(u && u.is_super),
    });
  }
  res.json({ is_authenticated: false });
});

// ── 비밀번호 변경 (POST /api/auth/change-password/)
router.post("/auth/change-password/", (req, res) => {
  if (!req.session.userId) {
    return res.status(403).json({ detail: "로그인이 필요합니다." });
  }
  const { current_password, new_password, new_password2 } = req.body;
  if (new_password !== new_password2) {
    return res.status(400).json({ detail: "새 비밀번호가 일치하지 않습니다." });
  }
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res
      .status(400)
      .json({ detail: "현재 비밀번호가 올바르지 않습니다." });
  }
  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
    hashed,
    req.session.userId,
  );
  res.json({ detail: "비밀번호가 변경되었습니다." });
});

export default router;
