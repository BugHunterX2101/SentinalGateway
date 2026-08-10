'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import * as THREE from 'three'
import { useLive } from '@/hooks/use-live'

/*
 * Sentinel Gateway background scene.
 *
 * Rendered once per route behind every page (fixed, z-0, pointer-events-none).
 * It is deliberately cheap — Points + basic materials only, no lights, no
 * shadows, no post-processing — so it never competes with the app for frame
 * budget. The animation is driven by the real live telemetry store (the same
 * SSE stream the dashboards use), so incidents visibly accelerate and pulse
 * the field, and every route gets its own colour + motion personality.
 */

interface SceneTheme {
  primary: string
  secondary: string
  glow: string
  /** Motion multiplier — each route feels different. */
  speed: number
  /** Landing page already ships its own 3D hero — render a lighter field. */
  lite?: boolean
}

const THEMES: Record<string, SceneTheme> = {
  '/': { primary: '#00b8d4', secondary: '#ff6a52', glow: '#7cd6ff', speed: 1.0, lite: true },
  '/command-center': { primary: '#00b8d4', secondary: '#2dd4bf', glow: '#7cd6ff', speed: 1.1 },
  '/flow-canvas': { primary: '#7c4dff', secondary: '#00b8d4', glow: '#b8a4ff', speed: 1.35 },
  '/decisions': { primary: '#ffab40', secondary: '#ff7a1a', glow: '#ffd9a8', speed: 0.85 },
  '/sign-in': { primary: '#00b8d4', secondary: '#1a237e', glow: '#9adcf5', speed: 0.7 },
  '/sign-up': { primary: '#00b8d4', secondary: '#1a237e', glow: '#9adcf5', speed: 0.7 },
}
const FALLBACK: SceneTheme = THEMES['/command-center']

// Soft round sprite so particles render as glowing dots rather than squares.
function useDotTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.65)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

interface FieldProps {
  count: number
  color: string
  /** 1 drifts right, -1 drifts left — the two clouds cross for parallax depth. */
  dir: 1 | -1
  /** z-range of the cloud. */
  depth: [number, number]
  size: number
  baseOpacity: number
  speedMul: number
  stress: number
  intensity: number
}

function DriftField({ count, color, dir, depth, size, baseOpacity, speedMul, stress, intensity }: FieldProps) {
  const ref = useRef<THREE.Points>(null)
  const tex = useDotTexture()

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4) // speed, phase, baseY, baseZ
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13
      positions[i * 3 + 2] = depth[0] + Math.random() * (depth[1] - depth[0])
      seeds[i * 4 + 0] = 0.06 + Math.random() * 0.16
      seeds[i * 4 + 1] = Math.random() * Math.PI * 2
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 11
      seeds[i * 4 + 3] = depth[0] + Math.random() * (depth[1] - depth[0])
    }
    return { positions, seeds }
  }, [count, depth])

  useFrame((state, delta) => {
    // Never burn cycles while the tab is hidden.
    if (typeof document !== 'undefined' && document.hidden) return
    const pts = ref.current
    if (!pts) return
    const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    // Live telemetry drives the pace: incidents (stress) and throughput
    // (intensity) visibly speed the field up.
    const pace = speedMul * (0.55 + stress * 1.1) * (0.85 + intensity * 0.25)
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] += dt * seeds[i * 4 + 0] * pace * 6 * dir
      if (arr[i * 3 + 0] > 10) arr[i * 3 + 0] -= 20
      if (arr[i * 3 + 0] < -10) arr[i * 3 + 0] += 20
      // Organic bob in y, slow drift in z — both out of phase per particle.
      arr[i * 3 + 1] = seeds[i * 4 + 2] + Math.sin(t * 0.5 + seeds[i * 4 + 1]) * 0.8
      arr[i * 3 + 2] = seeds[i * 4 + 3] + Math.sin(t * 0.35 + seeds[i * 4 + 1] * 1.7) * 0.5
    }
    ;(pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        map={tex || undefined}
        size={size}
        transparent
        opacity={Math.min(0.85, baseOpacity + intensity * 0.18)}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={color}
        sizeAttenuation
      />
    </points>
  )
}

// Two thin wireframe orbits — cheap, and their slow tumble gives the whole
// scene an engineered, living feel without stealing attention.
function Orbits({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.rotation.x = Math.sin(t * 0.12) * 0.5
    group.current.rotation.y = t * 0.08
    group.current.rotation.z = Math.cos(t * 0.1) * 0.3
  })
  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.4, 0.012, 8, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0.6, 0]}>
        <torusGeometry args={[6.1, 0.008, 8, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

// Expanding rings that fire while an incident is live (open circuit or a
// high anomaly score) — the background literally reacts to real telemetry.
function IncidentPulses({ color, active }: { color: string; active: boolean }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const pool = useRef(
    Array.from({ length: 3 }, () => ({
      life: -1,
      pos: new THREE.Vector3(0, 0, 0),
    })),
  )
  const lastSpawn = useRef(-10)

  useFrame((state, delta) => {
    if (typeof document !== 'undefined' && document.hidden) return
    const now = state.clock.elapsedTime
    const rings = pool.current
    if (active && now - lastSpawn.current > 2.4) {
      const slot = rings.find((ring) => ring.life < 0)
      if (slot) {
        slot.life = 0
        slot.pos.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5, -2 - Math.random() * 3)
        lastSpawn.current = now
      }
    }
    for (let i = 0; i < rings.length; i++) {
      const mesh = meshes.current[i]
      if (!mesh) continue
      const ring = rings[i]
      if (ring.life < 0) {
        mesh.visible = false
        continue
      }
      ring.life += delta
      const p = Math.min(1, ring.life / 2.6)
      mesh.visible = true
      mesh.position.copy(ring.pos)
      mesh.scale.setScalar(0.2 + p * 2.4)
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.5
      if (p >= 1) {
        ring.life = -1
        mesh.visible = false
      }
    }
  })

  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el
          }}
          visible={false}
        >
          <ringGeometry args={[0.98, 1, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

export function BackgroundScene() {
  const pathname = usePathname()
  const theme = THEMES[pathname ?? ''] ?? FALLBACK
  const { kpis } = useLive()
  const stress = Math.min(1.2, kpis.errorRate / 10 + kpis.p99 / 400)
  const intensity = Math.min(1.2, kpis.rps / 100000)
  const incidentActive = kpis.openCircuits > 0 || kpis.peakAnomaly >= 60

  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Reduced-motion users get the static gradient backdrop only.
  if (reduced) return <div className="app-backdrop" aria-hidden="true" />

  const primaryCount = theme.lite ? 140 : 260
  const secondaryCount = theme.lite ? 80 : 160

  return (
    <div className="app-backdrop" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <DriftField
          count={primaryCount}
          color={theme.primary}
          dir={1}
          depth={[0.5, 3.5]}
          size={0.18}
          baseOpacity={0.34}
          speedMul={theme.speed}
          stress={stress}
          intensity={intensity}
        />
        <DriftField
          count={secondaryCount}
          color={theme.secondary}
          dir={-1}
          depth={[-7, -3]}
          size={0.1}
          baseOpacity={0.22}
          speedMul={theme.speed * 0.8}
          stress={stress}
          intensity={intensity}
        />
        {!theme.lite && <Orbits color={theme.glow} />}
        {!theme.lite && <IncidentPulses color={theme.secondary} active={incidentActive} />}
      </Canvas>
    </div>
  )
}

export default BackgroundScene
