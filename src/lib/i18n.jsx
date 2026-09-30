// Three interface languages: Russian (the source), English and Hebrew (RTL).
//
// The Russian text itself is the key: `t("Сохранить")` returns it untouched in
// Russian and looks it up in src/lib/i18n/{en,he}.js otherwise — a missing entry
// simply shows the Russian. `t("Введите {n} цифры.", { n: 4 })` fills {n}.
// Constants that hold Russian text (icon names, extras titles…) stay Russian and
// are translated where they are shown: `t(label)`.
//
// `t` reads the current language from this module, so anything rendered after a
// switch is right; the app remounts its pages on a switch (see App.jsx) so that
// already-rendered text is redone. Trip and plan content written by the users
// (cities, activities, notes) is data, not interface, and is never translated.

import { createContext, useContext, useState } from "react";
import en from "@/lib/i18n/en";
import he from "@/lib/i18n/he";

export const LANGUAGES = [
  { code: "ru", name: "Русский", short: "RU", dir: "ltr" },
  { code: "en", name: "English", short: "EN", dir: "ltr" },
  { code: "he", name: "עברית", short: "עב", dir: "rtl" },
];

const DICTIONARIES = { en, he };
const STORAGE_KEY = "pp_lang";

function stored() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((l) => l.code === code)) return code;
  } catch {
    /* ignore */
  }
  return "ru";
}

function applyToDocument(code) {
  const { dir } = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
}

let current = stored();
applyToDocument(current); // before the first paint, so there is no flash

export const getLang = () => current;
export const isRtl = () => current === "he";

// BCP-47 tag for Intl / toLocaleString in the current language.
export const localeTag = () => ({ ru: "ru-RU", en: "en-GB", he: "he-IL" })[current];

export function t(key, params) {
  let text = DICTIONARIES[current]?.[key] ?? key;
  if (params) text = text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
  return text;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(current);

  const setLang = (code) => {
    if (code === current) return;
    current = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
    applyToDocument(code);
    setLangState(code);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, rtl: lang === "he" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}
