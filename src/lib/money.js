// Costs on plan items, the first day's insurance / SIM card, and day totals.
// A cost is stored as a plain number in the trip's currency (trip.currency).
//
// Two kinds of spending:
//   fixed  — paid for the trip as a whole, usually before it: flights, the
//            insurance and SIM card, other preparations. Counted in the trip's
//            total (the summary's receipt), never in a day's total.
//   daily  — everything else: meals, tickets, local transport, gifts… What a
//            day's "Итого за день" adds up.
// A plan item is fixed when `item.fixed === true`, or when it sits in a
// "Перелёт" (Plane) block and nobody set `fixed: false` on it.

import { localeTag } from "@/lib/i18n";

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
  const n = new Intl.NumberFormat(localeTag(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  // Non-breaking space: the amount and its currency sign must never wrap apart.
  return `${n} ${currency}`;
}

// The first-day extras: one company name + cost each (documents are ordinary
// uploads with these ids as item_id).
export const EXTRAS = [
  { key: "insurance", title: "Страховка", placeholder: "Страховая компания" },
  { key: "sim", title: "SIM-карта", placeholder: "Оператор SIM-карты" },
];

// Kinds of fixed spending, in receipt order. Russian titles are i18n keys.
export const FIXED_KINDS = [
  { key: "flights", title: "Перелёты" },
  { key: "insurance", title: "Страховка" },
  { key: "sim", title: "SIM-карта" },
  { key: "prep", title: "Подготовка и прочее" },
];

const round = (n) => Math.round(n * 100) / 100;

export function isFixedItem(item, section) {
  if (typeof item?.fixed === "boolean") return item.fixed;
  return section?.icon === "Plane";
}

// The fixed spending of one day: [{ kind, text, cost }] (only what has a price).
export function fixedItems(plan) {
  const out = [];
  EXTRAS.forEach(({ key }) => {
    const cost = parseCost(plan?.[key]?.cost);
    if (cost !== null) out.push({ kind: key, text: plan[key].company || "", cost });
  });
  (plan?.sections || []).forEach((s) =>
    (s.items || []).forEach((it) => {
      const cost = parseCost(it.cost);
      if (cost === null || !isFixedItem(it, s)) return;
      out.push({ kind: s.icon === "Plane" ? "flights" : "prep", text: it.text || "", cost });
    })
  );
  return out;
}

export const fixedTotal = (plan) => round(fixedItems(plan).reduce((sum, x) => sum + x.cost, 0));

// What was spent on the day itself — fixed spending is left out.
export function dayTotal(plan) {
  let sum = 0;
  (plan?.sections || []).forEach((s) =>
    (s.items || []).forEach((it) => {
      if (!isFixedItem(it, s)) sum += parseCost(it.cost) || 0;
    })
  );
  return round(sum);
}

// The trip's fixed spending as a receipt: { lines: [{ kind, title, total,
// items: [{ text, cost }] }], total } — one line per kind that has any.
export function fixedReceipt(plans) {
  const byKind = new Map();
  plans.forEach((plan) =>
    fixedItems(plan).forEach((x) => {
      const line = byKind.get(x.kind) || { kind: x.kind, total: 0, items: [] };
      line.total += x.cost;
      line.items.push({ text: x.text, cost: x.cost });
      byKind.set(x.kind, line);
    })
  );
  const lines = FIXED_KINDS.filter((k) => byKind.has(k.key)).map((k) => {
    const line = byKind.get(k.key);
    return { ...line, title: k.title, total: round(line.total) };
  });
  return { lines, total: round(lines.reduce((sum, l) => sum + l.total, 0)) };
}
