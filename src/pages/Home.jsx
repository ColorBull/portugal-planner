import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plane, ChevronLeft, ChevronRight } from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { buildDays } from "@/lib/tripDays";
import DayPlanModal from "@/components/DayPlanModal";
import CountryFlag from "@/components/CountryFlag";
import { tripCountry } from "@/lib/countries";

// Enough columns that a whole month fits one phone screen without scrolling.
// Wider screens keep the four big cards.
function phoneColumns(days) {
  if (days <= 4) return 2;
  if (days <= 9) return 3;
  if (days <= 16) return 4;
  if (days <= 25) return 5;
  return 6;
}

// A long trip is split into pages, so the grid always fits one screen.
const PER_PAGE = 30;

function paginate(days) {
  const pages = [];
  for (let i = 0; i < days.length; i += PER_PAGE) pages.push(days.slice(i, i + PER_PAGE));
  return pages.length ? pages : [[]];
}

export default function Home() {
  const { tripId: routeId } = useParams();
  const navigate = useNavigate();
  const { trips, loading, openTrip, tripId, days, daysLoading, saveDayPlan } = useTrips();

  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    openTrip(routeId);
  }, [routeId, openTrip]);

  const trip = trips.find((t) => t.id === routeId) || null;

  // The trip was deleted (or the link is stale) — back to the picker.
  useEffect(() => {
    if (!loading && !trip) navigate("/", { replace: true });
  }, [loading, trip, navigate]);

  const country = useMemo(() => tripCountry(trip), [trip]);

  const tripDays = useMemo(
    () => (trip ? buildDays(trip.startDate, trip.endDate) : []),
    [trip]
  );

  const ready = trip && tripId === routeId && !daysLoading;

  const pages = useMemo(() => paginate(tripDays), [tripDays]);
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => setPageIndex(0), [routeId]);

  const page = Math.min(pageIndex, pages.length - 1);
  const shownDays = pages[page];

  const selectedDay = tripDays.find((d) => d.key === selectedKey) || null;
  const selectedPlan = selectedKey ? days[selectedKey] || null : null;

  return (
    <div
      className="relative min-h-svh w-full flex flex-col items-center px-4 pt-16 pb-8 sm:pt-20"
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className="fixed top-3 left-3 z-40 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-2 text-sm text-stone-500 shadow-sm ring-1 ring-stone-200 backdrop-blur transition hover:text-stone-800"
      >
        <ChevronLeft className="h-4 w-4" />
        Поездки
      </button>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Sat on a plate: the map behind it is too busy to read text off. */}
        <div className="mx-auto mb-7 w-fit rounded-2xl bg-white/85 px-6 py-3.5 text-center shadow-sm ring-1 ring-black/5">
          <h1
            className="font-display text-3xl sm:text-5xl font-semibold tracking-tight"
            style={{ color: "#1d3b5c" }}
          >
            {trip ? `${trip.city} ${trip.year}` : "Загрузка…"}
          </h1>
          {trip && (
            <p className="mt-1 flex items-center justify-center gap-2 text-sm text-stone-500">
              {country && <CountryFlag code={country.code} width={20} />}
              {trip.country}
            </p>
          )}
        </div>

        {!ready ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-[#1d3b5c] rounded-full animate-spin" />
          </div>
        ) : tripDays.length === 0 ? (
          <p className="text-center text-stone-500 py-16">
            У этой поездки не указаны даты. Вернитесь к списку поездок и укажите
            даты вылета и возвращения.
          </p>
        ) : (
          <div
            className="grid gap-2 sm:gap-4 grid-cols-[repeat(var(--day-cols),minmax(0,1fr))] sm:grid-cols-4"
            style={{ "--day-cols": String(phoneColumns(shownDays.length)) }}
          >
            {shownDays.map((day) => {
              const plan = days[day.key];
              const filled = !!plan?.sections?.length;
              return (
                <motion.button
                  key={day.key}
                  onClick={() => setSelectedKey(day.key)}
                  // No entrance animation: the tiles land staggered, and the
                  // last one to settle read as a flicker.
                  initial={false}
                  whileHover={{ y: -5, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative aspect-square sm:aspect-[3/4] rounded-2xl sm:rounded-3xl p-2 sm:p-4 text-left shadow-md sm:shadow-lg overflow-hidden group flex flex-col"
                  style={{
                    background:
                      "linear-gradient(150deg, #1d3b5c 0%, #2c5f8a 60%, #3a7ca5 100%)",
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-xl sm:text-4xl font-semibold leading-none text-white">
                      {day.label.split(" ")[0]}
                    </span>
                    <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-white/60">
                      {day.weekday}
                    </span>
                  </div>
                  <div className="text-white/70 text-[10px] sm:text-sm mt-0.5 leading-tight">
                    {day.label.split(" ")[1]}
                  </div>

                  {/* A dot is all there is room for once the tiles are this small. */}
                  <span
                    className={`mt-auto h-1.5 w-1.5 rounded-full sm:hidden ${
                      filled ? "bg-[#e0a06f]" : "bg-white/25"
                    }`}
                  />

                  <div className="mt-auto pt-6 hidden sm:block">
                    <div className="text-white/90 text-sm sm:text-base font-medium leading-tight">
                      {plan?.city || trip.city}
                    </div>
                    <div className="flex items-center gap-1 text-white/55 text-xs mt-1">
                      {filled ? (
                        <>
                          <MapPin className="h-3 w-3" />
                          День {day.dayNumber}
                        </>
                      ) : (
                        <>
                          <Plane className="h-3 w-3" />
                          план скоро
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300"
                    style={{ backgroundColor: "#c4623a" }}
                  />
                </motion.button>
              );
            })}
          </div>
        )}

        {ready && pages.length > 1 && (
          <div className="mt-5 flex justify-center">
            {/* On its own plate: plain text is unreadable over the map. */}
            <div className="flex items-center gap-1 rounded-full bg-white/85 px-1.5 py-1 shadow-sm ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => setPageIndex(page - 1)}
                disabled={page === 0}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1 text-sm font-medium tabular-nums text-stone-600">
                {page + 1}/{pages.length}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex(page + 1)}
                disabled={page >= pages.length - 1}
                className="grid h-8 w-8 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Следующая страница"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedKey && (
          <DayPlanModal
            plan={selectedPlan}
            dayInfo={selectedDay}
            trip={trip}
            onSave={(data) => saveDayPlan(selectedKey, data)}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
