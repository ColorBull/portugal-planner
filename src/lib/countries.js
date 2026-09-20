import { COUNTRIES } from "@/data/countries";

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
    if (ru.startsWith(q) || en.startsWith(q) || normalise(c.code) === q) starts.push(c);
    else if (ru.includes(q) || en.includes(q)) contains.push(c);
  });
  return [...starts, ...contains];
}
