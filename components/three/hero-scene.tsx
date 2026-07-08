'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLive } from '@/hooks/use-live'

// Soft round sprite so particles render as glowing dots rather than squares.
function useDotTexture() {
  return useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.3, 'rgba(150,225,255,0.95)')
    g.addColorStop(1, 'rgba(90,190,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

const COUNT = 2600
const START = new THREE.Vector3(-10, -4.6, -2.4)
const END = new THREE.Vector3(10, 4.6, 2.4)

// A stream of particles flowing diagonally through the prism: tight beam at the
// centre (where the prism refracts it) and dispersing into a cloud at each end.
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
    const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < COUNT; i++) {
      let t = seeds[i * 4 + 0] + dt * 0.05 * seeds[i * 4 + 3] * (0.6 + intensity)
      if (t > 1) t -= 1
      seeds[i * 4 + 0] = t
      // narrow through the middle, wide at the ends
      const spread = 0.18 + Math.pow(Math.abs(t - 0.5) * 2, 2.4) * 3.4
      const x = START.x + (END.x - START.x) * t
      const y = START.y + (END.y - START.y) * t
      const z = START.z + (END.z - START.z) * t
      arr[i * 3 + 0] = x + seeds[i * 4 + 1] * spread
      arr[i * 3 + 1] = y + seeds[i * 4 + 2] * spread
      arr[i * 3 + 2] = z + seeds[i * 4 + 1] * spread * 0.6
    }
    ;(pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.19}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={'#29c9ec'}
        sizeAttenuation
      />
    </points>
  )
}

// Coral arcs swirling around the prism, each on its own tilted orbital plane.
function CoralRings({ stress }: { stress: number }) {
  const group = useRef<THREE.Group>(null)
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])

  const rings = useMemo(
    () => [
      { r: 2.3, tube: 0.03, rot: [0.6, 0.3, 0] as const, arc: Math.PI * 1.5, spin: 0.5 },
      { r: 2.9, tube: 0.024, rot: [1.1, 0.8, 0.4] as const, arc: Math.PI * 1.2, spin: -0.35 },
      { r: 3.5, tube: 0.02, rot: [0.2, 1.4, 0.9] as const, arc: Math.PI * 1.7, spin: 0.28 },
    ],
    [],
  )

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.z += delta * (0.1 + stress * 0.35)
    ringRefs.current.forEach((m, i) => {
      if (m) m.rotation.z += delta * rings[i].spin * (0.6 + stress)
    })
  })

  return (
    <group ref={group}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ringRefs.current[i] = el
          }}
          rotation={ring.rot as unknown as [number, number, number]}
        >
          <torusGeometry args={[ring.r, ring.tube, 16, 160, ring.arc]} />
          <meshStandardMaterial
            color={'#ff6a52'}
            emissive={'#ff6a52'}
            emissiveIntensity={0.7 + stress}
            roughness={0.35}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={`d${i}`} position={[Math.cos(a) * 3.1, Math.sin(a) * 3.1, Math.sin(a) * 0.9]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial
              color={'#ff6a52'}
              emissive={'#ff6a52'}
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Refraction background: the pearl page colour so the glass reads bright, not black.
const bgColor = new THREE.Color('#eef3fb')

function Prism({ stress }: { stress: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * (0.22 + stress * 0.25)
      mesh.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.14
    }
  })
  return (
    <Float speed={1.5} rotationIntensity={0.25} floatIntensity={0.6}>
      <mesh ref={mesh} scale={1.15} rotation={[0.18, 0, 0.12]}>
        <coneGeometry args={[1.05, 1.7, 3]} />
        <MeshTransmissionMaterial
          samples={12}
          resolution={768}
          transmission={1}
          thickness={0.35}
          roughness={0}
          ior={1.5}
          chromaticAberration={0.6}
          anisotropy={0.3}
          distortion={0.1}
          distortionScale={0.15}
          temporalDistortion={0.02}
          clearcoat={1}
          clearcoatRoughness={0}
          attenuationColor={'#dff2ff'}
          attenuationDistance={4}
          color={'#ffffff'}
          background={bgColor}
        />
      </mesh>
    </Float>
  )
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
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <directionalLight position={[-5, -2, 2]} intensity={0.8} color={'#29c9ec'} />
      <pointLight position={[0, 3, 4]} intensity={32} color={'#ffffff'} />
      <pointLight position={[-3, -3, 3]} intensity={20} color={'#bfe6ff'} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={8} color="#ffffff" />
        <Lightformer form="rect" intensity={1.5} position={[-4, 0, 3]} scale={6} color="#cfeeff" />
        <Lightformer form="circle" intensity={1.3} position={[4, -2, 2]} scale={5} color="#ffd9cf" />
      </Environment>
      <Prism stress={stress} />
      <ParticleStream intensity={intensity} />
      <CoralRings stress={stress} />
    </Canvas>
  )
}

export default HeroScene
