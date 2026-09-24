import Link from 'next/link';
import { ReactNode } from 'react';
import { navigationItems } from '../lib/navigation';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">BIEM Teknoloji</p>
          <h1>BIEM ONE</h1>
          <p className="muted">Mobile-first operations hub for project delivery and service.</p>
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
            <p className="eyebrow">Today&apos;s focus</p>
            <h2>Delivery operations at a glance</h2>
          </div>
          <Link href="/login" className="ghost-button">
            Switch User
          </Link>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
