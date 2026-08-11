// One-off brand asset generator for Sentinel Gateway.
// Draws the shield mark (from components/sentinel-logo.tsx, viewBox 0..32)
// into PNG files with zero dependencies. Run with: node generate-brand-assets.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

// ---- Brand tokens (app/globals.css) ----
const BG = [244, 246, 251] // --background #f4f6fb
const INDIGO = [26, 35, 126] // --indigo #1a237e
const CYAN = [0, 184, 212] // --cyan #00b8d4
const CYAN_GLOW = [0, 229, 255] // --cyan-glow #00e5ff
const SHIELD_FILL = [224, 245, 251] // rgba(0,229,255,0.08) over --background

// Shield geometry in the 32-unit logo space.
const SHIELD = [
  [16, 2.5],
  [4, 7.5],
  [4, 15.5],
  [16, 30],
  [28, 15.5],
  [28, 7.5],
]
const CIRCLE = { x: 16, y: 15, r: 3.4 }
const TICKS = [
  [6.5, 15, 10.7, 15],
  [21.3, 15, 25.5, 15],
  [16, 5.5, 16, 9.3],
  [16, 20.7, 16, 24.5],
]

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

function pointInPolygon(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Map a pixel to logo-space coordinates for a centered, padded drawing.
function sample(w, h, px, py, paddingFrac) {
  const pad = Math.min(w, h) * paddingFrac
  const scale = (Math.min(w, h) - pad * 2) / 32
  const ox = (w - 32 * scale) / 2
  const oy = (h - 32 * scale) / 2
  const x = (px - ox) / scale
  const y = (py - oy) / scale

  const inShield = pointInPolygon(x, y, SHIELD)
  if (!inShield) return null

  const dCircle = Math.hypot(x - CIRCLE.x, y - CIRCLE.y)

  // Stroke: indigo ring around the shield.
  let dEdge = Infinity
  for (let i = 0; i < SHIELD.length; i++) {
    const [x1, y1] = SHIELD[i]
    const [x2, y2] = SHIELD[(i + 1) % SHIELD.length]
    dEdge = Math.min(dEdge, distToSegment(x, y, x1, y1, x2, y2))
  }
  const strokeW = 0.55
  if (dEdge < strokeW) return INDIGO

  // Ticks: short cyan-glow lines pointing outward.
  for (const [x1, y1, x2, y2] of TICKS) {
    if (distToSegment(x, y, x1, y1, x2, y2) < 0.35) return CYAN_GLOW
  }

  // Core: bright cyan orb.
  if (dCircle < 3.4) return CYAN_GLOW
  if (dCircle < 3.9) return CYAN

  return SHIELD_FILL
}

// ---- Minimal PNG encoder (8-bit RGB) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, pixelFn) {
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y)
      const o = rowStart + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Icon: 512x512 on the brand background.
const icon = encodePng(512, 512, (x, y) => sample(512, 512, x, y, 0.08) ?? BG)
writeFileSync('public/icon.png', icon)

// OG image: 1200x630 with a subtle vertical gradient behind the mark.
const ogTop = BG
const ogBottom = [227, 232, 246]
const og = encodePng(1200, 630, (x, y) => {
  const t = y / 629
  const bg = ogTop.map((v, i) => Math.round(v + (ogBottom[i] - v) * t))
  return sample(1200, 630, x, y, 0.28) ?? bg
})
writeFileSync('public/og-image.png', og)

console.log('wrote public/icon.png and public/og-image.png')
