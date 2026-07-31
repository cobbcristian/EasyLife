/**
 * Batch-export Figma localhost assets into public/brand.
 * Requires Figma Desktop open. Run: node scripts/export-figma-assets.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT = path.join("public", "brand");
const BASE = "http://localhost:3845/assets";

/** Known exports from Figma MCP design-context pulls. Add node pulls here as you discover them. */
const DOWNLOADS = [
  { file: "member-avatar.png", url: `${BASE}/85f9b477568316495186abdd3b23bff6e7a06029.png` },
  { file: "featured-dining.png", url: `${BASE}/9d2c4cffc36835edd712ab52b360eda5219db89a.png` },
  { file: "featured-tennis.png", url: `${BASE}/813ef79e27996874d034a191caa1cce5eba57858.png` },
  { file: "icons/icon-star.svg", url: `${BASE}/c941a92bb49dabba65b6eb32fb3a90b19c2a14bc.svg` },
  { file: "icons/nav-tab-home.svg", url: `${BASE}/1be8848ff33d27316b0c419e7f1f841b8333cf82.svg` },
  { file: "icons/nav-tab-calendar.svg", url: `${BASE}/fbb643ddcc23e062980d457294467e723985492e.svg` },
  { file: "icons/nav-user-circle.svg", url: `${BASE}/2fb3698c81f1b3ee701759558a44a22b03ce3d04.svg` },
  { file: "logo-icon.png", url: `${BASE}/52ac737722ecb0912c1753fdc2d904d3392abbcc.png` },
  { file: "login.png", url: `${BASE}/f0f67038adc6f8b0fcb18054453b2b1f5802410b.png` },
  { file: "login-ring-inner.svg", url: `${BASE}/6f847cba1e46e6dd8a6a7bbc4f9277017ddad117.svg` },
  { file: "login-ring-mid.svg", url: `${BASE}/43c31ad698d760c3c7b6290dba1b366485cd000d.svg` },
  { file: "login-ring-outer.svg", url: `${BASE}/4dd8802c6628f1f27ca5e948f5b42ff43852d6f5.svg` },
  { file: "chart-bars.svg", url: `${BASE}/ed76af3266db84c16a8a1b4ca8718f80f2b9fce5.svg` },
  { file: "service-cleaning-supplies.png", url: `${BASE}/3b3ff12cc6c778b5a9782829c4cdfb7672a6c115.png` },
  { file: "activity-bike.png", url: `${BASE}/1a38d4d0bc7c1804efdbd1eebc5649839c3b4bdc.png` },
  { file: "service-details-hero.png", url: `${BASE}/52b8d4825906632e7b3252aad33f37de5e3a9581.png` },
  { file: "booking-thumb-cleaning.png", url: `${BASE}/a7ae7f8057f101c54cd827eb651e5ee20699a3bc.png` },
  { file: "booking-thumb-carpet.png", url: `${BASE}/520bb82055c531ef8c59687aab23ebb8c106799b.png` },
];

await mkdir(path.join(OUT, "icons"), { recursive: true });

let ok = 0;
let fail = 0;
for (const item of DOWNLOADS) {
  const dest = item.file.startsWith("icons/")
    ? path.join(OUT, item.file)
    : path.join(OUT, path.basename(item.file));
  try {
    const res = await fetch(item.url);
    if (!res.ok) {
      console.error(`SKIP ${item.file}: HTTP ${res.status}`);
      fail++;
      continue;
    }
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`OK ${item.file}`);
    ok++;
  } catch (e) {
    console.error(`FAIL ${item.file}:`, e instanceof Error ? e.message : e);
    fail++;
  }
}

console.log(`Done: ${ok} ok, ${fail} failed`);
