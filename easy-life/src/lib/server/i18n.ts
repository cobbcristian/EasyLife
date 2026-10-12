import { cookies } from "next/headers";
import { translate, type Lang } from "@/lib/translate";

export const LANG_COOKIE = "easy-life-lang";

export { translate };
export type { Lang };

export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return value === "es" ? "es" : "en";
}

export async function tServer(key: string): Promise<string> {
  return translate(await getServerLang(), key);
}
