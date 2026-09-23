// Costs on plan items, the first day's insurance / SIM card, and day totals.
// A cost is stored as a plain number in the trip's currency (trip.currency).

export const CURRENCIES = ["€", "$", "₪", "£", "₽", "zł", "CHF"];
export const DEFAULT_CURRENCY = "€";

export const tripCurrency = (trip) => trip?.currency || DEFAULT_CURRENCY;

// "12,50" / "12.5 €" / "" → 12.5 / null. Anything that isn't a number is null.
export function parseCost(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const n = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${n} ${currency}`;
}

// The first-day extras: one company name + cost each (documents are ordinary
// uploads with these ids as item_id).
export const EXTRAS = [
  { key: "insurance", title: "Страховка", placeholder: "Страховая компания" },
  { key: "sim", title: "SIM-карта", placeholder: "Оператор SIM-карты" },
];

export function dayTotal(plan) {
  let sum = 0;
  (plan?.sections || []).forEach((s) =>
    (s.items || []).forEach((it) => {
      sum += parseCost(it.cost) || 0;
    })
  );
  EXTRAS.forEach(({ key }) => {
    sum += parseCost(plan?.[key]?.cost) || 0;
  });
  return Math.round(sum * 100) / 100;
}
