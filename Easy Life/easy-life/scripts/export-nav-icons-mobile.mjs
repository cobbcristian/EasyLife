/**
 * Rasterize Figma nav SVGs for React Native tab bar.
 * Run from easy-life/: node scripts/export-nav-icons-mobile.mjs
 */
import { mkdir, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const WEB_ICONS = path.join("public", "brand", "icons");
const MOBILE_OUT = path.join("..", "mobile", "assets", "brand", "icons");
const SIZE = 48;

const icons = [
  "nav-dashboard.svg",
  "nav-calendar.svg",
  "nav-briefcase.svg",
  "nav-envelope.svg",
  "nav-user-circle.svg",
];

await mkdir(MOBILE_OUT, { recursive: true });

for (const file of icons) {
  const svg = await readFile(path.join(WEB_ICONS, file));
  const base = file.replace(".svg", ".png");
  await sharp(svg, { density: 192 })
    .resize(SIZE, SIZE)
    .png()
    .toFile(path.join(MOBILE_OUT, base));
  console.log(`Wrote mobile/assets/brand/icons/${base}`);
}
