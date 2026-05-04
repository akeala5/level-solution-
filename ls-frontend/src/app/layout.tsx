import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Providers from './providers'
import ServiceWorkerRegistration from '@/components/common/ServiceWorkerRegistration'
import CookieConsent from '@/components/common/CookieConsent'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: { default: 'LS Marketplace — Équipements Informatiques', template: '%s | LS Marketplace' },
  description: 'La marketplace N°1 pour acheter et vendre des équipements informatiques en Afrique. Ordinateurs, composants, périphériques — Paiement Mobile Money accepté.',
  keywords: ['marketplace', 'informatique', 'ordinateur', 'vente', 'achat', 'Togo', 'Afrique', 'Mobile Money'],
  authors: [{ name: 'LS Marketplace' }],
  creator: 'LS Marketplace',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'LS Marketplace',
    title: 'LS Marketplace — Équipements Informatiques',
    description: 'La marketplace N°1 pour acheter et vendre des équipements informatiques en Afrique.',
  },
  robots: { index: true, follow: true },
  themeColor: '#1A3C6E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>
          <ServiceWorkerRegistration />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pt-[120px] md:pt-[104px]">
              {children}
            </main>
            <Footer />
          </div>
          <CookieConsent />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A2E',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '12px 16px',
              },
              success: { iconTheme: { primary: '#27AE60', secondary: '#fff' } },
              error: { iconTheme: { primary: '#E74C3C', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
