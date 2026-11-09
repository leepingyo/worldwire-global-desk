CREATE TABLE IF NOT EXISTS source_health (
  feed_url TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL,
  reason TEXT,
  replacement TEXT UNIQUE
);
