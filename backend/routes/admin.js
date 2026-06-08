// =============================================================================
// routes/admin.js — 관리자 전용 유저 관리 API
// -----------------------------------------------------------------------------
// 📌 이 파일이 하는 일:
//   유저 목록 조회, 아이디 변경, 비밀번호 초기화, 정지/해제, 계정 삭제,
//   관리자 권한 부여/회수 같은 "관리자만 할 수 있는" 기능들을 모았다.
//
// 📌 보안 핵심:
//   맨 아래 router.use("/admin", requireAdmin) 한 줄로
//   이 파일의 모든 /admin 주소는 "관리자만" 통과하게 막혀 있다.
//   (프론트에서 메뉴를 숨기는 것과 별개로, 백엔드에서 반드시 검사해야 안전하다)
// =============================================================================

import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { requireAdmin, requireSuper } from "../middleware/auth.js";

const router = express.Router();

// 이 파일의 모든 /admin 주소는 관리자만 접근 가능 (문지기를 앞에 세움)
router.use("/admin", requireAdmin);

// ── 유저 목록 (GET /api/admin/users/) ────────────────────────────────
router.get("/admin/users/", (req, res) => {
  const users = db
    .prepare(
      `SELECT id, username, is_admin, is_super, banned_until,
        (banned_until IS NOT NULL AND banned_until > datetime('now','localtime')) AS is_banned
       FROM users
       ORDER BY is_super DESC, id`,
    )
    .all();
  res.json({ users });
});

// ── 1. 아이디 강제 변경 (POST /api/admin/users/:id/username/) ─────────
router.post("/admin/users/:id/username/", (req, res) => {
  const id = req.params.id;
  const newName = (req.body.username || "").trim();

  if (!/^[A-Za-z0-9]+$/.test(newName) || newName.length > 13) {
    return res
      .status(400)
      .json({ detail: "아이디는 영문/숫자 13자 이하만 가능합니다." });
  }

  // 다른 사람이 이미 쓰는 아이디인지 확인 (자기 자신은 제외)
  const dup = db
    .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
    .get(newName, id);
  if (dup)
    return res.status(400).json({ detail: "이미 사용중인 아이디입니다." });

  // ⚠️ 게시글/댓글은 작성자를 username '문자열'로 저장한다.
  //    아이디를 바꾸면 옛날 글/댓글의 작성자 이름도 같이 바꿔줘야 한다.
  const old = db
    .prepare("SELECT username, is_super FROM users WHERE id = ?")
    .get(id);
  if (!old)
    return res.status(404).json({ detail: "존재하지 않는 유저입니다." });
  // 최고 관리자(오너)의 아이디는 본인 외에는 바꿀 수 없다.
  if (old.is_super && Number(id) !== req.session.userId) {
    return res
      .status(400)
      .json({ detail: "최고 관리자의 아이디는 변경할 수 없습니다." });
  }

  db.prepare("UPDATE users SET username = ? WHERE id = ?").run(newName, id);
  db.prepare("UPDATE myapp_post SET user = ? WHERE user = ?").run(
    newName,
    old.username,
  );
  db.prepare("UPDATE myapp_comment SET user = ? WHERE user = ?").run(
    newName,
    old.username,
  );

  res.json({ detail: "아이디가 변경되었습니다.", username: newName });
});

// ── 2. 비밀번호 초기화 (POST /api/admin/users/:id/reset-password/) ────
router.post("/admin/users/:id/reset-password/", (req, res) => {
  // 최고 관리자(오너)의 비번은 본인 외에는 초기화할 수 없다(계정 탈취 방지).
  const target = db
    .prepare("SELECT is_super FROM users WHERE id = ?")
    .get(req.params.id);
  if (
    target &&
    target.is_super &&
    Number(req.params.id) !== req.session.userId
  ) {
    return res
      .status(400)
      .json({ detail: "최고 관리자의 비밀번호는 변경할 수 없습니다." });
  }
  const newPw = req.body.new_password || "0000"; // 기본 초기화 비번 (정책에 맞게)
  const hashed = bcrypt.hashSync(newPw, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
    hashed,
    req.params.id,
  );
  res.json({ detail: `비밀번호가 '${newPw}'(으)로 초기화되었습니다.` });
});

// ── 5-a. 계정 정지 (POST /api/admin/users/:id/ban/) ──────────────────
router.post("/admin/users/:id/ban/", (req, res) => {
  const days = parseInt(req.body.days, 10);
  if (![1, 3, 7, 15, 30].includes(days)) {
    return res
      .status(400)
      .json({ detail: "정지 기간은 1·3·7·15·30일만 가능합니다." });
  }
  // 최고 관리자(오너)는 정지시킬 수 없다.
  const target = db
    .prepare("SELECT is_super FROM users WHERE id = ?")
    .get(req.params.id);
  if (target && target.is_super) {
    return res
      .status(400)
      .json({ detail: "최고 관리자는 정지할 수 없습니다." });
  }
  // datetime('now','localtime','+7 day') 처럼 "지금부터 N일 뒤"를 만료시각으로 저장
  db.prepare(
    "UPDATE users SET banned_until = datetime('now','localtime', ?) WHERE id = ?",
  ).run(`+${days} day`, req.params.id);
  res.json({ detail: `${days}일 정지되었습니다.` });
});

// ── 5-b. 정지 해제 (POST /api/admin/users/:id/unban/) ────────────────
router.post("/admin/users/:id/unban/", (req, res) => {
  db.prepare("UPDATE users SET banned_until = NULL WHERE id = ?").run(
    req.params.id,
  );
  res.json({ detail: "정지가 해제되었습니다." });
});

// ── 6. 계정 삭제 (DELETE /api/admin/users/:id/) ──────────────────────
router.delete("/admin/users/:id/", (req, res) => {
  // 실수로 자기 자신을 지우는 것은 막는다.
  if (Number(req.params.id) === req.session.userId) {
    return res.status(400).json({ detail: "자기 자신은 삭제할 수 없습니다." });
  }
  // 최고 관리자(오너)는 누구도 삭제할 수 없다.
  const target = db
    .prepare("SELECT is_super FROM users WHERE id = ?")
    .get(req.params.id);
  if (target && target.is_super) {
    return res
      .status(400)
      .json({ detail: "최고 관리자는 삭제할 수 없습니다." });
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ detail: "계정이 삭제되었습니다." });
});

// ── 7. 권한 부여/회수 = 관리자로 만들기/해제 (POST .../role/) ─────────
//    ⭐ requireSuper: 이 작업은 오직 최고 관리자(오너)만 할 수 있다.
//       일반 관리자는 여기에 아예 접근하지 못한다(403).
router.post("/admin/users/:id/role/", requireSuper, (req, res) => {
  const makeAdmin = req.body.is_admin ? 1 : 0;

  // 최고 관리자(오너)의 권한은 아무도 변경할 수 없다(오너 본인 포함).
  const target = db
    .prepare("SELECT is_super FROM users WHERE id = ?")
    .get(req.params.id);
  if (target && target.is_super) {
    return res
      .status(400)
      .json({ detail: "최고 관리자의 권한은 변경할 수 없습니다." });
  }

  db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(
    makeAdmin,
    req.params.id,
  );
  res.json({
    detail: makeAdmin
      ? "관리자로 지정했습니다."
      : "관리자 권한을 해제했습니다.",
  });
});


// ── 삭제된 글 목록 (GET /api/admin/deleted-posts/) ───────────────────
router.get("/admin/deleted-posts/", (req, res) => {
  const posts = db
    .prepare(`
      SELECT id, title, user, date
      FROM myapp_post
      WHERE is_deleted = 1
      ORDER BY id DESC
    `)
    .all();
  res.json({ posts });
});

// ── 삭제된 글 완전 삭제 (DELETE /api/admin/deleted-posts/:id/) ────────
router.delete("/admin/deleted-posts/:id/", (req, res) => {
  db.prepare("DELETE FROM myapp_comment WHERE post_id = ?").run(req.params.id);
  db.prepare("DELETE FROM myapp_post WHERE id = ?").run(req.params.id);
  res.json({ detail: "완전 삭제되었습니다." });
});

// ── 삭제된 글 복구 (POST /api/admin/deleted-posts/:id/restore/) ───────
router.post("/admin/deleted-posts/:id/restore/", (req, res) => {
  db.prepare("UPDATE myapp_post SET is_deleted = 0 WHERE id = ?").run(req.params.id);
  res.json({ detail: "복구되었습니다." });
});

export default router;
