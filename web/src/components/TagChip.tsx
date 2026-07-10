export default function TagChip({ tag, onRemove, size = 'md' }: { tag: string; onRemove?: () => void; size?: 'sm' | 'md' }) {
  const l = tag.toLowerCase();
  const cls = l.includes('green')
    ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-400/30'
    : l.includes('red')
      ? 'bg-rose-500/15 text-rose-400 ring-rose-400/30'
      : 'bg-ink/10 text-ink/70 ring-ink/15';
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ${cls} ${pad}`}>
      {tag}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100" aria-label={`Remove ${tag}`}>×</button>
      )}
    </span>
  );
}
