# PWA Icons

Place the following PNG icon files in this directory:

| File                    | Size      | Purpose                  |
|-------------------------|-----------|--------------------------|
| icon-192.png            | 192×192   | Standard icon            |
| icon-512.png            | 512×512   | Standard icon (large)    |
| icon-maskable-192.png   | 192×192   | Maskable (Android)       |
| icon-maskable-512.png   | 512×512   | Maskable (Android large) |

You can generate these from `icon.svg` using a tool like:
- https://maskable.app/editor (for maskable variants)
- https://realfavicongenerator.net
- `sharp` npm package in a build script

## Quick generation with sharp

```bash
npm install sharp
node -e "
  const sharp = require('sharp');
  [192, 512].forEach(s =>
    sharp('public/icons/icon.svg').resize(s, s).toFile('public/icons/icon-' + s + '.png')
  );
"
```
