import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────
// .env 파일 읽기 (dotenv 패키지 없이 직접 구현)
//   프로젝트 루트의 .env 파일을 읽어 process.env에 채운다.
//   .env는 .gitignore에 있어서 깃허브에 올라가지 않는다 → 비밀번호 보관용.
//   파일이 없으면 그냥 넘어간다 (에러 안 남).
// ─────────────────────────────────────────────────────────────
const ENV_PATH = path.join(__dirname, "..", ".env");
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    // "KEY=값" 형태의 줄만 골라낸다 (#으로 시작하는 주석은 무시됨)
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

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
    tag TEXT DEFAULT '#기타',
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

// 공지글 여부 (0 = 일반글, 1 = 공지). 기존 DB에는 컬럼이 없어서 보강한다.
try {
  db.exec("ALTER TABLE myapp_post ADD COLUMN is_notice INTEGER DEFAULT 0");
} catch (e) { }

// 관리자 여부 (0 = 일반, 1 = 관리자)
try {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
} catch (e) {}

// 정지 만료 일시 (NULL이면 정지 아님). 이 시각이 지나면 자동으로 정지가 풀린다.
try {
  db.exec("ALTER TABLE users ADD COLUMN banned_until TEXT DEFAULT NULL");
} catch (e) {}

// 최고 관리자(오너) 여부 (0 = 일반, 1 = 오너).
//   오너만 다른 사람에게 관리자 권한을 주고 뺏을 수 있다.
//   오너 본인은 다른 관리자에게 정지/삭제/권한해제 당하지 않는다.
try {
  db.exec("ALTER TABLE users ADD COLUMN is_super INTEGER NOT NULL DEFAULT 0");
} catch (e) {}

try {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN avatar TEXT DEFAULT '/default-avatar.png'
  `);
} catch (e) { }

// ─────────────────────────────────────────────────────────────
// 오너(최고 관리자) 계정 자동 생성
//   서버가 켜질 때 admin 계정이 없으면 자동으로 만들어준다.
//   → 팀원 누가 클론해서 실행해도 항상 관리자 계정이 존재하게 된다.
//   비밀번호는 .env 파일의 ADMIN_PASSWORD에서 읽는다 (깃허브에 안 올라감).
//   사용법: .env.example을 복사해서 .env로 만들고, 팀 비밀번호를 넣으면 끝.
// ─────────────────────────────────────────────────────────────
const ownerExists = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get("admin");
if (!ownerExists) {
  if (process.env.ADMIN_PASSWORD) {
    const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare(
      "INSERT INTO users (username, password, is_admin, is_super) VALUES (?, ?, 1, 1)",
    ).run("admin", hashed);
    console.log("👑 오너 계정(admin)을 자동 생성했습니다.");
  } else {
    console.log(
      "⚠️ ADMIN_PASSWORD가 없어 오너 계정을 만들지 못했습니다. .env.example을 .env로 복사하고 팀 비밀번호를 넣어주세요.",
    );
  }
}

export default db;
