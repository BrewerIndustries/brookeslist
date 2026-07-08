import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useCanEdit } from '../auth/AuthContext';
import { useSettings } from '../settings/SettingsContext';
import { cmToFt, ftInToCm, kgToLb, lbToKg } from '../lib/format';

interface FormState {
  name: string;
  birthday: string;
  ft: string;
  inch: string;
  cm: string;
  weight: string; // in the active display unit (lb or kg)
  body_type: string;
  notes: string;
  extra: { key: string; value: string }[];
}

const empty: FormState = { name: '', birthday: '', ft: '', inch: '', cm: '', weight: '', body_type: '', notes: '', extra: [] };

export default function ProfileEdit() {
  const { id } = useParams();
  const editing = !!id;
  const canEdit = useCanEdit();
  const navigate = useNavigate();
  const { config } = useSettings();
  const us = config.units === 'us';
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api.getProfile(id!).then(({ profile }) => {
      const h = profile.height_cm ? cmToFt(profile.height_cm) : null;
      const weight = profile.weight_kg == null
        ? ''
        : String(us ? kgToLb(profile.weight_kg) : Math.round(profile.weight_kg));
      setForm({
        name: profile.name,
        birthday: profile.birthday || '',
        ft: h ? String(h.ft) : '',
        inch: h ? String(h.inch) : '',
        cm: profile.height_cm ? String(profile.height_cm) : '',
        weight,
        body_type: profile.body_type || '',
        notes: profile.notes || '',
        extra: Object.entries(profile.extra || {}).map(([key, value]) => ({ key, value: String(value) })),
      });
    }).catch((e) => setError(e.message));
  }, [id, editing, us]);

  if (!canEdit) return <div className="rounded-xl bg-rose-500/15 p-4 text-rose-200">You don't have permission to edit.</div>;

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const height_cm = us
      ? (form.ft || form.inch ? ftInToCm(Number(form.ft || 0), Number(form.inch || 0)) : null)
      : (form.cm ? Math.round(Number(form.cm)) : null);
    const weight_kg = form.weight
      ? (us ? lbToKg(Number(form.weight)) : Math.round(Number(form.weight) * 10) / 10)
      : null;

    const extra: Record<string, string> = {};
    for (const { key, value } of form.extra) if (key.trim()) extra[key.trim()] = value;

    const payload = {
      name: form.name.trim(),
      birthday: form.birthday || null,
      height_cm,
      weight_kg,
      body_type: form.body_type || null,
      notes: form.notes || null,
      extra,
    };
    try {
      const saved = editing ? await api.updateProfile(id!, payload) : await api.createProfile(payload);
      navigate(`/profile/${saved.id}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  const input = 'w-full rounded-lg bg-black/30 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-rose-400/40';
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-white/40';

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-5 text-2xl font-bold">{editing ? 'Edit profile' : 'New profile'}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
        <div>
          <label className={label}>Name *</label>
          <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Birthday</label>
            <input type="date" className={input} value={form.birthday} onChange={(e) => set('birthday', e.target.value)} />
          </div>
          <div>
            <label className={label}>Body type</label>
            <input className={input} list="body-types" value={form.body_type} onChange={(e) => set('body_type', e.target.value)} />
            <datalist id="body-types">
              {config.body_types.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Height</label>
            {us ? (
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={8} placeholder="ft" className={input + ' w-20'} value={form.ft} onChange={(e) => set('ft', e.target.value)} />
                <span className="text-white/40">ft</span>
                <input type="number" min={0} max={11} placeholder="in" className={input + ' w-20'} value={form.inch} onChange={(e) => set('inch', e.target.value)} />
                <span className="text-white/40">in</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="number" min={0} placeholder="cm" className={input} value={form.cm} onChange={(e) => set('cm', e.target.value)} />
                <span className="text-white/40">cm</span>
              </div>
            )}
          </div>
          <div>
            <label className={label}>Weight</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} placeholder={us ? 'lb' : 'kg'} className={input} value={form.weight} onChange={(e) => set('weight', e.target.value)} />
              <span className="text-white/40">{us ? 'lb' : 'kg'}</span>
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea className={input} rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <div>
          <label className={label}>Other stats</label>
          <div className="space-y-2">
            {form.extra.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="Label" list="stat-presets" className={input} value={row.key}
                  onChange={(e) => set('extra', form.extra.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} />
                <input placeholder="Value" className={input} value={row.value}
                  onChange={(e) => set('extra', form.extra.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} />
                <button type="button" onClick={() => set('extra', form.extra.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 text-white/40 hover:text-rose-300">×</button>
              </div>
            ))}
            <datalist id="stat-presets">
              {config.stat_presets.map((s) => <option key={s} value={s} />)}
            </datalist>
            <button type="button" onClick={() => set('extra', [...form.extra, { key: '', value: '' }])}
              className="text-sm text-rose-300 hover:text-rose-200">+ Add stat</button>
          </div>
        </div>

        {error && <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50">
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create profile'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/10">Cancel</button>
        </div>
      </form>
      {!editing && <p className="mt-3 text-center text-xs text-white/30">You can add photos after creating the profile.</p>}
    </div>
  );
}
