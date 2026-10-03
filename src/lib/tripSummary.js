// The trip's summary page: what is worked out from the days, and what the
// family fills in afterwards. The latter lives on the trip doc:
//
//   trip.summary = {
//     note:       "a few words about the trip",
//     ratings:    { food: 1-5, transport: 1-5, … },
//     highlights: { [id]: { text, at, by } },
//     actions:    { [id]: { text, done, at, by } },
//   }
//
// highlights / actions are maps rather than arrays so each entry is its own
// field path (see setTripSummary in api/trips.js).

import { dayTotal } from "@/lib/money";

export const SUMMARY_KEY = "summary";

// Russian text is the i18n key; translated where shown.
export const RATING_QUESTIONS = [
  { key: "food", label: "Еда и кухня" },
  { key: "transport", label: "Транспорт" },
  { key: "stay", label: "Жильё и условия" },
  { key: "beauty", label: "Красота городов" },
  { key: "sights", label: "Достопримечательности" },
  { key: "people", label: "Люди и гостеприимство" },
  { key: "safety", label: "Безопасность" },
  { key: "value", label: "Цены и соотношение цена/качество" },
  { key: "weather", label: "Погода" },
  { key: "overall", label: "Общее впечатление" },
];

// [{ city, days, cost }] in the order the cities were first reached.
export function cityStats(tripDays, days, trip) {
  const byCity = new Map();
  tripDays.forEach((d) => {
    const plan = days[d.key];
    const city = (plan?.city || trip?.city || "").trim() || "—";
    const row = byCity.get(city) || { city, days: 0, cost: 0 };
    row.days += 1;
    row.cost += dayTotal(plan);
    byCity.set(city, row);
  });
  return [...byCity.values()];
}

// { total, perDay, top: { day, total } | null }
export function costStats(tripDays, days) {
  let total = 0;
  let top = null;
  tripDays.forEach((d) => {
    const sum = dayTotal(days[d.key]);
    total += sum;
    if (sum > 0 && (!top || sum > top.total)) top = { day: d, total: sum };
  });
  total = Math.round(total * 100) / 100;
  return {
    total,
    perDay: tripDays.length ? Math.round((total / tripDays.length) * 100) / 100 : 0,
    top,
  };
}

// Oldest first; with `doneLast`, finished action items sink to the bottom.
export function sortedEntries(map, doneLast = false) {
  return Object.entries(map || {})
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (doneLast ? !!a.done - !!b.done : 0) || (a.at || 0) - (b.at || 0));
}

export function averageRating(ratings) {
  const values = Object.values(ratings || {}).filter((v) => v >= 1 && v <= 5);
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
