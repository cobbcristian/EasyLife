/**
 * Rewrite seed apparel imageUrl paths from Bonita Bay placeholders
 * to each club's branded apparel assets ({prefix}-apparel-*.png).
 *
 * Usage: node scripts/rewire-apparel-image-urls.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SERVER = path.join(ROOT, "src", "lib", "server");

/** seed file → apparel asset prefix */
const SEEDS = {
  "heron-creek-seed.ts": "hc",
  "debary-seed.ts": "db",
  "jacaranda-seed.ts": "jc",
  "the-dunes-seed.ts": "td",
  "the-nest-seed.ts": "tn",
  "martin-downs-seed.ts": "md",
  "seagate-seed.ts": "sg",
  "copperleaf-seed.ts": "cl",
  "club-renaissance-seed.ts": "cr",
  "falls-club-seed.ts": "fc",
  "worthington-seed.ts": "wo",
  "estero-seed.ts": "ec",
  "wildcat-run-seed.ts": "wr",
  "highland-woods-seed.ts": "hw",
  "bonita-national-seed.ts": "bn",
  "windsor-seed.ts": "wi",
  "carrollwood-seed.ts": "cw",
  "hunters-ridge-seed.ts": "hr",
  "spanish-wells-seed.ts": "sp",
  "harbor-pointe-seed.ts": "hp",
  "willow-creek-seed.ts": "wc",
  "alliant-seed.ts": "al",
};

const REPLACEMENTS = [
  ["/brand/apparel/bb-apparel-polo-navy.png", "/brand/apparel/{p}-apparel-polo-navy.png"],
  ["/brand/apparel/bb-apparel-ladies-polo.png", "/brand/apparel/{p}-apparel-ladies-polo.png"],
  ["/brand/apparel/bb-apparel-quarter-zip.png", "/brand/apparel/{p}-apparel-quarter-zip.png"],
  ["/brand/apparel/bb-apparel-cap-navy.png", "/brand/apparel/{p}-apparel-cap-navy.png"],
  ["/brand/apparel/bb-apparel-visor-black.png", "/brand/apparel/{p}-apparel-visor-black.png"],
  ["/brand/apparel/bb-apparel-towel.png", "/brand/apparel/{p}-apparel-towel.png"],
  ["/brand/apparel/hb-apparel-polo-navy.png", "/brand/apparel/{p}-apparel-polo-navy.png"],
  ["/brand/apparel/hb-apparel-ladies-polo.png", "/brand/apparel/{p}-apparel-ladies-polo.png"],
  ["/brand/apparel/hb-apparel-quarter-zip.png", "/brand/apparel/{p}-apparel-quarter-zip.png"],
  ["/brand/apparel/hb-apparel-cap-white.png", "/brand/apparel/{p}-apparel-cap-navy.png"],
  ["/brand/apparel/hb-apparel-visor-black.png", "/brand/apparel/{p}-apparel-visor-black.png"],
  ["/brand/apparel/hb-apparel-golf-towel.png", "/brand/apparel/{p}-apparel-towel.png"],
  ["/brand/apparel-club-polo.png", "/brand/apparel/{p}-apparel-polo-navy.png"],
  ["/brand/apparel-performance-cap.png", "/brand/apparel/{p}-apparel-cap-navy.png"],
  ["/brand/apparel-quarter-zip.png", "/brand/apparel/{p}-apparel-quarter-zip.png"],
];

let filesChanged = 0;
let totalReplacements = 0;

for (const [file, prefix] of Object.entries(SEEDS)) {
  const filePath = path.join(SERVER, file);
  if (!fs.existsSync(filePath)) {
    console.warn("missing", file);
    continue;
  }
  let text = fs.readFileSync(filePath, "utf8");
  let before = text;
  let count = 0;

  // brandAssets.apparel* → concrete club paths
  const brandAssetMap = [
    [
      /imageUrl:\s*brandAssets\.apparelClubPolo/g,
      `imageUrl: "/brand/apparel/${prefix}-apparel-polo-navy.png"`,
    ],
    [
      /imageUrl:\s*brandAssets\.apparelPerformanceCap/g,
      `imageUrl: "/brand/apparel/${prefix}-apparel-cap-navy.png"`,
    ],
    [
      /imageUrl:\s*brandAssets\.apparelQuarterZip/g,
      `imageUrl: "/brand/apparel/${prefix}-apparel-quarter-zip.png"`,
    ],
    [
      /imageUrl:\s*brandAssets\.apparelBonitaBayPolo/g,
      `imageUrl: "/brand/apparel/${prefix}-apparel-polo-navy.png"`,
    ],
    [
      /imageUrl:\s*brandAssets\.apparelBonitaBayCap/g,
      `imageUrl: "/brand/apparel/${prefix}-apparel-cap-navy.png"`,
    ],
    [
      /imageUrl:\s*brandAssets\.apparelBonitaBayQuarterZip/g,
      `imageUrl: "/brand/apparel/${prefix}-apparel-quarter-zip.png"`,
    ],
  ];

  for (const [re, replacement] of brandAssetMap) {
    const matches = text.match(re);
    if (matches) {
      count += matches.length;
      text = text.replace(re, replacement);
    }
  }

  for (const [from, toTemplate] of REPLACEMENTS) {
    if (!text.includes(from)) continue;
    const to = toTemplate.replaceAll("{p}", prefix);
    // Don't rewrite if already pointing at this club's assets
    if (from.includes(`/${prefix}-apparel-`)) continue;
    const occurrences = text.split(from).length - 1;
    if (occurrences > 0) {
      text = text.split(from).join(to);
      count += occurrences;
    }
  }

  if (text !== before) {
    fs.writeFileSync(filePath, text, "utf8");
    filesChanged += 1;
    totalReplacements += count;
    console.log(`updated ${file} (${count} replacements → ${prefix}-apparel-*)`);
  } else {
    console.log(`unchanged ${file}`);
  }
}

console.log(`Done — ${filesChanged} files, ${totalReplacements} replacements`);
