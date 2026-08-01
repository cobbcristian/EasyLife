"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { translate, type Lang } from "@/lib/translate";

export type { Lang };

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "easy-life-lang";

function setLangCookie(lang: Lang) {
  document.cookie = `${STORAGE_KEY}=${lang};path=/;max-age=31536000;samesite=lax`;
}

function readStoredLang(): Lang {
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  return stored === "en" || stored === "es" ? stored : "en";
}

function subscribeLang(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const storedLang = useSyncExternalStore(subscribeLang, readStoredLang, () => "en" as Lang);
  const [override, setOverride] = useState<Lang | null>(null);
  const lang = override ?? storedLang;

  useEffect(() => {
    document.documentElement.lang = lang;
    setLangCookie(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setOverride(next);
    document.documentElement.lang = next;
    setLangCookie(next);
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return { lang: "en", setLang: () => {}, t: (k) => k };
  }
  return ctx;
}
