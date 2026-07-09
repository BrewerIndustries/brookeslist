import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useCanEdit } from '../auth/AuthContext';
import { ThemeToggle } from '../theme/ThemeContext';

const roleBadge: Record<string, string> = {
  admin: 'bg-rose-500/15 text-rose-500 ring-rose-500/30',
  editor: 'bg-violet-500/15 text-violet-500 ring-violet-500/30',
  viewer: 'bg-slate-500/15 text-slate-500 ring-slate-500/40',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const canEdit = useCanEdit();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const close = () => setMenu(false);
  const isAdmin = user?.role === 'admin';

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenu(false), [loc.pathname]);

  const navLink = 'rounded-lg px-3 py-1.5 text-sm text-ink/70 hover:bg-ink/10 hover:text-ink';
  const menuItem = 'rounded-lg px-3 py-2.5 text-left text-sm text-ink/80 hover:bg-ink/10';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center gap-2 py-4">
        <Link to="/" onClick={close} className="font-display mr-auto flex items-baseline">
          <span className="text-xl font-bold tracking-tight text-brand-rose sm:text-2xl">Brooke's</span>
          <span className="text-xl font-bold tracking-tight text-brand-violet sm:text-2xl">&nbsp;List</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {canEdit && loc.pathname === '/' && (
            <Link to="/profile/new" className="rounded-lg bg-rose-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-rose-500">
              + New profile
            </Link>
          )}
          <Link to="/support" className={navLink}>Support</Link>
          {isAdmin && <Link to="/admin" className={navLink}>Admin</Link>}
          {isAdmin && <Link to="/settings" className={navLink}>Settings</Link>}
          <ThemeToggle />
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadge[user!.role]}`}>{user?.role}</span>
          <button onClick={() => logout()} className={navLink}>Sign out</button>
        </nav>

        {/* Mobile theme toggle (next to the menu button) */}
        <div className="sm:hidden"><ThemeToggle /></div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenu((m) => !m)}
          className="grid h-10 w-10 place-items-center rounded-lg text-ink/70 hover:bg-ink/10 sm:hidden"
          aria-label="Menu"
          aria-expanded={menu}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menu ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                  : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>
      </header>

      {/* Mobile dropdown */}
      {menu && (
        <div className="mb-4 overflow-hidden rounded-xl bg-ink/5 ring-1 ring-ink/10 sm:hidden">
          <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
            <span className="truncate text-sm text-ink/60">{user?.display_name || user?.email}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadge[user!.role]}`}>{user?.role}</span>
          </div>
          <div className="flex flex-col p-2">
            {canEdit && <Link to="/profile/new" onClick={close} className={menuItem}>+ New profile</Link>}
            <Link to="/support" onClick={close} className={menuItem}>Support</Link>
            {isAdmin && <Link to="/admin" onClick={close} className={menuItem}>Admin</Link>}
            {isAdmin && <Link to="/settings" onClick={close} className={menuItem}>Settings</Link>}
            <button onClick={() => { close(); logout(); }} className={menuItem}>Sign out</button>
          </div>
        </div>
      )}

      <main>{children}</main>
    </div>
  );
}
