import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import {
  X,
  MapPin,
  CalendarDays,
  Clock,
  ExternalLink,
  Pencil,
  Loader2,
  Check,
  Trash2,
  Wallet,
  ShieldCheck,
  Smartphone,
  MoreHorizontal,
  ImagePlus,
  FileText,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Receipt,
  AlarmClock,
  Coffee,
  Plus,
  BedDouble,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Mic,
  Minus,
  Menu,
} from "lucide-react";
import { TripPhoto } from "@/api/entities";
import PlanPhotoGrid from "@/components/PlanPhotoGrid";
import PlanNoteBox from "@/components/PlanNoteBox";
import ActionMenu from "@/components/ActionMenu";
import AddressInput from "@/components/AddressInput";
import TimeSelect from "@/components/TimeSelect";
import ExpenseScope from "@/components/ExpenseScope";
import { useAuth } from "@/lib/AuthContext";
import { overnightCity } from "@/lib/tripSummary";
import { alarmTime, setAlarm } from "@/lib/alarm";
import { ICON_OPTIONS, iconFor, styleFor } from "@/data/planStyles";
import { openMapUrl } from "@/lib/mapsLink";
import { uid } from "@/api/trips";
import { tripYearLabel } from "@/lib/tripDays";
import { useIsPhone } from "@/lib/useIsPhone";
import { useHoldMenu } from "@/lib/useHoldMenu";
import { countryLabel } from "@/lib/countries";
import { EXTRAS, dayExpenses, dayTotal, fixedTotal, formatMoney, isFixedItem, parseCost, tripCurrency } from "@/lib/money";
import { t, getLang } from "@/lib/i18n";

const EXTRA_ICONS = { insurance: ShieldCheck, sim: Smartphone };

// A price that can be set or changed right in the day view: tap the badge (or
// "+ цена" when there is none), type, Enter or tap away to save, Esc to cancel.
// `fixed`: a general trip expense (lib/money.js) — blue badge, not in the day's
// total. With `scope`, the day / general choice is asked while the price is
// typed, and `onSave(cost, fixed)` gets it too. `large`: the plan item's badge,
// the same size as its time chip and on the same row.
const InlineCost = forwardRef(function InlineCost(
  { cost, currency, onSave, fixed = false, scope = false, large = false },
  ref
) {
  const amount = parseCost(cost);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [fixedDraft, setFixedDraft] = useState(fixed);
  const [busy, setBusy] = useState(false);

  const start = () => {
    setValue(amount === null ? "" : String(amount).replace(".", ","));
    setFixedDraft(fixed);
    setEditing(true);
  };

  useImperativeHandle(ref, () => ({ start }));

  // Hold (or right-click) the badge to change or delete the price.
  const { bind, menu } = useHoldMenu([
    { key: "edit", label: t("Изменить цену"), icon: Pencil, run: start },
    { key: "del", label: t("Удалить цену"), icon: Trash2, danger: true, run: () => onSave(null) },
  ]);

  const commit = async () => {
    const next = parseCost(value);
    if (next === amount && (!scope || next === null || fixedDraft === fixed)) return setEditing(false);
    setBusy(true);
    try {
      await onSave(next, fixedDraft);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert(t("Не удалось сохранить цену."));
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    const field = (
      <span
        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white font-semibold text-stone-600 ring-1 ring-stone-300 ${
          large ? "h-[30px] px-3 text-[15px]" : "ms-2 px-2.5 py-1 text-sm sm:px-2 sm:py-0.5 sm:text-xs"
        }`}
      >
        <input
          autoFocus
          inputMode="decimal"
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="0"
          className={`w-16 bg-transparent text-end text-base tabular-nums outline-none ${large ? "sm:text-[15px]" : "sm:text-xs"}`}
        />
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : currency}
      </span>
    );
    if (!scope) return field;
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        {field}
        <ExpenseScope value={fixedDraft} onChange={setFixedDraft} />
      </span>
    );
  }

  // No price yet: nothing to show — "Цена" in the item's "⋯" menu starts editing.
  if (amount === null) return null;

  return (
    <>
    {menu}
    <button
      type="button"
      dir="ltr"
      {...bind}
      onClick={start}
      title={fixed ? t("Общий расход поездки — не входит в итог дня") : t("Изменить цену")}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold tabular-nums transition ${
        large ? "h-[30px] gap-1.5 px-3 text-[15px] font-bold sm:px-2.5" : "ms-2 px-2.5 py-1 text-xs sm:px-2 sm:py-0.5"
      } ${
        fixed ? "" : "bg-stone-200/70 text-stone-600 hover:bg-stone-300/70 active:bg-stone-300/70"
      }`}
      style={fixed ? { backgroundColor: "#e8eef5", color: "#1d3b5c" } : undefined}
    >
      {fixed && <Receipt className={`${large ? "h-4 w-4" : "h-3 w-3"} shrink-0`} />}
      {formatMoney(amount, currency)}
    </button>
    </>
  );
});

// When a plan item happens: `time` (start) and `end_time` ("HH:MM", "" for none).
// With them the item goes to Google Calendar as an event with those hours
// instead of an all-day one (api/gcal.js). An end earlier than the start means
// the next day (a night flight).
const TIME_RE = /^\d{2}:\d{2}$/;
const timeLabel = (item) =>
  TIME_RE.test(item.time || "")
    ? `${item.time}${TIME_RE.test(item.end_time || "") ? `–${item.end_time}` : ""}`
    : "";

// The chip on the first line, level with the timeline dot (30px tall, so the
// hours read at a glance), with the title below it. Tap to change, hold (right-click) to
// change or delete. The alarm-clock button beside it sets a device alarm (lib/alarm.js).
function TimeChip({ item, onEdit, onClear, onAlarm }) {
  const { bind, menu } = useHoldMenu([
    { key: "edit", label: t("Изменить время"), icon: Pencil, run: onEdit },
    { key: "alarm", label: t("Поставить будильник"), icon: AlarmClock, run: onAlarm },
    { key: "del", label: t("Удалить время"), icon: Trash2, danger: true, run: onClear },
  ]);
  const label = timeLabel(item);
  if (!label) return null;
  return (
    <>
      {menu}
      <span className="flex h-[30px] items-center gap-1">
        <button
          type="button"
          dir="ltr"
          {...bind}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title={t("Изменить время")}
          className="flex h-full w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-200/70 px-3 text-[15px] font-bold tabular-nums text-stone-700 transition hover:bg-stone-300/70 active:bg-stone-300/70 sm:px-2.5"
        >
          <Clock className="h-4 w-4 shrink-0" />
          {label}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAlarm();
          }}
          title={t("Поставить будильник на {time}", { time: item.time })}
          aria-label={t("Поставить будильник на {time}", { time: item.time })}
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-stone-200/70 hover:text-stone-700 active:bg-stone-200/70"
        >
          <AlarmClock className="h-4 w-4" />
        </button>
      </span>
    </>
  );
}

// Start and end, each labelled, under the item (in the flow, like the address).
function TimeEditor({ item, onSave, onClose }) {
  const [start, setStart] = useState(item.time || "");
  const [end, setEnd] = useState(item.end_time || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const commit = async () => {
    const time = TIME_RE.test(start) ? start : "";
    let endTime = TIME_RE.test(end) ? end : "";
    if (endTime && !time) return setError(t("Сначала укажите время начала."));
    if (endTime === time) endTime = "";
    setBusy(true);
    try {
      await onSave({ time, end_time: endTime });
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("Не удалось сохранить."));
    } finally {
      setBusy(false);
    }
  };

  const hint = "block text-[11px] font-semibold uppercase tracking-wider text-stone-400";

  return (
    <div data-no-swipe className="mt-2 rounded-2xl bg-white/70 p-3 ring-1 ring-stone-200">
      <div className="grid grid-cols-2 gap-3">
        <label className={hint}>
          {t("Начало")}
          <TimeSelect value={start} onChange={setStart} className="mt-1" />
        </label>
        <label className={hint}>
          {t("Конец")}
          <TimeSelect value={end} onChange={setEnd} className="mt-1" />
        </label>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        {error ? (
          <span className="text-[#a8451f]">{error}</span>
        ) : (
          t("Без конца событие в календаре длится час. Конец раньше начала — значит, на следующий день.")
        )}
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-stone-500 transition hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-xs"
        >
          <X className="h-3.5 w-3.5" /> {t("Отмена")}
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {t("Сохранить")}
        </button>
      </div>
    </div>
  );
}

// Address of one plan item, editable right in the day view like the price:
// The link shows when there is an address; "Адрес" in the item's "⋯" menu opens
// the editor. It opens in the flow under the item (with its suggestions), so on a phone
// the field is full-width, you see what you type, and the page just scrolls.
const ItemAddress = forwardRef(function ItemAddress({ item, bar, onSave }, ref) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ address: "", mapUrl: "" });
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);

  const start = () => {
    setDraft({ address: item.address || "", mapUrl: item.mapUrl || "" });
    setEditing(true);
  };

  useImperativeHandle(ref, () => ({ start }));

  const { bind, menu } = useHoldMenu([
    { key: "edit", label: t("Изменить адрес"), icon: Pencil, run: start },
    {
      key: "del",
      label: t("Удалить адрес"),
      icon: Trash2,
      danger: true,
      run: () => onSave({ address: "", mapUrl: "" }),
    },
  ]);

  // Bring the field into view once the keyboard has made room for it.
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(
      () => panelRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }),
      300
    );
    return () => clearTimeout(t);
  }, [editing]);

  const commit = async () => {
    setBusy(true);
    try {
      await onSave({ address: draft.address.trim(), mapUrl: draft.address.trim() ? draft.mapUrl : "" });
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert(t("Не удалось сохранить адрес."));
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div
        ref={panelRef}
        data-no-swipe
        className="mt-2 rounded-2xl bg-white/70 p-3 ring-1 ring-stone-200"
      >
        <AddressInput
          autoFocus
          value={draft.address}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          placeholder={t("Адрес или название места")}
          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20 sm:text-sm"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-stone-500 transition hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <X className="h-3.5 w-3.5" /> {t("Отмена")}
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("Сохранить")}
          </button>
        </div>
      </div>
    );
  }

  if (!item.address && !item.mapUrl) return null;
  return (
    <div {...bind}>
      <MapLink item={item} bar={bar} />
      {menu}
    </div>
  );
});

function MapLink({ item, bar }) {
  if (!item.address && !item.mapUrl) return null;
  const href =
    item.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openMapUrl(href);
      }}
      className="mt-1.5 flex max-w-full items-start gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition"
    >
      <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: bar }} />
      <span className="min-w-0 break-words underline decoration-dotted underline-offset-2">
        {item.address || t("Открыть на карте")}
      </span>
      <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60" />
    </a>
  );
}

// `prevDay` / `nextDay` are the neighbouring days ({ key, label }) or null;
// `onNavigate(key)` opens one of them (footer buttons, or a swipe).
export default function DayPlanModal({
  plan,
  dayInfo,
  trip,
  onSave,
  onClose,
  prevDay = null,
  nextDay = null,
  onNavigate,
}) {
  const sections = useMemo(() => plan?.sections || [], [plan]);
  const hasPlan = sections.length > 0;
  // The first day also carries the trip's insurance and SIM card.
  const firstDay = dayInfo?.dayNumber === 1;
  const currency = tripCurrency(trip);
  // The day's own spending; flights, insurance, SIM… are the trip's (lib/money.js).
  const total = dayTotal(plan);
  const fixed = fixedTotal(plan);

  const bodyRef = useRef(null);
  const swipeRef = useRef(null);
  const [photosByItem, setPhotosByItem] = useState({});
  // Edit mode (the "Изменить" button): the day is edited where it is shown, as a
  // copy — "Готово" saves it in one go, "Отменить" drops it (as in Apple's apps).
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = draft !== null;
  // The newest sections, ahead of the saved copy: two quick changes in a row
  // from the "⋯" menus must not each start from the same old list.
  const latest = useRef(sections);
  useEffect(() => {
    latest.current = sections;
  }, [sections]);

  const loadPhotos = async () => {
    if (!dayInfo) return;
    try {
      const records = await TripPhoto.filter({ day_key: dayInfo.key });
      const grouped = {};
      records.forEach((r) => {
        if (!grouped[r.item_id]) grouped[r.item_id] = [];
        grouped[r.item_id].push(r);
      });
      setPhotosByItem(grouped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPhotos();
    setDraft(null);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [dayInfo?.key]);

  // Swipe sideways (not while editing) for the previous / next day. It has to
  // be long and mostly horizontal, so it never steals a scroll.
  const swipeStart = (e) => {
    // Not from a field: selecting text by dragging must not turn the page.
    if (e.target.closest?.("input, textarea, [data-no-swipe]")) {
      swipeRef.current = null;
      return;
    }
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY };
  };
  const swipeEnd = (e) => {
    const from = swipeRef.current;
    swipeRef.current = null;
    if (!from || editing || !onNavigate) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 90 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
    // In Hebrew the next day lies to the left, so the swipe runs the other way.
    const target = (dx < 0) === (getLang() !== "he") ? nextDay : prevDay;
    if (target) onNavigate(target.key);
  };

  // Hold the page still behind the modal. Only `overflow` is touched: pinning
  // the body with `position: fixed` forces a full repaint, which Chrome has
  // been seen to flash as a black frame while the modal opens. The scrims are
  // plain translucent black for the same reason — a backdrop-filter gets
  // re-rasterised whenever the page behind it repaints, and Chrome paints that
  // gap black. Whether you saw it depended on which trip was open.
  useEffect(() => {
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, []);

  // Inline price edits save just the changed fields (saveDay merges): the price,
  // and whether it is the day's or a general one when that was changed with it.
  const setSections = (next) => {
    latest.current = next;
    return onSave({ sections: next });
  };
  const mapItems = (fn) => setSections(latest.current.map((s) => ({ ...s, items: fn(s.items || [], s) })));

  const saveItemCost = (itemId, cost, fixedNow, fixedWas) =>
    mapItems((items) =>
      items.map((it) =>
        it.id === itemId
          ? { ...it, cost, ...(cost !== null && fixedNow !== fixedWas ? { fixed: fixedNow } : {}) }
          : it
      )
    );

  const saveExpenses = (expenses) => onSave({ expenses });

  const saveItemPatch = (itemId, patch) =>
    mapItems((items) => items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));

  // Its photos and notes stay in Firestore / Drive.
  const deleteItem = (itemId) => mapItems((items) => items.filter((it) => it.id !== itemId));

  const saveExtraCost = (key, cost) =>
    onSave({ [key]: { company: plan?.[key]?.company || "", cost } });

  const startEditing = (seed = false) =>
    setDraft({
      city: plan?.city || "",
      stay: plan?.stay || "",
      companies: Object.fromEntries(EXTRAS.map(({ key }) => [key, plan?.[key]?.company || ""])),
      sections:
        seed && !hasPlan
          ? [{ ...newSection(), items: [newItem()] }]
          : sections.map((s) => ({ ...s, items: [...(s.items || [])] })),
    });

  const finishEditing = async () => {
    setSaving(true);
    try {
      await onSave({
        city: draft.city.trim(),
        stay: draft.stay.trim(),
        ...(firstDay
          ? Object.fromEntries(
              EXTRAS.map(({ key }) => [key, { company: draft.companies[key].trim(), cost: parseCost(plan?.[key]?.cost) }])
            )
          : {}),
        // Blank rows go; a block stays if it has a name or anything in it.
        sections: draft.sections
          .map((s) => ({
            ...s,
            title: (s.title || "").trim(),
            items: s.items.map((it) => ({ ...it, text: (it.text || "").trim() })).filter((it) => it.text),
          }))
          .filter((s) => s.title || s.items.length),
      });
      setDraft(null);
    } catch (err) {
      console.error(err);
      alert(t("Не удалось сохранить. Попробуйте ещё раз."));
    } finally {
      setSaving(false);
    }
  };

  const headerCity = plan?.city || trip?.city || "";
  // Where the night is spent, shown when the day's city doesn't say it plainly
  // (a transfer "Порту → Лиссабон", or a "Ночуем в" set in edit mode).
  const stayCity = overnightCity(plan, trip);
  const showStay = !!stayCity && stayCity.trim() !== headerCity.trim();

  const pill =
    "inline-flex h-11 items-center justify-center rounded-full px-4 text-[15px] font-semibold transition sm:h-9 sm:text-sm";
  const headerField =
    "w-full rounded-xl bg-white/15 px-3 py-2 text-white outline-none ring-1 ring-white/30 placeholder:text-white/50 focus:ring-white/70";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-stone-950/60 animate-in fade-in duration-200"
        onClick={editing ? undefined : onClose}
      />

      <motion.div
        className="relative flex h-dvh w-full flex-col overflow-hidden"
        style={{ backgroundColor: "#fbf7f0" }}
        initial={false}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* Header band */}
        <div
          className="shrink-0 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7 sm:pb-6 sm:pt-7"
          style={{
            background:
              "linear-gradient(135deg, #1d3b5c 0%, #2c5f8a 55%, #3a7ca5 100%)",
          }}
        >
          <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute end-0 top-0 flex gap-2">
            {editing ? (
              <>
                <button type="button" onClick={() => setDraft(null)} disabled={saving} className={`${pill} text-white/85 hover:bg-white/15`}>
                  {t("Отменить")}
                </button>
                <button
                  type="button"
                  onClick={finishEditing}
                  disabled={saving}
                  className={`${pill} gap-1.5 bg-white text-[#1d3b5c] shadow-sm disabled:opacity-70`}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("Готово")}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => startEditing(true)} className={`${pill} bg-white/15 text-white hover:bg-white/25`}>
                  {t("Изменить")}
                </button>
                <button
                  onClick={onClose}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25 active:bg-white/25 sm:h-9 sm:w-9"
                  aria-label={t("Закрыть")}
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold tracking-widest uppercase">
            <CalendarDays className="h-4 w-4" />
            {t("День")} {dayInfo?.dayNumber ?? "—"}
          </div>

          {editing ? (
            <div data-no-swipe className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("Город этого дня")}</span>
                <input
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  placeholder={trip?.city || ""}
                  className={`${headerField} text-lg font-semibold`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("Ночуем в")}</span>
                <input
                  value={draft.stay}
                  onChange={(e) => setDraft({ ...draft, stay: e.target.value })}
                  placeholder={overnightCity({ ...plan, stay: "" }, trip) || ""}
                  className={`${headerField} text-base sm:text-lg`}
                />
              </label>
            </div>
          ) : (
            <>
              <h2 className="mt-1.5 max-w-[calc(100%-9.5rem)] font-display text-2xl font-semibold leading-tight text-white sm:mt-2 sm:max-w-none sm:text-4xl">
                {headerCity || t("План скоро появится")}
              </h2>
              <div className="mt-1.5 flex items-center gap-1.5 text-white/75 text-sm">
                {trip?.country && (
                  <>
                    <MapPin className="h-4 w-4" />
                    {countryLabel(trip)}
                    <span className="mx-1.5 text-white/30">·</span>
                  </>
                )}
                {dayInfo?.weekday}, {dayInfo?.label}
              </div>
              {showStay && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
                  <BedDouble className="h-4 w-4 shrink-0" />
                  {t("Ночуем: {city}", { city: stayCity })}
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          onTouchStart={swipeStart}
          onTouchEnd={swipeEnd}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6"
        >
          <div className="mx-auto w-full max-w-3xl">
          {editing ? (
            <DayEditor draft={draft} setDraft={setDraft} firstDay={firstDay} />
          ) : (
            <>
              {firstDay && (
                <div className="mb-7 grid gap-3 sm:grid-cols-2">
                  {EXTRAS.map(({ key, title }) => {
                    const Icon = EXTRA_ICONS[key];
                    const extra = plan?.[key] || {};
                    return (
                      <div
                        key={key}
                        className="min-w-0 rounded-2xl border bg-white/70 p-4"
                        style={{ borderColor: "#ece3d4" }}
                      >
                        <ExtraTools
                          title={title}
                          Icon={Icon}
                          itemKey={key}
                          extra={extra}
                          dayKey={dayInfo.key}
                          currency={currency}
                          photos={photosByItem[key] || []}
                          onChanged={loadPhotos}
                          onSaveCost={(cost) => saveExtraCost(key, cost)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              {hasPlan ? (
                <div className="space-y-7">
                  {sections.map((section, i) => {
                    const Icon = iconFor(section.icon);
                    const style = styleFor(section.icon);

                    return (
                      <div key={section.id || section.title || i}>
                        <div className="flex items-center gap-3 mb-3.5">
                          <span
                            className="plan-chip grid h-10 w-10 place-items-center rounded-xl shrink-0"
                            style={{ backgroundColor: style.bg, color: style.fg }}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-heading text-lg font-semibold text-stone-800 leading-tight">
                              {section.title}
                            </h3>
                            <span
                              className="block h-0.5 w-10 rounded-full mt-1"
                              style={{ backgroundColor: style.bar }}
                            />
                            {section.mapUrl && (
                              <a
                                href={section.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openMapUrl(section.mapUrl);
                                }}
                                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition"
                              >
                                <MapPin className="h-4 w-4 shrink-0" style={{ color: style.bar }} />
                                <span className="underline decoration-dotted underline-offset-2">
                                  {t("Открыть на карте")}
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                              </a>
                            )}
                          </div>
                        </div>

                        <ul
                          className="ms-2 sm:ms-5 ps-6 border-s-2 space-y-4 sm:space-y-3"
                          style={{ borderColor: style.bar }}
                        >
                          {(section.items || []).map((item) => (
                            <li key={item.id} className="relative min-w-0">
                              {/* centred on the 2px rule and on the first text line: the
                                  title has pt-1 on a phone (sm:pt-0) and 26px lines, so the
                                  line's middle is 17px down there and 13px from sm up; a
                                  time / price row (30px) puts it at 19px / 15px */}
                              <span
                                className={`absolute h-2.5 w-2.5 rounded-full ${
                                  timeLabel(item) || parseCost(item.cost) !== null || item.gcal === true
                                    ? "top-3.5 sm:top-2.5"
                                    : "top-3 sm:top-2"
                                }`}
                                style={{
                                  insetInlineStart: "-30px",
                                  backgroundColor: style.bar,
                                  boxShadow: `0 0 0 4px ${style.bg}`,
                                }}
                              />
                              <ItemBlock
                                item={item}
                                fixed={isFixedItem(item, section)}
                                dayKey={dayInfo.key}
                                currency={currency}
                                bar={style.bar}
                                photos={photosByItem[item.id] || []}
                                onChanged={loadPhotos}
                                onSaveCost={(cost, fixedNow) =>
                                  saveItemCost(item.id, cost, fixedNow, isFixedItem(item, section))
                                }
                                onSavePatch={(patch) => saveItemPatch(item.id, patch)}
                                onDelete={() => deleteItem(item.id)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl mb-4"
                    style={{ backgroundColor: "#e8ddd0", color: "#1d3b5c" }}
                  >
                    <CalendarDays className="h-7 w-7" />
                  </span>
                  <p className="text-stone-600 font-medium">{t("План на этот день ещё не составлен")}</p>
                  <button
                    type="button"
                    onClick={() => startEditing(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition"
                    style={{ backgroundColor: "#1d3b5c" }}
                  >
                    <Plus className="h-4 w-4" />
                    {t("Составить план")}
                  </button>
                </div>
              )}
              <DayExpenses
                expenses={dayExpenses(plan)}
                all={Array.isArray(plan?.expenses) ? plan.expenses : []}
                currency={currency}
                onSave={saveExpenses}
              />
              {(total > 0 || fixed > 0) && (
                <div className="mt-3 space-y-2">
                  {total > 0 && (
                    <div
                      className="flex items-center justify-between rounded-2xl px-4 py-3"
                      style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}
                    >
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Wallet className="h-5 w-5" />
                        {t("Итого за день")}
                      </span>
                      <span dir="ltr" className="font-display text-xl font-semibold tabular-nums">
                        {formatMoney(total, currency)}
                      </span>
                    </div>
                  )}
                  {fixed > 0 && (
                    <div className="flex items-start justify-between gap-3 px-4 text-sm text-stone-500">
                      <span className="inline-flex min-w-0 items-start gap-2">
                        <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {t("Общие расходы")}
                          <span className="block text-xs text-stone-400">
                            {t("Не входят в итог дня — учтены в итогах поездки")}
                          </span>
                        </span>
                      </span>
                      <span dir="ltr" className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(fixed, currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Footer: no day-to-day moves while editing. */}
        {!editing && (
          <div
            className="shrink-0 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:py-2.5"
            style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
          >
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
            <DayNavButton day={prevDay} dir="prev" onNavigate={onNavigate} />
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-stone-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {trip ? `${trip.city} ${tripYearLabel(trip)}` : ""}
              </span>
            </span>
            <DayNavButton day={nextDay} dir="next" onNavigate={onNavigate} />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const newItem = () => ({ id: uid("item"), text: "", address: "", mapUrl: "", cost: null, time: "", end_time: "" });
const newSection = () => ({ id: uid("sec"), title: "", icon: "MapPin", mapUrl: "", items: [] });

// A textarea that grows with its text (one row to start).
function GrowText({ value, onChange, onKeyDown, placeholder, className = "", autoFocus = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`block w-full resize-none bg-transparent py-2 text-base leading-snug text-stone-800 outline-none placeholder:text-stone-400 ${className}`}
    />
  );
}

// One row of the edit list, as in iOS: the red minus in front (tap → a "Удалить"
// button takes the grip's place), the content, the grip at the end — the same
// place on every row, block or event.
function EditRow({ armed, onArm, onDelete, handle, children, className = "" }) {
  return (
    <div className={`flex min-h-[52px] items-center gap-2.5 ps-3 pe-1 ${className}`}>
      <button
        type="button"
        onClick={onArm}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white transition"
        style={{ backgroundColor: "#e5484d", transform: armed ? "rotate(90deg)" : undefined }}
        aria-label={t("Удалить")}
      >
        <Minus className="h-4 w-4" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      {armed ? (
        <button
          type="button"
          onClick={onDelete}
          className="me-1.5 shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "#e5484d" }}
        >
          {t("Удалить")}
        </button>
      ) : (
        <span
          {...handle}
          data-no-swipe
          className="grid h-11 w-11 shrink-0 cursor-grab touch-none place-items-center text-stone-400 active:cursor-grabbing"
          aria-label={t("Переместить")}
        >
          <Menu className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}

// Edit mode of the day: each block an inset card — its name, then its events,
// then "Добавить событие"; drag by ≡ (events also between blocks, on a phone
// after a short hold); Enter in an event starts the next one below it.
function DayEditor({ draft, setDraft, firstDay }) {
  const [armed, setArmed] = useState(null); // id of the row showing "Удалить"
  const [focusId, setFocusId] = useState(null); // new row to put the cursor in
  const [pickingIcon, setPickingIcon] = useState(null); // section id
  const sections = draft.sections;

  const setSections = (fn) => setDraft((d) => ({ ...d, sections: fn(d.sections) }));
  const patchSection = (id, patch) => setSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const patchItem = (sid, iid, patch) =>
    setSections((list) =>
      list.map((s) => (s.id === sid ? { ...s, items: s.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) } : s))
    );
  const addItem = (sid, afterIndex) => {
    const item = newItem();
    setSections((list) =>
      list.map((s) => {
        if (s.id !== sid) return s;
        const items = [...s.items];
        items.splice(afterIndex ?? items.length, 0, item);
        return { ...s, items };
      })
    );
    setFocusId(item.id);
  };
  const removeItem = (sid, iid) =>
    setSections((list) => list.map((s) => (s.id === sid ? { ...s, items: s.items.filter((it) => it.id !== iid) } : s)));
  const addSection = () => {
    const s = newSection();
    setSections((list) => [...list, s]);
    setFocusId(s.id);
  };
  const arm = (id) => setArmed((a) => (a === id ? null : id));

  const onDragEnd = ({ source, destination, type }) => {
    if (!destination) return;
    setSections((list) => {
      const next = list.map((s) => ({ ...s, items: [...s.items] }));
      if (type === "section") {
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      }
      const from = next.find((s) => s.id === source.droppableId);
      const to = next.find((s) => s.id === destination.droppableId);
      if (!from || !to) return list;
      const [moved] = from.items.splice(source.index, 1);
      to.items.splice(destination.index, 0, moved);
      return next;
    });
  };

  const card = "overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200";
  const divider = "border-t border-stone-200";

  return (
    <div data-no-swipe>
      {firstDay && (
        <div className={`${card} mb-6`}>
          {EXTRAS.map(({ key, title }, i) => {
            const Icon = EXTRA_ICONS[key];
            return (
              <label key={key} className={`flex min-h-[52px] items-center gap-3 px-3 ${i ? divider : ""}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="w-24 shrink-0 text-sm text-stone-500">{t(title)}</span>
                <input
                  value={draft.companies[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, companies: { ...d.companies, [key]: e.target.value } }))}
                  placeholder={t("Компания")}
                  className="min-w-0 flex-1 bg-transparent py-2 text-base text-stone-800 outline-none placeholder:text-stone-400"
                />
              </label>
            );
          })}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="day" type="section">
          {(dropSections) => (
            <div ref={dropSections.innerRef} {...dropSections.droppableProps}>
              {sections.map((section, sIndex) => {
                const Icon = iconFor(section.icon);
                const style = styleFor(section.icon);
                return (
                  <Draggable key={section.id} draggableId={section.id} index={sIndex}>
                    {(dragSection, snap) => (
                      <div ref={dragSection.innerRef} {...dragSection.draggableProps} className="pb-5">
                        <div className={`${card} ${snap.isDragging ? "shadow-xl" : ""}`}>
                          <EditRow
                            armed={armed === section.id}
                            onArm={() => arm(section.id)}
                            onDelete={() => {
                              setArmed(null);
                              setSections((list) => list.filter((s) => s.id !== section.id));
                            }}
                            handle={dragSection.dragHandleProps}
                            className="py-1"
                          >
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => setPickingIcon(pickingIcon === section.id ? null : section.id)}
                                className="plan-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                                style={{ backgroundColor: style.bg, color: style.fg }}
                                aria-label={t("Изменить иконку")}
                                title={t("Изменить иконку")}
                              >
                                <Icon className="h-5 w-5" />
                              </button>
                              <input
                                value={section.title}
                                autoFocus={focusId === section.id}
                                onChange={(e) => patchSection(section.id, { title: e.target.value })}
                                placeholder={t("Название блока")}
                                className="min-w-0 flex-1 bg-transparent py-2 font-heading text-lg font-semibold text-stone-800 outline-none placeholder:font-normal placeholder:text-stone-400"
                              />
                            </div>
                          </EditRow>
                          {pickingIcon === section.id && (
                            <div className={`${divider} flex flex-wrap gap-1.5 px-3 py-2.5`}>
                              {ICON_OPTIONS.map((o) => {
                                const OIcon = iconFor(o.value);
                                const os = styleFor(o.value);
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => {
                                      patchSection(section.id, { icon: o.value });
                                      setPickingIcon(null);
                                    }}
                                    className={`plan-chip grid h-10 w-10 place-items-center rounded-xl ${o.value === section.icon ? "ring-2 ring-stone-400" : ""}`}
                                    style={{ backgroundColor: os.bg, color: os.fg }}
                                    title={t(o.label)}
                                    aria-label={t(o.label)}
                                  >
                                    <OIcon className="h-5 w-5" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <Droppable droppableId={section.id} type="item">
                            {(dropItems) => (
                              <div ref={dropItems.innerRef} {...dropItems.droppableProps}>
                                {section.items.map((item, iIndex) => (
                                  <Draggable key={item.id} draggableId={item.id} index={iIndex}>
                                    {(dragItem, itemSnap) => (
                                      <div
                                        ref={dragItem.innerRef}
                                        {...dragItem.draggableProps}
                                        className={`${divider} bg-white ${itemSnap.isDragging ? "rounded-xl shadow-lg" : ""}`}
                                      >
                                        <EditRow
                                          armed={armed === item.id}
                                          onArm={() => arm(item.id)}
                                          onDelete={() => {
                                            setArmed(null);
                                            removeItem(section.id, item.id);
                                          }}
                                          handle={dragItem.dragHandleProps}
                                        >
                                          <div className="flex items-start gap-2.5">
                                            <span className="mt-[15px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: style.bar }} />
                                            <GrowText
                                              value={item.text}
                                              autoFocus={focusId === item.id}
                                              onChange={(text) => patchItem(section.id, item.id, { text })}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                  e.preventDefault();
                                                  addItem(section.id, iIndex + 1);
                                                }
                                              }}
                                              placeholder={t("Событие")}
                                            />
                                          </div>
                                        </EditRow>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {dropItems.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <button
                            type="button"
                            onClick={() => addItem(section.id)}
                            className={`${divider} flex min-h-[52px] w-full items-center gap-2.5 ps-3 text-start text-[15px] text-stone-600 transition hover:bg-stone-100`}
                          >
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: "#30a46c" }}>
                              <Plus className="h-4 w-4" strokeWidth={3} />
                            </span>
                            {t("Добавить событие")}
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {dropSections.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        type="button"
        onClick={addSection}
        className={`${card} flex min-h-[52px] w-full items-center gap-2.5 ps-3 text-start text-[15px] font-medium text-stone-700 transition hover:bg-stone-100`}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: "#30a46c" }}>
          <Plus className="h-4 w-4" strokeWidth={3} />
        </span>
        {t("Добавить блок")}
      </button>
      <p className="mt-3 px-1 text-xs text-stone-400">
        {t("Перетащите ≡, чтобы поменять порядок. Цены, адреса, фото и заметки — в меню «⋯» каждого события.")}
      </p>
    </div>
  );
}

// Small spending of the day that isn't a plan item — coffee, a snack, a bus
// ticket, a souvenir — logged at the foot of the day, next to its total. Each
// is the day's or a general one (ExpenseScope); stored as `plan.expenses`
// (lib/money.js). Tap a line to change or delete it.
function DayExpenses({ expenses, all, currency, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState(null); // { id?, text, cost, fixed }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!form) return;
    const timer = setTimeout(() => formRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    return () => clearTimeout(timer);
  }, [!!form]);

  const open = (e) => {
    setError(null);
    setForm(
      e
        ? { id: e.id, text: e.text || "", cost: String(parseCost(e.cost)).replace(".", ","), fixed: e.fixed === true }
        : { text: "", cost: "", fixed: false }
    );
  };

  const persist = async (next) => {
    setBusy(true);
    setError(null);
    try {
      await onSave(next);
      setForm(null);
    } catch (err) {
      console.error(err);
      setError(t("Не удалось сохранить."));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const cost = parseCost(form.cost);
    if (cost === null) return setError(t("Укажите сумму."));
    const entry = { text: form.text.trim(), cost, fixed: form.fixed };
    persist(
      form.id
        ? all.map((e) => (e.id === form.id ? { ...e, ...entry } : e))
        : [...all, { id: uid("exp"), ...entry, at: Date.now(), by: user?.email || null }]
    );
  };

  const remove = () => persist(all.filter((e) => e.id !== form.id));

  const field =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20 sm:text-sm";

  return (
    <div className="mt-8 rounded-2xl border bg-white/70 p-4" style={{ borderColor: "#ece3d4" }}>
      <div className="flex items-center gap-2">
        <span
          className="plan-chip grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: "#f0e8e2", color: "#7a5a3a" }}
        >
          <Coffee className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold leading-tight text-stone-700">{t("Мелкие расходы")}</span>
          <span className="block text-xs text-stone-400">{t("Кофе, перекусы, мелкие покупки")}</span>
        </span>
        {!form && (
          <button
            type="button"
            onClick={() => open(null)}
            className="ms-auto inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-stone-800 px-3.5 text-[13px] font-medium text-white transition hover:bg-stone-700 sm:min-h-0 sm:py-1.5 sm:text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Добавить")}
          </button>
        )}
      </div>

      {expenses.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-200/70">
          {expenses.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => open(e)}
                title={t("Изменить или удалить")}
                className="flex w-full items-center gap-3 rounded-lg py-2.5 text-start transition hover:bg-stone-200/40 sm:py-2"
              >
                <span className="min-w-0 flex-1 break-words text-stone-700">{e.text || t("Без названия")}</span>
                {e.fixed === true && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}
                    title={t("Общий расход поездки — не входит в итог дня")}
                  >
                    <Receipt className="h-3 w-3" />
                    {t("Общий")}
                  </span>
                )}
                <span dir="ltr" className="shrink-0 font-semibold tabular-nums text-stone-600">
                  {formatMoney(parseCost(e.cost), currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div ref={formRef} data-no-swipe className="mt-3 space-y-2.5">
          <input
            autoFocus
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("На что: кофе, мороженое, такси…")}
            className={field}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-32 shrink-0">
              <input
                inputMode="decimal"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="0"
                aria-label={t("Стоимость")}
                className={`${field} pe-9 text-end tabular-nums`}
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                {currency}
              </span>
            </div>
            <ExpenseScope
              value={form.fixed}
              onChange={(fixed) => setForm((f) => ({ ...f, fixed }))}
              className="flex-1 sm:flex-none"
            />
          </div>
          <p className="text-xs text-stone-400">
            {error ? (
              <span className="text-[#a8451f]">{error}</span>
            ) : form.fixed ? (
              t("Общий расход (жильё, аренда машины, страховка…) не входит в итог дня — он учтён в итогах поездки.")
            ) : (
              t("Расход дня входит в «Итого за день».")
            )}
          </p>
          <div className="flex items-center justify-end gap-2">
            {form.id && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="me-auto inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#a8451f] transition hover:bg-[#f7e9e3] sm:px-3 sm:py-1.5 sm:text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("Удалить")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-stone-500 transition hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <X className="h-3.5 w-3.5" /> {t("Отмена")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {t("Сохранить")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// One "⋯" button instead of a row of add-buttons. On a phone the actions come up
// as a bottom sheet with big rows; from `sm` up as a small popover. Portalled, so
// no transformed ancestor can displace it. No fade: see CLAUDE.md (black frame).
// Everything of one plan item in the reading view; its add-actions share one menu.
function ItemBlock({ item, fixed, dayKey, currency, bar, photos, onChanged, onSaveCost, onSavePatch, onDelete }) {
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const costRef = useRef(null);
  const [editingTime, setEditingTime] = useState(false);
  const addressRef = useRef(null);
  const gridRef = useRef(null);
  const noteRef = useRef(null);
  const hasCost = parseCost(item.cost) !== null;
  const hasAddress = !!(item.address || item.mapUrl);
  const wakeAt = alarmTime(item);
  const alarm = () => setAlarm({ dayKey, time: wakeAt, title: item.text });

  const startText = () => {
    setTextDraft(item.text || "");
    setEditingText(true);
  };
  const commitText = async () => {
    const text = textDraft.trim();
    if (!text || text === item.text) return setEditingText(false);
    setBusy(true);
    try {
      await onSavePatch({ text });
      setEditingText(false);
    } catch (err) {
      console.error(err);
      alert(t("Не удалось сохранить."));
    } finally {
      setBusy(false);
    }
  };

  const failed = (err) => {
    console.error(err);
    alert(t("Не удалось сохранить."));
  };

  const actions = [
    { key: "text", icon: Pencil, label: t("Изменить название"), run: startText },
    { key: "cost", icon: Wallet, label: hasCost ? t("Изменить цену") : t("Добавить цену"), run: () => costRef.current?.start() },
    { key: "time", icon: Clock, label: item.time ? t("Изменить время") : t("Указать время"), run: () => setEditingTime(true) },
    {
      key: "gcal",
      icon: item.gcal === true ? CalendarX : CalendarPlus,
      label: item.gcal === true ? t("Убрать из Google Calendar") : t("Добавить в Google Calendar"),
      run: () =>
        onSavePatch({ gcal: item.gcal !== true }).catch((err) => {
          console.error(err);
          alert(t("Не удалось сохранить."));
        }),
    },
    ...(wakeAt
      ? [{ key: "alarm", icon: AlarmClock, label: t("Будильник на {time}", { time: wakeAt }), run: alarm }]
      : []),
    {
      key: "fixed",
      icon: Receipt,
      label: fixed ? t("Сделать расходом дня") : t("Сделать общим расходом"),
      run: () =>
        onSavePatch({ fixed: !fixed }).catch((err) => {
          console.error(err);
          alert(t("Не удалось сохранить."));
        }),
    },
    { key: "address", icon: MapPin, label: hasAddress ? t("Изменить адрес") : t("Добавить адрес"), run: () => addressRef.current?.start() },
    { key: "photo", icon: ImagePlus, label: t("Добавить фото"), run: () => gridRef.current?.pickPhoto() },
    { key: "doc", icon: FileText, label: t("Добавить документ"), run: () => gridRef.current?.pickDocument() },
    { key: "audio", icon: Mic, label: t("Записать голос"), run: () => gridRef.current?.startRecording() },
    { key: "note", icon: StickyNote, label: t("Заметка / ссылка"), run: () => noteRef.current?.open() },
    ...(hasCost ? [{ key: "delcost", icon: Trash2, danger: true, label: t("Удалить цену"), run: () => onSaveCost(null).catch(failed) }] : []),
    ...(item.time ? [{ key: "deltime", icon: Trash2, danger: true, label: t("Удалить время"), run: () => onSavePatch({ time: "", end_time: "" }).catch(failed) }] : []),
    ...(hasAddress ? [{ key: "deladdr", icon: Trash2, danger: true, label: t("Удалить адрес"), run: () => onSavePatch({ address: "", mapUrl: "" }).catch(failed) }] : []),
    {
      key: "delitem",
      icon: Trash2,
      danger: true,
      label: t("Удалить событие"),
      run: () => confirm(t("Удалить «{name}» из плана?", { name: item.text })) && onDelete().catch(failed),
    },
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1 pt-1 sm:pt-0">
          {/* Time and price share the first row, same size; empty → no row. */}
          <div className="mb-1 flex flex-wrap items-center gap-1.5 empty:hidden">
          <TimeChip
            item={item}
            onAlarm={alarm}
            onEdit={() => setEditingTime(true)}
            onClear={() =>
              onSavePatch({ time: "", end_time: "" }).catch((err) => {
                console.error(err);
                alert(t("Не удалось сохранить."));
              })
            }
          />
          <InlineCost ref={costRef} cost={item.cost} currency={currency} onSave={onSaveCost} fixed={fixed} scope large />
          {/* Marked for Google Calendar (api/gcal.js pushes only these). */}
          {item.gcal === true && (
            <span
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}
              title={t("Будет в Google Calendar")}
              aria-label={t("Будет в Google Calendar")}
            >
              <CalendarCheck className="h-4 w-4" />
            </span>
          )}
          </div>
          <div className="break-words leading-relaxed text-stone-700">{item.text}</div>
        </div>
        <ActionMenu actions={actions} label={t("Цена, адрес, фото, документ, заметка")} />
      </div>
      {editingText && (
        <div data-no-swipe className="mt-2 rounded-2xl bg-white/70 p-3 ring-1 ring-stone-200">
          <textarea
            autoFocus
            rows={3}
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20 sm:text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingText(false)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-stone-500 transition hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <X className="h-3.5 w-3.5" /> {t("Отмена")}
            </button>
            <button
              type="button"
              onClick={commitText}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {t("Сохранить")}
            </button>
          </div>
        </div>
      )}
      {editingTime && <TimeEditor item={item} onSave={onSavePatch} onClose={() => setEditingTime(false)} />}
      <ItemAddress ref={addressRef} item={item} bar={bar} onSave={onSavePatch} />
      <PlanPhotoGrid ref={gridRef} itemId={item.id} dayKey={dayKey} photos={photos} onChanged={onChanged} />
      <PlanNoteBox ref={noteRef} itemId={item.id} dayKey={dayKey} />
    </>
  );
}

// Insurance / SIM card of the first day: price, photo, document.
function ExtraTools({ itemKey, title, Icon, extra, dayKey, currency, photos, onChanged, onSaveCost }) {
  const costRef = useRef(null);
  const gridRef = useRef(null);
  const actions = [
    { key: "cost", icon: Wallet, label: parseCost(extra.cost) !== null ? t("Изменить цену") : t("Добавить цену"), run: () => costRef.current?.start() },
    { key: "photo", icon: ImagePlus, label: t("Добавить фото"), run: () => gridRef.current?.pickPhoto() },
    { key: "doc", icon: FileText, label: t("Добавить документ"), run: () => gridRef.current?.pickDocument() },
    ...(parseCost(extra.cost) !== null
      ? [{ key: "delcost", icon: Trash2, danger: true, label: t("Удалить цену"), run: () => onSaveCost(null) }]
      : []),
  ];
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{t(title)}</span>
        {/* -me-[17px]: through the card's padding and border, so this ⋯ lines up with the events' ⋯ */}
        <span className="-me-[17px] ms-auto flex items-center">
          <InlineCost ref={costRef} cost={extra.cost} currency={currency} onSave={onSaveCost} />
          <ActionMenu actions={actions} label={t("Цена, адрес, фото, документ, заметка")} />
        </span>
      </div>
      <div className="mt-2 break-words font-medium text-stone-700">
        {extra.company || <span className="text-sm font-normal text-stone-400">{t("Не указано")}</span>}
      </div>
      <PlanPhotoGrid ref={gridRef} itemId={itemKey} dayKey={dayKey} photos={photos} onChanged={onChanged} />
    </>
  );
}

// Footer button to the neighbouring day; an empty slot keeps the centre label put.
function DayNavButton({ day, dir, onNavigate }) {
  const Chevron = dir === "prev" ? ChevronLeft : ChevronRight;
  const flip = "rtl:rotate-180";
  if (!day || !onNavigate) return <span className="w-24 shrink-0" aria-hidden="true" />;
  return (
    <button
      type="button"
      onClick={() => onNavigate(day.key)}
      className={`inline-flex min-h-11 w-24 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 active:bg-stone-200/60 ${
        dir === "prev" ? "justify-start" : "justify-end"
      }`}
      aria-label={dir === "prev" ? t("Предыдущий день") : t("Следующий день")}
    >
      {dir === "prev" && <Chevron className={`h-4 w-4 shrink-0 ${flip}`} />}
      <span className="truncate">{day.label}</span>
      {dir === "next" && <Chevron className={`h-4 w-4 shrink-0 ${flip}`} />}
    </button>
  );
}

