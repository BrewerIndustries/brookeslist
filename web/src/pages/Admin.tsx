import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Role, User } from '../lib/types';

const ROLES: Role[] = ['viewer', 'editor', 'admin'];

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', role: 'viewer', display_name: '' });
  const [busy, setBusy] = useState(false);

  const load = () => api.listUsers().then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createUser(form);
      setForm({ email: '', password: '', role: 'viewer', display_name: '' });
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function changeRole(u: User, role: string) {
    try {
      await api.updateUser(u.id, { role });
      await load();
    } catch (err: any) { setError(err.message); }
  }

  async function resetPassword(u: User) {
    const pw = prompt(`New password for ${u.email} (min 8 chars):`);
    if (!pw) return;
    try { await api.updateUser(u.id, { password: pw }); alert('Password updated.'); }
    catch (err: any) { setError(err.message); }
  }

  async function remove(u: User) {
    if (!confirm(`Delete ${u.email}?`)) return;
    try { await api.deleteUser(u.id); await load(); }
    catch (err: any) { setError(err.message); }
  }

  const input = 'rounded-lg bg-black/30 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-rose-400/40';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold">Users</h1>
      {error && <div className="mb-4 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</div>}

      <form onSubmit={create} className="mb-6 flex flex-wrap items-end gap-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div>
          <label className="mb-1 block text-xs text-white/40">Email</label>
          <input type="email" required className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/40">Password</label>
          <input type="text" required minLength={8} placeholder="min 8 chars" className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/40">Name</label>
          <input className={input} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/40">Role</label>
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50">
          Invite
        </button>
      </form>

      {!users ? (
        <div className="py-10 text-center text-white/40">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-4 py-2">{u.email}{u.id === me?.id && <span className="ml-1 text-xs text-white/30">(you)</span>}</td>
                  <td className="px-4 py-2 text-white/60">{u.display_name || '—'}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="rounded-md bg-black/30 px-2 py-1 text-xs ring-1 ring-white/10 disabled:opacity-40"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => resetPassword(u)} className="mr-3 text-xs text-white/40 hover:text-white">reset pw</button>
                    {u.id !== me?.id && (
                      <button onClick={() => remove(u)} className="text-xs text-white/40 hover:text-rose-300">delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
