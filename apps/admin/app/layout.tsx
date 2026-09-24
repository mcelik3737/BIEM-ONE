import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BIEM ONE Admin',
  description: 'Operations admin panel for Biem Teknoloji',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
