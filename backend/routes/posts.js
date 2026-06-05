import express from "express";
import db from "../db.js";

const router = express.Router();

// ── 글 목록 (GET /api/posts/) ────────────────────────────────────────
router.get("/posts/", (req, res) => {
  const PAGE_SIZE = parseInt(req.query.page_size || "20", 10);
  const query = req.query.query || "";
  const searchType = req.query.search_type || "title";
  const searchPeriod = req.query.search_period || "all";
  const tag = decodeURIComponent(req.query.tag || "");
  const page = parseInt(req.query.page || "1", 10);

  const where = [];
  const params = [];

  if (tag) {
    where.push("p.tag = ?");
    params.push(tag);
  }

  if (query) {
    if (searchType === "title") {
      where.push("p.title LIKE ?");
      params.push(`%${query}%`);
    } else if (searchType === "content") {
      where.push("p.content LIKE ?");
      params.push(`%${query}%`);
    } else if (searchType === "title_content") {
      where.push("(p.title LIKE ? OR p.content LIKE ?)");
      params.push(`%${query}%`, `%${query}%`);
    } else if (searchType === "user") {
      where.push("p.user LIKE ?");
      params.push(`%${query}%`);
    }
  }

  if (searchPeriod === "today") {
    where.push("DATE(p.date) = DATE('now','localtime')");
  } else if (searchPeriod === "week") {
    where.push("DATE(p.date) >= DATE('now','localtime','-7 day')");
  } else if (searchPeriod === "month") {
    where.push("DATE(p.date) >= DATE('now','localtime','-30 day')");
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  const total = db
    .prepare(`SELECT COUNT(*) AS cnt FROM myapp_post p ${whereSql}`)
    .get(...params).cnt;

  const offset = (page - 1) * PAGE_SIZE;

  // ✅ [수정] users 테이블 JOIN해서 avatar 포함
  const posts = db
    .prepare(
      `
    SELECT p.id, p.title, p.user, p.date, p.views, p.likes, p.hates,
           (SELECT COUNT(*) FROM myapp_comment c WHERE c.post_id = p.id) AS comment_count,
           u.avatar
    FROM myapp_post p
    LEFT JOIN users u ON u.username = p.user
    ${whereSql}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, PAGE_SIZE, offset);

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

  if (!req.session.visited) {
    req.session.visited = true;
    db.prepare(
      "INSERT INTO myapp_visitor (ip, date) VALUES (?, DATE('now','localtime'))",
    ).run(req.sessionID);
  }

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
router.get("/posts/:pk/", (req, res) => {
  const pk = req.params.pk;

  // ✅ [수정] users 테이블 JOIN해서 avatar 포함
  const post = db.prepare(`
    SELECT p.*, u.avatar
    FROM myapp_post p
    LEFT JOIN users u ON u.username = p.user
    WHERE p.id = ?
  `).get(pk);

  if (!post) {
    return res.status(404).json({ detail: "존재하지 않는 글입니다." });
  }

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
    comments: commentsWithReplies,
    prev_post: prev || null,
    next_post: next || null,
  });
});

// ── 글 작성 (POST /api/posts/create/) ────────────────────────────────
// backend/routes/posts.js

// backend/routes/posts.js (글 작성 부분)
router.post("/posts/create/", (req, res) => {
  const { title, content, tag, is_notice } = req.body;
  const username = req.session.username || "익명";

  // 백엔드 검증: 관리자가 아닌데 공지사항 등록을 시도할 경우 강제로 0 처리
  const isAdmin = username === "admin";
  const finalIsNotice = isAdmin && is_notice ? 1 : 0;

  const result = db
    .prepare(
      "INSERT INTO myapp_post (title, content, user, date, views, likes, hates, tag, is_notice) VALUES (?, ?, ?, datetime('now','localtime'), 0, 0, 0, ?, ?)",
    )
    .run(title, content, user, tag || "#기타", finalIsNotice);

  res.status(201).json({ id: result.lastInsertRowid });
});

// ── 좋아요 (POST /api/posts/:pk/like/) ───────────────────────────────
router.post("/posts/:pk/like/", (req, res) => {
  const pk = req.params.pk;
  const post = db.prepare("SELECT * FROM myapp_post WHERE id = ?").get(pk);
  if (!post) return res.status(404).json({ detail: "존재하지 않는 글입니다." });

  const key = `liked_${pk}`;
  if (!req.session[key]) {
    db.prepare("UPDATE myapp_post SET likes = likes + 1 WHERE id = ?").run(pk);
    req.session[key] = true;
    post.likes += 1;
  }
  res.json({ likes: post.likes });
});

// ── 싫어요 (POST /api/posts/:pk/hate/) — 로그인 필요 ──────────────────
router.post("/posts/:pk/hate/", (req, res) => {
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

  const created = db
    .prepare("SELECT date FROM myapp_comment WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json({
    id: result.lastInsertRowid,
    post: Number(pk),
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
  const { type } = req.body;
  const sessionId = req.sessionID;

  const existing = db
    .prepare(
      "SELECT * FROM myapp_comment_like WHERE comment_id = ? AND session_id = ?",
    )
    .get(cid, sessionId);

  if (existing) {
    if (existing.type === type) {
      db.prepare("DELETE FROM myapp_comment_like WHERE id = ?").run(existing.id);
    } else {
      db.prepare("UPDATE myapp_comment_like SET type = ? WHERE id = ?").run(type, existing.id);
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