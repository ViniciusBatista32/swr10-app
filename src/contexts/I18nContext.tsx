import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getLocales } from "expo-localization";
import ptBr from "@/src/i18n/pt-br";
import enUs from "@/src/i18n/en-us";
import { loadLanguage, saveLanguage } from "@/src/storage";

type Translations = typeof ptBr;
type NestedKeyOf<T, Prefix extends string = ""> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Translations>;

const LANGS: Record<string, Translations> = {
  "pt-br": ptBr,
  "en-us": enUs,
};

type I18nContextType = {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "en-us",
  setLang: () => {},
  t: (k) => k,
});

function resolveKey(obj: Record<string, any>, path: string): string {
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = current[part];
  }
  return typeof current === "string" ? current : path;
}

function detectLanguage(): string {
  try {
    const locales = getLocales();
    const tag = locales[0]?.languageTag?.toLowerCase() ?? "";
    if (tag.startsWith("pt")) return "pt-br";
  } catch {}
  return "en-us";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState("en-us");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLanguage().then((saved) => {
      setLangState(saved ?? detectLanguage());
      setReady(true);
    });
  }, []);

  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    saveLanguage(newLang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translations = LANGS[lang] ?? LANGS["en-us"];
      return resolveKey(translations as any, key);
    },
    [lang]
  );

  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
