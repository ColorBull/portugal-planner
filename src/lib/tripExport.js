// Turns a whole trip (days, prices, notes, documents) into one HTML page.
// Drive converts that HTML into a native Google Doc on upload, which is what
// NotebookLM reads and keeps in sync (see api/drive.js → saveGoogleDoc).

import { buildDays, tripRangeLabel, tripYearLabel } from "@/lib/tripDays";
import { EXTRAS, dayTotal, formatMoney, parseCost, tripCurrency } from "@/lib/money";
import { driveViewUrl } from "@/api/drive";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const link = (href, text) => `<a href="${esc(href)}">${esc(text || href)}</a>`;

const mapHref = (x) =>
  x.mapUrl ||
  (x.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.address)}`
    : "");

// Group records by day_key, then by item_id.
function group(records) {
  const out = {};
  (records || []).forEach((r) => {
    ((out[r.day_key] ||= {})[r.item_id] ||= []).push(r);
  });
  return out;
}

const noteHtml = (n) =>
  `<li><i>Заметка:</i> ${esc(n.text)}${n.link ? ` ${link(n.link)}` : ""}</li>`;

const fileHtml = (p) =>
  p.kind === "document"
    ? `<li><i>Документ:</i> ${link(driveViewUrl(p.drive_file_id), p.file_name || "документ")}</li>`
    : `<li><i>Фото:</i> ${link(driveViewUrl(p.drive_file_id), "открыть фото")}</li>`;

export function tripDocName(trip) {
  return `${trip.city} ${tripYearLabel(trip)} — план поездки`;
}

export function buildTripHtml({ trip, days, notes, photos }) {
  const currency = tripCurrency(trip);
  const notesBy = group(notes);
  const filesBy = group(photos);
  const list = buildDays(trip.startDate, trip.endDate);

  let tripTotal = 0;
  const body = [];

  list.forEach((day) => {
    const plan = days[day.key];
    const dayNotes = notesBy[day.key] || {};
    const dayFiles = filesBy[day.key] || {};
    const used = new Set();
    const sections = plan?.sections || [];
    const hasExtras = day.dayNumber === 1 && EXTRAS.some(({ key }) => plan?.[key]?.company || plan?.[key]?.cost);
    if (!sections.length && !hasExtras && !Object.keys(dayNotes).length) return;

    body.push(
      `<h2>День ${day.dayNumber}: ${esc(day.label)} (${esc(day.weekday)}), ${esc(plan?.city || trip.city)} — ${esc(day.key)}</h2>`
    );

    if (hasExtras) {
      body.push("<h3>Страховка и SIM-карта</h3><ul>");
      EXTRAS.forEach(({ key, title }) => {
        const x = plan?.[key];
        if (!x?.company && !x?.cost) return;
        const cost = parseCost(x.cost);
        body.push(
          `<li>${esc(title)}: ${esc(x.company || "—")}${cost === null ? "" : `, ${esc(formatMoney(cost, currency))}`}</li>`
        );
        (dayFiles[key] || []).forEach((p) => body.push(`<ul>${fileHtml(p)}</ul>`));
        used.add(key);
      });
      body.push("</ul>");
    }

    sections.forEach((s) => {
      body.push(`<h3>${esc(s.title)}</h3>`);
      const sm = s.mapUrl ? `<p>${link(s.mapUrl, "Маршрут на карте")}</p>` : "";
      body.push(sm, "<ul>");
      (s.items || []).forEach((it) => {
        const cost = parseCost(it.cost);
        const href = mapHref(it);
        const extra = [
          it.address && `📍 ${href ? link(href, it.address) : esc(it.address)}`,
          cost !== null && `<b>${esc(formatMoney(cost, currency))}</b>`,
        ].filter(Boolean);
        const sub = [
          ...(dayNotes[it.id] || []).map(noteHtml),
          ...(dayFiles[it.id] || []).map(fileHtml),
        ];
        used.add(it.id);
        body.push(
          `<li>${esc(it.text)}${extra.length ? ` — ${extra.join(", ")}` : ""}${sub.length ? `<ul>${sub.join("")}</ul>` : ""}</li>`
        );
      });
      body.push("</ul>");
    });

    // Notes / files whose plan item no longer exists (or that are day-wide).
    const loose = [
      ...Object.entries(dayNotes).filter(([k]) => !used.has(k)).flatMap(([, v]) => v.map(noteHtml)),
      ...Object.entries(dayFiles).filter(([k]) => !used.has(k)).flatMap(([, v]) => v.map(fileHtml)),
    ];
    if (loose.length) body.push(`<h3>Прочее</h3><ul>${loose.join("")}</ul>`);

    const total = dayTotal(plan);
    tripTotal += total;
    if (total) body.push(`<p><b>Итого за день: ${esc(formatMoney(total, currency))}</b></p>`);
  });

  const head = [
    `<h1>${esc(trip.city)} ${esc(tripYearLabel(trip))} — ${esc(trip.country)}</h1>`,
    `<p>Даты: ${esc(tripRangeLabel(trip))}. Валюта: ${esc(currency)}.` +
      (tripTotal ? ` Общая стоимость по плану: <b>${esc(formatMoney(tripTotal, currency))}</b>.` : "") +
      "</p>",
    `<p><i>Обновлено: ${esc(new Date().toLocaleString("ru-RU"))}. Документ создан автоматически из приложения Portugal Planner — правьте план там, а не здесь.</i></p>`,
  ];

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(tripDocName(trip))}</title></head><body>${head.join("")}${body.join("")}</body></html>`;
}
