// =============================================================================
// routes/posts.js — 글 목록 / 상세 / 작성 / 좋아요 / 싫어요 / 댓글
// -----------------------------------------------------------------------------
// 📌 이 파일이 하는 일:
//   글/댓글 관련 API들을 모았다. SQL로 직접 조회하고, 응답 모양(JSON)도 직접 만든다.
//
// 📌 better-sqlite3 사용법 복습:
//   db.prepare(SQL).get(...)  → 한 줄 가져오기
//   db.prepare(SQL).all(...)  → 여러 줄 가져오기 (배열)
//   db.prepare(SQL).run(...)  → INSERT/UPDATE 처럼 바꾸기
//   SQL 안의 '?' 는 값이 들어갈 자리 → SQL 인젝션 공격을 막는 안전한 방법이다.
// =============================================================================

import express from "express";
import db from "../db.js";

const router = express.Router();

// ── 글 목록 (GET /api/posts/) ────────────────────────────────────────
router.get("/posts/", (req, res) => {
  const PAGE_SIZE = parseInt(req.query.page_size || "20", 10);
  // 쿼리스트링(?query=...&page=...) 값 꺼내기
  const query = req.query.query || "";
  const searchType = req.query.search_type || "title";
  const searchPeriod = req.query.search_period || "all";
  const tag = decodeURIComponent(req.query.tag || "");
  const page = parseInt(req.query.page || "1", 10); // 문자열 "1" → 숫자 1

  // WHERE 조건을 검색어/기간에 따라 동적으로 조립한다.
  //   where: 조건문 조각들,  params: '?'에 들어갈 실제 값들
  const where = [];
  const params = [];

  if (tag) {
    where.push("tag = ?");
    params.push(tag);
  }

  if (query) {
    // LIKE '%단어%' 는 "그 단어가 포함된" 검색
    if (searchType === "title") {
      where.push("title LIKE ?");
      params.push(`%${query}%`);
    } else if (searchType === "content") {
      where.push("content LIKE ?");
      params.push(`%${query}%`);
    } else if (searchType === "title_content") {
      where.push("(title LIKE ? OR content LIKE ?)");
      params.push(`%${query}%`, `%${query}%`);
    } else if (searchType === "user") {
      where.push("user LIKE ?");
      params.push(`%${query}%`);
    }
  }

  // 기간 필터 — 오늘 / 최근 7일 / 최근 30일.
  //   DATE('now','localtime') 은 SQLite에서 "오늘 날짜"를 구하는 방법.
  if (searchPeriod === "today") {
    where.push("DATE(date) = DATE('now','localtime')");
  } else if (searchPeriod === "week") {
    where.push("DATE(date) >= DATE('now','localtime','-7 day')");
  } else if (searchPeriod === "month") {
    where.push("DATE(date) >= DATE('now','localtime','-30 day')");
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  // 전체 개수 (페이지네이션 계산용)
  const total = db
    .prepare(`SELECT COUNT(*) AS cnt FROM myapp_post ${whereSql}`)
    .get(...params).cnt;

  // 실제 목록 — 댓글 수(comment_count)를 서브쿼리로 같이 구한다.
  //   ORDER BY id DESC → 최신글이 위로.  LIMIT/OFFSET → 페이지 나누기.
  const offset = (page - 1) * PAGE_SIZE;
  const posts = db
    .prepare(
      `
    SELECT p.id, p.title, p.user, p.date, p.views, p.likes, p.hates,
           (SELECT COUNT(*) FROM myapp_comment c WHERE c.post_id = p.id) AS comment_count
    FROM myapp_post p
    ${whereSql}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, PAGE_SIZE, offset);

  // 상단 통계 — 홈 화면에 내려주는 값들.
  const todayPosts = db
    .prepare(
      "SELECT COUNT(*) AS c FROM myapp_post WHERE DATE(date)=DATE('now','localtime')",
    )
    .get().c;
  const todayComments = db
    .prepare(
      "SELECT COUNT(*) AS c FROM myapp_comment WHERE DATE(date)=DATE('now','localtime')",
    )
    .get().c;
  const todayVisitors = db
    .prepare(
      "SELECT COUNT(*) AS c FROM myapp_visitor WHERE date=DATE('now','localtime')",
    )
    .get().c;

  // 방문자 기록 — 오늘 이 IP가 처음이면 기록한다.
  if (!req.session.visited) {
    req.session.visited = true;
    db.prepare(
      "INSERT INTO myapp_visitor (ip, date) VALUES (?, DATE('now','localtime'))",
    ).run(req.sessionID);
  }
  // 응답 모양은 프론트가 기대하는 형태와 똑같이 맞춰야 화면이 동작한다.
  res.json({
    posts,
    page,
    page_size: PAGE_SIZE,
    total,
    has_next: offset + PAGE_SIZE < total,
    today_posts: todayPosts,
    today_comments: todayComments,
    today_visitors: todayVisitors,
  });
});

// ── 글 상세 (GET /api/posts/:pk/) ────────────────────────────────────
//    ':pk' 는 주소의 변할 수 있는 부분 → req.params.pk 로 꺼낸다.
router.get("/posts/:pk/", (req, res) => {
  const pk = req.params.pk;
  const post = db.prepare("SELECT * FROM myapp_post WHERE id = ?").get(pk);
  if (!post) {
    return res.status(404).json({ detail: "존재하지 않는 글입니다." });
  }

  // 조회수 중복 방지
  const viewKey = `viewed_${pk}`;
  if (!req.session[viewKey]) {
    db.prepare("UPDATE myapp_post SET views = views + 1 WHERE id = ?").run(pk);
    req.session[viewKey] = true;
  }
  const comments = db
    .prepare(
      `
    SELECT c.id, c.post_id AS post, c.content, c.user, c.date, c.parent_id,
      (SELECT COUNT(*) FROM myapp_comment_like WHERE comment_id = c.id AND type = 'like') AS likes,
      (SELECT COUNT(*) FROM myapp_comment_like WHERE comment_id = c.id AND type = 'hate') AS hates
    FROM myapp_comment c
    WHERE c.post_id = ? AND (c.parent_id IS NULL OR c.parent_id = 0)
    ORDER BY c.id
  `,
    )
    .all(pk);

  const replies = db
    .prepare(
      `
    SELECT c.id, c.post_id AS post, c.content, c.user, c.date, c.parent_id,
      (SELECT COUNT(*) FROM myapp_comment_like WHERE comment_id = c.id AND type = 'like') AS likes,
      (SELECT COUNT(*) FROM myapp_comment_like WHERE comment_id = c.id AND type = 'hate') AS hates
    FROM myapp_comment c
    WHERE c.post_id = ? AND c.parent_id IS NOT NULL AND c.parent_id != 0
    ORDER BY c.id
  `,
    )
    .all(pk);

  const commentsWithReplies = comments.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parent_id === c.id),
  }));

  const prev = db
    .prepare(
      "SELECT id, title FROM myapp_post WHERE id < ? ORDER BY id DESC LIMIT 1",
    )
    .get(pk);
  const next = db
    .prepare(
      "SELECT id, title FROM myapp_post WHERE id > ? ORDER BY id ASC LIMIT 1",
    )
    .get(pk);

  res.json({
    ...post,
    comments: commentsWithReplies, // ← comments로 키 이름 맞추기
    prev_post: prev || null,
    next_post: next || null,
  });
});

// ── 글 작성 (POST /api/posts/create/) ────────────────────────────────
router.post("/posts/create/", (req, res) => {
  const { title, content, tag } = req.body;
  if (!title || !content) {
    return res.status(400).json({ detail: "제목과 내용을 모두 입력해주세요." });
  }
  const user = req.session.username || "익명";
  const result = db
    .prepare(
      "INSERT INTO myapp_post (title, content, user, date, views, likes, hates, tag) VALUES (?, ?, ?, datetime('now','localtime'), 0, 0, 0, ?)",
    )
    .run(title, content, user, tag || "#기타");
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── 좋아요 (POST /api/posts/:pk/like/) ───────────────────────────────
router.post("/posts/:pk/like/", (req, res) => {
  const pk = req.params.pk;
  const post = db.prepare("SELECT * FROM myapp_post WHERE id = ?").get(pk);
  if (!post) return res.status(404).json({ detail: "존재하지 않는 글입니다." });

  // 세션으로 중복 방지 — 한 번 누른 사람은 또 못 누른다.
  const key = `liked_${pk}`;
  if (!req.session[key]) {
    db.prepare("UPDATE myapp_post SET likes = likes + 1 WHERE id = ?").run(pk);
    req.session[key] = true;
    post.likes += 1; // 화면에 즉시 반영할 수 있게 응답값도 올려준다
  }
  res.json({ likes: post.likes });
});

// ── 싫어요 (POST /api/posts/:pk/hate/) — 로그인 필요 ──────────────────
router.post("/posts/:pk/hate/", (req, res) => {
  // 로그인 안 했으면 거절한다.
  if (!req.session.userId) {
    return res.status(403).json({ detail: "로그인이 필요합니다." });
  }
  const pk = req.params.pk;
  const post = db.prepare("SELECT * FROM myapp_post WHERE id = ?").get(pk);
  if (!post) return res.status(404).json({ detail: "존재하지 않는 글입니다." });

  const key = `hated_${pk}`;
  if (!req.session[key]) {
    db.prepare("UPDATE myapp_post SET hates = hates + 1 WHERE id = ?").run(pk);
    req.session[key] = true;
    post.hates += 1;
  }
  res.json({ hates: post.hates });
});

// ── 댓글 작성 (POST /api/posts/:pk/comments/) ────────────────────────
router.post("/posts/:pk/comments/", (req, res) => {
  const pk = req.params.pk;
  const post = db.prepare("SELECT id FROM myapp_post WHERE id = ?").get(pk);
  if (!post) return res.status(404).json({ detail: "존재하지 않는 글입니다." });

  const { content, parent_id } = req.body;
  if (!content) {
    return res.status(400).json({ detail: "댓글 내용을 입력해주세요." });
  }
  const user = req.session.username || "익명";
  const result = db
    .prepare(
      "INSERT INTO myapp_comment (content, user, date, post_id, parent_id) VALUES (?, ?, datetime('now','localtime'), ?, ?)",
    )
    .run(content, user, pk, parent_id || null);

  // 프론트가 기대하는 댓글 모양으로 응답한다.
  const created = db
    .prepare("SELECT date FROM myapp_comment WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json({
    id: result.lastInsertRowid,
    post: Number(pk), // 문자열 pk를 숫자로 변환
    content,
    user,
    date: created.date,
  });
});

// ── 글 삭제 (DELETE /api/posts/:pk/) ─────────────────────────────────
router.delete("/posts/:pk/", (req, res) => {
  if (!req.session.userId) {
    return res.status(403).json({ detail: "로그인이 필요합니다." });
  }
  const pk = req.params.pk;
  const post = db.prepare("SELECT * FROM myapp_post WHERE id = ?").get(pk);
  if (!post) return res.status(404).json({ detail: "존재하지 않는 글입니다." });
  if (post.user !== req.session.username) {
    return res.status(403).json({ detail: "본인 글만 삭제할 수 있습니다." });
  }

  db.prepare("DELETE FROM myapp_comment WHERE post_id = ?").run(pk);
  db.prepare("DELETE FROM myapp_post WHERE id = ?").run(pk);
  res.json({ detail: "삭제되었습니다." });
});

// ── 글 수정 (PUT /api/posts/:pk/) ────────────────────────────────────
router.put("/posts/:pk/", (req, res) => {
  if (!req.session.userId) {
    return res.status(403).json({ detail: "로그인이 필요합니다." });
  }
  const pk = req.params.pk;
  const post = db.prepare("SELECT * FROM myapp_post WHERE id = ?").get(pk);
  if (!post) return res.status(404).json({ detail: "존재하지 않는 글입니다." });
  if (post.user !== req.session.username) {
    return res.status(403).json({ detail: "본인 글만 수정할 수 있습니다." });
  }

  const { title, content, tag } = req.body;
  if (!title || !content) {
    return res.status(400).json({ detail: "제목과 내용을 모두 입력해주세요." });
  }

  db.prepare(
    "UPDATE myapp_post SET title = ?, content = ?, tag = ? WHERE id = ?",
  ).run(title, content, tag || "#기타", pk);
  res.json({ detail: "수정되었습니다." });
});

// ── 댓글 추천/반대 (POST /api/posts/:pk/comments/:cid/like/)
router.post("/posts/:pk/comments/:cid/like/", (req, res) => {
  const { cid } = req.params;
  const { type } = req.body; // 'like' or 'hate'
  const sessionId = req.sessionID;

  const existing = db
    .prepare(
      "SELECT * FROM myapp_comment_like WHERE comment_id = ? AND session_id = ?",
    )
    .get(cid, sessionId);

  if (existing) {
    if (existing.type === type) {
      // 같은 버튼 다시 누르면 취소
      db.prepare("DELETE FROM myapp_comment_like WHERE id = ?").run(
        existing.id,
      );
    } else {
      // 다른 버튼 누르면 변경
      db.prepare("UPDATE myapp_comment_like SET type = ? WHERE id = ?").run(
        type,
        existing.id,
      );
    }
  } else {
    db.prepare(
      "INSERT INTO myapp_comment_like (comment_id, session_id, type) VALUES (?, ?, ?)",
    ).run(cid, sessionId, type);
  }

  const likes = db
    .prepare(
      "SELECT COUNT(*) AS c FROM myapp_comment_like WHERE comment_id = ? AND type = 'like'",
    )
    .get(cid).c;
  const hates = db
    .prepare(
      "SELECT COUNT(*) AS c FROM myapp_comment_like WHERE comment_id = ? AND type = 'hate'",
    )
    .get(cid).c;

  res.json({ likes, hates });
});

export default router;
