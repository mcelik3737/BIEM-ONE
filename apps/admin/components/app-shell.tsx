'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { navigationItems } from '../lib/navigation';
import { AuthUser, clearAuthSession, fetchCurrentUser, getAccessToken } from '../lib/auth-client';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [logoAvailable, setLogoAvailable] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }

    let isMounted = true;

    fetchCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          setIsCheckingSession(false);
        }
      })
      .catch(() => {
        clearAuthSession();
        router.replace('/login');
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  function handleLogout() {
    clearAuthSession();
    router.replace('/login');
    router.refresh();
  }

  if (isCheckingSession) {
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <p className="eyebrow">BIEM ONE</p>
          <h1>Oturum kontrol ediliyor</h1>
          <p className="muted">Operasyon çalışma alanınız hazırlanıyor.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          {logoAvailable ? (
            <Image
              className="brand-logo"
              src="/logo_png.png"
              alt="BIEM ONE"
              width={190}
              height={64}
              onError={() => setLogoAvailable(false)}
            />
          ) : (
            <>
              <p className="eyebrow">BIEM Teknoloji</p>
              <h1>BIEM ONE</h1>
            </>
          )}
          <p className="muted">Proje teslimatı ve servis için operasyon merkezi.</p>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              <span>{item.label}</span>
              <small>{item.description}</small>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="shell-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bugünün odağı</p>
            <h2>Teslimat operasyonlarına genel bakış</h2>
            {user ? (
              <p className="session-line">
                {user.fullName} · {user.company?.name ?? 'BIEM ONE'}
              </p>
            ) : null}
          </div>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Çıkış Yap
          </button>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
