import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import { TripPhoto } from "@/api/entities";
import PlanPhotoGrid from "@/components/PlanPhotoGrid";
import PlanNoteBox from "@/components/PlanNoteBox";
import AddressInput from "@/components/AddressInput";
import DayPlanEditor, { emptySection } from "@/components/DayPlanEditor";
import { iconFor, styleFor } from "@/data/planStyles";
import { openMapUrl } from "@/lib/mapsLink";
import { uid } from "@/api/trips";
import { tripYearLabel } from "@/lib/tripDays";
import { useIsPhone } from "@/lib/useIsPhone";
import { useHoldMenu } from "@/lib/useHoldMenu";
import { EXTRAS, dayTotal, formatMoney, parseCost, tripCurrency } from "@/lib/money";

const EXTRA_ICONS = { insurance: ShieldCheck, sim: Smartphone };

// A price that can be set or changed right in the day view: tap the badge (or
// "+ цена" when there is none), type, Enter or tap away to save, Esc to cancel.
const InlineCost = forwardRef(function InlineCost({ cost, currency, onSave }, ref) {
  const amount = parseCost(cost);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const start = () => {
    setValue(amount === null ? "" : String(amount).replace(".", ","));
    setEditing(true);
  };

  useImperativeHandle(ref, () => ({ start }));

  // Hold (or right-click) the badge to change or delete the price.
  const { bind, menu } = useHoldMenu([
    { key: "edit", label: "Изменить цену", icon: Pencil, run: start },
    { key: "del", label: "Удалить цену", icon: Trash2, danger: true, run: () => onSave(null) },
  ]);

  const commit = async () => {
    const next = parseCost(value);
    if (next === amount) return setEditing(false);
    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("Не удалось сохранить цену.");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <span className="ml-2 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-stone-600 ring-1 ring-stone-300 sm:px-2 sm:py-0.5 sm:text-xs">
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
          className="w-16 bg-transparent text-right text-base tabular-nums outline-none sm:text-xs"
        />
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : currency}
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
      {...bind}
      onClick={start}
      title="Изменить цену"
      className="ml-2 inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-stone-200/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-stone-600 transition hover:bg-stone-300/70 active:bg-stone-300/70 sm:px-2 sm:py-0.5"
    >
      {formatMoney(amount, currency)}
    </button>
    </>
  );
});

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
    { key: "edit", label: "Изменить адрес", icon: Pencil, run: start },
    {
      key: "del",
      label: "Удалить адрес",
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
      alert("Не удалось сохранить адрес.");
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
          placeholder="Адрес или название места"
          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20 sm:text-sm"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-stone-500 transition hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <X className="h-3.5 w-3.5" /> Отмена
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Сохранить
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
        {item.address || "Открыть на карте"}
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
  const total = dayTotal(plan);

  const bodyRef = useRef(null);
  const swipeRef = useRef(null);
  const [photosByItem, setPhotosByItem] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
    bodyRef.current?.scrollTo({ top: 0 });
  }, [dayInfo?.key]);

  // Swipe sideways (reading mode only) for the previous / next day. It has to
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
    const target = dx < 0 ? nextDay : prevDay;
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

  const startEditing = (seed = false) => {
    setSaveError(null);
    setDraft({
      city: plan?.city || trip?.city || "",
      sections: seed && !hasPlan ? [emptySection()] : sections.map(cloneSection),
      ...(firstDay
        ? Object.fromEntries(EXTRAS.map(({ key }) => [key, cloneExtra(plan?.[key])]))
        : {}),
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft(null);
  };

  // Inline price edits save just the changed field (saveDay merges).
  const saveItemCost = (itemId, cost) =>
    onSave({
      sections: sections.map((s) => ({
        ...s,
        items: (s.items || []).map((it) => (it.id === itemId ? { ...it, cost } : it)),
      })),
    });

  const saveItemPatch = (itemId, patch) =>
    onSave({
      sections: sections.map((s) => ({
        ...s,
        items: (s.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      })),
    });

  const saveExtraCost = (key, cost) =>
    onSave({ [key]: { company: plan?.[key]?.company || "", cost } });

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(cleanPlan(draft, firstDay));
      setEditing(false);
      setDraft(null);
    } catch (err) {
      console.error(err);
      setSaveError("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const headerCity = plan?.city || trip?.city || "";

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
          <div className="absolute right-0 top-0 flex gap-2">
            {!editing && (
              <button
                onClick={() => startEditing(true)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25 active:bg-white/25 sm:h-9 sm:w-9"
                aria-label="Редактировать день"
                title="Редактировать день"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={editing ? cancelEditing : onClose}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25 active:bg-white/25 sm:h-9 sm:w-9"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold tracking-widest uppercase">
            <CalendarDays className="h-4 w-4" />
            День {dayInfo?.dayNumber ?? "—"}
          </div>

          <h2 className="mt-1.5 max-w-[calc(100%-6.5rem)] font-display text-2xl font-semibold leading-tight text-white sm:mt-2 sm:max-w-none sm:text-4xl">
            {editing ? "Редактирование дня" : headerCity || "План скоро появится"}
          </h2>
          <div className="mt-1.5 flex items-center gap-1.5 text-white/75 text-sm">
            {trip?.country && (
              <>
                <MapPin className="h-4 w-4" />
                {trip.country}
                <span className="mx-1.5 text-white/30">·</span>
              </>
            )}
            {dayInfo?.weekday}, {dayInfo?.label}
          </div>
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
            <DayPlanEditor
              value={draft}
              onChange={setDraft}
              currency={currency}
              firstDay={firstDay}
            />
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
                          onEditCompany={() => startEditing(false)}
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
                      <motion.div
                        key={section.id || section.title || i}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + i * 0.07 }}
                      >
                        <div className="flex items-center gap-3 mb-3.5">
                          <span
                            className="grid h-10 w-10 place-items-center rounded-xl shrink-0"
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
                                  Открыть на карте
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                              </a>
                            )}
                          </div>
                        </div>

                        <ul
                          className="ml-2 sm:ml-5 pl-6 border-l-2 space-y-4 sm:space-y-3"
                          style={{ borderColor: style.bar }}
                        >
                          {section.items.map((item) => (
                            <li key={item.id} className="relative min-w-0">
                              {/* centred on the 2px rule, level with the first text line */}
                              <span
                                className="absolute h-2.5 w-2.5 rounded-full"
                                style={{
                                  left: "-30px",
                                  top: "8px",
                                  backgroundColor: style.bar,
                                  boxShadow: `0 0 0 4px ${style.bg}`,
                                }}
                              />
                              <ItemBlock
                                item={item}
                                dayKey={dayInfo.key}
                                currency={currency}
                                bar={style.bar}
                                photos={photosByItem[item.id] || []}
                                onChanged={loadPhotos}
                                onSaveCost={(cost) => saveItemCost(item.id, cost)}
                                onSavePatch={(patch) => saveItemPatch(item.id, patch)}
                              />
                            </li>
                          ))}
                        </ul>
                      </motion.div>
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
                  <p className="text-stone-600 font-medium">План на этот день ещё не составлен</p>
                  <button
                    type="button"
                    onClick={() => startEditing(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition"
                    style={{ backgroundColor: "#1d3b5c" }}
                  >
                    <Pencil className="h-4 w-4" />
                    Составить план
                  </button>
                </div>
              )}
              {total > 0 && (
                <div
                  className="mt-8 flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}
                >
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Wallet className="h-5 w-5" />
                    Итого за день
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {formatMoney(total, currency)}
                  </span>
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        {editing ? (
          <div
            className="shrink-0 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:py-4"
            style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-end gap-2">
            {saveError && (
              <span className="w-full text-sm text-[#a8451f] sm:mr-auto sm:w-auto">{saveError}</span>
            )}
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-xl px-5 py-3 text-stone-600 font-medium transition hover:bg-stone-200/60 active:bg-stone-200/60 sm:px-4 sm:py-2.5"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm transition disabled:opacity-60 sm:flex-none sm:py-2.5"
              style={{ backgroundColor: "#1d3b5c" }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Сохранить
            </button>
            </div>
          </div>
        ) : (
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

// One "⋯" button instead of a row of add-buttons. On a phone the actions come up
// as a bottom sheet with big rows; from `sm` up as a small popover. Portalled, so
// no transformed ancestor can displace it. No fade: see CLAUDE.md (black frame).
function ActionMenu({ actions }) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = 232;
      const h = actions.length * 44 + 12;
      setPos({
        left: Math.min(Math.max(r.right - w, 8), window.innerWidth - w - 8),
        top: r.bottom + h + 8 > window.innerHeight ? Math.max(r.top - h - 4, 8) : r.bottom + 4,
      });
    }
    setOpen((o) => !o);
  };

  // Run inside the tap itself: a file picker only opens from a user gesture.
  const choose = (action) => {
    setOpen(false);
    action.run();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-stone-200/60 hover:text-stone-700 active:bg-stone-200/60"
        aria-label="Действия"
        title="Цена, адрес, фото, документ, заметка"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open &&
        createPortal(
          <div
            data-no-swipe
            className={`fixed inset-0 z-[70] ${phone ? "bg-stone-950/40" : ""}`}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={
                phone
                  ? "absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
                  : "absolute w-[232px] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-stone-200"
              }
              style={phone ? undefined : { left: pos.left, top: pos.top }}
            >
              {phone && <div className="mx-auto mb-1 mt-1 h-1 w-10 rounded-full bg-stone-200" />}
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => choose(a)}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3.5 text-left text-[15px] text-stone-700 transition hover:bg-stone-100 active:bg-stone-100 sm:py-2.5 sm:text-sm"
                >
                  <a.icon className="h-5 w-5 shrink-0 text-stone-400 sm:h-4 sm:w-4" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Everything of one plan item in the reading view; its add-actions share one menu.
function ItemBlock({ item, dayKey, currency, bar, photos, onChanged, onSaveCost, onSavePatch }) {
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const costRef = useRef(null);
  const addressRef = useRef(null);
  const gridRef = useRef(null);
  const noteRef = useRef(null);
  const hasCost = parseCost(item.cost) !== null;
  const hasAddress = !!(item.address || item.mapUrl);

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
      alert("Не удалось сохранить.");
    } finally {
      setBusy(false);
    }
  };

  const actions = [
    { key: "text", icon: Pencil, label: "Изменить название", run: startText },
    { key: "cost", icon: Wallet, label: hasCost ? "Изменить цену" : "Добавить цену", run: () => costRef.current?.start() },
    { key: "address", icon: MapPin, label: hasAddress ? "Изменить адрес" : "Добавить адрес", run: () => addressRef.current?.start() },
    { key: "photo", icon: ImagePlus, label: "Добавить фото", run: () => gridRef.current?.pickPhoto() },
    { key: "doc", icon: FileText, label: "Добавить документ", run: () => gridRef.current?.pickDocument() },
    { key: "note", icon: StickyNote, label: "Заметка / ссылка", run: () => noteRef.current?.open() },
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-1">
        {/* Tap the title to edit it in place. */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !window.getSelection()?.toString() && startText()}
          onKeyDown={(e) => e.key === "Enter" && startText()}
          className="min-w-0 cursor-text break-words rounded-md pt-1 leading-relaxed text-stone-700 transition hover:bg-stone-200/40 sm:pt-0"
        >
          {item.text}
        </div>
        <span className="flex shrink-0 items-center">
          <InlineCost ref={costRef} cost={item.cost} currency={currency} onSave={onSaveCost} />
          <ActionMenu actions={actions} />
        </span>
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
              <X className="h-3.5 w-3.5" /> Отмена
            </button>
            <button
              type="button"
              onClick={commitText}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Сохранить
            </button>
          </div>
        </div>
      )}
      <ItemAddress ref={addressRef} item={item} bar={bar} onSave={onSavePatch} />
      <PlanPhotoGrid ref={gridRef} itemId={item.id} dayKey={dayKey} photos={photos} onChanged={onChanged} />
      <PlanNoteBox ref={noteRef} itemId={item.id} dayKey={dayKey} />
    </>
  );
}

// Insurance / SIM card of the first day: price, photo, document.
function ExtraTools({ itemKey, title, Icon, extra, dayKey, currency, photos, onChanged, onSaveCost, onEditCompany }) {
  const costRef = useRef(null);
  const gridRef = useRef(null);
  const actions = [
    { key: "cost", icon: Wallet, label: parseCost(extra.cost) !== null ? "Изменить цену" : "Добавить цену", run: () => costRef.current?.start() },
    { key: "photo", icon: ImagePlus, label: "Добавить фото", run: () => gridRef.current?.pickPhoto() },
    { key: "doc", icon: FileText, label: "Добавить документ", run: () => gridRef.current?.pickDocument() },
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
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{title}</span>
        <span className="ml-auto flex items-center">
          <InlineCost ref={costRef} cost={extra.cost} currency={currency} onSave={onSaveCost} />
          <ActionMenu actions={actions} />
        </span>
      </div>
      <div className="mt-2 break-words font-medium text-stone-700">
        {extra.company || (
          <button
            type="button"
            onClick={onEditCompany}
            className="text-sm font-normal text-stone-400 underline decoration-dotted underline-offset-2 hover:text-stone-700"
          >
            Не указано — добавить
          </button>
        )}
      </div>
      <PlanPhotoGrid ref={gridRef} itemId={itemKey} dayKey={dayKey} photos={photos} onChanged={onChanged} />
    </>
  );
}

// Footer button to the neighbouring day; an empty slot keeps the centre label put.
function DayNavButton({ day, dir, onNavigate }) {
  const Chevron = dir === "prev" ? ChevronLeft : ChevronRight;
  if (!day || !onNavigate) return <span className="w-24 shrink-0" aria-hidden="true" />;
  return (
    <button
      type="button"
      onClick={() => onNavigate(day.key)}
      className={`inline-flex min-h-11 w-24 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 active:bg-stone-200/60 ${
        dir === "prev" ? "justify-start" : "justify-end"
      }`}
      aria-label={dir === "prev" ? "Предыдущий день" : "Следующий день"}
    >
      {dir === "prev" && <Chevron className="h-4 w-4 shrink-0" />}
      <span className="truncate">{day.label}</span>
      {dir === "next" && <Chevron className="h-4 w-4 shrink-0" />}
    </button>
  );
}

// Editing works on a copy, so cancelling really cancels.
function cloneSection(section) {
  return {
    id: section.id || `sec-${Math.random().toString(36).slice(2, 10)}`,
    title: section.title || "",
    icon: section.icon || "MapPin",
    mapUrl: section.mapUrl || "",
    items: (section.items || []).map((it) => ({
      id: it.id || `item-${Math.random().toString(36).slice(2, 10)}`,
      text: it.text || "",
      address: it.address || "",
      mapUrl: it.mapUrl || "",
      cost: parseCost(it.cost) ?? "",
    })),
  };
}

function cloneExtra(extra) {
  return { company: extra?.company || "", cost: parseCost(extra?.cost) ?? "" };
}

// Drops blank rows so a half-filled form doesn't leave empty bullets behind.
function cleanPlan(draft, firstDay) {
  const extras = firstDay
    ? Object.fromEntries(
        EXTRAS.map(({ key }) => [
          key,
          { company: (draft[key]?.company || "").trim(), cost: parseCost(draft[key]?.cost) },
        ])
      )
    : {};
  return {
    ...extras,
    city: (draft.city || "").trim(),
    sections: (draft.sections || [])
      .map((s) => ({
        id: s.id,
        title: (s.title || "").trim(),
        icon: s.icon || "MapPin",
        mapUrl: (s.mapUrl || "").trim(),
        items: (s.items || [])
          .flatMap(splitItem)
          .filter((it) => it.text || it.address || it.mapUrl || it.cost !== null),
      }))
      .filter((s) => s.title || s.items.length),
  };
}

// One sentence or line per timeline dot: "Вылет в 05:40. Полёт 3 часа." becomes
// two items. The first keeps the id (so its photos and notes stay put) and the
// address; the rest are new. A dot only splits before a capital letter and not
// after a short abbreviation, so "ул. Ленина" and "3.5 км" stay whole.
function splitItem(it) {
  const parts = (it.text || "")
    .split(/\n+|(?<=[.!?…])(?<!(?:^|\s)[а-яёa-z]{1,3}\.)\s+(?=[A-ZА-ЯЁ«"])/)
    .map((t) => t.trim())
    .filter(Boolean);
  const first = {
    id: it.id,
    text: parts[0] || "",
    address: (it.address || "").trim(),
    mapUrl: (it.mapUrl || "").trim(),
    cost: parseCost(it.cost),
  };
  const rest = parts
    .slice(1)
    .map((text) => ({ id: uid("item"), text, address: "", mapUrl: "", cost: null }));
  return [first, ...rest];
}
