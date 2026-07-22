// Reproducible icon generation for Settle In (M6).
//
// The install identity is LOCKED by docs/design-system.md § App identity: a minimal
// taper-candle silhouette in Taper Wax (#EADFC8) with a small Candlelight Amber
// (#D6A66A) flame on a Pond Charcoal (#14181A) field, maskable-safe, legible at
// 48px, no spiritual iconography.
//
// The candle geometry is defined ONCE below (unit 512×512 field) and every output
// is derived from it, so this script is the single source of truth and is fully
// reproducible:
//
//   - src/assets/icons/taper-candle.svg          canonical vector source (checked in)
//   - public/favicon.svg                          scalable browser-tab icon
//   - public/icons/icon-192.png / icon-512.png            maskable "any" icons
//   - public/icons/icon-192-maskable.png / icon-512-maskable.png   dedicated maskable
//   - public/apple-touch-icon.png (180)           iOS home-screen icon
//   - public/favicon-32.png / favicon-16.png      raster favicon fallbacks
//
// Rasterization uses Playwright's bundled Chromium (already a dev dependency) to
// screenshot the SVG at each pixel size — no new image library is added. Run with:
//   node scripts/generate-icons.mjs
// then commit the SVG source and the generated PNGs. Regenerating from the same
// source produces byte-stable output.

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- Palette (design-system.md § Color tokens) -------------------------------
const FIELD = '#14181A'; // Pond Charcoal
const WAX = '#EADFC8'; // Taper Wax
const FLAME = '#D6A66A'; // Candlelight Amber

// --- Candle geometry, defined once in a 512×512 field ------------------------
// The whole figure sits within ~149px of centre (256,256); the maskable safe zone
// is a circle of radius ~205 (40% of 512), so k=1.0 already clears it with margin.
// The candle body tapers (top half-width 20, base half-width 30); the flame is a
// symmetric teardrop whose rounded base meets the candle rim.
const CANDLE = `
  <defs>
    <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="256" cy="162" r="74">
      <stop offset="0" stop-color="${FLAME}" stop-opacity="0.34" />
      <stop offset="0.55" stop-color="${FLAME}" stop-opacity="0.10" />
      <stop offset="1" stop-color="${FLAME}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="256" cy="162" r="74" fill="url(#glow)" />
  <g fill="${WAX}">
    <path d="M236 196 L276 196 L286 394 Q286 402 278 402 L234 402 Q226 402 226 394 Z" />
  </g>
  <path fill="${FLAME}" d="M256 118
    C236 150 226 168 232 182
    C236 194 246 200 256 200
    C266 200 276 194 280 182
    C286 168 276 150 256 118 Z" />
`;

/**
 * Build an SVG string. `k` scales the candle about the field centre (1.0 is
 * maskable-safe; larger fills more of the frame for "any"/favicon use).
 * `field` toggles the opaque Pond Charcoal background rect.
 */
function svg({ k = 1, field = true } = {}) {
  const bg = field ? `<rect width="512" height="512" fill="${FIELD}" />` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Settle In">
  ${bg}
  <g transform="translate(256 256) scale(${k}) translate(-256 -256)">${CANDLE}</g>
</svg>`;
}

// Output specs: candle scale k, and whether the field is painted.
const CANONICAL = svg({ k: 1.3, field: true }); // "any"/source: candle fills the frame
const MASKABLE = svg({ k: 1.0, field: true }); // safe-zone candle, full-bleed field
const FAVICON_VEC = svg({ k: 1.42, field: true }); // bolder for tiny tab sizes

async function rasterize(page, source, size, outPath) {
  const sized = source.replace('width="512" height="512"', `width="${size}" height="${size}"`);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{background:${FIELD}}</style>${sized}`,
  );
  const png = await page.locator('svg').screenshot({ omitBackground: false });
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, png);
  return png.length;
}

async function main() {
  // Write the vector sources first (checked into the repo).
  await mkdir(resolve(ROOT, 'src/assets/icons'), { recursive: true });
  await writeFile(resolve(ROOT, 'src/assets/icons/taper-candle.svg'), CANONICAL);
  await mkdir(resolve(ROOT, 'public/icons'), { recursive: true });
  await writeFile(resolve(ROOT, 'public/favicon.svg'), FAVICON_VEC);

  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const jobs = [
    [CANONICAL, 192, 'public/icons/icon-192.png'],
    [CANONICAL, 512, 'public/icons/icon-512.png'],
    [MASKABLE, 192, 'public/icons/icon-192-maskable.png'],
    [MASKABLE, 512, 'public/icons/icon-512-maskable.png'],
    [CANONICAL, 180, 'public/apple-touch-icon.png'],
    [FAVICON_VEC, 32, 'public/favicon-32.png'],
    [FAVICON_VEC, 16, 'public/favicon-16.png'],
  ];

  for (const [source, size, out] of jobs) {
    const bytes = await rasterize(page, source, size, resolve(ROOT, out));
    console.log(`  ${out.padEnd(38)} ${size}px  ${bytes} bytes`);
  }

  await browser.close();
  console.log('Icons generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
