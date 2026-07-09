import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ProfileCard as Card } from '../lib/types';
import { useCanEdit } from '../auth/AuthContext';
import { useSettings } from '../settings/SettingsContext';
import ProfileCard from '../components/ProfileCard';

type Sort = 'recent' | 'rating' | 'name' | 'ranked';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Catalog() {
  const canEdit = useCanEdit();
  const { config } = useSettings();
  const [profiles, setProfiles] = useState<Card[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [filter, setFilter] = useState<string>('active'); // status filter; 'all' = everything

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    if (!profiles) return [];
    let list = filter === 'all' ? profiles.slice() : profiles.filter((p) => (p.status || 'active') === filter);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    list.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'ranked') return (a.rank ?? Infinity) - (b.rank ?? Infinity) || b.updated_at - a.updated_at;
      return b.updated_at - a.updated_at;
    });
    return list;
  }, [profiles, q, sort, filter]);

  const ranking = sort === 'ranked' && canEdit;

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= shown.length) return;
    const arr = shown.slice();
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await api.rankProfiles(arr.map((p) => p.id));
    setProfiles(await api.listProfiles());
  }

  if (error) return <div className="rounded-xl bg-rose-500/15 p-4 text-rose-500">{error}</div>;
  if (!profiles) return <div className="py-20 text-center text-ink/40">Loading…</div>;

  const control = 'rounded-lg bg-ink/5 px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/40';

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names…" className={`${control} w-full sm:w-44`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={control} title="Filter by status">
          {config.statuses.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          <option value="all">All</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={control} title="Sort">
          <option value="recent">Recently updated</option>
          <option value="rating">Highest rated</option>
          <option value="ranked">My ranking</option>
          <option value="name">Name (A–Z)</option>
        </select>
        <span className="ml-auto text-sm text-ink/40">{shown.length} profile{shown.length === 1 ? '' : 's'}</span>
      </div>

      {ranking && (
        <p className="mb-3 text-xs text-ink/40">Ranking mode — use ▲▼ to order your {filter === 'all' ? '' : filter} profiles. #1 is your top pick.</p>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl bg-ink/5 p-12 text-center ring-1 ring-ink/10">
          <div className="mb-2 text-4xl">{q ? '🔍' : '💌'}</div>
          <p className="text-ink/50">{q ? 'No cuties match that search.' : `No ${filter === 'all' ? '' : filter} cuties here yet 💅`}</p>
          {canEdit && !q && (
            <Link to="/profile/new" className="mt-3 inline-block rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400">
              Add someone 💕
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p, i) => (
            <div key={p.id} className="relative">
              <ProfileCard p={p} />
              {sort === 'ranked' && (
                <span className="absolute left-1.5 top-1.5 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-black/70 px-1.5 text-xs font-bold text-white">
                  {i + 1}
                </span>
              )}
              {ranking && (
                <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                    className="grid h-6 w-6 place-items-center rounded bg-black/70 text-xs text-white hover:bg-black/90 disabled:opacity-30">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === shown.length - 1} title="Move down"
                    className="grid h-6 w-6 place-items-center rounded bg-black/70 text-xs text-white hover:bg-black/90 disabled:opacity-30">▼</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
