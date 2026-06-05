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

export default router;