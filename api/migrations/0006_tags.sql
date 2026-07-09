-- Per-profile vibe tags (green flag / red flag / custom), stored as a JSON array.
ALTER TABLE profiles ADD COLUMN tags TEXT;
