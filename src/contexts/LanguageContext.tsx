"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { content, type Content, type Locale } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  t: Content;
};

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "ppm-locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // One-time hydration from persisted preference / browser language.
    // Must run after mount to avoid SSR/client markup mismatch, so setState here is intentional.
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    const browser = navigator.language.toLowerCase();
    const initial: Locale =
      saved === "en" || saved === "ja"
        ? saved
        : browser.startsWith("ja")
          ? "ja"
          : "en";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const toggle = useCallback(() => {
    setLocale(locale === "en" ? "ja" : "en");
  }, [locale, setLocale]);

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, toggle, t: content[locale] }),
    [locale, setLocale, toggle]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
