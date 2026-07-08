-- Support/feedback submissions. Jarvis polls the pending ones and emails Dan.

CREATE TABLE feedback (
  id         TEXT PRIMARY KEY,
  user_email TEXT,
  user_id    TEXT,
  category   TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  page_url   TEXT,
  status     TEXT NOT NULL DEFAULT 'new',   -- new | sent
  created_at INTEGER NOT NULL,
  sent_at    INTEGER
);
CREATE INDEX idx_feedback_status ON feedback(status, created_at);
