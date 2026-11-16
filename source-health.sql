CREATE TABLE IF NOT EXISTS source_health (
  feed_url TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL,
  reason TEXT,
  replacement TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS headline_batches (
  id INTEGER PRIMARY KEY CHECK(id=1), slot INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0,
  payload TEXT, error TEXT
);
