'use client'

import dynamic from 'next/dynamic'

// `ssr: false` is only allowed inside a Client Component — the root layout is
// a Server Component, so this tiny host does the lazy mount. Three.js never
// ships in the initial HTML payload and hydrates asynchronously after first
// paint, so pages render instantly and the 3D backdrop fades in behind them.
const BackgroundScene = dynamic(
  () => import('@/components/three/background-scene').then((m) => m.BackgroundScene),
  { ssr: false, loading: () => null },
)

export function BackgroundSceneHost() {
  return <BackgroundScene />
}

export default BackgroundSceneHost
