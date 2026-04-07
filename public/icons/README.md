# PWA Icons

## Source

Place the brand image as **`source-brand.png`** or **`source-brand.jpg`** in this directory (square or vertical logo; script crops the upper-center square for the mark).

## Regenerate all icons

From the repo root:

```bash
npm run icons
```

This runs [`scripts/generate-icons.mjs`](../../scripts/generate-icons.mjs) (uses **sharp**) and writes:

| Output | Use |
|--------|-----|
| `icon-192.png`, `icon-512.png` | [`app/manifest.ts`](../../app/manifest.ts) — `purpose: any` |
| `icon-maskable-192.png`, `icon-maskable-512.png` | `purpose: maskable` (safe zone padding) |
| [`app/icon.png`](../../app/icon.png) | Next.js favicon / metadata |

If the crop still includes text or cuts the circle, edit the `side` / `top` logic at the top of `scripts/generate-icons.mjs`.

## Manual tools

- [maskable.app](https://maskable.app/editor) — preview maskable icons
- [realfavicongenerator.net](https://realfavicongenerator.net) — alternative packs
