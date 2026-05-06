/**
 * Generate Harbour PWA icons from inline SVG sources.
 * Run with: node scripts/gen-icons.mjs
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../public/icons");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svgFlat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f2547"/>
  <g stroke="#ff5b3a" stroke-width="32" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="256" cy="158" r="40"/>
    <line x1="256" y1="200" x2="256" y2="396"/>
    <path d="M120 282 a136 136 0 0 0 272 0"/>
    <line x1="180" y1="282" x2="120" y2="282"/>
    <line x1="332" y1="282" x2="392" y2="282"/>
  </g>
</svg>`;

// Maskable variant: extra padding so the icon survives the safe-zone crop on Android
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f2547"/>
  <g transform="translate(64,64) scale(0.75)">
    <g stroke="#ff5b3a" stroke-width="36" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="256" cy="158" r="40"/>
      <line x1="256" y1="200" x2="256" y2="396"/>
      <path d="M120 282 a136 136 0 0 0 272 0"/>
      <line x1="180" y1="282" x2="120" y2="282"/>
      <line x1="332" y1="282" x2="392" y2="282"/>
    </g>
  </g>
</svg>`;

// Apple touch (no rounded corners, iOS will mask)
const svgApple = svgFlat;

const targets = [
  { name: "icon-192.png", svg: svgFlat, size: 192 },
  { name: "icon-512.png", svg: svgFlat, size: 512 },
  { name: "icon-maskable-192.png", svg: svgMaskable, size: 192 },
  { name: "icon-maskable-512.png", svg: svgMaskable, size: 512 },
  { name: "apple-touch-icon.png", svg: svgApple, size: 180 },
];

for (const t of targets) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(resolve(outDir, t.name));
  console.log(`✓ ${t.name}`);
}

// Open Graph default
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f2547"/>
  <g transform="translate(420, 140)">
    <g stroke="#ff5b3a" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="180" cy="60" r="20"/>
      <line x1="180" y1="80" x2="180" y2="200"/>
      <path d="M110 140 a70 70 0 0 0 140 0"/>
    </g>
  </g>
  <text x="600" y="450" font-family="Manrope, sans-serif" font-weight="800" font-size="84" fill="#fdfaf3" text-anchor="middle">Harbour</text>
  <text x="600" y="510" font-family="Manrope, sans-serif" font-weight="500" font-size="32" fill="#a9beda" text-anchor="middle">Save. Read. Listen. Keep.</text>
</svg>`;
writeFileSync(resolve(__dirname, "../public/og-default.svg"), og);
console.log("✓ og-default.svg");
