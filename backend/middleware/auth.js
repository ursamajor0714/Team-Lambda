// =============================================================================
// middleware/auth.js — 권한 검사용 "문지기(미들웨어)"
// -----------------------------------------------------------------------------
// 📌 이 파일이 하는 일:
//   "이 요청을 보낸 사람이 관리자 맞아?"를 검사하는 함수를 모아둔다.
//   여러 관리자 API에서 똑같이 갖다 쓰려고 따로 빼두는 것이다(재사용).
//
// 📌 미들웨어란?
//   요청(req)이 실제 처리에 도달하기 전에 거쳐가는 "중간 검문소".
//   통과시키려면 next()를 부르고, 막으려면 res로 응답을 돌려보낸다.
// =============================================================================

import db from "../db.js";

// 관리자만 통과시키는 문지기. 관리자 라우트 앞에 끼운다.
export function requireAdmin(req, res, next) {
  // 1) 로그인부터 안 했으면 거절
  if (!req.session.userId) {
    return res.status(403).json({ detail: "로그인이 필요합니다." });
  }
  // 2) DB에서 이 사람의 is_admin 값을 확인
  const me = db
    .prepare("SELECT is_admin FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!me || !me.is_admin) {
    return res.status(403).json({ detail: "관리자 권한이 필요합니다." });
  }
  // 3) 통과 → 다음(실제 처리)으로 넘긴다
  next();
}

// 최고 관리자(오너)만 통과시키는 문지기. "권한 주고 뺏기" 같은 최상위 작업에 쓴다.
export function requireSuper(req, res, next) {
  if (!req.session.userId) {
    return res.status(403).json({ detail: "로그인이 필요합니다." });
  }
  const me = db
    .prepare("SELECT is_super FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!me || !me.is_super) {
    return res.status(403).json({ detail: "최고 관리자만 가능합니다." });
  }
  next();
}
