/**
 * Stamp each club crest onto blank Pro Shop apparel product photos.
 * Uses logo-free garment bases so crests look embroidered — no giant cover blotch.
 *
 * Usage: node scripts/brand-apparel-logos.mjs
 *        node scripts/brand-apparel-logos.mjs hc db jc
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "brand", "apparel");
const BRAND = path.join(ROOT, "public", "brand");

const CLUBS = [
  { slug: "bb", logo: "community-bonita-bay.png" },
  { slug: "sw", logo: "community-shadow-wood.png" },
  { slug: "hr", logo: "community-hunters-ridge.png" },
  { slug: "hc", logo: "community-heron-creek.png" },
  { slug: "db", logo: "community-debary.png" },
  { slug: "jc", logo: "community-jacaranda.png" },
  { slug: "td", logo: "community-the-dunes.png" },
  { slug: "tn", logo: "community-the-nest.png" },
  { slug: "md", logo: "community-martin-downs.png" },
  { slug: "sg", logo: "community-seagate.png" },
  { slug: "cl", logo: "community-copperleaf.png" },
  { slug: "cr", logo: "community-club-renaissance.png" },
  { slug: "fc", logo: "community-falls-club.png" },
  { slug: "wo", logo: "community-worthington.png" },
  { slug: "ec", logo: "community-estero.png" },
  { slug: "wr", logo: "community-wildcat-run.png" },
  { slug: "hw", logo: "community-highland-woods.png" },
  { slug: "bn", logo: "community-bonita-national.png" },
  { slug: "wi", logo: "community-windsor.png" },
  { slug: "cw", logo: "community-carrollwood.png" },
  { slug: "sp", logo: "community-spanish-wells.png" },
  { slug: "hp", logo: "community-harbor-pointe.png" },
  { slug: "wc", logo: "community-willow-creek.png" },
  { slug: "al", logo: "community-alliant.png" },
];

/** Blank bases + left-chest / front embroidery placement (1024×1024). */
const GARMENTS = [
  {
    key: "polo-navy",
    base: path.join(OUT, "blank-navy-polo.png"),
    logoSize: 70,
    // Classic left-chest: just right of the placket (not toward the sleeve).
    logoLeft: 510,
    logoTop: 290,
  },
  {
    key: "ladies-polo",
    base: path.join(OUT, "blank-ladies-polo.png"),
    logoSize: 64,
    logoLeft: 495,
    logoTop: 270,
  },
  {
    key: "quarter-zip",
    base: path.join(OUT, "blank-quarter-zip.png"),
    logoSize: 72,
    logoLeft: 555,
    logoTop: 300,
  },
  {
    key: "cap-navy",
    base: path.join(OUT, "blank-navy-cap.png"),
    logoSize: 120,
    logoLeft: 452,
    logoTop: 340,
  },
  {
    key: "visor-black",
    base: path.join(OUT, "blank-black-visor.png"),
    logoSize: 130,
    logoLeft: 447,
    logoTop: 380,
  },
  {
    key: "towel",
    base: path.join(OUT, "blank-golf-towel.png"),
    logoSize: 140,
    logoLeft: 442,
    logoTop: 300,
  },
];

/**
 * Knock out near-white backgrounds, soft-circle crop — flat crest, no shadow blob.
 * Skip white knockout when the mark is already a filled badge (dark field + light ink),
 * otherwise white embroidery detail (e.g. Spanish Wells ship) is erased.
 */
async function embroideryLogo(logoPath, size) {
  const { data, info } = await sharp(logoPath)
    .ensureAlpha()
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let nearWhite = 0;
  let otherOpaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 245 && g > 245 && b > 245) nearWhite += 1;
    else otherOpaque += 1;
  }
  // Only treat white as background when it dominates (logo on white plate).
  const knockOutWhite = nearWhite > otherOpaque * 2;

  if (knockOutWhite) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 245 && g > 245 && b > 245) data[i + 3] = 0;
    }
  }

  const cleaned = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );

  return sharp(cleaned)
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function brandOne(club, garment) {
  const logoPath = path.join(BRAND, club.logo);
  if (!fs.existsSync(logoPath)) {
    throw new Error(`Missing logo for ${club.slug}: ${club.logo}`);
  }
  if (!fs.existsSync(garment.base)) {
    throw new Error(`Missing base garment: ${garment.base}`);
  }

  const logo = await embroideryLogo(logoPath, garment.logoSize);
  const outPath = path.join(OUT, `${club.slug}-apparel-${garment.key}.png`);

  await sharp(garment.base)
    .composite([
      { input: logo, left: garment.logoLeft, top: garment.logoTop },
    ])
    .png({ quality: 90 })
    .toFile(outPath);

  return outPath;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const only = new Set(process.argv.slice(2).filter(Boolean));
  const clubs = only.size
    ? CLUBS.filter((c) => only.has(c.slug))
    : CLUBS;

  if (!clubs.length) {
    console.error("No matching clubs. Known:", CLUBS.map((c) => c.slug).join(", "));
    process.exit(1);
  }

  const written = [];
  for (const club of clubs) {
    for (const garment of GARMENTS) {
      const out = await brandOne(club, garment);
      written.push(path.relative(ROOT, out));
      console.log("wrote", path.relative(ROOT, out));
    }
  }
  console.log(`Done — ${written.length} files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
