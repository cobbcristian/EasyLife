/**
 * Rebuild Spanish Wells brand assets from the club's official site logos.
 * Previous community-spanish-wells.png was a blank white square (invisible on white UI).
 */
import { unlinkSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const brandDir = resolve(process.cwd(), "public/brand");
const FILL = "#0c3b5c";
const SIZE = 512;
const HEADER_INK = { r: 0x00, g: 0x28, b: 0x56 }; // #002856

const siteLogoUrl =
  "https://www.spanishwellscountryclub.com/wp-content/uploads/sites/9743/2025/09/90_1_a8223a.png";
const shipIconUrl =
  "https://www.spanishwellscountryclub.com/wp-content/uploads/sites/9743/2025/09/apple-touch-icon_d3d9e5.png";

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function whiteMarkFromIcon(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    const lum = (out[i] + out[i + 1] + out[i + 2]) / 3;
    if (a < 16 || lum < 25) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    } else {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(340, 340, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function darkWordmark(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    const lum = (out[i] + out[i + 1] + out[i + 2]) / 3;
    if (a < 16) continue;
    if (lum > 180) {
      out[i] = HEADER_INK.r;
      out[i + 1] = HEADER_INK.g;
      out[i + 2] = HEADER_INK.b;
    } else if (lum < 40) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function main() {
  const [siteLogo, shipIcon] = await Promise.all([
    fetchBuffer(siteLogoUrl),
    fetchBuffer(shipIconUrl),
  ]);

  const whiteShip = await whiteMarkFromIcon(shipIcon);
  const circleSvg = Buffer.from(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">`,
      `<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="${FILL}"/>`,
      `</svg>`,
    ].join(""),
  );

  const crestPath = resolve(brandDir, "community-spanish-wells.png");
  await sharp(circleSvg)
    .composite([{ input: whiteShip, gravity: "centre" }])
    .png()
    .toFile(crestPath);

  const wordmarkPath = resolve(brandDir, "community-spanish-wells-wordmark.png");
  await sharp(await darkWordmark(siteLogo)).toFile(wordmarkPath);

  for (const f of [
    "sw-site-logo.png",
    "sw-apple-icon.png",
    "community-spanish-wells-white.png",
  ]) {
    try {
      unlinkSync(resolve(brandDir, f));
    } catch {
      /* ignore */
    }
  }

  const crestMeta = await sharp(crestPath).metadata();
  const wordMeta = await sharp(wordmarkPath).metadata();
  console.log(
    JSON.stringify(
      {
        crest: { path: crestPath, ...crestMeta },
        wordmark: { path: wordmarkPath, ...wordMeta },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
