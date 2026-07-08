import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { hashPassword, verifyPassword, newToken, sessionId } from './auth';
import { uuid, now, zodiac, clampRating } from './util';

type Bindings = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ALLOWED_ORIGIN: string;
  SESSION_SECRET: string;
  JARVIS_INGEST_TOKEN: string;
};

type SessionUser = {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  display_name: string | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: { user: SessionUser } }>();

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// ---------------- CORS ----------------
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [c.env.ALLOWED_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// ---------------- helpers ----------------
function publicUser(row: any): SessionUser {
  return { id: row.id, email: row.email, role: row.role, display_name: row.display_name ?? null };
}

async function currentUser(c: any): Promise<SessionUser | null> {
  const token = getCookie(c, 'bl_session');
  if (!token) return null;
  const id = await sessionId(token, c.env.SESSION_SECRET);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.role, u.display_name, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
  ).bind(id).first();
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) return null;
  return publicUser(row);
}

const auth = async (c: any, next: any) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
};

const requireEditor = async (c: any, next: any) => {
  const role = c.get('user').role;
  if (role !== 'editor' && role !== 'admin') return c.json({ error: 'forbidden' }, 403);
  await next();
};

const requireAdmin = async (c: any, next: any) => {
  if (c.get('user').role !== 'admin') return c.json({ error: 'forbidden' }, 403);
  await next();
};

// Bearer-token auth for the Jarvis server's feedback poller (not a browser session).
const jarvisAuth = async (c: any, next: any) => {
  const hdr = c.req.header('Authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!c.env.JARVIS_INGEST_TOKEN || token !== c.env.JARVIS_INGEST_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
};

function serializeProfile(row: any) {
  let extra: any = {};
  if (row.extra) { try { extra = JSON.parse(row.extra); } catch { extra = {}; } }
  return {
    id: row.id,
    name: row.name,
    birthday: row.birthday,
    sign: row.sign,
    height_cm: row.height_cm,
    weight_kg: row.weight_kg ?? null,
    body_type: row.body_type,
    rating: row.rating,
    notes: row.notes,
    extra,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// App configuration (admin-editable). Defaults fill any keys missing from the
// stored row so older configs stay forward-compatible.
const DEFAULT_CONFIG = {
  units: 'us' as 'us' | 'metric',
  body_types: ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size', 'Petite', 'Tall'],
  stat_presets: ['Eyes', 'Hair', 'How we met', 'Occupation', 'Location'],
  rating_half_steps: true,
  gold_standard_id: null as string | null,
};

async function getConfig(c: any) {
  const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'config'").first();
  let stored: any = {};
  if (row?.value) { try { stored = JSON.parse(row.value); } catch { stored = {}; } }
  return { ...DEFAULT_CONFIG, ...stored };
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const s = String(item).trim();
    if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
  }
  return out;
}

// ---------------- health ----------------
app.get('/', (c) => c.json({ ok: true, service: 'brookeslist-api' }));

// ---------------- auth ----------------
app.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash as string))) {
    return c.json({ error: 'invalid credentials' }, 401);
  }

  const token = newToken();
  const id = await sessionId(token, c.env.SESSION_SECRET);
  const created = Date.now();
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .bind(id, user.id, created, created + SESSION_MS).run();

  const host = new URL(c.req.url).hostname;
  const secure = host !== 'localhost' && host !== '127.0.0.1';
  setCookie(c, 'bl_session', token, {
    httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return c.json({ user: publicUser(user) });
});

app.post('/auth/logout', auth, async (c) => {
  const token = getCookie(c, 'bl_session');
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
      .bind(await sessionId(token, c.env.SESSION_SECRET)).run();
  }
  deleteCookie(c, 'bl_session', { path: '/' });
  return c.json({ ok: true });
});

app.get('/auth/me', auth, (c) => c.json({ user: c.get('user') }));

// ---------------- settings (config) ----------------
app.get('/settings', auth, async (c) => c.json({ config: await getConfig(c) }));

app.put('/admin/settings', auth, requireAdmin, async (c) => {
  const b = await c.req.json().catch(() => ({} as any));
  const next = await getConfig(c);
  if (b.units === 'us' || b.units === 'metric') next.units = b.units;
  if (b.body_types !== undefined) next.body_types = cleanList(b.body_types);
  if (b.stat_presets !== undefined) next.stat_presets = cleanList(b.stat_presets);
  if (typeof b.rating_half_steps === 'boolean') next.rating_half_steps = b.rating_half_steps;
  if (b.gold_standard_id !== undefined) next.gold_standard_id = b.gold_standard_id ? String(b.gold_standard_id) : null;
  await c.env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).bind(JSON.stringify(next)).run();
  return c.json({ config: next });
});

// ---------------- profiles ----------------
app.get('/profiles', auth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*,
            (SELECT r2_key  FROM profile_photos pp WHERE pp.profile_id = p.id ORDER BY sort_order, created_at LIMIT 1) AS primary_key,
            (SELECT focal_x FROM profile_photos pp WHERE pp.profile_id = p.id ORDER BY sort_order, created_at LIMIT 1) AS primary_focal_x,
            (SELECT focal_y FROM profile_photos pp WHERE pp.profile_id = p.id ORDER BY sort_order, created_at LIMIT 1) AS primary_focal_y
     FROM profiles p ORDER BY p.updated_at DESC`,
  ).all();
  const cards = (results as any[]).map((r) => ({
    ...serializeProfile(r),
    photo_key: r.primary_key ?? null,
    photo_focal_x: r.primary_focal_x ?? 50,
    photo_focal_y: r.primary_focal_y ?? 50,
  }));
  return c.json({ profiles: cards });
});

app.post('/profiles', auth, requireEditor, async (c) => {
  const b = await c.req.json().catch(() => ({} as any));
  if (!b.name || !String(b.name).trim()) return c.json({ error: 'name is required' }, 400);
  const id = uuid();
  const ts = now();
  const birthday = b.birthday || null;
  await c.env.DB.prepare(
    `INSERT INTO profiles (id, name, birthday, sign, height_cm, weight_kg, body_type, rating, notes, extra, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    id, String(b.name).trim(), birthday, zodiac(birthday),
    b.height_cm ?? null, b.weight_kg ?? null, b.body_type ?? null, clampRating(b.rating ?? 0),
    b.notes ?? null, b.extra ? JSON.stringify(b.extra) : null,
    c.get('user').id, ts, ts,
  ).run();
  const row = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first();
  return c.json({ profile: serializeProfile(row) }, 201);
});

app.get('/profiles/:id', auth, async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'not found' }, 404);
  const photos = await c.env.DB.prepare(
    'SELECT id, r2_key, content_type, sort_order, focal_x, focal_y, created_at FROM profile_photos WHERE profile_id = ? ORDER BY sort_order, created_at',
  ).bind(id).all();
  const dates = await c.env.DB.prepare(
    'SELECT * FROM date_logs WHERE profile_id = ? ORDER BY occurred_on DESC, created_at DESC',
  ).bind(id).all();
  return c.json({
    profile: serializeProfile(row),
    photos: photos.results,
    dates: dates.results,
  });
});

app.patch('/profiles/:id', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'not found' }, 404);
  const b = await c.req.json().catch(() => ({} as any));

  const name = b.name !== undefined ? String(b.name).trim() : existing.name;
  const birthday = b.birthday !== undefined ? (b.birthday || null) : existing.birthday;
  const sign = b.birthday !== undefined ? zodiac(birthday as string) : existing.sign;
  const height_cm = b.height_cm !== undefined ? b.height_cm : existing.height_cm;
  const weight_kg = b.weight_kg !== undefined ? b.weight_kg : existing.weight_kg;
  const body_type = b.body_type !== undefined ? b.body_type : existing.body_type;
  const rating = b.rating !== undefined ? clampRating(b.rating) : existing.rating;
  const notes = b.notes !== undefined ? b.notes : existing.notes;
  const extra = b.extra !== undefined ? (b.extra ? JSON.stringify(b.extra) : null) : existing.extra;

  await c.env.DB.prepare(
    `UPDATE profiles SET name=?, birthday=?, sign=?, height_cm=?, weight_kg=?, body_type=?, rating=?, notes=?, extra=?, updated_at=?
     WHERE id=?`,
  ).bind(name, birthday, sign, height_cm, weight_kg, body_type, rating, notes, extra, now(), id).run();
  const row = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first();
  return c.json({ profile: serializeProfile(row) });
});

app.put('/profiles/:id/rating', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json().catch(() => ({} as any));
  const rating = clampRating(b.rating);
  const res = await c.env.DB.prepare('UPDATE profiles SET rating=?, updated_at=? WHERE id=?')
    .bind(rating, now(), id).run();
  if (!res.meta.changes) return c.json({ error: 'not found' }, 404);
  return c.json({ rating });
});

app.delete('/profiles/:id', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const photos = await c.env.DB.prepare('SELECT r2_key FROM profile_photos WHERE profile_id = ?').bind(id).all();
  for (const p of photos.results as any[]) {
    await c.env.PHOTOS.delete(p.r2_key);
  }
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM profile_photos WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM date_logs WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});

// ---------------- photos ----------------
app.post('/profiles/:id/photos', auth, requireEditor, async (c) => {
  const profileId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(profileId).first();
  if (!exists) return c.json({ error: 'not found' }, 404);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return c.json({ error: 'file field required' }, 400);
  if (file.size > MAX_PHOTO_BYTES) return c.json({ error: 'file too large (max 10MB)' }, 413);

  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `${profileId}/${uuid()}.${ext}`;
  await c.env.PHOTOS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const id = uuid();
  const ts = now();
  const order = form.get('sort_order') ? Number(form.get('sort_order')) : ts;
  await c.env.DB.prepare(
    'INSERT INTO profile_photos (id, profile_id, r2_key, content_type, sort_order, created_at) VALUES (?,?,?,?,?,?)',
  ).bind(id, profileId, key, file.type || null, order, ts).run();
  await c.env.DB.prepare('UPDATE profiles SET updated_at=? WHERE id=?').bind(ts, profileId).run();
  return c.json({ photo: { id, r2_key: key, content_type: file.type, sort_order: order, created_at: ts } }, 201);
});

// Scrape an image from a URL, store it in R2 (same as a direct upload).
app.post('/profiles/:id/photos/url', auth, requireEditor, async (c) => {
  const profileId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(profileId).first();
  if (!exists) return c.json({ error: 'not found' }, 404);

  const b = await c.req.json().catch(() => ({} as any));
  const url = String(b.url ?? '').trim();
  let parsed: URL;
  try { parsed = new URL(url); } catch { return c.json({ error: 'invalid URL' }, 400); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return c.json({ error: 'URL must start with http:// or https://' }, 400);
  }

  let resp: Response;
  try {
    resp = await fetch(url, { headers: { 'User-Agent': 'BrookeslistBot/1.0', Accept: 'image/*' }, redirect: 'follow' });
  } catch {
    return c.json({ error: 'could not reach that URL' }, 502);
  }
  if (!resp.ok) return c.json({ error: `fetch failed (HTTP ${resp.status})` }, 502);
  const ct = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ct.startsWith('image/')) return c.json({ error: 'that URL is not an image' }, 415);
  const buf = await resp.arrayBuffer();
  if (buf.byteLength === 0) return c.json({ error: 'the image was empty' }, 400);
  if (buf.byteLength > MAX_PHOTO_BYTES) return c.json({ error: 'image too large (max 10MB)' }, 413);

  const ext = (ct.split('/')[1] || 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
  const key = `${profileId}/${uuid()}.${ext}`;
  await c.env.PHOTOS.put(key, buf, { httpMetadata: { contentType: ct } });

  const id = uuid();
  const ts = now();
  await c.env.DB.prepare(
    'INSERT INTO profile_photos (id, profile_id, r2_key, content_type, sort_order, created_at) VALUES (?,?,?,?,?,?)',
  ).bind(id, profileId, key, ct, ts, ts).run();
  await c.env.DB.prepare('UPDATE profiles SET updated_at=? WHERE id=?').bind(ts, profileId).run();
  return c.json({ photo: { id, r2_key: key, content_type: ct, sort_order: ts, created_at: ts } }, 201);
});

// Update a photo's focal point (0–100 each axis) for repositioning in its frame.
app.patch('/photos/:id', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json().catch(() => ({} as any));
  const clamp = (v: any) => Math.max(0, Math.min(100, Number(v)));
  const fx = clamp(b.focal_x);
  const fy = clamp(b.focal_y);
  if (!isFinite(fx) || !isFinite(fy)) return c.json({ error: 'focal_x and focal_y required' }, 400);
  const res = await c.env.DB.prepare('UPDATE profile_photos SET focal_x = ?, focal_y = ? WHERE id = ?').bind(fx, fy, id).run();
  if (!res.meta.changes) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true, focal_x: fx, focal_y: fy });
});

app.delete('/photos/:id', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT r2_key FROM profile_photos WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'not found' }, 404);
  await c.env.PHOTOS.delete(row.r2_key as string);
  await c.env.DB.prepare('DELETE FROM profile_photos WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// Streams an image from R2 — auth-gated, so photos never load without a session.
app.get('/photos/:key{.+}', auth, async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) return c.json({ error: 'not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=3600');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// ---------------- date logs ----------------
app.post('/profiles/:id/dates', auth, requireEditor, async (c) => {
  const profileId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(profileId).first();
  if (!exists) return c.json({ error: 'not found' }, 404);
  const b = await c.req.json().catch(() => ({} as any));
  const id = uuid();
  const ts = now();
  await c.env.DB.prepare(
    'INSERT INTO date_logs (id, profile_id, occurred_on, title, location, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
  ).bind(id, profileId, b.occurred_on || null, b.title || null, b.location || null, b.notes || null, c.get('user').id, ts).run();
  await c.env.DB.prepare('UPDATE profiles SET updated_at=? WHERE id=?').bind(ts, profileId).run();
  const row = await c.env.DB.prepare('SELECT * FROM date_logs WHERE id = ?').bind(id).first();
  return c.json({ date: row }, 201);
});

app.patch('/dates/:id', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM date_logs WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'not found' }, 404);
  const b = await c.req.json().catch(() => ({} as any));
  await c.env.DB.prepare(
    'UPDATE date_logs SET occurred_on=?, title=?, location=?, notes=? WHERE id=?',
  ).bind(
    b.occurred_on !== undefined ? (b.occurred_on || null) : existing.occurred_on,
    b.title !== undefined ? (b.title || null) : existing.title,
    b.location !== undefined ? (b.location || null) : existing.location,
    b.notes !== undefined ? (b.notes || null) : existing.notes,
    id,
  ).run();
  const row = await c.env.DB.prepare('SELECT * FROM date_logs WHERE id = ?').bind(id).first();
  return c.json({ date: row });
});

app.delete('/dates/:id', auth, requireEditor, async (c) => {
  const id = c.req.param('id');
  const res = await c.env.DB.prepare('DELETE FROM date_logs WHERE id = ?').bind(id).run();
  if (!res.meta.changes) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

// ---------------- admin: users ----------------
app.get('/admin/users', auth, requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, role, display_name, created_at FROM users ORDER BY created_at',
  ).all();
  return c.json({ users: results });
});

app.post('/admin/users', auth, requireAdmin, async (c) => {
  const b = await c.req.json().catch(() => ({} as any));
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const role = ['viewer', 'editor', 'admin'].includes(b.role) ? b.role : 'viewer';
  if (!email || password.length < 8) return c.json({ error: 'email and password (min 8 chars) required' }, 400);
  const dupe = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (dupe) return c.json({ error: 'email already exists' }, 409);
  const id = uuid();
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, role, display_name, created_at) VALUES (?,?,?,?,?,?)',
  ).bind(id, email, await hashPassword(password), role, b.display_name || null, now()).run();
  return c.json({ user: { id, email, role, display_name: b.display_name || null } }, 201);
});

app.patch('/admin/users/:id', auth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'not found' }, 404);
  const b = await c.req.json().catch(() => ({} as any));

  if (b.role !== undefined) {
    if (!['viewer', 'editor', 'admin'].includes(b.role)) return c.json({ error: 'bad role' }, 400);
    // don't let an admin demote themselves and lock everyone out
    if (id === c.get('user').id && b.role !== 'admin') return c.json({ error: 'cannot change your own role' }, 400);
    await c.env.DB.prepare('UPDATE users SET role=? WHERE id=?').bind(b.role, id).run();
  }
  if (b.display_name !== undefined) {
    await c.env.DB.prepare('UPDATE users SET display_name=? WHERE id=?').bind(b.display_name || null, id).run();
  }
  if (b.password !== undefined) {
    if (String(b.password).length < 8) return c.json({ error: 'password too short' }, 400);
    await c.env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await hashPassword(String(b.password)), id).run();
    // invalidate existing sessions on password change
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
  }
  const row = await c.env.DB.prepare('SELECT id, email, role, display_name, created_at FROM users WHERE id = ?').bind(id).first();
  return c.json({ user: row });
});

app.delete('/admin/users/:id', auth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (id === c.get('user').id) return c.json({ error: 'cannot delete yourself' }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});

// ---------------- feedback / support ----------------
app.post('/feedback', auth, async (c) => {
  const b = await c.req.json().catch(() => ({} as any));
  const message = String(b.message ?? '').trim();
  if (!message) return c.json({ error: 'a message is required' }, 400);
  const user = c.get('user');
  const id = uuid();
  await c.env.DB.prepare(
    `INSERT INTO feedback (id, user_email, user_id, category, subject, message, page_url, status, created_at)
     VALUES (?,?,?,?,?,?,?, 'new', ?)`,
  ).bind(
    id, user.email, user.id,
    b.category ? String(b.category).slice(0, 40) : null,
    b.subject ? String(b.subject).slice(0, 200) : null,
    message.slice(0, 5000),
    b.page_url ? String(b.page_url).slice(0, 500) : null,
    now(),
  ).run();
  return c.json({ ok: true }, 201);
});

// Jarvis pulls new feedback, emails Dan, then acks. Bearer-token protected.
app.get('/feedback/pending', jarvisAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, user_email, category, subject, message, page_url, created_at FROM feedback WHERE status = 'new' ORDER BY created_at LIMIT 50",
  ).all();
  return c.json({ feedback: results });
});

app.post('/feedback/ack', jarvisAuth, async (c) => {
  const b = await c.req.json().catch(() => ({} as any));
  const ids = Array.isArray(b.ids) ? b.ids.filter((x: any) => typeof x === 'string') : [];
  if (!ids.length) return c.json({ ok: true, acked: 0 });
  const ts = now();
  await c.env.DB.batch(
    ids.map((id: string) => c.env.DB.prepare("UPDATE feedback SET status = 'sent', sent_at = ? WHERE id = ? AND status = 'new'").bind(ts, id)),
  );
  return c.json({ ok: true, acked: ids.length });
});

export default app;
