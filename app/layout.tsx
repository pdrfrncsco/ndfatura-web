import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'FACTURYAN - SaaS ERP Facturação Certificada pela AGT',
  description: 'SaaS ERP Billing and Electronic Invoicing platform ready for AGT compliance in Angola.',
  manifest: '/manifest.json',
  themeColor: '#0B0F19',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-AO">
      <body suppressHydrationWarning className="antialiased font-sans">{children}</body>
    </html>
  );
}
