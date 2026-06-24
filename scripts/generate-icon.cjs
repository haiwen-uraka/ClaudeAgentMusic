const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ── Minimal PNG encoder ────────────────────────────────
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const c = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(c), 0)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  return Buffer.concat([len, c, crc])
}

function makePNG(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const raw = Buffer.alloc((width * 4 + 1) * height)
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate 16×16 green-circle icon ────────────────────
const icon = makePNG(16, 16, (x, y) => {
  const dx = x + 0.5 - 8
  const dy = y + 0.5 - 8
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= 7) return [0, 0, 0, 0]
  if (dist >= 6.5) {
    const t = 1 - (dist - 6.5) / 0.5
    return [0, 230, 118, Math.round(t * 255)]
  }
  return [0, 230, 118, 255]
})

const outDir = path.join(__dirname, '..', 'electron')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'tray-icon.png')
fs.writeFileSync(outPath, icon)
console.log('Tray icon generated:', outPath)
