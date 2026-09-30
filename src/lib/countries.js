import { COUNTRIES } from "@/data/countries";
import { getLang } from "@/lib/i18n";

// Country name in the interface language. `name` (Russian) stays the stored,
// canonical value; Hebrew comes from the browser's own region names.
const hebrewNames = new Map();
export function countryName(country) {
  if (!country) return "";
  const lang = getLang();
  if (lang === "en") return country.nameEn || country.name;
  if (lang === "he") {
    if (!hebrewNames.has(country.code)) {
      let name = "";
      try {
        name = new Intl.DisplayNames(["he"], { type: "region" }).of(country.code) || "";
      } catch {
        /* older browser: fall back below */
      }
      hebrewNames.set(country.code, name);
    }
    return hebrewNames.get(country.code) || country.nameEn || country.name;
  }
  return country.name;
}

// What to print for a trip's country: the localized name when it is a known
// country, otherwise whatever free text was saved.
export function countryLabel(trip) {
  const c = tripCountry(trip);
  return c ? countryName(c) : trip?.country || "";
}

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

const normalise = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е");

const byName = new Map();
COUNTRIES.forEach((c) => {
  byName.set(normalise(c.name), c);
  if (!byName.has(normalise(c.nameEn))) byName.set(normalise(c.nameEn), c);
});

/**
 * Resolve a trip's country. Trips saved before the picker existed only carry a
 * free-text `country`, so fall back to matching that against the names.
 */
export function findCountry(codeOrName) {
  if (!codeOrName) return null;
  const raw = String(codeOrName).trim();
  return byCode.get(raw.toUpperCase()) || byName.get(normalise(raw)) || null;
}

export function tripCountry(trip) {
  if (!trip) return null;
  return findCountry(trip.countryCode) || findCountry(trip.country);
}

/** 🇵🇹 — the flag emoji for an alpha-2 code. */
export function flagEmoji(code) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)
  );
}

/** Names starting with the query come first, then names containing it. */
export function searchCountries(query) {
  const q = normalise(query);
  if (!q) return COUNTRIES;
  const starts = [];
  const contains = [];
  COUNTRIES.forEach((c) => {
    const ru = normalise(c.name);
    const en = normalise(c.nameEn);
    const local = normalise(countryName(c));
    if (ru.startsWith(q) || en.startsWith(q) || local.startsWith(q) || normalise(c.code) === q) starts.push(c);
    else if (ru.includes(q) || en.includes(q) || local.includes(q)) contains.push(c);
  });
  return [...starts, ...contains];
}
