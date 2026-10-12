export type CatalogProduct = { sku: string; name: string; category?: string };

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Heuristic product match from a free-text camera note. */
export function matchProductHeuristic(
  cameraNote: string,
  catalog: CatalogProduct[],
): { sku: string; name: string; confidence: number } | null {
  const note = norm(cameraNote);
  if (!note || catalog.length === 0) return null;

  let best: { sku: string; name: string; confidence: number } | null = null;
  for (const p of catalog) {
    const name = norm(p.name);
    const sku = norm(p.sku);
    let conf = 0;
    if (note.includes(name) || name.includes(note)) conf = 0.92;
    else if (note.includes(sku) || note.includes(p.sku.toLowerCase())) conf = 0.88;
    else {
      const tokens = name.split(" ").filter((t) => t.length > 2);
      const hits = tokens.filter((t) => note.includes(t)).length;
      if (hits > 0) conf = 0.45 + hits / Math.max(tokens.length, 1) * 0.4;
    }
    if (p.category && note.includes(norm(p.category))) conf = Math.min(1, conf + 0.08);
    if (!best || conf > best.confidence) {
      best = { sku: p.sku, name: p.name, confidence: conf };
    }
  }
  if (!best || best.confidence < 0.5) return null;
  return best;
}
