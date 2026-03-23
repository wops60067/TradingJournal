const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'trading_journal.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('long', 'short')),
    entry_price REAL NOT NULL,
    exit_price REAL,
    quantity REAL NOT NULL,
    entry_date TEXT NOT NULL,
    exit_date TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
    pnl REAL,
    pnl_percent REAL,
    fees REAL DEFAULT 0,
    strategy TEXT,
    timeframe TEXT,
    entry_reason TEXT,
    exit_reason TEXT,
    review_notes TEXT,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    tags TEXT,
    screenshot_url TEXT,
    contract_size REAL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trade_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );
`);

// Migration: add contract_size column if missing
try {
  const columns = db.prepare("PRAGMA table_info(trades)").all();
  const hasContractSize = columns.some(c => c.name === 'contract_size');
  if (!hasContractSize) {
    db.exec("ALTER TABLE trades ADD COLUMN contract_size REAL DEFAULT 1");
  }
} catch (e) {
  // Column already exists
}

module.exports = db;
