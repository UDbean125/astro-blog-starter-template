import { mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../extension/icons");
if (!existsSync(out)) mkdirSync(out, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#0f2547"/>
  <g stroke="#ff5b3a" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="64" cy="38" r="10"/>
    <line x1="64" y1="48" x2="64" y2="98"/>
    <path d="M30 72 a34 34 0 0 0 68 0"/>
    <line x1="44" y1="72" x2="30" y2="72"/>
    <line x1="84" y1="72" x2="98" y2="72"/>
  </g>
</svg>`;

for (const s of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg)).resize(s, s).png().toFile(resolve(out, `icon-${s}.png`));
  console.log(`✓ icon-${s}.png`);
}
