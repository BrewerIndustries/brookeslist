import { Link } from 'react-router-dom';
import type { ProfileCard as Card } from '../lib/types';
import { photoUrl } from '../lib/api';
import { formatHeight } from '../lib/format';
import { useSettings } from '../settings/SettingsContext';
import StarRating from './StarRating';

export default function ProfileCard({ p }: { p: Card }) {
  const { config } = useSettings();
  const isGold = config.gold_standard_id === p.id;
  const stats = [p.sign, p.body_type, formatHeight(p.height_cm, config.units)].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/profile/${p.id}`}
      className={`group block overflow-hidden rounded-2xl bg-ink/5 ring-1 transition ${
        isGold ? 'gold-glow ring-amber-400/70' : 'ring-ink/10 hover:bg-ink/10 hover:ring-ink/20'
      }`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-violet-500/20 to-rose-500/20">
        {p.photo_key ? (
          <img
            src={photoUrl(p.photo_key)}
            alt={p.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-black text-ink/25">
            {p.name.charAt(0).toUpperCase()}
          </div>
        )}
        {isGold && (
          <div className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-black shadow-lg ring-2 ring-amber-200/60" title="Gold standard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className={`p-3 ${isGold ? 'bg-amber-400/10' : ''}`}>
        <div className="flex items-center gap-1 truncate text-base font-semibold text-ink">
          {isGold && <span className="text-amber-400">★</span>}
          <span className="truncate">{p.name}</span>
        </div>
        {stats && <div className="mt-0.5 truncate text-xs text-ink/50">{stats}</div>}
        <div className="mt-2">
          <StarRating value={p.rating} size={16} showNumber={p.rating > 0} />
        </div>
      </div>
    </Link>
  );
}
