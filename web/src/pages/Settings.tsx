import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../settings/SettingsContext';
import { api } from '../lib/api';
import type { AppConfig, ProfileCard, Units } from '../lib/types';

export default function Settings() {
  const { user } = useAuth();
  const { config, save } = useSettings();
  const [draft, setDraft] = useState<AppConfig>(config);
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  // keep the draft in sync when config loads/changes
  useEffect(() => { setDraft(config); }, [config]);
  useEffect(() => { api.listProfiles().then(setProfiles).catch(() => {}); }, []);

  if (user?.role !== 'admin') {
    return <div className="rounded-xl bg-rose-500/15 p-4 text-rose-500">Admins only.</div>;
  }

  function set<K extends keyof AppConfig>(k: K, v: AppConfig[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setStatus('idle');
  }

  async function onSave() {
    setStatus('saving');
    setError('');
    try {
      await save(draft);
      setStatus('saved');
    } catch (e: any) {
      setStatus('error');
      setError(e.message || 'Save failed');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-ink/40">App-wide configuration. Changes apply to everyone.</p>

      <div className="space-y-6">
        {/* Units */}
        <Section title="Units" subtitle="How height and weight are entered and displayed.">
          <div className="flex gap-2">
            {(['us', 'metric'] as Units[]).map((u) => (
              <button
                key={u}
                onClick={() => set('units', u)}
                className={`rounded-lg px-4 py-2 text-sm ring-1 ${
                  draft.units === u ? 'bg-rose-500 text-white ring-rose-400' : 'bg-ink/5 text-ink/70 ring-ink/10 hover:bg-ink/10'
                }`}
              >
                {u === 'us' ? 'US (ft / in, lb)' : 'Metric (cm, kg)'}
              </button>
            ))}
          </div>
        </Section>

        {/* Gold standard */}
        <Section title="Gold standard" subtitle="Feature one profile as the perfect candidate — its card glows gold with a star.">
          <select
            value={draft.gold_standard_id ?? ''}
            onChange={(e) => set('gold_standard_id', e.target.value || null)}
            className="w-full rounded-lg bg-field px-3 py-2 text-sm ring-1 ring-ink/10 outline-none focus:ring-amber-400/60"
          >
            <option value="">— None —</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {draft.gold_standard_id && (
            <p className="mt-2 text-xs text-amber-300">
              ★ {profiles.find((p) => p.id === draft.gold_standard_id)?.name ?? 'Selected profile'} is the gold standard.
            </p>
          )}
        </Section>

        {/* Body types */}
        <Section title="Body types" subtitle="The options offered when editing a profile's body type.">
          <ListEditor items={draft.body_types} onChange={(v) => set('body_types', v)} placeholder="Add a body type…" />
        </Section>

        {/* Custom stat presets */}
        <Section title="Custom stat labels" subtitle="Suggested labels in a profile's “Other stats” section.">
          <ListEditor items={draft.stat_presets} onChange={(v) => set('stat_presets', v)} placeholder="Add a stat label…" />
        </Section>

        {/* Ratings */}
        <Section title="Ratings" subtitle="How the 0–5 star rating behaves.">
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input
              type="checkbox"
              checked={draft.rating_half_steps}
              onChange={(e) => set('rating_half_steps', e.target.checked)}
              className="h-4 w-4 accent-rose-500"
            />
            Allow half-star ratings (e.g. 3.5)
          </label>
        </Section>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={status === 'saving'}
          className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span className="text-sm text-emerald-300">Saved ✓</span>}
        {status === 'error' && <span className="text-sm text-rose-300">{error}</span>}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink/5 p-5 ring-1 ring-ink/10">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-ink/40">{subtitle}</p>}
      {children}
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [entry, setEntry] = useState('');

  function add() {
    const v = entry.trim();
    if (!v || items.some((i) => i.toLowerCase() === v.toLowerCase())) { setEntry(''); return; }
    onChange([...items, v]);
    setEntry('');
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 py-1 pl-3 pr-1.5 text-sm">
            {item}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="grid h-5 w-5 place-items-center rounded-full text-ink/50 hover:bg-rose-500/30 hover:text-rose-500"
              aria-label={`Remove ${item}`}
            >×</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-sm text-ink/30">None yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg bg-field px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/40"
        />
        <button onClick={add} className="rounded-lg bg-ink/10 px-3 py-1.5 text-sm hover:bg-ink/20">Add</button>
      </div>
    </div>
  );
}
