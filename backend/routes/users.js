import express from "express";
import db from "../db.js";

const router = express.Router();

// 유저 프로필 API
router.get("/:username", (req, res) => {
    const { username } = req.params;

    // 1. 유저 기본 정보
    const user = db
        .prepare("SELECT username FROM users WHERE username = ?")
        .get(username);

    if (!user) {
        return res.status(404).json({ message: "유저 없음" });
    }

    // 2. 작성글 수
    const postCount = db
        .prepare("SELECT COUNT(*) as count FROM myapp_post WHERE user = ?")
        .get(username).count;

    // 3. 댓글 수
    const commentCount = db
        .prepare("SELECT COUNT(*) as count FROM myapp_comment WHERE user = ?")
        .get(username).count;

    // 4. 최근 작성글
    const posts = db
        .prepare(`
      SELECT id, title, date
      FROM myapp_post
      WHERE user = ?
      ORDER BY id DESC
      LIMIT 10
    `)
        .all(username);

    res.json({
        username,
        postCount,
        commentCount,
        posts,
    });
});

// ── 댓글 목록 (GET /api/users/:username/comments) ─────────────────────
router.get("/:username/comments", (req, res) => {
    const { username } = req.params;

    const comments = db
        .prepare(`
        SELECT c.id, c.content, c.date, c.post_id,
               p.title AS post_title
        FROM myapp_comment c
        LEFT JOIN myapp_post p ON p.id = c.post_id
        WHERE c.user = ?
        ORDER BY c.id DESC
        LIMIT 20
      `)
        .all(username);

    res.json({ comments });
});

// ── 방명록 목록 (GET /api/users/:username/guestbook) ──────────────────
router.get("/:username/guestbook", (req, res) => {
    const { username } = req.params;

    const entries = db
        .prepare(`
        SELECT id, author, content, date
        FROM guestbook
        WHERE owner = ?
        ORDER BY id DESC
        LIMIT 20
      `)
        .all(username);

    res.json({ entries });
});

// ── 방명록 작성 (POST /api/users/:username/guestbook) ─────────────────
router.post("/:username/guestbook", (req, res) => {
    if (!req.session.userId) {
        return res.status(403).json({ detail: "로그인이 필요합니다." });
    }
    const { username } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
        return res.status(400).json({ detail: "내용을 입력해주세요." });
    }
    db.prepare(`
      INSERT INTO guestbook (owner, author, content, date)
      VALUES (?, ?, ?, datetime('now','localtime'))
    `).run(username, req.session.username, content.trim());

    res.status(201).json({ detail: "작성되었습니다." });
});

// ── 방명록 삭제 (DELETE /api/users/:username/guestbook/:id) ───────────
router.delete("/:username/guestbook/:id", (req, res) => {
    if (!req.session.userId) {
        return res.status(403).json({ detail: "로그인이 필요합니다." });
    }
    const { id } = req.params;
    const entry = db.prepare("SELECT * FROM guestbook WHERE id = ?").get(id);
    if (!entry) return res.status(404).json({ detail: "없는 글입니다." });
    if (entry.author !== req.session.username && entry.owner !== req.session.username) {
        return res.status(403).json({ detail: "삭제 권한이 없습니다." });
    }
    db.prepare("DELETE FROM guestbook WHERE id = ?").run(id);
    res.json({ detail: "삭제되었습니다." });
});

export default router;