import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useCanEdit } from '../auth/AuthContext';

const roleBadge: Record<string, string> = {
  admin: 'bg-rose-500/20 text-rose-200 ring-rose-400/30',
  editor: 'bg-violet-500/20 text-violet-200 ring-violet-400/30',
  viewer: 'bg-slate-500/20 text-slate-200 ring-slate-400/30',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const canEdit = useCanEdit();
  const loc = useLocation();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center gap-3 py-5">
        <Link to="/" className="mr-auto flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-rose-200">Brookes</span>
          <span className="text-2xl font-black tracking-tight text-violet-300">list</span>
        </Link>

        {canEdit && loc.pathname === '/' && (
          <Link
            to="/profile/new"
            className="rounded-lg bg-rose-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-rose-500"
          >
            + New profile
          </Link>
        )}
        {user?.role === 'admin' && (
          <>
            <Link to="/admin" className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white">
              Admin
            </Link>
            <Link to="/settings" className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white">
              Settings
            </Link>
          </>
        )}

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-white/60 sm:inline">{user?.display_name || user?.email}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadge[user!.role]}`}>
            {user?.role}
          </span>
          <button
            onClick={() => logout()}
            className="rounded-lg px-2.5 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
