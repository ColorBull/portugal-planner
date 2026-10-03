// Two-way sync between a trip's day plans and a Google Calendar.
//
// Each trip gets its own secondary calendar ("✈ City 2026"), created by this
// app. That is what the narrow `calendar.app.created` scope allows: the app can
// make calendars and manage events on the calendars it made, and cannot see the
// rest of the account's calendar. The calendar's id is kept per account on the
// trip (`trip.gcal[<email key>]`), because every family member has their own.
//
// Push  — every plan item becomes an event on its day: from `item.time` to
//         `item.end_time` ("HH:MM", in the trip's time zone — tripTimeZone; no
//         end = one hour; an end before the start = the next day) when it has
//         a start time, else all day. The event carries the item id in its private extended properties and its
//         event id is derived from it, so re-pushing updates instead of
//         duplicating, and items deleted in the app are deleted from the calendar.
// Pull  — events changed in the calendar since the last push are compared with
//         the plan: renamed, moved to another day, given another time, deleted,
//         or new. Nothing is
//         written until the user has seen the list (see CalendarSettings).
//
// The Calendar API must be enabled in the Google Cloud project that owns
// GOOGLE_OAUTH_CLIENT_ID; until then every call answers 403 accessNotConfigured.

import { GOOGLE_OAUTH_CLIENT_ID } from "@/config";
import { loadGis } from "@/api/googleToken";
import { listDays, saveDay, uid } from "@/api/trips";
import { t } from "@/lib/i18n";
import { parseCost, formatMoney, tripCurrency } from "@/lib/money";
import { tripYearLabel, parseKey, toKey } from "@/lib/tripDays";

const SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const API = "https://www.googleapis.com/calendar/v3";
const CONCURRENCY = 4;

let client = null;
let pending = null;
let token = null;
let expiresAt = 0;

export const calendarConnected = () => !!token && expiresAt > Date.now();
export const preloadCalendar = () => loadGis().catch(() => {});

const settle = (value) => {
  const done = pending;
  pending = null;
  done?.(value);
};

// Must run straight from a click: it opens Google's consent / account window.
export async function connectCalendar(hint) {
  if (calendarConnected()) return token;
  await loadGis();
  client ||= window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scope: SCOPE,
    callback: (response) => settle(response),
    error_callback: () => settle(null),
  });
  const response = await new Promise((resolve) => {
    pending = resolve;
    client.requestAccessToken({ prompt: "", hint: hint || undefined });
  });
  if (!response?.access_token || (response.scope && !response.scope.includes(SCOPE))) {
    throw new Error(t("Нужен доступ к Google Calendar. Разрешите его в окне Google."));
  }
  token = response.access_token;
  expiresAt = Date.now() + ((response.expires_in || 3600) - 120) * 1000;
  return token;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, init = {}, attempt = 0) {
  if (!calendarConnected()) {
    throw new Error(t("Сессия Google Calendar истекла. Нажмите кнопку ещё раз."));
  }
  const res = await fetch(path.startsWith("http") ? path : API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (res.ok) return body;

  const reason = body?.error?.errors?.[0]?.reason || "";
  if ((res.status === 429 || /rateLimit/i.test(reason)) && attempt < 4) {
    await wait(600 * 2 ** attempt);
    return call(path, init, attempt + 1);
  }
  const error = new Error(body?.error?.message || `Calendar ${res.status}`);
  error.status = res.status;
  error.reason = reason;
  throw error;
}

// A message a person can act on.
export function explainCalendarError(err) {
  if (err?.reason === "accessNotConfigured" || /has not been used|is disabled/i.test(err?.message || "")) {
    return t(
      "Google Calendar API не включён в проекте Google Cloud. Включите его в Google Cloud Console (APIs & Services → Library → Google Calendar API) и повторите."
    );
  }
  if (err?.status === 401) return t("Сессия Google Calendar истекла. Нажмите кнопку ещё раз.");
  return err?.message || t("Не удалось подключить Google Calendar. Попробуйте ещё раз.");
}

// ---------------------------------------------------------------- helpers ----

export const emailKey = (email) => String(email || "").toLowerCase().replace(/[^a-z0-9]/g, "_");

export const calendarName = (trip) => `✈ ${trip.city} ${tripYearLabel(trip)}`;

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// The zone an item's "HH:MM" is read in: chosen in the calendar settings
// (`trip.timezone`), else this device's.
export const tripTimeZone = (trip) => trip?.timezone || deviceTimeZone();

const TIME = /^\d{2}:\d{2}$/;

// Event ids allow only 0-9 a-v: the item id as base32hex.
const eventIdFor = (itemId) =>
  "pp" + [...new TextEncoder().encode(itemId)].map((b) => b.toString(32).padStart(2, "0")).join("");

const nextDay = (key) => {
  const d = parseKey(key);
  d.setUTCDate(d.getUTCDate() + 1);
  return toKey(d);
};

// Events are listed in the trip's time zone (listEvents), so these are local.
const dayOf = (event) => event.start?.date || event.start?.dateTime?.slice(0, 10) || null;
const timeOf = (event) => (event.start?.dateTime ? event.start.dateTime.slice(11, 16) : "");
const endTimeOf = (event) => (event.end?.dateTime ? event.end.dateTime.slice(11, 16) : "");

// "HH:MM" an hour later, as { date, time } — past midnight it is the next day.
function hourLater(dayKey, time) {
  const [h, m] = time.split(":").map(Number);
  const minutes = h * 60 + m + 60;
  const pad = (n) => String(n).padStart(2, "0");
  const at = `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
  return { date: minutes >= 24 * 60 ? nextDay(dayKey) : dayKey, time: at };
}

function eventTimes(trip, dayKey, item) {
  if (!TIME.test(item.time || "")) {
    return { start: { date: dayKey }, end: { date: nextDay(dayKey) } };
  }
  const timeZone = tripTimeZone(trip);
  const end =
    TIME.test(item.end_time || "") && item.end_time !== item.time
      ? { date: item.end_time < item.time ? nextDay(dayKey) : dayKey, time: item.end_time }
      : hourLater(dayKey, item.time);
  return {
    start: { dateTime: `${dayKey}T${item.time}:00`, timeZone },
    end: { dateTime: `${end.date}T${end.time}:00`, timeZone },
  };
}

function eventBody(trip, dayKey, section, item) {
  const href =
    item.mapUrl ||
    (item.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
      : "");
  const cost = parseCost(item.cost);
  const description = [
    section.title,
    item.address,
    href,
    cost === null ? "" : formatMoney(cost, tripCurrency(trip)),
  ]
    .filter(Boolean)
    .join("\n");
  return {
    summary: (item.text || "").slice(0, 1000) || t("Без названия"),
    description,
    location: item.address || undefined,
    ...eventTimes(trip, dayKey, item),
    transparency: "transparent",
    status: "confirmed",
    extendedProperties: { private: { pp_trip: trip.id, pp_day: dayKey, pp_item: item.id } },
  };
}

async function listEvents(calendarId, timeZone) {
  const out = [];
  let pageToken = "";
  do {
    const page = await call(
      `/calendars/${encodeURIComponent(calendarId)}/events?showDeleted=true&maxResults=2500&timeZone=${encodeURIComponent(
        timeZone
      )}${
        pageToken ? `&pageToken=${pageToken}` : ""
      }`
    );
    out.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return out;
}

async function pool(jobs, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
      while (next < jobs.length) await worker(jobs[next++]);
    })
  );
}

// The calendar of this trip for this account: the saved one, or a new one.
export async function ensureCalendar(trip, email) {
  const saved = trip.gcal?.[emailKey(email)]?.id;
  if (saved) {
    try {
      await call(`/calendars/${encodeURIComponent(saved)}`);
      return { id: saved, created: false };
    } catch (err) {
      if (![403, 404, 410].includes(err.status)) throw err;
    }
  }
  const made = await call("/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary: calendarName(trip),
      description: t("Создано приложением Portugal Planner"),
      timeZone: tripTimeZone(trip),
    }),
  });
  return { id: made.id, created: true };
}

// ------------------------------------------------------------------- push ----

export async function pushTrip(trip, calendarId, onProgress) {
  const days = await listDays(trip.id);
  const existing = await listEvents(calendarId, tripTimeZone(trip));

  // An item may already have an event that did not get its id from us (one the
  // user made in the calendar and then pulled in): keep using that one.
  const eventOf = new Map();
  existing.forEach((e) => {
    const item = e.extendedProperties?.private?.pp_item;
    if (item) eventOf.set(item, e.id);
  });
  const known = new Set(existing.map((e) => e.id));

  const jobs = [];
  const wanted = new Set();
  Object.keys(days)
    .sort()
    .forEach((dayKey) => {
      (days[dayKey].sections || []).forEach((section) =>
        (section.items || []).forEach((item) => {
          const id = eventOf.get(item.id) || eventIdFor(item.id);
          wanted.add(id);
          jobs.push({ id, exists: known.has(id), body: eventBody(trip, dayKey, section, item) });
        })
      );
    });
  const stale = existing.filter(
    (e) => e.extendedProperties?.private?.pp_item && e.status !== "cancelled" && !wanted.has(e.id)
  );

  const cal = encodeURIComponent(calendarId);
  const result = { created: 0, updated: 0, removed: 0 };
  let done = 0;
  const total = jobs.length + stale.length;
  const tick = () => onProgress?.(++done, total);

  await pool(jobs, async (job) => {
    const put = () =>
      call(`/calendars/${cal}/events/${job.id}`, { method: "PUT", body: JSON.stringify(job.body) });
    if (job.exists) {
      await put();
      result.updated++;
    } else {
      try {
        await call(`/calendars/${cal}/events`, {
          method: "POST",
          body: JSON.stringify({ ...job.body, id: job.id }),
        });
        result.created++;
      } catch (err) {
        if (err.status !== 409) throw err;
        await put();
        result.updated++;
      }
    }
    tick();
  });
  await pool(stale, async (event) => {
    await call(`/calendars/${cal}/events/${event.id}`, { method: "DELETE" });
    result.removed++;
    tick();
  });
  return result;
}

// ------------------------------------------------------------------- pull ----

// Compare the calendar with the plan. Only events edited after `pushedAt` count,
// so edits made in the app since the last push are not mistaken for calendar edits.
export async function findCalendarChanges(trip, calendarId, pushedAt) {
  const [events, days] = await Promise.all([listEvents(calendarId, tripTimeZone(trip)), listDays(trip.id)]);

  const where = new Map();
  Object.entries(days).forEach(([dayKey, plan]) =>
    (plan.sections || []).forEach((section) =>
      (section.items || []).forEach((item) => where.set(item.id, { dayKey, item }))
    )
  );

  const since = pushedAt ? new Date(pushedAt).getTime() : 0;
  const changes = [];
  events.forEach((event) => {
    const itemId = event.extendedProperties?.private?.pp_item;
    const day = dayOf(event);
    const edited = !since || new Date(event.updated).getTime() > since;
    if (itemId) {
      const at = where.get(itemId);
      if (!at || !edited) return;
      if (event.status === "cancelled") {
        changes.push({ type: "delete", itemId, text: at.item.text });
        return;
      }
      if (event.summary && event.summary !== at.item.text) {
        changes.push({ type: "rename", itemId, from: at.item.text, to: event.summary });
      }
      if (day && day !== at.dayKey) {
        changes.push({ type: "move", itemId, day, text: event.summary || at.item.text });
      }
      // Hours: the end only counts when the item has one (else it is our hour).
      const time = timeOf(event);
      const endTime = endTimeOf(event);
      const had = TIME.test(at.item.time || "") ? at.item.time : "";
      const hadEnd = had && TIME.test(at.item.end_time || "") ? at.item.end_time : "";
      const pushedEnd = had ? hadEnd || eventTimes(trip, at.dayKey, at.item).end.dateTime.slice(11, 16) : "";
      if (time !== had || endTime !== pushedEnd) {
        changes.push({
          type: "time",
          itemId,
          time,
          endTime: time && (endTime !== pushedEnd || hadEnd) ? endTime : "",
          text: event.summary || at.item.text,
        });
      }
    } else if (event.status !== "cancelled" && day) {
      changes.push({
        type: "add",
        eventId: event.id,
        day,
        time: timeOf(event),
        endTime: endTimeOf(event),
        text: event.summary || t("Без названия"),
        address: event.location || "",
      });
    }
  });
  return changes;
}

export async function applyCalendarChanges(trip, calendarId, changes) {
  const days = await listDays(trip.id);
  const touched = new Set();
  const linked = [];

  const removeItem = (itemId) => {
    for (const [dayKey, plan] of Object.entries(days)) {
      for (const section of plan.sections || []) {
        const i = (section.items || []).findIndex((it) => it.id === itemId);
        if (i >= 0) {
          const [item] = section.items.splice(i, 1);
          touched.add(dayKey);
          return item;
        }
      }
    }
    return null;
  };
  const place = (dayKey, item) => {
    const plan = (days[dayKey] ||= { city: trip.city, sections: [] });
    plan.sections ||= [];
    const title = t("Из календаря");
    let section = plan.sections.find((s) => s.title === title);
    if (!section) {
      section = { id: uid("sec"), title, icon: "MapPin", mapUrl: "", items: [] };
      plan.sections.push(section);
    }
    section.items.push(item);
    touched.add(dayKey);
  };

  for (const change of changes) {
    if (change.type === "delete") removeItem(change.itemId);
    if (change.type === "rename" || change.type === "time") {
      for (const plan of Object.values(days))
        for (const section of plan.sections || [])
          for (const item of section.items || [])
            if (item.id === change.itemId) {
              if (change.type === "rename") item.text = change.to;
              else {
                item.time = change.time;
                item.end_time = change.endTime || "";
              }
              touched.add(plan.id);
            }
    }
    if (change.type === "move") {
      const item = removeItem(change.itemId);
      if (item) {
        item.text = change.text;
        place(change.day, item);
      }
    }
    if (change.type === "add") {
      const item = {
        id: uid("item"),
        text: change.text,
        address: change.address || "",
        mapUrl: "",
        cost: null,
        time: change.time || "",
        end_time: change.time ? change.endTime || "" : "",
      };
      place(change.day, item);
      linked.push({ eventId: change.eventId, day: change.day, itemId: item.id });
    }
  }

  for (const dayKey of touched) {
    const plan = days[dayKey];
    await saveDay(trip.id, dayKey, { city: plan.city || trip.city, sections: plan.sections });
  }

  // The new items now own their calendar events, so the next push updates them
  // rather than adding a second copy.
  const cal = encodeURIComponent(calendarId);
  await pool(linked, (l) =>
    call(`/calendars/${cal}/events/${l.eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        extendedProperties: { private: { pp_trip: trip.id, pp_day: l.day, pp_item: l.itemId } },
      }),
    })
  );
  return changes.length;
}
