import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ProfileCard as Card } from '../lib/types';
import { useCanEdit } from '../auth/AuthContext';
import ProfileCard from '../components/ProfileCard';

type Sort = 'recent' | 'rating' | 'name';

export default function Catalog() {
  const canEdit = useCanEdit();
  const [profiles, setProfiles] = useState<Card[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    if (!profiles) return [];
    const filtered = q
      ? profiles.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      : profiles.slice();
    filtered.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'name') return a.name.localeCompare(b.name);
      return b.updated_at - a.updated_at;
    });
    return filtered;
  }, [profiles, q, sort]);

  if (error) return <div className="rounded-xl bg-rose-500/15 p-4 text-rose-500">{error}</div>;
  if (!profiles) return <div className="py-20 text-center text-ink/40">Loading…</div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names…"
          className="w-48 rounded-lg bg-ink/5 px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/40"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg bg-ink/5 px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none"
        >
          <option value="recent">Recently updated</option>
          <option value="rating">Highest rated</option>
          <option value="name">Name (A–Z)</option>
        </select>
        <span className="ml-auto text-sm text-ink/40">{shown.length} profile{shown.length === 1 ? '' : 's'}</span>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl bg-ink/5 p-12 text-center ring-1 ring-ink/10">
          <p className="text-ink/50">No profiles yet.</p>
          {canEdit && (
            <Link to="/profile/new" className="mt-3 inline-block rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400">
              Create the first one
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <ProfileCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
