// Turns a trip's start/end date into the day cards shown on the dashboard.
// Everything is computed in UTC so the cards never shift by a timezone.

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

// Only a guard against a typo'd year producing an endless list — a real trip
// of any length (even over a year) is shown in full.
const MAX_DAYS = 3660;

export function parseKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

export function toKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDayLabel(key) {
  const date = parseKey(key);
  if (!date) return key || "";
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

// [{ key, label, weekday, dayNumber }] — inclusive of both ends.
export function buildDays(startDate, endDate) {
  const start = parseKey(startDate);
  const end = parseKey(endDate);
  if (!start || !end || end < start) return [];

  const days = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end && days.length < MAX_DAYS) {
    const key = toKey(cursor);
    days.push({
      key,
      label: formatDayLabel(key),
      weekday: WEEKDAYS[cursor.getUTCDay()],
      dayNumber: days.length + 1,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

// "2026", or "2026-2027" for a trip that runs into another year. Taken from
// the dates; `year` is only the fallback for a trip saved without them.
export function tripYearLabel(trip) {
  const start = parseKey(trip?.startDate);
  const end = parseKey(trip?.endDate);
  if (!start) return trip?.year ? String(trip.year) : "";
  const a = start.getUTCFullYear();
  const b = end ? end.getUTCFullYear() : a;
  return b > a ? `${a}-${b}` : String(a);
}

export function tripRangeLabel(trip) {
  if (!trip?.startDate || !trip?.endDate) return "";
  // Across a new year the bare "23 дек — 31 дек" would be ambiguous.
  const crosses = trip.startDate.slice(0, 4) !== trip.endDate.slice(0, 4);
  const label = (key) => (crosses ? `${formatDayLabel(key)} ${key.slice(0, 4)}` : formatDayLabel(key));
  return `${label(trip.startDate)} — ${label(trip.endDate)}`;
}
