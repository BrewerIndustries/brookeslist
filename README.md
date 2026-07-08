# Brookeslist

A private, invite-only **dating logbook**. The front page is a catalog of profile
cards (photo + key stats); each profile has a photo gallery, a date log, notes, and
a 0–5 star rating. Two roles — **editor** (writes) and **viewer** (reads).

**Nothing loads until you log in, and that gate is real** — the frontend is a static
site, but all data and images live behind a Cloudflare Worker that enforces the
session on every request (images included).

- **Prod:** https://brookeslist.dabrewer.dev/
- **Dev:** https://brookeslist.dabrewer.dev/dev/

## Architecture

```
Browser ──▶ GitHub Pages (React/Vite SPA) ──fetch(credentials)──▶ Cloudflare Worker (Hono)
            brookeslist.dabrewer.dev                              ├─ D1  (SQLite)  data
              main → /                                            └─ R2            photos (private)
              dev  → /dev/         API: brookeslist-api[-dev].dabrewer.dev
```

- Frontend + API are sibling subdomains of `dabrewer.dev` → **same-site**, so the
  `HttpOnly; Secure; SameSite=Lax` session cookie set on the API host is sent on
  cross-origin fetches **and** on `<img>` requests, but never leaks to other Jarvis apps.
- Auth: email + password (PBKDF2 via Web Crypto), random session tokens stored as
  `HMAC(token, SESSION_SECRET)`. Roles enforced server-side (`viewer` read-only).

## Repo layout

```
web/    React 19 + Vite + Tailwind v4 frontend  → GitHub Pages
api/    Cloudflare Worker (Hono) + D1 migration + create-user script
.github/workflows/pages.yml   builds web/ for main (/) and dev (/dev/)
.jarvis.json                  dashboard/launcher registry declaration
```

---

## First-time setup

Prereqs: Node 20+, `gh` logged in to `BrewerIndustries`, a Cloudflare account with
the `dabrewer.dev` zone, `npx wrangler login` done once.

### 1. Cloudflare resources
```bash
cd api
npx wrangler d1 create brookeslist-prod      # copy database_id → wrangler.toml (prod block)
npx wrangler d1 create brookeslist-dev       # copy database_id → wrangler.toml ([env.dev] block)
npx wrangler r2 bucket create brookeslist-photos-prod
npx wrangler r2 bucket create brookeslist-photos-dev
npx wrangler secret put SESSION_SECRET            # paste a long random string
npx wrangler secret put SESSION_SECRET --env dev  # a different random string
```
Replace the two `PLACEHOLDER_*_D1_ID` values in `api/wrangler.toml` with the ids printed above.

### 2. Migrate + deploy the Worker
```bash
cd api
npm install
npm run migrate:prod        # applies migrations/0001_init.sql to brookeslist-prod
npm run migrate:dev
npm run deploy              # prod worker
npm run deploy:dev         # dev worker
```

### 3. API custom domains (Cloudflare dashboard → Workers → the worker → Settings → Domains & Routes → Add Custom Domain)
- `brookeslist-api.dabrewer.dev` → `brookeslist-api` (prod)
- `brookeslist-api-dev.dabrewer.dev` → `brookeslist-api-dev` (dev)

Cloudflare auto-creates the (proxied) DNS record + edge cert for each.

### 4. Create the first admin + any invites
```bash
cd api
npm run create-user -- --env prod --email you@example.com --role admin --password 'a-strong-password'
# add more later, or use the in-app /admin page:
npm run create-user -- --env dev  --email viewer@example.com --role viewer --password 'another-password'
```

### 5. GitHub repo + Pages
- Repo `BrewerIndustries/brookeslist` with `main` + `dev` branches (dev is where the workflow lives).
- **Settings → Pages → Source = GitHub Actions.**
- **Settings → Environments → `github-pages` → deployment branch policy → allow `dev`**
  (non-default branches are blocked by default — the Action can't deploy without this).
- After the first green run, enable **Enforce HTTPS**.

### 6. Frontend DNS (Cloudflare, `dabrewer.dev` zone)
- CNAME `brookeslist.dabrewer.dev` → `brewerindustries.github.io`, **DNS-only (grey cloud)**
  so GitHub issues the cert (avoids the Cloudflare↔Pages TLS redirect loop). Dev lives at `…/dev/`.

---

## Local development
```bash
# terminal 1 — API on http://localhost:8787
cd api
cp .dev.vars.example .dev.vars        # sets a dev SESSION_SECRET
npm install
npm run migrate:local                 # seed the local D1
npm run create-user -- --local --email you@example.com --role admin --password 'devpassword'
npm run dev

# terminal 2 — frontend on http://localhost:5173 (proxies to :8787 by default)
cd web
npm install
npm run dev
```
`web` calls `VITE_API_BASE` (defaults to `http://localhost:8787` locally). The Worker
allows `localhost:5173` via CORS and omits the `Secure` cookie flag on localhost.

## Deploy / update
- **Frontend:** push to `dev` → the Pages Action rebuilds both `/` (from `main`) and `/dev/` (from `dev`).
- **Worker:** `cd api && npm run deploy` (prod) / `npm run deploy:dev` (dev).
- **New schema change:** add `api/migrations/000N_*.sql`, then `npm run migrate:prod` / `:dev`.
- **Promotion:** work on `dev`, verify at `/dev/`, promote to `main` via a PR you approve.

## Support / feedback → Jarvis → email

The **Support** page (in the header, all users) posts to `POST /feedback`, which stores
the submission in D1. Because the Cloudflare Worker can't reach the Tailscale-only Jarvis
box, Jarvis **pulls**: a tiny cron poller on the server reads new items and emails them to
Dan from Jarvis's own Gmail, then acks them.

- `GET /feedback/pending` and `POST /feedback/ack` are protected by a bearer token
  (`JARVIS_INGEST_TOKEN` Worker secret) — not a browser session.
- Bridge script: `deploy/jarvis-feedback-poller.py` (pure stdlib, no deps).

**Live install** (already set up on `dan@100.102.159.57`):
- Script: `/home/dan/brookeslist-feedback/jarvis-feedback-poller.py`
- Env (chmod 600): `/home/dan/brookeslist-feedback/feedback-poller.env` — SMTP creds are
  read from Jarvis's own `config.yaml` (`serveremail.jarvis@gmail.com`); `BROOKESLIST_API`
  points at the **dev** API; `NOTIFY_TO=myemailisdanmail@gmail.com`.
- Cron (every 5 min): `crontab -l | grep feedback`; log at `~/brookeslist-feedback/poller.log`.

Notes:
- The poller sends a real `User-Agent` — Cloudflare's edge 403s the default `Python-urllib/*`.
- **On prod promotion:** set a prod `JARVIS_INGEST_TOKEN` Worker secret, then update the env
  file's `JARVIS_INGEST_TOKEN` + `BROOKESLIST_API=https://brookeslist-api.dabrewer.dev`.
- To reinstall from scratch, `deploy/feedback-poller.env.example` documents every key.

## Roles
| | viewer | editor | admin |
|---|:--:|:--:|:--:|
| View profiles/photos/dates | ✅ | ✅ | ✅ |
| Create/edit/delete profiles, photos, dates, ratings | | ✅ | ✅ |
| Submit support/feedback | ✅ | ✅ | ✅ |
| Manage users (invite / set role / reset pw) | | | ✅ |
| App configuration (Settings page) | | | ✅ |

## Configuration (admin → Settings)

App-wide config lives in a D1 `settings` table (single `config` JSON row) and is
edited from the in-app **Settings** page (admins only). `GET /settings` is readable
by any signed-in user; `PUT /admin/settings` is admin-only. Current options:

- **Units** — `us` (feet/inches, pounds — **default**) or `metric` (cm, kg). Drives
  how height/weight are entered and displayed everywhere. Values are stored in metric
  base columns (`height_cm`, `weight_kg`) and converted per-unit in the UI.
- **Body types** — the list offered in the profile editor's body-type field.
- **Custom stat labels** — suggested labels for a profile's free-form "Other stats".
- **Ratings** — toggle half-star ratings (e.g. 3.5) on/off.
- **Gold standard** — feature one profile as the perfect candidate: its card glows gold
  with a star badge, and the detail page gets a "Gold standard" ribbon. Stored as
  `gold_standard_id` (a profile id or null).

**Theme** — a light/dark toggle (in the header, all users) persists per-browser in
`localStorage`. Light mode is white + pink; dark is the default. Theming works via a
single `ink` CSS-variable color token that flips between near-white and near-black, so
every `ink/opacity` surface inverts correctly (see `web/src/index.css`, `theme/ThemeContext.tsx`).

Missing keys fall back to defaults in the Worker (`DEFAULT_CONFIG`), so the config is
forward-compatible as new options are added.
