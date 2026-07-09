'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLive } from '@/hooks/use-live'

const COUNT = 420
// Half-width large enough to span the full visible area at camera distance 12,
// FOV 50. Particles start off-screen on the left and wrap back from the right,
// so they always travel a full page-width before reappearing — never cutting off
// abruptly in the middle.
const HALF_W = 18

function Field({ stress }: { stress: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const velocities = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * HALF_W * 2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
      velocities[i] = 0.1 + Math.random() * 0.4
    }
    return { positions, velocities }
  }, [])

  useFrame((_, delta) => {
    const pts = ref.current
    if (!pts) return
    const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 0] += dt * velocities[i] * (0.5 + stress)
      // Wrap at the far edge so the particle re-enters from the opposite edge,
      // travelling the full width without popping in the middle of the screen.
      if (arr[i * 3 + 0] > HALF_W) arr[i * 3 + 0] = -HALF_W
    }
    ;(pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={'#22c3e6'}
        sizeAttenuation
      />
    </points>
  )
}

function Shards() {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (group.current) group.current.rotation.y = state.clock.elapsedTime * 0.06
  })
  const shards = useMemo(
    () =>
      Array.from({ length: 5 }, () => ({
        pos: [(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 9, -3 - Math.random() * 4] as const,
        scale: 0.5 + Math.random() * 0.9,
      })),
    [],
  )
  return (
    <group ref={group}>
      {shards.map((s, i) => (
        <Float key={i} speed={1} rotationIntensity={0.6} floatIntensity={0.8}>
          <mesh position={s.pos as unknown as [number, number, number]} scale={s.scale}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={'#c9def0'}
              transparent
              opacity={0.25}
              roughness={0.1}
              metalness={0.3}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

export function AmbientScene() {
  const { kpis } = useLive()
  const stress = Math.min(1.2, kpis.errorRate / 10 + kpis.p99 / 400)
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[4, 4, 5]} intensity={0.9} />
      <Field stress={stress} />
      <Shards />
    </Canvas>
  )
}

export default AmbientScene
