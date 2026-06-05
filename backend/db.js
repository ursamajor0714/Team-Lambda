import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH =
  process.env.DATABASE_FILE || path.join(__dirname, "..", "db.sqlite3");

const db = new Database(DB_PATH);

// ─────────────────────────────────────────────────────────────
// 테이블 정의 (Node 백엔드가 직접 생성)
//   IF NOT EXISTS 라서 이미 있으면 그대로 두고, 빈 DB면 새로 만든다.
//   테이블 이름은 기존 DB와의 호환을 위해 myapp_* 접두사를 유지한다.
// ─────────────────────────────────────────────────────────────

// 회원
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

// 게시글
db.exec(`
  CREATE TABLE IF NOT EXISTS myapp_post (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    user TEXT,
    likes INTEGER NOT NULL DEFAULT 0,
    hates INTEGER NOT NULL DEFAULT 0,
    tag TEXT DEFAULT '#기타'
    is_notice INTEGER DEFAULT 0
  )
`);

// 댓글
db.exec(`
  CREATE TABLE IF NOT EXISTS myapp_comment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    user TEXT,
    date TEXT,
    parent_id INTEGER DEFAULT NULL
  )
`);

// 방문자 기록
db.exec(`
  CREATE TABLE IF NOT EXISTS myapp_visitor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    date TEXT
  )
`);

// 댓글 좋아요/싫어요
db.exec(`
  CREATE TABLE IF NOT EXISTS myapp_comment_like (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(comment_id, session_id)
  )
`);

// ─────────────────────────────────────────────────────────────
// 이전 버전 DB 호환용 마이그레이션
//   예전 스키마로 만들어진 DB에는 아래 컬럼이 없을 수 있어 보강한다.
//   이미 컬럼이 있으면 에러가 나는데, try/catch로 무시한다.
// ─────────────────────────────────────────────────────────────

// parent_id 컬럼 추가 (없으면)
try {
  db.exec(
    "ALTER TABLE myapp_comment ADD COLUMN parent_id INTEGER DEFAULT NULL",
  );
} catch (e) { }

try {
  db.exec("ALTER TABLE myapp_post ADD COLUMN tag TEXT DEFAULT '#기타'");
} catch (e) { }

try {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN avatar TEXT DEFAULT '/default-avatar.png'
  `);
} catch (e) { }
export default db;
