/**
 * Download Figma brand + nav assets when Figma Desktop is open.
 * Run: node scripts/export-figma-nav-icons.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT = path.join("public", "brand");
const ICONS_OUT = path.join(OUT, "icons");
const BASE = "http://localhost:3845/assets";

/** Figma node → file. SF Symbol icons (calendar/briefcase/envelope/dashboard) are glyphs in-file; user-circle exports as SVG. */
const DOWNLOADS = [
  { file: "icons/nav-user-circle.svg", url: `${BASE}/2fb3698c81f1b3ee701759558a44a22b03ce3d04.svg` },
  { file: "logo-icon.png", url: `${BASE}/52ac737722ecb0912c1753fdc2d904d3392abbcc.png` },
  { file: "activity-bike.png", url: `${BASE}/1a38d4d0bc7c1804efdbd1eebc5649839c3b4bdc.png` },
];

await mkdir(ICONS_OUT, { recursive: true });

for (const item of DOWNLOADS) {
  const res = await fetch(item.url);
  if (!res.ok) {
    console.error(`Failed ${item.file}: HTTP ${res.status}`);
    continue;
  }
  const fullPath = item.file.startsWith("icons/")
    ? path.join(OUT, item.file)
    : path.join(OUT, path.basename(item.file));
  await writeFile(fullPath, Buffer.from(await res.arrayBuffer()));
  console.log(`Wrote ${item.file}`);
}

console.log("SF Symbol nav glyphs (dashboard/calendar/briefcase/envelope) render inline in NavIcon — see Figma nodes 4616:13903–4616:13906.");
