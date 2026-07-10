import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, photoUrl } from '../lib/api';
import type { DateLog, Photo, ProfileDetail as Detail } from '../lib/types';
import { useCanEdit } from '../auth/AuthContext';
import { useSettings } from '../settings/SettingsContext';
import { formatDate, formatHeight, formatWeight } from '../lib/format';
import { zodiacSymbol, zodiacColor } from '../lib/zodiac';
import { celebrate } from '../lib/confetti';
import StarRating from '../components/StarRating';
import TagChip from '../components/TagChip';

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ProfileDetail() {
  const { id = '' } = useParams();
  const canEdit = useCanEdit();
  const navigate = useNavigate();
  const { config } = useSettings();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [focal, setFocal] = useState({ x: 50, y: 50 });
  const [savingFocal, setSavingFocal] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const load = () => api.getProfile(id).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (error) return <div className="rounded-xl bg-rose-500/15 p-4 text-rose-500">{error}</div>;
  if (!data) return <div className="py-20 text-center text-ink/40">Loading…</div>;

  const { profile, photos, dates } = data;
  const isGold = config.gold_standard_id === profile.id;

  async function setRating(v: number) {
    await api.setRating(id, v);
    setData((d) => (d ? { ...d, profile: { ...d.profile, rating: v } } : d));
    if (v >= 5) celebrate();
  }

  async function setStatus(v: string) {
    await api.updateProfile(id, { status: v });
    setData((d) => (d ? { ...d, profile: { ...d.profile, status: v } } : d));
  }

  async function upload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await api.addPhoto(id, file);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); }
  }

  async function uploadFromUrl(e: FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setError('');
    setUploading(true);
    try {
      await api.addPhotoUrl(id, urlInput.trim());
      setUrlInput('');
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); }
  }

  async function removePhoto(photo: Photo) {
    if (!confirm('Delete this photo?')) return;
    await api.deletePhoto(photo.id);
    setActive(0);
    await load();
  }

  async function movePhoto(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const ids = photos.map((p) => p.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setActive(j);
    await api.reorderPhotos(id, ids);
    await load();
  }

  async function removeProfile() {
    if (!confirm(`Delete ${profile.name}? This cannot be undone.`)) return;
    await api.deleteProfile(id);
    navigate('/');
  }

  function startReposition() {
    const ph = photos[active];
    setFocal({ x: ph.focal_x, y: ph.focal_y });
    setRepositioning(true);
  }
  function onDragStart(e: React.PointerEvent) {
    if (!repositioning) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function onDragMove(e: React.PointerEvent) {
    if (!repositioning || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    // dragging the image reveals the opposite edge → move focal against the drag
    setFocal((f) => ({ x: clamp(f.x - dx * 0.3), y: clamp(f.y - dy * 0.3) }));
  }
  async function saveFocal() {
    setSavingFocal(true);
    setError('');
    try {
      await api.updatePhotoFocal(photos[active].id, Math.round(focal.x), Math.round(focal.y));
      await load();
      setRepositioning(false);
    } catch (err: any) { setError(err.message); }
    finally { setSavingFocal(false); }
  }
  async function removeBg() {
    setBgBusy(true);
    setBgError('');
    const addedIndex = photos.length; // new photo appends to the end
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const srcBlob = await (await fetch(photoUrl(photos[active].r2_key), { credentials: 'include' })).blob();
      const cutout = await removeBackground(srcBlob);
      // Cap size (a full-res PNG w/ alpha can blow past the 10MB upload limit → 413).
      const file = await downscalePng(cutout, 1400);
      await api.addPhoto(id, file);
      await load();
      setActive(addedIndex);
    } catch (err: any) {
      setBgError(err?.message ? `Couldn't remove background: ${err.message}` : 'Background removal failed.');
    } finally { setBgBusy(false); }
  }

  // Downscale + re-encode a PNG (preserving transparency) so uploads stay small.
  async function downscalePng(blob: Blob, maxDim: number): Promise<File> {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    const out: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/png'),
    );
    return new File([out], `nobg-${Date.now()}.png`, { type: 'image/png' });
  }

  const extraEntries = Object.entries(profile.extra || {});
  const activePhoto = photos[active];
  const objectPosition = activePhoto
    ? (repositioning ? `${focal.x}% ${focal.y}%` : `${activePhoto.focal_x}% ${activePhoto.focal_y}%`)
    : undefined;

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-ink/50 hover:text-ink">← Catalog</Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* ---- Left: photos ---- */}
        <div>
          <div className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/20 to-rose-500/20 ring-1 ${isGold ? 'gold-glow ring-amber-400/70' : 'ring-ink/10'}`}>
            {activePhoto ? (
              <img
                src={photoUrl(activePhoto.r2_key)}
                alt={profile.name}
                draggable={false}
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={() => (dragRef.current = null)}
                className={`h-full w-full select-none object-cover ${repositioning ? 'cursor-move touch-none' : ''}`}
                style={{ objectPosition }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-7xl font-black text-ink/25">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            {repositioning && (
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/60 px-3 py-1.5 text-center text-xs text-white">
                Drag the photo to reposition
              </div>
            )}
            {bgBusy && (
              <div className="absolute inset-0 grid place-items-center bg-black/50">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
              </div>
            )}
            {isGold && !repositioning && !bgBusy && (
              <div className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-black shadow-lg ring-2 ring-amber-200/60" title="Gold standard">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
                </svg>
              </div>
            )}
          </div>

          {canEdit && activePhoto && (
            <div className="mt-2 flex flex-wrap gap-2">
              {repositioning ? (
                <>
                  <button onClick={saveFocal} disabled={savingFocal} className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50">
                    {savingFocal ? 'Saving…' : 'Save position'}
                  </button>
                  <button onClick={() => setRepositioning(false)} className="rounded-lg px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/10">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={startReposition} className="rounded-lg bg-ink/10 px-3 py-1.5 text-sm hover:bg-ink/20">Reposition</button>
                  <button onClick={removeBg} disabled={bgBusy} className="flex items-center gap-2 rounded-lg bg-ink/10 px-3 py-1.5 text-sm hover:bg-ink/20 disabled:opacity-50">
                    {bgBusy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink/80" />}
                    Remove background
                  </button>
                </>
              )}
            </div>
          )}
          {bgError && <p className="mt-1 text-xs text-rose-500">{bgError}</p>}
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((ph, i) => (
                <div key={ph.id} className="relative">
                  <button
                    onClick={() => setActive(i)}
                    className={`relative block h-16 w-14 overflow-hidden rounded-lg ring-2 ${i === active ? 'ring-rose-400' : 'ring-transparent'}`}
                  >
                    <img src={photoUrl(ph.r2_key)} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${ph.focal_x}% ${ph.focal_y}%` }} />
                    {i === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-rose-500/90 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">On card</span>
                    )}
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => removePhoto(ph)}
                        className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-black/80 text-xs text-white/80 ring-1 ring-white/20 hover:text-rose-300"
                        title="Delete photo"
                      >×</button>
                      {photos.length > 1 && (
                        <div className="mt-1 flex justify-center gap-1">
                          <button onClick={() => movePhoto(i, -1)} disabled={i === 0} title="Move left"
                            className="grid h-5 w-6 place-items-center rounded bg-ink/10 text-xs hover:bg-ink/20 disabled:opacity-30">◀</button>
                          <button onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} title="Move right"
                            className="grid h-5 w-6 place-items-center rounded bg-ink/10 text-xs hover:bg-ink/20 disabled:opacity-30">▶</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <div className="mt-3 space-y-2">
              <form onSubmit={upload} className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="block w-full text-xs text-ink/50 file:mr-2 file:rounded-md file:border-0 file:bg-ink/10 file:px-2 file:py-1 file:text-ink/80" />
                <button type="submit" disabled={uploading} className="shrink-0 rounded-lg bg-ink/10 px-3 py-1.5 text-sm hover:bg-ink/20 disabled:opacity-50">Upload</button>
              </form>
              <form onSubmit={uploadFromUrl} className="flex items-center gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="…or paste an image URL"
                  className="min-w-0 flex-1 rounded-lg bg-field px-3 py-1.5 text-xs ring-1 ring-ink/10 outline-none focus:ring-rose-400/40"
                />
                <button type="submit" disabled={uploading || !urlInput.trim()} className="shrink-0 rounded-lg bg-ink/10 px-3 py-1.5 text-sm hover:bg-ink/20 disabled:opacity-50">
                  {uploading ? '…' : 'Add'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ---- Right: details ---- */}
        <div>
          {isGold && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/40">
              ★ Gold standard
            </div>
          )}
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="mr-auto bg-gradient-to-r from-rose-400 to-violet-500 bg-clip-text text-3xl font-bold text-transparent">{profile.name}</h1>
            {canEdit && (
              <div className="flex gap-2">
                <Link to={`/profile/${id}/edit`} className="rounded-lg bg-ink/10 px-3 py-1.5 text-sm hover:bg-ink/20">Edit</Link>
                <button onClick={removeProfile} className="rounded-lg px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/15">Delete</button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StarRating value={profile.rating} size={28} half={config.rating_half_steps} onChange={canEdit ? setRating : undefined} />
            {canEdit ? (
              <select value={profile.status || 'active'} onChange={(e) => setStatus(e.target.value)}
                className="rounded-full bg-ink/10 px-3 py-1 text-xs font-medium ring-1 ring-ink/10 outline-none">
                {config.statuses.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
              </select>
            ) : (
              <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-medium">{cap(profile.status || 'active')}</span>
            )}
          </div>

          {profile.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.tags.map((t) => <TagChip key={t} tag={t} />)}
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Stat label="Birthday" value={formatDate(profile.birthday)} />
            {profile.sign && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink/40">Sign</dt>
                <dd className="mt-0.5 flex flex-col items-start leading-none">
                  <span className={`text-3xl ${zodiacColor(profile.sign)}`}>{zodiacSymbol(profile.sign) ?? '★'}</span>
                  <span className="mt-1 text-xs text-ink/70">{profile.sign}</span>
                </dd>
              </div>
            )}
            <Stat label="Height" value={formatHeight(profile.height_cm, config.units)} />
            <Stat label="Weight" value={formatWeight(profile.weight_kg, config.units)} />
            <Stat label="Body type" value={profile.body_type} />
            {extraEntries.map(([k, v]) => <Stat key={k} label={k} value={v} />)}
          </dl>

          <NotesSection profileId={id} notes={profile.notes} canEdit={canEdit} onChange={load} />

          <DateLogSection profileId={id} dates={dates} canEdit={canEdit} onChange={load} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-0.5 break-words text-ink/90">{value}</dd>
    </div>
  );
}

function PlusButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-sm font-bold leading-none text-white hover:bg-rose-400">+</button>
  );
}

function NotesSection({ profileId, notes, canEdit, onChange }: { profileId: string; notes: string | null; canEdit: boolean; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.updateProfile(profileId, { notes: draft.trim() || null });
      setEditing(false);
      await onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-6">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/40">Notes</h2>
        {canEdit && !editing && <PlusButton title="Add / edit notes" onClick={() => { setDraft(notes || ''); setEditing(true); }} />}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="Add notes…"
            className="w-full rounded-lg bg-field px-3 py-2 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/40" />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/10">Cancel</button>
          </div>
        </div>
      ) : notes ? (
        <p className="whitespace-pre-wrap break-words text-sm text-ink/80">{notes}</p>
      ) : (
        <p className="text-sm text-ink/30">No notes yet.</p>
      )}
    </div>
  );
}

function DateLogSection({ profileId, dates, canEdit, onChange }: { profileId: string; dates: DateLog[]; canEdit: boolean; onChange: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ occurred_on: '', title: '', location: '', notes: '' });

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.addDate(profileId, form);
    setForm({ occurred_on: '', title: '', location: '', notes: '' });
    setOpen(false);
    await onChange();
  }

  async function del(d: DateLog) {
    if (!confirm('Delete this entry?')) return;
    await api.deleteDate(d.id);
    await onChange();
  }

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/40">Date log</h2>
        {canEdit && (open
          ? <button onClick={() => setOpen(false)} className="text-sm text-ink/50 hover:text-ink">Cancel</button>
          : <PlusButton title="Add date entry" onClick={() => setOpen(true)} />)}
      </div>

      {open && (
        <form onSubmit={add} className="mb-4 space-y-2 rounded-xl bg-ink/5 p-4 ring-1 ring-ink/10">
          <div className="flex flex-wrap gap-2">
            <input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
              className="rounded-lg bg-field px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none" />
            <input placeholder="Title (e.g. Dinner at Nobu)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="min-w-40 flex-1 rounded-lg bg-field px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none" />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="rounded-lg bg-field px-3 py-1.5 text-sm ring-1 ring-ink/10 outline-none" />
          </div>
          <textarea placeholder="Notes…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-lg bg-field px-3 py-2 text-sm ring-1 ring-ink/10 outline-none" rows={3} />
          <button type="submit" className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-400">Save entry</button>
        </form>
      )}

      {dates.length === 0 ? (
        <p className="text-sm text-ink/30">No dates logged yet.</p>
      ) : (
        <ol className="space-y-3 border-l border-ink/10 pl-4">
          {dates.map((d) => (
            <li key={d.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-rose-400" />
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink/90">{d.title || 'Date'}</span>
                {d.occurred_on && <span className="text-xs text-ink/40">{formatDate(d.occurred_on)}</span>}
                {d.location && <span className="text-xs text-ink/40">· {d.location}</span>}
                {canEdit && <button onClick={() => del(d)} className="ml-auto text-xs text-ink/30 hover:text-rose-300">delete</button>}
              </div>
              {d.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-ink/60">{d.notes}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
