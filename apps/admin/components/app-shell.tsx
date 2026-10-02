'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, ReactNode, useContext } from 'react';
import { useAction, useLoad } from '../lib/api';
import { User } from '../lib/types';
import { ErrorMessage } from './ui';
const Session = createContext<User | undefined>(undefined);
export const useUser = () => useContext(Session);
export const canManage = (user?: User) =>
  !!user?.roles.some((r) => ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER'].includes(r));
const navigation = [
  ['/dashboard', 'Genel bakış', '01'],
  ['/customers', 'Müşteriler', '02'],
  ['/suppliers', 'Tedarikçiler', '03'],
  ['/projects', 'İş dosyaları', '04'],
  ['/tasks', 'Görevler', '05'],
  ['/settings', 'Çalışma alanı', '06'],
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user, error, reload } = useLoad<User>('auth/me');
  const action = useAction();
  if (!user)
    return (
      <main className="auth-layout">
        <section className="panel-card">
          <h1>BIEM ONE</h1>
          {error ? (
            <>
              <ErrorMessage message={error} />
              <button onClick={reload}>Tekrar dene</button>
            </>
          ) : (
            <p>Çalışma alanı açılıyor…</p>
          )}
        </section>
      </main>
    );
  return (
    <Session.Provider value={user}>
      <div className="shell">
        <aside className="sidebar">
          <Link href="/dashboard" className="brand">
            <span className="brand-icon">B</span>
            <span>
              BIEM <b>ONE</b>
              <small>TEKNOLOJİ & OPERASYON</small>
            </span>
          </Link>
          <p className="nav-caption">ÇALIŞMA ALANI</p>
          <nav aria-label="Ana menü">
            {navigation.map(([href, label, no]) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname.startsWith(href) ? 'active' : ''}`}
                aria-current={pathname.startsWith(href) ? 'page' : undefined}
              >
                <small>{no}</small>
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span className="status-dot" /> İşinizin her aşaması, tek yerde.
          </div>
        </aside>
        <div className="shell-content">
          <header className="topbar">
            <span>
              BIEM Teknoloji <span className="muted">/ Çalışma alanı</span>
            </span>
            <div className="row">
              <span className="avatar">{user.fullName.slice(0, 1)}</span>
              <span>{user.fullName}</span>
              <button
                className="secondary compact"
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    const r = await fetch('/api/session/logout', { method: 'POST' });
                    if (!r.ok) throw new Error('Çıkış yapılamadı.');
                    window.location.assign('/login');
                  })
                }
              >
                Çıkış
              </button>
            </div>
          </header>
          <ErrorMessage message={action.error} />
          <main className="page-content">{children}</main>
        </div>
      </div>
    </Session.Provider>
  );
}
