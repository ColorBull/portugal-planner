import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plane, ChevronLeft } from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { buildDays } from "@/lib/tripDays";
import DayPlanModal from "@/components/DayPlanModal";
import CountryFlag from "@/components/CountryFlag";
import { tripCountry } from "@/lib/countries";

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

  const selectedDay = tripDays.find((d) => d.key === selectedKey) || null;
  const selectedPlan = selectedKey ? days[selectedKey] || null : null;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 pt-20 pb-8 sm:py-8"
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
        <h1
          className="font-display text-4xl sm:text-6xl font-semibold tracking-tight text-center mb-2"
          style={{ color: "#1d3b5c" }}
        >
          {trip ? `${trip.city} ${trip.year}` : "Загрузка…"}
        </h1>
        {trip && (
          <p className="mb-8 flex items-center justify-center gap-2 text-stone-500">
            {country && <CountryFlag code={country.code} width={20} />}
            {trip.country}
          </p>
        )}

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {tripDays.map((day, i) => {
              const plan = days[day.key];
              const filled = !!plan?.sections?.length;
              return (
                <motion.button
                  key={day.key}
                  onClick={() => setSelectedKey(day.key)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                  whileHover={{ y: -5, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative aspect-[3/4] rounded-3xl p-4 text-left shadow-lg overflow-hidden group flex flex-col"
                  style={{
                    background:
                      "linear-gradient(150deg, #1d3b5c 0%, #2c5f8a 60%, #3a7ca5 100%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl sm:text-4xl font-semibold text-white">
                      {day.label.split(" ")[0]}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                      {day.weekday}
                    </span>
                  </div>
                  <div className="text-white/70 text-xs sm:text-sm mt-0.5">
                    {day.label.split(" ")[1]}
                  </div>

                  <div className="mt-auto pt-6">
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
