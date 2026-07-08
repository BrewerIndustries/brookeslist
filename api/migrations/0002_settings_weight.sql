-- Configurable app settings (key/value JSON) + a weight field on profiles.

ALTER TABLE profiles ADD COLUMN weight_kg REAL;

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL          -- JSON
);

-- Seed the default config. Units default to US (feet/inches, pounds).
INSERT INTO settings (key, value) VALUES (
  'config',
  '{"units":"us","body_types":["Slim","Athletic","Average","Curvy","Muscular","Plus-size","Petite","Tall"],"stat_presets":["Eyes","Hair","How we met","Occupation","Location"],"rating_half_steps":true}'
);
