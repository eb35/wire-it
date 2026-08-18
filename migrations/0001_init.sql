-- Migration number: 0001 	 2026-08-17T00:00:00.000Z

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  project_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drawings_user_updated
  ON drawings (user_id, updated_at DESC);
