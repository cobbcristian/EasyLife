import { es } from "@/lib/translations/es";

export type Lang = "en" | "es";

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, es };

/**
 * Resolve UI / seed strings for the active language.
 * English keys pass through; Spanish uses the dictionary plus light pattern fallbacks.
 */
export function translate(lang: Lang, key: string): string {
  if (lang === "en" || !key) return key;

  const dict = dictionaries[lang];
  const hit = dict[key];
  if (hit) return hit;

  // Status keys arrive lowercase ("active") while dictionary uses "Active".
  if (key.length > 0) {
    const titled = key.charAt(0).toUpperCase() + key.slice(1);
    if (dict[titled]) return dict[titled];
  }

  // "$0.95 / click · $175 budget"
  const ppcMatch = key.match(
    /^\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*click\s*·\s*\$([0-9,]+)\s*budget$/i,
  );
  if (ppcMatch) {
    return `$${ppcMatch[1]} / clic · presupuesto $${ppcMatch[2]}`;
  }

  // "Code: ABC" or "Code: ABC · English note"
  const codeMatch = key.match(/^Code:\s*(.+)$/i);
  if (codeMatch) {
    const rest = codeMatch[1].trim();
    const sep = rest.split(/\s*·\s*/);
    if (sep.length === 1) {
      return `Código: ${sep[0]}`;
    }
    const code = sep[0];
    const note = sep.slice(1).join(" · ");
    return `Código: ${code} · ${dict[note] ?? note}`;
  }

  return key;
}
