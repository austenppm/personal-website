// One-off: renders the lotto app icons (PNG) from an SVG with sharp.
// Run: node scripts/make-lotto-icons.mjs

import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "tools", "lotto");

// Full-bleed background so the icon also works as an Android "maskable" icon.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f59e0b"/><stop offset=".5" stop-color="#fb7d3c"/><stop offset="1" stop-color="#fb7185"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="200" cy="215" r="70" fill="#fff7ee"/>
  <circle cx="320" cy="215" r="70" fill="#fff7ee" opacity=".92"/>
  <circle cx="260" cy="320" r="70" fill="#fff7ee" opacity=".85"/>
  <g font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="64" fill="#c2410c" text-anchor="middle">
    <text x="200" y="237">6</text><text x="320" y="237">7</text><text x="260" y="342">5</text>
  </g>
</svg>`;

for (const size of [192, 512, 180]) {
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, name));
  console.log("wrote", name);
}
