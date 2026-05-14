#!/usr/bin/env node
/**
 * Dev-time icon generator — NOT part of the build.
 *
 * Rasterises `public/favicon.svg` (the hand-authored master) into the PNG /
 * ICO favicon family, and renders a placeholder `og-image.png`. Output lands
 * in `frontend/public/` and is committed to the repo, so CI and the Vite
 * build only ever consume the committed binaries — `rsvg-convert` is a
 * developer dependency, never a build/CI dependency.
 *
 * Requires: `rsvg-convert` (librsvg). macOS: `brew install librsvg`.
 *
 * Re-run after editing `favicon.svg` or the og-image template below:
 *   npm run generate:icons          (from frontend/)
 *
 * The generated assets are PLACEHOLDERS. Replace with branded artwork from
 * the UI Designer — see the follow-up ticket linked from #135.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const faviconSvg = join(publicDir, 'favicon.svg');

const BRAND_INDIGO = '#4f46e5';

/** Rasterise an SVG (file path or buffer) to a PNG buffer via rsvg-convert. */
function svgToPng(svg, width, height) {
  const args = ['-w', String(width), '-h', String(height), '-f', 'png'];
  if (typeof svg === 'string') {
    return execFileSync('rsvg-convert', [...args, svg]);
  }
  return execFileSync('rsvg-convert', args, { input: svg, maxBuffer: 16 * 1024 * 1024 });
}

/** Wrap PNG buffers into a multi-size .ico container (PNG-compressed entries). */
function pngsToIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(entries.length, 4);

  const dir = [];
  let offset = 6 + entries.length * 16;
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 => 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 => 256)
    e.writeUInt8(0, 2); // palette count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8); // image data size
    e.writeUInt32LE(offset, 12); // image data offset
    offset += png.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...entries.map((x) => x.png)]);
}

// --- favicon.ico (16 / 32 / 48, PNG-compressed entries) ---
const icoEntries = [16, 32, 48].map((size) => ({ size, png: svgToPng(faviconSvg, size, size) }));
writeFileSync(join(publicDir, 'favicon.ico'), pngsToIco(icoEntries));
console.log('[generate-icons] favicon.ico written (16, 32, 48)');

// --- apple-touch-icon + Android PNGs ---
for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  writeFileSync(join(publicDir, name), svgToPng(faviconSvg, size, size));
  console.log(`[generate-icons] ${name} written (${size}x${size})`);
}

// --- og-image.png (1200x630 placeholder social card) ---
// The icon group reuses favicon.svg's exact geometry, scaled 3.75x (32 -> 120).
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef2ff"/>
      <stop offset="1" stop-color="#e0e7ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(96 200) scale(3.75)">
    <rect width="32" height="32" rx="7" fill="${BRAND_INDIGO}"/>
    <path d="M16 5 C 17 12.5, 19.5 15, 27 16 C 19.5 17, 17 19.5, 16 27 C 15 19.5, 12.5 17, 5 16 C 12.5 15, 15 12.5, 16 5 Z" fill="#ffffff"/>
  </g>
  <text x="252" y="290" font-family="Helvetica, Arial, sans-serif" font-size="68" font-weight="700" fill="#1e1b4b">AI Blog Generator</text>
  <text x="252" y="356" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#4338ca">Ship drafts that don&apos;t read like AI.</text>
  <text x="96" y="556" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#6366f1">SEO-ready &#8226; AI authenticity check &#8226; author profiles</text>
</svg>`;
writeFileSync(join(publicDir, 'og-image.png'), svgToPng(Buffer.from(ogSvg), 1200, 630));
console.log('[generate-icons] og-image.png written (1200x630)');

console.log('[generate-icons] done — assets are placeholders; replace with branded artwork.');
