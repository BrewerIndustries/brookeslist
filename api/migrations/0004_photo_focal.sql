-- Per-photo focal point (object-position %) so a photo can be repositioned
-- within its bounding box. 50/50 = centered (the CSS default).
ALTER TABLE profile_photos ADD COLUMN focal_x REAL NOT NULL DEFAULT 50;
ALTER TABLE profile_photos ADD COLUMN focal_y REAL NOT NULL DEFAULT 50;
