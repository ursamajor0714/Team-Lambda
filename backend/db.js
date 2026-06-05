import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH =
  process.env.DATABASE_FILE || path.join(__dirname, "..", "db.sqlite3");

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS myapp_comment_like (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(comment_id, session_id)
  )
`);

// parent_id 컬럼 추가 (없으면)
try {
  db.exec(
    "ALTER TABLE myapp_comment ADD COLUMN parent_id INTEGER DEFAULT NULL",
  );
} catch (e) {}

try {
  db.exec("ALTER TABLE myapp_post ADD COLUMN tag TEXT DEFAULT '#기타'");
} catch (e) {}

export default db;
