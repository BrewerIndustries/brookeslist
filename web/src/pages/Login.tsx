import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../theme/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            <span className="text-brand-rose">Brooke's</span>
            <span className="text-brand-violet"> List</span>
          </h1>
          <p className="mt-2 text-sm text-ink/40">Sign in to continue</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-ink/5 p-6 ring-1 ring-ink/10">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/50">Email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-field px-3 py-2 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/50"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/50">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-field px-3 py-2 pr-10 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink/40 hover:text-ink/70"
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-500">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-rose-400 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-ink/30">Accounts are invite-only. Ask an admin for access.</p>
      </div>
    </div>
  );
}
