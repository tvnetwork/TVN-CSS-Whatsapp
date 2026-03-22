import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TVN WhatsApp Pairing',
  description: 'Connect your WhatsApp instantly with the TVN pairing system.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
