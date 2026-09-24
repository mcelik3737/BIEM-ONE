import { AppShell } from '../../components/app-shell';

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
