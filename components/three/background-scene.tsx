'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import * as THREE from 'three'
import { useLive } from '@/hooks/use-live'

/*
 * Sentinel Gateway background scene.
 *
 * Rendered once per route behind every page (fixed, z-0, pointer-events-none).
 * A layered, genuinely 3D composition:
 *
 *   1. Constellation — a slowly rotating shell of nodes linked to their
 *                     nearest neighbours — the "nervous system" motif.
 *   2. Shards       — a few drifting wireframe octahedra, hologram fragments.
 *   3. DriftField   — fast crossing foreground particles for parallax depth.
 *   4. IncidentPulses — expanding rings fired by real telemetry when a
 *                     circuit is open or the anomaly score is high.
 *
 * Everything is Points / basic materials (no lights, shadows, or
 * post-processing) so the whole scene costs a few draw calls and never
 * competes with the app for frame budget. The animation loop pauses when the
 * tab is hidden, the mouse parallax is window-level, every layer is scaled to
 * the current camera frustum so nothing ever clips, and reduced-motion users
 * get the static gradient only.
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

const CAMERA_Z = 10
const CAMERA_FOV = 50

// Scale factor that keeps a layer of the given half-extent inside the visible
// frustum on any screen, with margin for the camera's parallax drift.
function useFrustumFit(maxHalfExtent: number) {
  const size = useThree((s) => s.size)
  return useMemo(() => {
    const halfH = CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2)
    const halfW = halfH * (size.width / Math.max(1, size.height))
    return Math.min(1.15, Math.max(0.5, (halfW / maxHalfExtent) * 0.85))
  }, [size.width, size.height, maxHalfExtent])
}

function isHidden() {
  return typeof document !== 'undefined' && document.hidden
}

interface ConstellationProps {
  color: string
  glow: string
  speedMul: number
}

// A slow shell of linked nodes — the "nervous system" motif, far in the field.
function Constellation({ color, glow, speedMul }: ConstellationProps) {
  const group = useRef<THREE.Group>(null)
  const fit = useFrustumFit(7)

  const { nodePositions, linePositions, nodeCount } = useMemo(() => {
    const N = 28
    const R = 6.4
    const nodes: THREE.Vector3[] = Array.from({ length: N }, () => {
      const th = Math.acos(2 * Math.random() - 1)
      const ph = Math.random() * Math.PI * 2
      return new THREE.Vector3(
        R * Math.sin(th) * Math.cos(ph),
        R * Math.sin(th) * Math.sin(ph) * 0.62,
        R * Math.cos(th) * 0.7,
      )
    })
    const pairs: number[] = []
    for (let i = 0; i < N; i++) {
      const dists = nodes
        .map((n, j) => ({ d: i === j ? Infinity : n.distanceTo(nodes[i]), j }))
        .sort((a, b) => a.d - b.d)
      for (const { j } of dists.slice(0, 2)) if (j > i) pairs.push(i, j)
    }
    const nodePositions = new Float32Array(N * 3)
    nodes.forEach((n, i) => {
      nodePositions[i * 3 + 0] = n.x
      nodePositions[i * 3 + 1] = n.y
      nodePositions[i * 3 + 2] = n.z
    })
    const linePositions = new Float32Array(pairs.length * 3)
    pairs.forEach((idx, k) => {
      const n = nodes[idx]
      linePositions[k * 3 + 0] = n.x
      linePositions[k * 3 + 1] = n.y
      linePositions[k * 3 + 2] = n.z
    })
    return { nodePositions, linePositions, nodeCount: N }
  }, [])

  useFrame((state) => {
    if (isHidden()) return
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    g.rotation.y = t * 0.045 * speedMul
    g.rotation.x = Math.sin(t * 0.06) * 0.22
    g.rotation.z = Math.cos(t * 0.05) * 0.12
  })

  return (
    <group ref={group} scale={fit}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} count={nodeCount} />
        </bufferGeometry>
        <pointsMaterial size={0.055} transparent opacity={0.55} depthWrite={false} color={glow} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} count={linePositions.length / 3} />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

interface ShardProps {
  color: string
  speedMul: number
}

// Drifting wireframe fragments — cheap hologram accents.
function Shards({ color, speedMul }: ShardProps) {
  const group = useRef<THREE.Group>(null)
  const fit = useFrustumFit(9)

  const shards = useMemo(() => {
    const count = 5
    return Array.from({ length: count }, (_, i) => ({
      seed: i * 1.7,
      base: new THREE.Vector3(
        (Math.random() - 0.5) * 16 * Math.min(1, fit / 0.85),
        (Math.random() - 0.5) * 8 * Math.min(1, fit / 0.85),
        -2 - Math.random() * 5,
      ),
      scale: 0.22 + Math.random() * 0.34,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      sx: (Math.random() - 0.5) * 0.55,
      sy: (Math.random() - 0.5) * 0.55,
      sz: (Math.random() - 0.5) * 0.55,
    }))
  }, [fit])

  useFrame((state) => {
    if (isHidden()) return
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    shards.forEach((s, i) => {
      const m = g.children[i] as THREE.Mesh | undefined
      if (!m) return
      m.rotation.x = s.rx + s.sx * t * speedMul
      m.rotation.y = s.ry + s.sy * t * speedMul
      m.rotation.z = s.rz + s.sz * t * speedMul
      m.position.y = s.base.y + Math.sin(t * 0.35 + s.seed) * 0.35
      m.position.x = s.base.x + Math.cos(t * 0.22 + s.seed) * 0.4
    })
  })

  return (
    <group ref={group}>
      {shards.map((s, i) => (
        <mesh key={i} position={[s.base.x, s.base.y, s.base.z]} scale={s.scale}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.24} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
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
    if (isHidden()) return
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
    if (isHidden()) return
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

// Window-level mouse parallax + a slow breathing dolly. Every layer is
// frustum-fitted, so the parallax never exposes an edge.
function CameraRig({ speedMul }: { speedMul: number }) {
  const target = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  useFrame((state) => {
    if (isHidden()) return
    const { camera } = state
    const t = state.clock.elapsedTime
    const tx = target.current.x * 0.4 * speedMul
    const ty = -target.current.y * 0.26 * speedMul
    camera.position.x += (tx - camera.position.x) * 0.03
    camera.position.y += (ty - camera.position.y) * 0.03
    camera.position.z = CAMERA_Z + Math.sin(t * 0.11) * 0.3
    camera.lookAt(0, 0, 0)
  })
  return null
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

  const primaryCount = theme.lite ? 150 : 260
  const secondaryCount = theme.lite ? 60 : 140

  return (
    <div className="app-backdrop" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <CameraRig speedMul={theme.speed} />
        {!theme.lite && <Constellation color={theme.primary} glow={theme.glow} speedMul={theme.speed} />}
        {!theme.lite && <Shards color={theme.secondary} speedMul={theme.speed} />}
        <DriftField
          count={primaryCount}
          color={theme.primary}
          dir={1}
          depth={[0.5, 3.5]}
          size={0.16}
          baseOpacity={0.3}
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
          baseOpacity={0.2}
          speedMul={theme.speed * 0.8}
          stress={stress}
          intensity={intensity}
        />
        <IncidentPulses color={theme.secondary} active={incidentActive} />
      </Canvas>
    </div>
  )
}

export default BackgroundScene
