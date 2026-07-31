import { cookies } from "next/headers";
import { es } from "@/lib/translations/es";
import type { Lang } from "@/lib/i18n";

export const LANG_COOKIE = "easy-life-lang";

export function translate(lang: Lang, key: string): string {
  if (lang === "es") return es[key] ?? key;
  return key;
}

export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return value === "es" ? "es" : "en";
}

export async function tServer(key: string): Promise<string> {
  return translate(await getServerLang(), key);
}
