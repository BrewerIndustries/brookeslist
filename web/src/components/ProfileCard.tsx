import { Link } from 'react-router-dom';
import type { ProfileCard as Card } from '../lib/types';
import { photoUrl } from '../lib/api';
import { formatHeight, formatWeight } from '../lib/format';
import { useSettings } from '../settings/SettingsContext';
import StarRating from './StarRating';

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink/40">{label}</div>
      <div className="break-words text-sm leading-snug text-ink/80">{value}</div>
    </div>
  );
}

export default function ProfileCard({ p }: { p: Card }) {
  const { config } = useSettings();
  const isGold = config.gold_standard_id === p.id;

  return (
    <Link
      to={`/profile/${p.id}`}
      className={`group flex aspect-square overflow-hidden rounded-2xl bg-ink/5 ring-1 transition ${
        isGold ? 'gold-glow ring-amber-400/70' : 'ring-ink/10 hover:bg-ink/10 hover:ring-ink/20'
      }`}
    >
      {/* Left: photo — the larger column (~60%), full card height */}
      <div className="relative h-full basis-3/5 shrink-0 overflow-hidden bg-gradient-to-br from-violet-500/20 to-rose-500/20">
        {p.photo_key ? (
          <img
            src={photoUrl(p.photo_key)}
            alt={p.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            style={{ objectPosition: `${p.photo_focal_x}% ${p.photo_focal_y}%` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-black text-ink/25">
            {p.name.charAt(0).toUpperCase()}
          </div>
        )}
        {isGold && (
          <div className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-amber-400 text-black shadow-lg ring-2 ring-amber-200/60" title="Gold standard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Right: name + stacked stat list + rating (smaller column) */}
      <div className={`flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden p-3 ${isGold ? 'bg-amber-400/10' : ''}`}>
        <div className="flex items-center gap-1.5 text-base font-semibold text-ink">
          {isGold && <span className="text-amber-400">★</span>}
          <span className="truncate">{p.name}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          <Row label="Sign" value={p.sign} />
          <Row label="Body" value={p.body_type} />
          <Row label="Height" value={formatHeight(p.height_cm, config.units)} />
          <Row label="Weight" value={formatWeight(p.weight_kg, config.units)} />
        </div>
        <div className="shrink-0 pt-1">
          <StarRating value={p.rating} size={15} showNumber={p.rating > 0} />
        </div>
      </div>
    </Link>
  );
}
