import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Loader2,
  Upload,
  UserRound,
} from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { useAuth } from "@/lib/AuthContext";
import { canSeeTrip } from "@/lib/tripLock";
import { formatDayLabel, tripYearLabel } from "@/lib/tripDays";
import { countryLabel } from "@/lib/countries";
import {
  applyCalendarChanges,
  calendarName,
  calendarWebUrl,
  connectCalendar,
  connectedCalendarAccount,
  deviceTimeZone,
  emailKey,
  ensureCalendar,
  explainCalendarError,
  findCalendarChanges,
  getCalendarAccount,
  preloadCalendar,
  pushTrip,
  tripTimeZone,
} from "@/api/gcal";
import { t } from "@/lib/i18n";

// Settings → Google Calendar: pick a trip, then send its schedule to a calendar
// of its own (api/gcal.js), or bring back what was changed there.

// Every zone the browser knows, the device's and the trip's included.
function timeZones(...extra) {
  let list = [];
  try {
    list = Intl.supportedValuesOf("timeZone");
  } catch {
    list = [];
  }
  return [...new Set([...extra.filter(Boolean), ...list])].sort();
}

const action =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium " +
  "transition disabled:opacity-50";

function describe(change) {
  if (change.type === "rename") return t("Переименовано: «{from}» → «{to}»", { from: change.from, to: change.to });
  if (change.type === "move")
    return t("Перенесено на {day}: «{text}»", { day: formatDayLabel(change.day), text: change.text });
  if (change.type === "time")
    return change.time
      ? t("Новое время {time}: «{text}»", {
          time: change.endTime ? `${change.time}–${change.endTime}` : change.time,
          text: change.text,
        })
      : t("Теперь на весь день: «{text}»", { text: change.text });
  if (change.type === "add")
    return t("Новое событие на {day}: «{text}»", {
      day: formatDayLabel(change.day),
      text: change.time
        ? `${change.time}${change.endTime ? `–${change.endTime}` : ""} ${change.text}`
        : change.text,
    });
  return t("Удалено в календаре: «{text}»", { text: change.text });
}

export default function CalendarSettings({ onBack }) {
  const { trips, saveTripGcal, editTrip } = useTrips();
  const { user } = useAuth();
  const email = user?.email;
  const visible = trips.filter((trip) => canSeeTrip(trip, email));

  const [tripId, setTripId] = useState(null);
  const [busy, setBusy] = useState(null); // "push" | "pull" | "apply"
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState(null); // { kind: "ok" | "error", text }
  const [changes, setChanges] = useState(null);
  // The Google account the calendar lives in (api/gcal.js), chosen per device.
  const [account, setAccount] = useState(() => getCalendarAccount(email));
  const [connected, setConnected] = useState(() => connectedCalendarAccount());

  // Load Google's script now, so the consent window can open inside the click.
  useEffect(() => {
    preloadCalendar();
  }, []);

  const trip = visible.find((x) => x.id === tripId) || null;
  const mine = trip?.gcal?.[emailKey(email)] || null;

  const choose = (id) => {
    setTripId(id);
    setStatus(null);
    setChanges(null);
  };

  const remember = (id, pushedAt) =>
    saveTripGcal(trip.id, { ...(trip.gcal || {}), [emailKey(email)]: { id, pushedAt, account } });

  // Always the chosen account; Google's answer for another one is refused.
  const connect = async () => {
    await connectCalendar({ account });
    setConnected(connectedCalendarAccount());
  };

  const chooseAccount = () =>
    guard("account", async () => {
      await connectCalendar({ choose: true });
      const picked = connectedCalendarAccount();
      if (picked) setAccount(picked);
      setConnected(picked);
      setStatus({ kind: "ok", text: t("Календарь будет в аккаунте {email}.", { email: picked || account }) });
    });

  const guard = async (kind, job) => {
    setBusy(kind);
    setStatus(null);
    setChanges(null);
    try {
      await job();
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", text: explainCalendarError(err) });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const push = () =>
    guard("push", async () => {
      // A minute early: the calendar's clock and this device's may differ.
      const startedAt = new Date(Date.now() - 60000).toISOString();
      await connect();
      // A calendar made in another Google account isn't reachable from this one.
      const saved = mine && mine.account && mine.account !== account ? { ...trip, gcal: {} } : trip;
      const { id } = await ensureCalendar(saved, email);
      const result = await pushTrip(trip, id, (done, total) => setProgress({ done, total }));
      await remember(id, startedAt);
      setStatus({
        kind: "ok",
        text: result.selected
          ? t("Отправлено: создано {created}, обновлено {updated}, удалено {removed}.", result)
          : t(
              "Ни один пункт не отмечен для календаря. Откройте день, нажмите «⋯» у пункта и выберите «Добавить в Google Calendar».",
              result
            ) + (result.removed ? " " + t("Удалено из календаря: {removed}.", result) : ""),
      });
    });

  const pull = () =>
    guard("pull", async () => {
      if (!mine?.id || (mine.account && mine.account !== account)) {
        setStatus({ kind: "error", text: t("Календарь ещё не создан для этой поездки. Сначала отправьте расписание.") });
        return;
      }
      await connect();
      const found = await findCalendarChanges(trip, mine.id, mine.pushedAt);
      if (!found.length) setStatus({ kind: "ok", text: t("Изменений в календаре нет.") });
      else setChanges(found.map((c) => ({ ...c, on: true })));
    });

  const apply = () =>
    guard("apply", async () => {
      const chosen = changes.filter((c) => c.on);
      await connect();
      await applyCalendarChanges(trip, mine.id, chosen);
      await remember(mine.id, new Date().toISOString());
      setStatus({ kind: "ok", text: t("Применено: {n}.", { n: chosen.length }) });
    });

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-800"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("Назад")}
      </button>

      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[#1d3b5c]">
        <CalendarDays className="h-5 w-5" />
        {t("Синхронизация с Google Calendar")}
      </h3>
      <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-stone-200">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          {t("Аккаунт Google для календаря")}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-stone-400" />
          <span dir="ltr" className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">
            {account || "—"}
          </span>
          {connected && connected === account && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#2f6b4f]">
              <Check className="h-3.5 w-3.5" />
              {t("подключён")}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={chooseAccount}
          disabled={!!busy}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#1d3b5c] ring-1 ring-stone-300 transition hover:bg-stone-100 disabled:opacity-50"
        >
          {busy === "account" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
          {t("Сменить аккаунт")}
        </button>
        <p className="mt-1.5 text-xs text-stone-400">
          {t("Синхронизация идёт только с этим аккаунтом, даже если на устройстве их несколько.")}
        </p>
      </div>

      <p className="mt-4 text-sm text-stone-500">{t("Выберите поездку")}</p>

      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-stone-400">{t("Нет доступных поездок.")}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {visible.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => choose(x.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start text-sm transition ${
                x.id === tripId
                  ? "bg-[#1d3b5c] text-white"
                  : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {x.city} {tripYearLabel(x)}
                </span>
                <span className={`block truncate text-xs ${x.id === tripId ? "text-white/70" : "text-stone-400"}`}>
                  {countryLabel(x)}
                </span>
              </span>
              {x.id === tripId && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {trip && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-stone-500">
            {t(
              "Календарь «{name}» появится в Google Calendar аккаунта {account}. В него попадают только пункты, отмеченные «Добавить в Google Calendar» (меню «⋯» у пункта): с временем — в это время, без времени — на весь день.",
              { name: calendarName(trip), account }
            )}
          </p>

          <label className="block text-xs text-stone-500">
            {t("Часовой пояс поездки")}
            <select
              value={tripTimeZone(trip)}
              disabled={!!busy}
              onChange={(e) =>
                editTrip(trip.id, { timezone: e.target.value }).catch((err) => {
                  console.error(err);
                  setStatus({ kind: "error", text: t("Не удалось сохранить.") });
                })
              }
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base text-stone-800 outline-none sm:text-sm"
            >
              {timeZones(trip.timezone, deviceTimeZone()).map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={push}
            disabled={!!busy}
            className={`${action} bg-[#1d3b5c] text-white hover:bg-[#16304b]`}
          >
            {busy === "push" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy === "push" && progress
              ? t("Отправляю: {done} из {total}", progress)
              : t("Отправить в календарь")}
          </button>

          <button
            type="button"
            onClick={pull}
            disabled={!!busy}
            className={`${action} bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100`}
          >
            {busy === "pull" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy === "pull" ? t("Ищу изменения…") : t("Забрать из календаря")}
          </button>
        </div>
      )}

      {changes && (
        <div className="mt-4 rounded-2xl bg-white/70 p-3 ring-1 ring-stone-200">
          <p className="text-sm text-stone-600">
            {t("Найдено изменений: {n}. Снимите галочки с лишних и примените.", { n: changes.length })}
          </p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto overscroll-contain">
            {changes.map((c, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={c.on}
                    onChange={(e) =>
                      setChanges((list) => list.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#1d3b5c]"
                  />
                  <span className="min-w-0 break-words">{describe(c)}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={apply}
            disabled={!!busy || !changes.some((c) => c.on)}
            className={`${action} mt-2 bg-[#1d3b5c] text-white hover:bg-[#16304b]`}
          >
            {busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("Применить выбранное")}
          </button>
        </div>
      )}

      {status && (
        <p className={`mt-3 text-sm ${status.kind === "error" ? "text-[#a8451f]" : "text-stone-600"}`}>
          {status.text}
        </p>
      )}

      {status?.kind === "ok" && mine && (
        <a
          href={calendarWebUrl(account)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900"
        >
          <ExternalLink className="h-4 w-4" />
          {t("Открыть Google Calendar")}
        </a>
      )}
    </div>
  );
}
