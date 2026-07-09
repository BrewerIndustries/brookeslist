import { useState } from 'react';
import { useSettings } from '../settings/SettingsContext';

const PATHS = {
  star: 'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
};

function Icon({ size, color, d }: { size: number; color: string; d: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d={d} />
    </svg>
  );
}

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  showNumber?: boolean;
  half?: boolean;
}

export default function StarRating({ value, onChange, size = 22, showNumber = true, half = true }: Props) {
  const { config } = useSettings();
  const d = PATHS[config.rating_icon] ?? PATHS.star;
  const fillColor = config.rating_icon === 'heart' ? '#fb7185' : '#f5c518';
  const editable = !!onChange;
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(null)}>
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, shown - (i - 1)));
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <span className="pointer-events-none absolute inset-0">
                <Icon size={size} color="rgba(127,127,127,0.28)" d={d} />
              </span>
              <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Icon size={size} color={fillColor} d={d} />
              </span>
              {editable && (
                <>
                  <button
                    type="button"
                    aria-label={`${half ? i - 0.5 : i}`}
                    className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(half ? i - 0.5 : i)}
                    onClick={() => onChange!(half ? i - 0.5 : i)}
                  />
                  <button
                    type="button"
                    aria-label={`${i}`}
                    className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => onChange!(i)}
                  />
                </>
              )}
            </span>
          );
        })}
      </div>
      {showNumber && <span className="ml-1 text-sm tabular-nums text-ink/60">{shown.toFixed(1)}</span>}
    </div>
  );
}
