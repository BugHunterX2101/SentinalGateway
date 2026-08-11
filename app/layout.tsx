import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { BackgroundSceneHost } from '@/components/three/background-scene-host'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sentinalgateway-eta.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Sentinel Gateway — The Self-Aware API Gateway',
  description:
    'Sentinel Gateway is an intelligent API gateway with real-time anomaly detection, adaptive traffic shaping, and self-healing circuit breaking. See your traffic think.',
  applicationName: 'Sentinel Gateway',
  icons: {
    icon: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }, { url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Sentinel Gateway',
    title: 'Sentinel Gateway — The Self-Aware API Gateway',
    description:
      'Sentinel Gateway is an intelligent API gateway with real-time anomaly detection, adaptive traffic shaping, and self-healing circuit breaking. See your traffic think.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sentinel Gateway shield mark' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sentinel Gateway — The Self-Aware API Gateway',
    description:
      'Sentinel Gateway is an intelligent API gateway with real-time anomaly detection, adaptive traffic shaping, and self-healing circuit breaking.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f6fb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <BackgroundSceneHost />
        <div className="relative z-10">{children}</div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
