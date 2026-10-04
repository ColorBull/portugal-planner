// The trip's summary page: what is worked out from the days, and what the
// family fills in afterwards. The latter lives on the trip doc:
//
//   trip.summary = {
//     note:       "a few words about the trip",
//     ratings_by: { [emailKey]: { email, food: 1-5, transport: 1-5, … } },
//     highlights: { [id]: { text, at, by } },
//     actions:    { [id]: { text, done, at, by } },
//   }
//
// highlights / actions are maps rather than arrays so each entry is its own
// field path (see setTripSummary in api/trips.js).

import { dayTotal, fixedReceipt } from "@/lib/money";
import { emailKey } from "@/api/gcal";

export { emailKey };

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

// Where the family sleeps after a day: `plan.stay` when set (the editor's
// "Ночуем в"), else worked out from the day's city. A transfer day such as
// "Порту → Лиссабон" ends in Lisbon; "Лиссабон — Белем" (a trip out and back)
// or "Лиссабон, Синтра" stays in the first place named.
const ARROW = /\s*(?:→|->|—>|–>|⇒|➝|➔|=>)\s*/;
export function overnightCity(plan, trip) {
  const stay = (plan?.stay || "").trim();
  if (stay) return stay;
  const city = (plan?.city || trip?.city || "").trim();
  if (!city) return "";
  const parts = city.split(ARROW).map((x) => x.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || city;
  return last.split(/\s+[—–-]\s+|\s*[,/;]\s*|\s+\+\s+/)[0].trim() || last;
}

// "Лиссабон", " лиссабон ", "Лиссабон." are one city.
const cityKey = (name) =>
  name.toLocaleLowerCase().replace(/ё/g, "е").replace(/[.\s]+$/, "").replace(/\s+/g, " ");

// [{ city, nights, days, cost }] in the order the cities were first slept in —
// one row per place the family stayed overnight, so a transfer day is not a
// city of its own and a city is never counted twice. Each day but the last
// gives a night (and its spending) to where it ends; the last day's spending
// goes to where the family woke up. A one-day trip is just its city.
// `cost` is daily spending only: a flight is not the city's.
export function cityStats(tripDays, days, trip) {
  const byCity = new Map();
  const row = (name) => {
    const city = name || "—";
    const key = cityKey(city);
    if (!byCity.has(key)) byCity.set(key, { city, nights: 0, days: 0, cost: 0 });
    return byCity.get(key);
  };
  const n = tripDays.length;
  tripDays.forEach((d, i) => {
    const plan = days[d.key];
    const last = i === n - 1 && n > 1;
    const r = last ? row(overnightCity(days[tripDays[i - 1].key], trip)) : row(overnightCity(plan, trip));
    if (!last) r.nights += 1;
    r.days += 1;
    r.cost = Math.round((r.cost + dayTotal(plan)) * 100) / 100;
  });
  return [...byCity.values()];
}

// { total, daily, fixed, perDay, top: { day, total } | null }
//   daily  — the days' own spending (perDay and the top day come from it)
//   fixed  — flights, insurance, SIM… as a receipt (money.js → fixedReceipt)
//   total  — both together: what the trip cost
export function costStats(tripDays, days) {
  let daily = 0;
  let top = null;
  tripDays.forEach((d) => {
    const sum = dayTotal(days[d.key]);
    daily += sum;
    if (sum > 0 && (!top || sum > top.total)) top = { day: d, total: sum };
  });
  daily = Math.round(daily * 100) / 100;
  const fixed = fixedReceipt(tripDays.map((d) => days[d.key]));
  return {
    total: Math.round((daily + fixed.total) * 100) / 100,
    daily,
    fixed,
    perDay: tripDays.length ? Math.round((daily / tripDays.length) * 100) / 100 : 0,
    top,
  };
}

// Oldest first; with `doneLast`, finished action items sink to the bottom.
export function sortedEntries(map, doneLast = false) {
  return Object.entries(map || {})
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (doneLast ? !!a.done - !!b.done : 0) || (a.at || 0) - (b.at || 0));
}

const valid = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
const mean = (values) =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

// Everyone who has rated: [{ key, email, ratings: { food: 4, … } }].
export function raters(summary) {
  return Object.entries(summary?.ratings_by || {})
    .map(([key, v]) => ({
      key,
      email: v?.email || "",
      ratings: Object.fromEntries(
        RATING_QUESTIONS.filter((q) => valid(v?.[q.key])).map((q) => [q.key, v[q.key]])
      ),
    }))
    .filter((r) => Object.keys(r.ratings).length);
}

// One question across the family: { avg, votes: [{ email, value }] }.
export function questionStats(list, qKey) {
  const votes = list
    .filter((r) => r.ratings[qKey])
    .map((r) => ({ email: r.email, value: r.ratings[qKey] }));
  return { avg: mean(votes.map((v) => v.value)), votes };
}

// The family's overall score: each question's average, averaged.
export function familyAverage(list) {
  return mean(RATING_QUESTIONS.map((q) => questionStats(list, q.key).avg).filter((v) => v !== null));
}

// The trip's score for its card and header: { avg, count } (avg null when
// nobody has rated yet).
export function tripRating(trip) {
  const list = raters(trip?.summary);
  return { avg: familyAverage(list), count: list.length };
}

// Over once its last day is behind (local date): time to rate it.
export function tripIsOver(trip, today = new Date()) {
  if (!trip?.endDate) return false;
  const pad = (n) => String(n).padStart(2, "0");
  const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return trip.endDate < key;
}
