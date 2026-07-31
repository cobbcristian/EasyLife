import fs from "node:fs";
import path from "node:path";

const map = new Map([
  [0x91, "'"],
  [0x92, "'"],
  [0x93, '"'],
  [0x94, '"'],
  [0x95, "·"],
  [0x96, "–"],
  [0x97, "—"],
  [0x9d, "·"],
  [0xa0, " "],
  [0xa9, "(c)"],
  [0xae, "(R)"],
  [0xb7, "·"],
]);

function fixFile(filePath) {
  const b = fs.readFileSync(filePath);
  const out = [];
  const counts = {};
  let i = 0;
  while (i < b.length) {
    const c = b[i];
    if (c < 0x80) {
      out.push(c);
      i++;
      continue;
    }
    if (
      (c & 0xe0) === 0xc0 &&
      i + 1 < b.length &&
      (b[i + 1] & 0xc0) === 0x80
    ) {
      out.push(c, b[i + 1]);
      i += 2;
      continue;
    }
    if (
      (c & 0xf0) === 0xe0 &&
      i + 2 < b.length &&
      (b[i + 1] & 0xc0) === 0x80 &&
      (b[i + 2] & 0xc0) === 0x80
    ) {
      out.push(c, b[i + 1], b[i + 2]);
      i += 3;
      continue;
    }
    if (
      (c & 0xf8) === 0xf0 &&
      i + 3 < b.length &&
      (b[i + 1] & 0xc0) === 0x80 &&
      (b[i + 2] & 0xc0) === 0x80 &&
      (b[i + 3] & 0xc0) === 0x80
    ) {
      out.push(c, b[i + 1], b[i + 2], b[i + 3]);
      i += 4;
      continue;
    }
    counts[c] = (counts[c] || 0) + 1;
    const repl = map.get(c) || "-";
    out.push(...Buffer.from(repl, "utf8"));
    i++;
  }
  fs.writeFileSync(filePath, Buffer.from(out));
  return counts;
}

function countBad(filePath) {
  const b = fs.readFileSync(filePath);
  let bad = 0;
  let i = 0;
  while (i < b.length) {
    const c = b[i];
    if (c < 0x80) {
      i++;
      continue;
    }
    if (
      (c & 0xe0) === 0xc0 &&
      i + 1 < b.length &&
      (b[i + 1] & 0xc0) === 0x80
    ) {
      i += 2;
      continue;
    }
    if (
      (c & 0xf0) === 0xe0 &&
      i + 2 < b.length &&
      (b[i + 1] & 0xc0) === 0x80 &&
      (b[i + 2] & 0xc0) === 0x80
    ) {
      i += 3;
      continue;
    }
    if (
      (c & 0xf8) === 0xf0 &&
      i + 3 < b.length &&
      (b[i + 1] & 0xc0) === 0x80 &&
      (b[i + 2] & 0xc0) === 0x80 &&
      (b[i + 3] & 0xc0) === 0x80
    ) {
      i += 4;
      continue;
    }
    bad++;
    i++;
  }
  return bad;
}

const dir = path.join(process.cwd(), "src/lib/server");
const targets = [
  "copperleaf-seed.ts",
  "falls-club-seed.ts",
  "highland-woods-seed.ts",
];

for (const f of targets) {
  const p = path.join(dir, f);
  const counts = fixFile(p);
  console.log("fixed", f, counts);
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("-seed.ts"))) {
  const bad = countBad(path.join(dir, f));
  if (bad) console.log("STILL BAD", f, bad);
}
console.log("done");
