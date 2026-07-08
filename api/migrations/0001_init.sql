-- Brookeslist schema (D1 / SQLite)

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','editor','admin')),
  display_name  TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,          -- HMAC-SHA256(token, SESSION_SECRET)
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE profiles (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  birthday   TEXT,                      -- ISO yyyy-mm-dd
  sign       TEXT,                      -- derived from birthday
  height_cm  INTEGER,
  body_type  TEXT,
  rating     REAL NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes      TEXT,
  extra      TEXT,                      -- JSON: custom "etc" stats
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_profiles_updated ON profiles(updated_at DESC);

CREATE TABLE profile_photos (
  id           TEXT PRIMARY KEY,
  profile_id   TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  content_type TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_photos_profile ON profile_photos(profile_id);

CREATE TABLE date_logs (
  id          TEXT PRIMARY KEY,
  profile_id  TEXT NOT NULL,
  occurred_on TEXT,                     -- ISO yyyy-mm-dd
  title       TEXT,
  location    TEXT,
  notes       TEXT,
  created_by  TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_dates_profile ON date_logs(profile_id);
