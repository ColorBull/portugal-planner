// Colour theme: "system" (follow the phone / computer), "dark" or "light".
// The choice lives in localStorage (`pp_theme`); the resolved result is the
// `dark` class on <html>, which src/index.css restyles. index.html applies the
// class once more in an inline script before the first paint.

import { useEffect, useState } from "react";

export const THEMES = ["system", "dark", "light"];
const STORAGE_KEY = "pp_theme";
const query = window.matchMedia("(prefers-color-scheme: dark)");

function stored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(value)) return value;
  } catch {
    /* ignore */
  }
  return "system";
}

let mode = stored();
const listeners = new Set();

const isDark = () => (mode === "system" ? query.matches : mode === "dark");

function apply() {
  const dark = isDark();
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#0f1825" : "#1d3b5c");
  listeners.forEach((fn) => fn(mode));
}

query.addEventListener("change", () => {
  if (mode === "system") apply();
});
apply();

export const getTheme = () => mode;

export function setTheme(next) {
  if (!THEMES.includes(next) || next === mode) return;
  mode = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  apply();
}

export function useTheme() {
  const [current, setCurrent] = useState(mode);
  useEffect(() => {
    listeners.add(setCurrent);
    return () => listeners.delete(setCurrent);
  }, []);
  return { theme: current, setTheme };
}
