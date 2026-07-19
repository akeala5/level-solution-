import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Providers from './providers'
import ServiceWorkerRegistration from '@/components/common/ServiceWorkerRegistration'
import CookieConsent from '@/components/common/CookieConsent'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { CompareBar, CompareDrawer } from '@/components/product/CompareDrawer'
import PWAInstallBanner from '@/components/common/PWAInstallBanner'
import '@/styles/globals.css'

const SITE_URL = 'https://shop.lsgrouptogo.com'

export const metadata: Metadata = {
  title: { default: 'LS Marketplace — Équipements Informatiques', template: '%s | LS Marketplace' },
  description: 'La marketplace N°1 pour acheter et vendre des équipements informatiques en Afrique. Ordinateurs, composants, périphériques — Paiement Mobile Money accepté.',
  keywords: ['marketplace', 'informatique', 'ordinateur', 'vente', 'achat', 'Togo', 'Afrique', 'Mobile Money'],
  authors: [{ name: 'LS Marketplace' }],
  creator: 'LS Marketplace',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'LS Marketplace',
    title: 'LS Marketplace — Équipements Informatiques',
    description: 'La marketplace N°1 pour acheter et vendre des équipements informatiques en Afrique.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LS Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LS Marketplace — Équipements Informatiques',
    description: 'La marketplace N°1 pour acheter et vendre des équipements informatiques en Afrique.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LS Marketplace',
  },
}

export const viewport: Viewport = {
  themeColor: '#1A3C6E',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'LS Marketplace',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description: 'La marketplace N°1 pour acheter et vendre des équipements informatiques en Afrique.',
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: ['French', 'English'] },
      areaServed: ['TG', 'CI', 'SN'],
    },
    {
      '@type': 'WebSite',
      name: 'LS Marketplace',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/products?search={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  const t = await getTranslations('common')

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.shop.lsgrouptogo.com" />
        <link rel="dns-prefetch" href="https://api.shop.lsgrouptogo.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-semibold">
          {t('skip_to_content')}
        </a>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ServiceWorkerRegistration />
            <div className="flex flex-col min-h-screen">
              <Header />
              <main id="main-content" className="flex-1 pt-[120px] md:pt-[104px]">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
            <CookieConsent />
            <CompareBar />
            <CompareDrawer />
            <PWAInstallBanner />
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
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
