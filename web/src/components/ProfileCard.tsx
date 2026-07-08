import { Link } from 'react-router-dom';
import type { ProfileCard as Card } from '../lib/types';
import { photoUrl } from '../lib/api';
import { cmToFtIn } from '../lib/format';
import StarRating from './StarRating';

export default function ProfileCard({ p }: { p: Card }) {
  const stats = [p.sign, p.body_type, cmToFtIn(p.height_cm)].filter(Boolean).join(' · ');
  return (
    <Link
      to={`/profile/${p.id}`}
      className="group overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-white/20"
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-violet-500/20 to-rose-500/20">
        {p.photo_key ? (
          <img
            src={photoUrl(p.photo_key)}
            alt={p.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-black text-white/25">
            {p.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-base font-semibold text-white">{p.name}</div>
        {stats && <div className="mt-0.5 truncate text-xs text-white/50">{stats}</div>}
        <div className="mt-2">
          <StarRating value={p.rating} size={16} showNumber={p.rating > 0} />
        </div>
      </div>
    </Link>
  );
}
