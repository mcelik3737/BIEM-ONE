import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '../../components/app-shell';

export default async function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  if (!jar.has('biem_access') && !jar.has('biem_refresh')) redirect('/login');
  return <AppShell>{children}</AppShell>;
}
