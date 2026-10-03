import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Trophy,
  MapPin,
  CalendarDays,
  Building2,
  Wallet,
  Sparkles,
  Star,
  ListChecks,
  Plus,
  Check,
  Loader2,
  PenLine,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { uid } from "@/api/trips";
import { useAuth } from "@/lib/AuthContext";
import { personName } from "@/lib/family";
import { tripRangeLabel, tripYearLabel } from "@/lib/tripDays";
import { countryLabel } from "@/lib/countries";
import { formatMoney, tripCurrency } from "@/lib/money";
import {
  RATING_QUESTIONS,
  cityStats,
  emailKey,
  familyAverage,
  questionStats,
  raters,
  costStats,
  sortedEntries,
} from "@/lib/tripSummary";
import { t, getLang, localeTag } from "@/lib/i18n";

const STAR = "#e0a06f";

const plural = (n, one, few, many) => {
  if (getLang() !== "ru") return n === 1 ? one : many;
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const daysLabel = (n) => `${n} ${t(plural(n, "день", "дня", "дней"))}`;
const nightsLabel = (n) => `${n} ${t(plural(n, "ночь", "ночи", "ночей"))}`;

// The page after the last day: what the trip came to, and room for the family's
// verdict. Not a day — no date, no plan. Same full-page sheet as DayPlanModal.
// `lastDay` ({ key, label }) is where "back" leads; `onNavigate(key)` goes there.
export default function TripSummaryModal({ trip, tripDays, days, onSave, onClose, lastDay, onNavigate }) {
  const { user } = useAuth();
  const summary = trip?.summary || {};
  const currency = tripCurrency(trip);
  const cities = useMemo(() => cityStats(tripDays, days, trip), [tripDays, days, trip]);
  const costs = useMemo(() => costStats(tripDays, days), [tripDays, days]);
  const swipeRef = useRef(null);

  // Hold the page still behind the sheet (see DayPlanModal for why only overflow).
  useEffect(() => {
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, []);

  const save = (patch) =>
    onSave(patch).catch((err) => {
      console.error(err);
      alert(t("Не удалось сохранить."));
    });

  const addEntry = (kind, text) =>
    save({
      [`summary.${kind}.${uid(kind === "actions" ? "act" : "hl")}`]: {
        text,
        ...(kind === "actions" ? { done: false } : {}),
        at: Date.now(),
        by: user?.email || null,
      },
    });

  // A swipe toward "previous" goes back to the last day.
  const swipeStart = (e) => {
    if (e.target.closest?.("input, textarea, [data-no-swipe]")) {
      swipeRef.current = null;
      return;
    }
    const p = e.touches[0];
    swipeRef.current = { x: p.clientX, y: p.clientY };
  };
  const swipeEnd = (e) => {
    const from = swipeRef.current;
    swipeRef.current = null;
    if (!from || !lastDay || !onNavigate) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - from.x;
    const dy = p.clientY - from.y;
    if (Math.abs(dx) < 90 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
    if ((dx > 0) === (getLang() !== "he")) onNavigate(lastDay.key);
  };

  const maxCityDays = Math.max(1, ...cities.map((c) => c.days));
  // Ratings are per person: everyone sets their own stars and sees the family average.
  const me = emailKey(user?.email);
  const mine = summary.ratings_by?.[me] || {};
  const family = raters(summary);
  const avg = familyAverage(family);
  const fmt = (n) => n.toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rate = (qKey, value) =>
    save({
      [`summary.ratings_by.${me}.email`]: user?.email || null,
      [`summary.ratings_by.${me}.${qKey}`]: value || null,
    });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-stone-950/60 animate-in fade-in duration-200" onClick={onClose} />

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
          style={{ background: "linear-gradient(135deg, #1d3b5c 0%, #2c5f8a 55%, #3a7ca5 100%)" }}
        >
          <div className="relative mx-auto w-full max-w-3xl">
            <button
              onClick={onClose}
              className="absolute end-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25 active:bg-white/25 sm:h-9 sm:w-9"
              aria-label={t("Закрыть")}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
              <Trophy className="h-4 w-4" />
              {t("Итоги поездки")}
            </div>
            <h2 className="mt-1.5 max-w-[calc(100%-3.5rem)] font-display text-2xl font-semibold leading-tight text-white sm:mt-2 sm:text-4xl">
              {trip ? `${trip.city} ${tripYearLabel(trip)}` : ""}
            </h2>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
              {trip?.country && (
                <>
                  <MapPin className="h-4 w-4" />
                  {countryLabel(trip)}
                  <span className="mx-1.5 text-white/30">·</span>
                </>
              )}
              <span dir="auto">{tripRangeLabel(trip)}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          onTouchStart={swipeStart}
          onTouchEnd={swipeEnd}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6"
        >
          <div className="mx-auto w-full max-w-3xl space-y-8">
            {/* The numbers */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard Icon={CalendarDays} label={t("Длительность")}>
                {daysLabel(tripDays.length)}
                {tripDays.length > 1 && (
                  <span className="block text-xs font-normal text-stone-500">
                    {nightsLabel(tripDays.length - 1)}
                  </span>
                )}
              </StatCard>
              <StatCard Icon={Building2} label={t("Городов")}>
                {cities.length}
              </StatCard>
              <StatCard Icon={Wallet} label={t("Всего потрачено")} className="col-span-2 sm:col-span-1">
                <span dir="ltr">{formatMoney(costs.total, currency)}</span>
                {costs.total > 0 && (
                  <span className="block text-xs font-normal text-stone-500">
                    {t("≈ {sum} в день", { sum: formatMoney(costs.perDay, currency) })}
                  </span>
                )}
              </StatCard>
            </div>

            {/* Cities */}
            <Section Icon={Building2} title={t("Города")}>
              <ul className="space-y-2.5">
                {cities.map((c) => (
                  <li key={c.city} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 break-words font-medium text-stone-700">{c.city}</span>
                      <span className="shrink-0 text-sm tabular-nums text-stone-500">
                        {daysLabel(c.days)}
                        {c.cost > 0 && (
                          <>
                            <span className="mx-1.5 text-stone-300">·</span>
                            <span dir="ltr">{formatMoney(c.cost, currency)}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200/70">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.days / maxCityDays) * 100}%`, backgroundColor: "#3a7ca5" }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {costs.top && (
                <p className="mt-4 text-sm text-stone-500">
                  {t("Самый дорогой день: {day} — {sum}", {
                    day: costs.top.day.label,
                    sum: formatMoney(costs.top.total, currency),
                  })}
                </p>
              )}
            </Section>

            {/* Highlights */}
            <Section Icon={Sparkles} title={t("Лучшие моменты")}>
              <QuickList
                entries={sortedEntries(summary.highlights)}
                placeholder={t("Что запомнилось больше всего?")}
                addLabel={t("Добавить момент")}
                bullet={<Sparkles className="mt-1 h-4 w-4 shrink-0" style={{ color: STAR }} />}
                onAdd={(text) => addEntry("highlights", text)}
                onRemove={(id) => save({ [`summary.highlights.${id}`]: null })}
              />
            </Section>

            {/* Ratings */}
            <Section
              Icon={Star}
              title={t("Оценки")}
              aside={
                avg !== null && (
                  <span
                    className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-stone-600"
                    title={t("Средняя оценка семьи")}
                  >
                    <Star className="h-4 w-4" style={{ color: STAR, fill: STAR }} />
                    {fmt(avg)}
                  </span>
                )
              }
            >
              <p className="mb-3 text-sm text-stone-500">
                {t("Звёзды — ваша личная оценка. Под ними — средняя оценка семьи.")}
              </p>
              <ul>
                {RATING_QUESTIONS.map((q) => {
                  const stats = questionStats(family, q.key);
                  return (
                    <li key={q.key} className="border-t border-stone-200 py-2 first:border-t-0 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="text-stone-700">{t(q.label)}</span>
                        <Stars value={mine[q.key] || 0} onChange={(v) => rate(q.key, v)} />
                      </div>
                      {stats.avg !== null && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-stone-600">
                            {t("Семья")}
                            <Star className="h-3 w-3" style={{ color: STAR, fill: STAR }} />
                            {fmt(stats.avg)}
                          </span>
                          {stats.votes.map((v) => (
                            <span key={v.email} className="tabular-nums">
                              · {personName(v.email)} {v.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>

            {/* Action items */}
            <Section Icon={ListChecks} title={t("Что сделать после поездки")}>
              <QuickList
                entries={sortedEntries(summary.actions, true)}
                placeholder={t("Например: отправить фото бабушке")}
                addLabel={t("Добавить задачу")}
                checkable
                onAdd={(text) => addEntry("actions", text)}
                onToggle={(id, done) => save({ [`summary.actions.${id}.done`]: done })}
                onRemove={(id) => save({ [`summary.actions.${id}`]: null })}
              />
            </Section>

            {/* Free text */}
            <Section Icon={PenLine} title={t("Пара слов о поездке")}>
              <NoteField value={summary.note || ""} onSave={(note) => save({ "summary.note": note || null })} />
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:py-2.5"
          style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
        >
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
            {lastDay && onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate(lastDay.key)}
                className="inline-flex min-h-11 w-24 shrink-0 items-center justify-start gap-1 rounded-xl px-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 active:bg-stone-200/60"
                aria-label={t("Предыдущий день")}
              >
                <ChevronLeft className="h-4 w-4 shrink-0 rtl:rotate-180" />
                <span className="truncate">{lastDay.label}</span>
              </button>
            ) : (
              <span className="w-24 shrink-0" aria-hidden="true" />
            )}
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-stone-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{trip ? `${trip.city} ${tripYearLabel(trip)}` : ""}</span>
            </span>
            <span className="w-24 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ Icon, label, children, className = "" }) {
  return (
    <div className={`min-w-0 rounded-2xl border bg-white/70 p-4 ${className}`} style={{ borderColor: "#ece3d4" }}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
        <Icon className="h-4 w-4" style={{ color: "#3a7ca5" }} />
        {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold leading-tight tabular-nums" style={{ color: "#1d3b5c" }}>
        {children}
      </div>
    </div>
  );
}

function Section({ Icon, title, aside, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: "#e8eef5", color: "#1d3b5c" }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="min-w-0 flex-1 font-heading text-lg font-semibold leading-tight text-stone-800">{title}</h3>
        {aside}
      </div>
      <div className="rounded-2xl border bg-white/70 p-4" style={{ borderColor: "#ece3d4" }}>
        {children}
      </div>
    </section>
  );
}

// Tap a star to set it; tap the same star again to clear the rating.
function Stars({ value, onChange }) {
  return (
    <span dir="ltr" className="inline-flex shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="grid h-10 w-9 place-items-center rounded-lg transition hover:bg-stone-200/40 sm:h-8 sm:w-8"
          aria-label={`${n} / 5`}
        >
          <Star
            className={`h-6 w-6 sm:h-5 sm:w-5 ${n <= value ? "" : "text-stone-300"}`}
            style={n <= value ? { color: STAR, fill: STAR } : undefined}
          />
        </button>
      ))}
    </span>
  );
}

// A short list with a "+" to add to it. Enter adds and keeps the field open,
// so several entries go in one after another; Esc or an empty Enter closes it.
function QuickList({ entries, placeholder, addLabel, bullet, checkable, onAdd, onToggle, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = async () => {
    const value = text.trim();
    if (!value) return setAdding(false);
    setBusy(true);
    try {
      await onAdd(value);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {entries.length > 0 && (
        <ul className="mb-2 space-y-1">
          {entries.map((e) => (
            <li key={e.id} className="group flex items-start gap-2.5">
              {checkable ? (
                <button
                  type="button"
                  onClick={() => onToggle(e.id, !e.done)}
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${
                    e.done ? "border-transparent text-white" : "border-stone-300 text-transparent"
                  }`}
                  style={e.done ? { backgroundColor: "#3a7ca5" } : undefined}
                  aria-label={e.done ? t("Отметить как не сделанное") : t("Отметить как сделанное")}
                >
                  <Check className="h-4 w-4" />
                </button>
              ) : (
                bullet
              )}
              <span
                className={`min-w-0 flex-1 break-words pt-0.5 leading-relaxed ${
                  e.done ? "text-stone-400 line-through" : "text-stone-700"
                }`}
              >
                {e.text}
              </span>
              <button
                type="button"
                onClick={() => onRemove(e.id)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-300 transition hover:bg-stone-200/60 hover:text-stone-600 active:bg-stone-200/60"
                aria-label={t("Удалить")}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div data-no-swipe className="flex items-center gap-2">
          <input
            autoFocus
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setText("");
                setAdding(false);
              }
            }}
            onBlur={() => !text.trim() && setAdding(false)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20 sm:text-sm"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            disabled={busy}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm transition disabled:opacity-60 sm:h-10 sm:w-10"
            style={{ backgroundColor: "#1d3b5c" }}
            aria-label={addLabel}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-800 active:bg-stone-200/60 sm:min-h-9"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ backgroundColor: "#3a7ca5" }}>
            <Plus className="h-4 w-4" />
          </span>
          {addLabel}
        </button>
      )}
    </div>
  );
}

// Saved when the field loses focus, if it changed.
function NoteField({ value, onSave }) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState("idle"); // idle | saving | saved
  const focused = useRef(false);

  // Someone else's edit arrives while this field is not being typed in.
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const commit = async () => {
    focused.current = false;
    const next = draft.trim();
    if (next === value) return;
    setState("saving");
    await onSave(next);
    setState("saved");
  };

  return (
    <div data-no-swipe>
      <textarea
        rows={4}
        value={draft}
        onFocus={() => {
          focused.current = true;
          setState("idle");
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={t("Как вам поездка? Пара слов на память.")}
        className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base leading-relaxed text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20 sm:text-sm"
      />
      <div className="mt-1 h-4 text-end text-xs text-stone-400">
        {state === "saving" && <Loader2 className="inline h-3 w-3 animate-spin" />}
        {state === "saved" && t("Сохранено")}
      </div>
    </div>
  );
}
