import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-rose-200">Brooke's</span>
            <span className="text-violet-300"> List</span>
          </h1>
          <p className="mt-2 text-sm text-white/40">Sign in to continue</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">Email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-rose-400/50"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-rose-400/50"
              required
            />
          </div>
          {error && <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-rose-400 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-white/30">Accounts are invite-only. Ask an admin for access.</p>
      </div>
    </div>
  );
}
