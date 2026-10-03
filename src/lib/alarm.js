// "Set an alarm" for a plan item. A web page cannot set a phone alarm by
// itself, so this hands it to the device:
// - Android: an intent:// URL for the clock app's SET_ALARM with the hour,
//   minutes and the item's text. Where Chrome refuses it (it only lets pages
//   start activities that accept BROWSABLE), its browser_fallback_url opens a
//   Google Calendar event at that time instead, which notifies.
// - iPhone: there is no URL into the Clock app, so an .ics event with an alert
//   at that exact time (Safari offers "Add to Calendar").
// - Computer: the same Google Calendar event, in a new tab.

const TEXT_TIME_RE = /(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/;

// The item's start time, else the first "8:00"-like time in its text.
export function alarmTime(item) {
  if (/^\d{2}:\d{2}$/.test(item?.time || "")) return item.time;
  const m = TEXT_TIME_RE.exec(item?.text || "");
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

const stamp = (dayKey, hhmm, addMin = 0) => {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi + addMin));
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}00`;
};

function calendarUrl(dayKey, hhmm, title) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `⏰ ${title}`,
    dates: `${stamp(dayKey, hhmm)}/${stamp(dayKey, hhmm, 15)}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function downloadIcs(dayKey, hhmm, title) {
  const esc = (s) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Portugal Planner//Alarm//EN",
    "BEGIN:VEVENT",
    `UID:alarm-${dayKey}-${hhmm.replace(":", "")}-${Date.now()}@portugal-planner`,
    `DTSTAMP:${stamp(new Date().toISOString().slice(0, 10), "00:00")}Z`,
    `DTSTART:${stamp(dayKey, hhmm)}`,
    `DTEND:${stamp(dayKey, hhmm, 15)}`,
    `SUMMARY:${esc(`⏰ ${title}`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `alarm-${dayKey}-${hhmm.replace(":", "")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function setAlarm({ dayKey, time, title }) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return;
  const label = (title || "").trim().slice(0, 80) || time;
  const ua = navigator.userAgent || "";
  const fallback = calendarUrl(dayKey, time, label);

  if (/Android/i.test(ua)) {
    const [h, m] = time.split(":").map(Number);
    window.location.href =
      "intent:#Intent;action=android.intent.action.SET_ALARM;" +
      `i.android.intent.extra.alarm.HOUR=${h};` +
      `i.android.intent.extra.alarm.MINUTES=${m};` +
      `S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(label)};` +
      `S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
    return;
  }
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    downloadIcs(dayKey, time, label);
    return;
  }
  window.open(fallback, "_blank", "noopener");
}
