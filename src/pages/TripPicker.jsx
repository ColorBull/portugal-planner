import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { tripRangeLabel } from "@/lib/tripDays";
import TripFormModal from "@/components/TripFormModal";

export default function TripPicker() {
  const navigate = useNavigate();
  const { trips, loading, error, addTrip, editTrip, removeTrip } = useTrips();

  const [formFor, setFormFor] = useState(null); // { trip } | { trip: null }
  const [busyId, setBusyId] = useState(null);

  const handleDelete = async (trip) => {
    const ok = window.confirm(
      `Удалить поездку «${trip.city}, ${trip.year}»? Заметки и фотографии этой поездки тоже будут удалены.`
    );
    if (!ok) return;
    setBusyId(trip.id);
    try {
      await removeTrip(trip.id);
    } catch (e) {
      console.error(e);
      alert("Не удалось удалить поездку.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(120% 120% at 15% 10%, #fdfaf4 0%, #f5ecdd 45%, #ead9c2 100%)",
      }}
    >
      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-10">
          <span
            className="inline-grid h-14 w-14 place-items-center rounded-2xl mb-4 shadow-sm"
            style={{ backgroundColor: "#1d3b5c", color: "white" }}
          >
            <Plane className="h-7 w-7" />
          </span>
          <h1
            className="font-display text-4xl sm:text-5xl font-semibold tracking-tight"
            style={{ color: "#1d3b5c" }}
          >
            Куда летим?
          </h1>
          <p className="text-stone-500 mt-2">Выберите поездку</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-[#1d3b5c] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-4 text-center text-sm text-[#a8451f]">{error}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {trips.map((trip, i) => {
                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 24 }}
                    className="relative rounded-2xl p-5 text-left shadow-sm transition ring-2 ring-transparent bg-white/70 hover:ring-[#c4623a] hover:bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/trip/${trip.id}`)}
                      className="block w-full text-left pr-16"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                        {trip.country}
                      </div>
                      <div
                        className="font-display text-2xl font-semibold mt-0.5"
                        style={{ color: "#1d3b5c" }}
                      >
                        {trip.city}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-stone-500 mt-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {trip.year}
                        {tripRangeLabel(trip) && (
                          <>
                            <span className="text-stone-300">·</span>
                            {tripRangeLabel(trip)}
                          </>
                        )}
                      </div>
                    </button>

                    <div className="absolute top-4 right-4 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFormFor({ trip })}
                        className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                        aria-label="Изменить поездку"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(trip)}
                        disabled={busyId === trip.id}
                        className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 transition hover:bg-[#f7e9e3] hover:text-[#a8451f] disabled:opacity-50"
                        aria-label="Удалить поездку"
                      >
                        {busyId === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              <button
                type="button"
                onClick={() => setFormFor({ trip: null })}
                className="rounded-2xl border-2 border-dashed border-stone-300 p-5 text-stone-500 transition hover:border-[#1d3b5c] hover:text-[#1d3b5c] min-h-[120px] flex flex-col items-center justify-center gap-2"
              >
                <Plus className="h-6 w-6" />
                <span className="font-medium">Добавить поездку</span>
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {formFor && (
          <TripFormModal
            trip={formFor.trip}
            onClose={() => setFormFor(null)}
            onSave={async (data) => {
              if (formFor.trip) await editTrip(formFor.trip.id, data);
              else await addTrip(data);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
