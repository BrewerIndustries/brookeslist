import { useState } from 'react';

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
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
                <Star size={size} color="rgba(255,255,255,0.16)" />
              </span>
              <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} color="#f5c518" />
              </span>
              {editable && (
                <>
                  <button
                    type="button"
                    aria-label={`${half ? i - 0.5 : i} stars`}
                    className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(half ? i - 0.5 : i)}
                    onClick={() => onChange!(half ? i - 0.5 : i)}
                  />
                  <button
                    type="button"
                    aria-label={`${i} stars`}
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
      {showNumber && <span className="ml-1 text-sm tabular-nums text-white/60">{shown.toFixed(1)}</span>}
    </div>
  );
}
