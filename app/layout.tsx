import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AmbientScene } from '@/components/three/ambient-scene'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sentinel Gateway - The Self-Aware API Gateway',
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
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <AmbientScene />
        </div>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
