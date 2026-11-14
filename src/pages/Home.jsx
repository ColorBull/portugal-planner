import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, Lock, LockOpen, Trophy } from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { buildDays, tripYearLabel } from "@/lib/tripDays";
import DayPlanModal from "@/components/DayPlanModal";
import TripSummaryModal from "@/components/TripSummaryModal";
import TripRatingBadge from "@/components/TripRatingBadge";
import { SUMMARY_KEY } from "@/lib/tripSummary";
import CountryFlag from "@/components/CountryFlag";
import { tripCountry, countryLabel } from "@/lib/countries";
import { useAuth } from "@/lib/AuthContext";
import { requestFolderAccess } from "@/api/tripFolders";
import {
  isTripLocked,
  isTripOwner,
  isRemembered,
  canSeeTrip,
  useTripLockChanges,
  PRIVATE_TRIP_LABEL,
} from "@/lib/tripLock";
import TripLockDialog from "@/components/TripLockDialog";
import TripExportDialog from "@/components/TripExportDialog";
import { t } from "@/lib/i18n";

// A long trip is split into pages, so the grid always fits one screen. The
// summary tile counts as a tile here, so it never makes a page overflow.
const PER_PAGE = 30;

function paginate(tiles) {
  const pages = [];
  for (let i = 0; i < tiles.length; i += PER_PAGE) pages.push(tiles.slice(i, i + PER_PAGE));
  return pages.length ? pages : [[]];
}

export default function Home() {
  const { tripId: routeId } = useParams();
  const navigate = useNavigate();
  const {
    trips,
    loading,
    openTrip,
    tripId,
    days,
    daysLoading,
    saveDayPlan,
    setTripLock,
    saveTripExport,
    saveTripSummary,
  } = useTrips();
  const { user } = useAuth();

  const [selectedKey, setSelectedKey] = useState(null);
  // "?view=summary" (the rating badge in the trip list) opens the summary page.
  const [searchParams, setSearchParams] = useSearchParams();
  const wantSummary = searchParams.get("view") === "summary";

  useEffect(() => {
    openTrip(routeId);
  }, [routeId, openTrip]);

  const trip = trips.find((t) => t.id === routeId) || null;

  // The trip was deleted (or the link is stale) — back to the picker.
  useEffect(() => {
    if (!loading && !trip) navigate("/", { replace: true });
  }, [loading, trip, navigate]);

  const country = useMemo(() => tripCountry(trip), [trip]);

  // PIN lock (lib/tripLock.js). Asked on every visit unless this device was
  // told to remember it; `unlockedId` covers the rest of this visit.
  const [unlockedId, setUnlockedId] = useState(null);
  const [lockDialog, setLockDialog] = useState(null); // "setup" | "manage"
  const [exportOpen, setExportOpen] = useState(false);
  const owner = isTripOwner(trip, user?.email);
  const lockedOut =
    !!trip && isTripLocked(trip) && unlockedId !== trip.id && !isRemembered(trip);
  useTripLockChanges();
  // Behind the PIN prompt, only the owner (or a device that has had the PIN)
  // sees which trip this is.
  const hidden = !!trip && !canSeeTrip(trip, user?.email);

  // Past the PIN: ask to be let into the trip's Drive folder too (the owner's
  // app does it — api/tripFolders.js).
  useEffect(() => {
    if (trip && user && !lockedOut) requestFolderAccess(trip).catch(console.warn);
  }, [trip, user, lockedOut]);

  const tripDays = useMemo(
    () => (trip ? buildDays(trip.startDate, trip.endDate) : []),
    [trip]
  );

  const ready = trip && tripId === routeId && !daysLoading && !lockedOut;

  useEffect(() => {
    if (!ready || !wantSummary) return;
    if (tripDays.length) setSelectedKey(SUMMARY_KEY);
    setSearchParams({}, { replace: true });
  }, [ready, wantSummary, tripDays.length, setSearchParams]);

  // The days, then one more tile for the summary page (not a day: no date).
  const pages = useMemo(
    () => paginate(tripDays.length ? [...tripDays, { key: SUMMARY_KEY, summary: true }] : []),
    [tripDays]
  );
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => setPageIndex(0), [routeId]);

  const page = Math.min(pageIndex, pages.length - 1);
  const shownDays = pages[page];
  // Today's tile is marked in the accent colour, as in Apple's Calendar (this
  // device's own date); navy fill is the "Итоги" tile's.
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const selectedIndex = tripDays.findIndex((d) => d.key === selectedKey);
  const selectedDay = tripDays[selectedIndex] || null;
  const selectedPlan = selectedKey ? days[selectedKey] || null : null;
  const lastDay = tripDays[tripDays.length - 1] || null;
  const summaryLink = { key: SUMMARY_KEY, label: t("Итоги") };

  return (
    <div
      className="relative min-h-svh w-full flex flex-col items-center px-4 pt-16 pb-8 sm:pt-14"
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        // iOS back button: accent text with a chevron, on a plate over the map.
        className="fixed start-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 inline-flex h-10 items-center gap-0.5 rounded-full bg-white/90 pe-3.5 ps-2 text-[17px] text-[#2c5f8a] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
      >
        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        {t("Поездки")}
      </button>

      {trip && !lockedOut && (
        <div className="fixed end-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex gap-2">
          {ready && (
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className={`grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 transition hover:bg-white ${
                trip.export_doc_id ? "text-[#2c5f8a]" : "text-stone-500"
              }`}
              aria-label={t("Выгрузить поездку в Google Drive для NotebookLM")}
              title={t("Выгрузить в Google Drive для NotebookLM")}
            >
              <BookOpen className="h-4 w-4" />
            </button>
          )}
          {owner && (
            <button
              type="button"
              onClick={() => setLockDialog(isTripLocked(trip) ? "manage" : "setup")}
              className={`grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 transition hover:bg-white ${
                isTripLocked(trip) ? "text-[#2c5f8a]" : "text-stone-500"
              }`}
              aria-label={isTripLocked(trip) ? t("Поездка закрыта PIN-кодом") : t("Закрыть поездку PIN-кодом")}
              title={isTripLocked(trip) ? t("Поездка закрыта PIN-кодом") : t("Закрыть поездку PIN-кодом")}
            >
              {isTripLocked(trip) ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}

      <div className="relative z-10 w-full max-w-3xl">
        {/* Sat on a plate: the map behind it is too busy to read text off. */}
        <div className="mx-auto mb-7 w-fit rounded-[22px] bg-white/90 px-6 py-3 text-center shadow-sm ring-1 ring-black/5 sm:mb-5">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {!trip ? t("Загрузка…") : hidden ? t(PRIVATE_TRIP_LABEL) : `${trip.city} ${tripYearLabel(trip)}`}
          </h1>
          {trip && !hidden && !lockedOut && (
            <TripRatingBadge
              trip={trip}
              size="lg"
              className="mt-1.5"
              onRate={ready && tripDays.length ? () => setSelectedKey(SUMMARY_KEY) : undefined}
            />
          )}
          {trip && !hidden && (
            <p className="mt-1 flex items-center justify-center gap-2 text-[15px] text-stone-500">
              {country && <CountryFlag code={country.code} width={20} />}
              {countryLabel(trip)}
            </p>
          )}
        </div>

        {lockedOut ? (
          <div className="flex justify-center py-16 text-white/80">
            <Lock className="h-10 w-10 drop-shadow" />
          </div>
        ) : !ready ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-[#1d3b5c] rounded-full animate-spin" />
          </div>
        ) : tripDays.length === 0 ? (
          <p className="text-center text-stone-500 py-16">
            {t("У этой поездки не указаны даты. Вернитесь к списку поездок и укажите даты вылета и возвращения.")}
          </p>
        ) : (
          // Same tile everywhere, five across on a phone and six on a desktop,
          // so a full page of thirty always fits one screen without scrolling.
          // The width cap is what keeps five rows inside the viewport height:
          // a square tile is (width - gaps) / 6, so bounding the width bounds
          // the height too.
          <div
            className="mx-auto grid grid-cols-5 gap-2 sm:grid-cols-6 sm:gap-3 sm:[max-width:calc((100svh-15rem)/5*6+5*0.75rem)]"
          >
            {shownDays.map((day) => {
              if (day.summary) {
                return (
                  <motion.button
                    key={day.key}
                    onClick={() => setSelectedKey(SUMMARY_KEY)}
                    initial={false}
                    whileHover={{ y: -5, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    title={t("Итоги поездки")}
                    className="relative aspect-square rounded-2xl sm:rounded-[1.25rem] p-2 sm:p-3 shadow-sm overflow-hidden group flex flex-col items-center justify-center gap-1 sm:gap-1.5"
                    style={{ backgroundColor: "#1d3b5c" }}
                  >
                    <Trophy className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: "#e0a06f" }} />
                    <span className="max-w-full truncate text-[11px] sm:text-sm font-semibold leading-tight text-white">
                      {t("Итоги")}
                    </span>
                    <span
                      className="absolute bottom-0 start-0 h-1 w-0 group-hover:w-full transition-all duration-300"
                      style={{ backgroundColor: "#c4623a" }}
                    />
                  </motion.button>
                );
              }
              const plan = days[day.key];
              const filled = !!plan?.sections?.length;
              const today = day.key === todayKey;
              return (
                <motion.button
                  key={day.key}
                  onClick={() => setSelectedKey(day.key)}
                  // No entrance animation: the tiles land staggered, and the
                  // last one to settle read as a flicker.
                  initial={false}
                  whileHover={{ y: -5, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  title={`${day.label} — ${plan?.city || trip.city}${filled ? "" : ` (${t("план скоро")})`}`}
                  aria-current={today ? "date" : undefined}
                  // Light cards with dark type (as in Apple's Calendar) — white on
                  // see-through blue was hard to read over the map. Today: accent ring.
                  className={`relative aspect-square rounded-2xl sm:rounded-[1.25rem] bg-white/90 p-2 sm:p-3 text-start shadow-sm overflow-hidden group flex flex-col ${
                    today ? "ring-2 ring-[#c4623a]" : "ring-1 ring-black/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-display text-xl sm:text-2xl font-semibold leading-none ${today ? "text-[#c4623a]" : "text-[#1d3b5c]"}`}
                    >
                      {day.label.split(" ")[0]}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${today ? "text-[#c4623a]" : "text-stone-500"}`}
                    >
                      {day.weekday}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs mt-0.5 leading-tight text-stone-500">
                    {day.label.split(" ")[1]}
                  </div>

                  {/* A dot is all there is room for once the tiles are this
                      small; the city fits beside it from a tablet up. */}
                  <div className="mt-auto flex items-center gap-1.5 overflow-hidden">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        filled ? "bg-[#e0a06f]" : "bg-stone-300"
                      }`}
                    />
                    <span className="hidden sm:block truncate text-[11px] leading-tight text-stone-500">
                      {plan?.city || trip.city}
                    </span>
                  </div>

                  <span
                    className="absolute bottom-0 start-0 h-1 w-0 group-hover:w-full transition-all duration-300"
                    style={{ backgroundColor: "#c4623a" }}
                  />
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Room for the pager, which floats over the foot of the screen. */}
        {ready && pages.length > 1 && <div className="h-16" aria-hidden="true" />}

        {ready && pages.length > 1 && (
          // Anchored to the screen, so it stays put however many tiles there are.
          <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center">
            {/* On its own plate: plain text is unreadable over the map. */}
            <div className="flex items-center gap-1 rounded-full bg-white/85 px-1.5 py-1 shadow-sm ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => setPageIndex(page - 1)}
                disabled={page === 0}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label={t("Предыдущая страница")}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
              <span className="px-1 text-sm font-medium tabular-nums text-stone-600">
                {page + 1}/{pages.length}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex(page + 1)}
                disabled={page >= pages.length - 1}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label={t("Следующая страница")}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {lockedOut && (
        <TripLockDialog
          key={trip.id}
          mode="unlock"
          trip={trip}
          showName={!hidden}
          onUnlocked={() => setUnlockedId(trip.id)}
          onClose={() => navigate("/")}
        />
      )}

      {exportOpen && ready && (
        <TripExportDialog
          trip={trip}
          days={days}
          onSaved={(docId) => saveTripExport(trip.id, docId)}
          onClose={() => setExportOpen(false)}
        />
      )}

      {lockDialog && trip && (
        <TripLockDialog
          mode={lockDialog}
          trip={trip}
          onSetPin={async (hash) => {
            await setTripLock(trip.id, hash);
            setUnlockedId(trip.id);
          }}
          onClose={() => setLockDialog(null)}
        />
      )}

      <AnimatePresence>
        {selectedKey === SUMMARY_KEY && ready && (
          <TripSummaryModal
            key={SUMMARY_KEY}
            trip={trip}
            tripDays={tripDays}
            days={days}
            onSave={(patch) => saveTripSummary(trip.id, patch)}
            onClose={() => setSelectedKey(null)}
            lastDay={lastDay}
            onNavigate={setSelectedKey}
          />
        )}
        {selectedDay && !lockedOut && (
          <DayPlanModal
            key="day"
            plan={selectedPlan}
            dayInfo={selectedDay}
            trip={trip}
            onSave={(data) => saveDayPlan(selectedKey, data)}
            onClose={() => setSelectedKey(null)}
            prevDay={tripDays[selectedIndex - 1] || null}
            nextDay={tripDays[selectedIndex + 1] || summaryLink}
            onNavigate={setSelectedKey}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
