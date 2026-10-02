import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BIEM ONE',
  description: 'BIEM Teknoloji iş ve operasyon yönetimi',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
