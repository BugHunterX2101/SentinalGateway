import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { BackgroundSceneHost } from '@/components/three/background-scene-host'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sentinel Gateway — The Self-Aware API Gateway',
  description:
    'Sentinel Gateway is an intelligent API gateway with real-time anomaly detection, adaptive traffic shaping, and self-healing circuit breaking. See your traffic think.',
  generator: 'v0.app',
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
