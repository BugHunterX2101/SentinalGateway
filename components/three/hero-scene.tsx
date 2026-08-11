'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLive } from '@/hooks/use-live'

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
    g.addColorStop(0.45, 'rgba(210,240,255,0.95)')
    g.addColorStop(1, 'rgba(150,215,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

// The stream spans the full hero canvas (now full page width) and flows
// diagonally through the prism: tight beam at the centre, dispersing into a
// cloud at each end. Every particle is the same cyan — no end fade — and the
// cloud extends past the page edges on purpose, so particles enter and leave
// the frame naturally instead of being sliced by the canvas.
const COUNT = 900
const START = new THREE.Vector3(-5.8, -3.4, -2.0)
const END = new THREE.Vector3(5.8, 3.4, 2.0)

function ParticleStream({ intensity }: { intensity: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const tex = useDotTexture()

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT * 4) // t, offX, offY, speed
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 4 + 0] = Math.random()
      seeds[i * 4 + 1] = (Math.random() - 0.5) * 2
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 2
      seeds[i * 4 + 3] = 0.5 + Math.random() * 0.9
    }
    return { positions, seeds }
  }, [])

  useFrame((_, delta) => {
    const pts = pointsRef.current
    if (!pts) return
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < COUNT; i++) {
      let t = seeds[i * 4 + 0] + dt * 0.06 * seeds[i * 4 + 3] * (0.6 + intensity)
      if (t > 1) t -= 1
      seeds[i * 4 + 0] = t
      // narrow through the middle, wide at the ends
      const spread = 0.15 + Math.pow(Math.abs(t - 0.5) * 2, 2.2) * 1.5
      const x = START.x + (END.x - START.x) * t
      const y = START.y + (END.y - START.y) * t
      const z = START.z + (END.z - START.z) * t
      arr[i * 3 + 0] = x + seeds[i * 4 + 1] * spread
      arr[i * 3 + 1] = y + seeds[i * 4 + 2] * spread
      arr[i * 3 + 2] = z + seeds[i * 4 + 1] * spread * 0.6
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
      </bufferGeometry>
      <pointsMaterial
        map={tex || undefined}
        size={0.21}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={'#45c9f7'}
        sizeAttenuation
      />
    </points>
  )
}

// Full orbital rings around the prism, each carrying glowing satellites that
// ride the ring's tilted plane. Complete circles (no cut arc ends) with each
// ring spinning at its own rate; the whole system drifts slowly on world Y.
interface RingDef {
  r: number
  tube: number
  rot: [number, number, number]
  speed: number
  orbs: number
}

const RING_DEFS: RingDef[] = [
  { r: 2.5, tube: 0.026, rot: [0.6, 0.3, 0], speed: 0.9, orbs: 3 },
  { r: 3.1, tube: 0.02, rot: [1.15, 0.8, 0.4], speed: -0.65, orbs: 2 },
  { r: 3.6, tube: 0.017, rot: [0.25, 1.45, 0.9], speed: 0.5, orbs: 2 },
]

const RING_GROUP_ROT = new THREE.Euler(0.12, 0, 0)

function OrbitalRing({ def, stress }: { def: RingDef; stress: number }) {
  const orbsRef = useRef<THREE.Group>(null)
  useFrame((state) => {
    const orbs = orbsRef.current
    if (!orbs) return
    const t = state.clock.elapsedTime
    const rate = def.speed * (0.7 + stress * 0.9)
    orbs.children.forEach((child, k) => {
      const a = t * rate + (k / def.orbs) * Math.PI * 2
      ;(child as THREE.Mesh).position.set(def.r * Math.cos(a), def.r * Math.sin(a), 0)
    })
  })
  return (
    <group rotation={def.rot}>
      <mesh>
        <torusGeometry args={[def.r, def.tube, 16, 128]} />
        <meshStandardMaterial
          color={'#ff6a52'}
          emissive={'#ff6a52'}
          emissiveIntensity={0.55 + stress}
          roughness={0.35}
          metalness={0.15}
          transparent
          opacity={0.92}
        />
      </mesh>
      <group ref={orbsRef}>
        {Array.from({ length: def.orbs }, (_, k) => (
          <mesh key={k}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial
              color={'#ffd9cf'}
              emissive={'#ff6a52'}
              emissiveIntensity={1.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function RingSystem({ stress }: { stress: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12
  })
  return (
    <group ref={group} rotation={RING_GROUP_ROT}>
      {RING_DEFS.map((def, i) => (
        <OrbitalRing key={i} def={def} stress={stress} />
      ))}
    </group>
  )
}

// Refraction background: the exact pearl page colour (--background token) so
// the glass reads bright, not black, and blends with the page behind it.
const bgColor = new THREE.Color('#f4f6fb')

function Prism() {
  const group = useRef<THREE.Group>(null)
  // Shared cone geometry so the wireframe facets always match the glass body.
  const geometry = useMemo(() => new THREE.ConeGeometry(1, 1.7, 3), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry])
  useFrame((state) => {
    const g = group.current
    if (g) {
      g.rotation.y = state.clock.elapsedTime * 0.25
      g.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.15
    }
  })
  return (
    <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.35}>
      <group ref={group} position={[0.55, 0.25, 0]} scale={1.8}>
        <mesh geometry={geometry}>
          <MeshTransmissionMaterial
            transmission={1}
            thickness={0.6}
            roughness={0.04}
            ior={1.35}
            chromaticAberration={0.4}
            anisotropy={0.15}
            distortion={0.1}
            distortionScale={0.15}
            temporalDistortion={0.03}
            color={'#ffffff'}
            background={bgColor}
          />
        </mesh>
        {/* Indigo wireframe facets drawn on top keep the glass defined against
            the light page instead of reading as a flat grey shape. */}
        <lineSegments geometry={edges} renderOrder={2}>
          <lineBasicMaterial color={'#1a237e'} transparent opacity={0.3} />
        </lineSegments>
      </group>
    </Float>
  )
}

// Subtle parallax + breathing dolly. Listens on window because the hero
// container is pointer-events-none; the whole scene stays inside the frustum
// for the full range of motion (verified by pixel sampling).
function CameraRig() {
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
    const { camera } = state
    const t = state.clock.elapsedTime
    const tx = target.current.x * 0.35
    const ty = -target.current.y * 0.22 + Math.sin(t * 0.15) * 0.12
    camera.position.x += (tx - camera.position.x) * 0.04
    camera.position.y += (ty - camera.position.y) * 0.04
    camera.position.z = 9 + Math.sin(t * 0.1) * 0.25
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function HeroScene() {
  const { kpis } = useLive()
  // Feed live telemetry into the scene: higher error/latency = faster, angrier motion.
  const stress = Math.min(1, kpis.errorRate / 12 + kpis.p99 / 400)
  const intensity = Math.min(1.2, kpis.rps / 120000)

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} />
      <directionalLight position={[-5, -2, 2]} intensity={0.7} color={'#22c3e6'} />
      <pointLight position={[0, 3, 4]} intensity={30} color={'#ffffff'} />
      <pointLight position={[-3, -3, 3]} intensity={18} color={'#bfe6ff'} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 4]} scale={8} color="#ffffff" />
        <Lightformer form="rect" intensity={1.4} position={[-4, 0, 3]} scale={6} color="#cfeeff" />
        <Lightformer form="circle" intensity={0.8} position={[4, -2, 2]} scale={5} color="#ffd9cf" />
      </Environment>
      <CameraRig />
      <Prism />
      <ParticleStream intensity={intensity} />
      <RingSystem stress={stress} />
    </Canvas>
  )
}

export default HeroScene
