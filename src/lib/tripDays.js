// Turns a trip's start/end date into the day cards shown on the dashboard.
// Everything is computed in UTC so the cards never shift by a timezone.

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const MAX_DAYS = 60;

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

export function tripRangeLabel(trip) {
  if (!trip?.startDate || !trip?.endDate) return "";
  return `${formatDayLabel(trip.startDate)} — ${formatDayLabel(trip.endDate)}`;
}
