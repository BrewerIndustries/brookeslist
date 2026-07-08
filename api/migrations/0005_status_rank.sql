-- Per-profile status (configurable; default 'active') + a manual rank for ordering.
ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN rank INTEGER;
