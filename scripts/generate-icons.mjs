/**
 * Generates PWA icons + app/icon.png from public/icons/source-brand.png (or .jpg).
 * Uses a centered square crop (full mark); for tall brand art with text below, restore a smaller top crop.
 */
import sharp from 'sharp'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const iconsDir = join(root, 'public', 'icons')

const candidates = [
  join(iconsDir, 'source-brand.png'),
  join(iconsDir, 'source-brand.jpg'),
]

const srcPath = candidates.find((p) => existsSync(p))
if (!srcPath) {
  console.error('Missing public/icons/source-brand.png (or .jpg)')
  process.exit(1)
}

const meta = await sharp(srcPath).metadata()
const w = meta.width ?? 1024
const h = meta.height ?? 1024

// Centered square (e.g. standalone circular mark on square canvas)
const side = Math.min(w, h)
const left = Math.floor((w - side) / 2)
const top = Math.floor((h - side) / 2)

const bg = { r: 255, g: 247, b: 242, alpha: 1 }

function cropMark() {
  return sharp(srcPath)
    .extract({ left, top, width: side, height: side })
    .ensureAlpha()
    .png()
}

const markBuf = await cropMark().toBuffer()

async function writeAny(size, outName) {
  await sharp(markBuf)
    .resize(size, size, { fit: 'contain', background: bg })
    .png()
    .toFile(join(iconsDir, outName))
}

/** Maskable: content in ~80% safe zone (10% padding on each side) */
async function writeMaskable(size, outName) {
  const inner = Math.floor(size * 0.8)
  const innerBuf = await sharp(markBuf)
    .resize(inner, inner, { fit: 'contain', background: bg })
    .png()
    .toBuffer()
  const pad = Math.floor((size - inner) / 2)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: innerBuf, left: pad, top: pad }])
    .png()
    .toFile(join(iconsDir, outName))
}

await writeAny(192, 'icon-192.png')
await writeAny(512, 'icon-512.png')
await writeMaskable(192, 'icon-maskable-192.png')
await writeMaskable(512, 'icon-maskable-512.png')

// Next.js App Router favicon (small)
await sharp(markBuf)
  .resize(48, 48, { fit: 'contain', background: bg })
  .png()
  .toFile(join(root, 'app', 'icon.png'))

console.log('Wrote icons: icon-192/512, maskable-192/512, app/icon.png')
