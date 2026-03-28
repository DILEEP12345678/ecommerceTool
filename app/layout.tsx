import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ToastProvider from '../components/ToastProvider';
import { Providers } from './providers';
import { UserProvider } from '../components/UserContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { PageTitleProvider } from '../components/PageTitleContext';
import { NotificationProvider } from '../components/NotificationContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SquadBid',
  description: 'Order products and collect from your nearest collection point',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/icons/icon-192x192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SquadBid',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="SquadBid" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SquadBid" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider>
            <PageTitleProvider>
              <NotificationProvider>
                <UserProvider>{children}</UserProvider>
              </NotificationProvider>
            </PageTitleProvider>
          </ThemeProvider>
        </Providers>
        <ToastProvider />
      </body>
    </html>
  );
}
