export function translateRecord<T extends object>(
  t: (key: string) => string,
  record: T,
  fields: (keyof T)[],
): T {
  const out = { ...record };
  for (const field of fields) {
    const value = out[field];
    if (typeof value === "string") {
      (out as Record<string, unknown>)[field as string] = t(value);
    }
  }
  return out;
}

export function translateList<T extends object>(
  t: (key: string) => string,
  list: T[],
  fields: (keyof T)[],
): T[] {
  return list.map((item) => translateRecord(t, item, fields));
}

export function translateNestedOptions(
  t: (key: string) => string,
  options: { label: string; votes: number }[],
): { label: string; votes: number }[] {
  return options.map((o) => ({ ...o, label: t(o.label) }));
}

export function translateFaqs(
  t: (key: string) => string,
  faqs: { q: string; a: string }[],
): { q: string; a: string }[] {
  return faqs.map((f) => ({ q: t(f.q), a: t(f.a) }));
}
