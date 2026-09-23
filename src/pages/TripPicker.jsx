import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  Plane,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { tripRangeLabel, tripYearLabel } from "@/lib/tripDays";
import TripFormModal from "@/components/TripFormModal";
import PasscodeDialog from "@/components/PasscodeDialog";
import CountryFlag from "@/components/CountryFlag";
import { tripCountry } from "@/lib/countries";

const iconButton =
  "grid h-8 w-8 place-items-center rounded-lg text-stone-400 transition disabled:opacity-50";

function TripCard({ trip, muted, onOpen, children }) {
  const country = tripCountry(trip);
  return (
    <div
      className={`relative rounded-2xl p-5 text-left shadow-sm transition ring-2 ring-transparent hover:ring-[#c4623a] hover:bg-white ${
        muted ? "bg-white/55" : "bg-white/70"
      }`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left pr-16">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
          {country && <CountryFlag code={country.code} width={18} />}
          {trip.country}
          {trip.pin_hash && (
            <Lock className="h-3.5 w-3.5 text-[#1d3b5c]" aria-label="Закрыта PIN-кодом" />
          )}
        </div>
        <div
          className="font-display text-2xl font-semibold mt-0.5"
          style={{ color: muted ? "#5b6b7c" : "#1d3b5c" }}
        >
          {trip.city}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-stone-500 mt-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {tripYearLabel(trip)}
          {tripRangeLabel(trip) && (
            <>
              <span className="text-stone-300">·</span>
              {tripRangeLabel(trip)}
            </>
          )}
        </div>
      </button>

      <div className="absolute top-4 right-4 flex gap-1">{children}</div>
    </div>
  );
}

export default function TripPicker() {
  const navigate = useNavigate();
  const { activeTrips, archivedTrips, loading, error, addTrip, editTrip, archiveTrip, removeTrip } =
    useTrips();

  const [formFor, setFormFor] = useState(null); // { trip } | { trip: null }
  const [busyId, setBusyId] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [deleting, setDeleting] = useState(null); // trip awaiting the passcode

  const run = async (trip, action, failure) => {
    setBusyId(trip.id);
    try {
      await action();
    } catch (e) {
      console.error(e);
      alert(failure);
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = (trip) => {
    const ok = window.confirm(
      `Перенести поездку «${trip.city}, ${tripYearLabel(trip)}» в архив? Все заметки и фотографии сохранятся.`
    );
    if (ok) run(trip, () => archiveTrip(trip.id, true), "Не удалось перенести поездку в архив.");
  };

  const handleRestore = (trip) =>
    run(trip, () => archiveTrip(trip.id, false), "Не удалось вернуть поездку из архива.");

  const spinner = <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="relative min-h-svh w-full flex flex-col items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-3xl">
        <div className="mx-auto mb-10 w-fit rounded-3xl bg-white/85 px-8 py-6 text-center shadow-sm ring-1 ring-black/5">
          <span
            className="inline-grid h-14 w-14 place-items-center rounded-2xl mb-4 shadow-sm"
            style={{ backgroundColor: "#1d3b5c", color: "white" }}
          >
            {showArchive ? <Archive className="h-7 w-7" /> : <Plane className="h-7 w-7" />}
          </span>
          <h1
            className="font-display text-4xl sm:text-5xl font-semibold tracking-tight"
            style={{ color: "#1d3b5c" }}
          >
            {showArchive ? "Архив" : "Куда летим?"}
          </h1>
          <p className="text-stone-500 mt-2">
            {showArchive ? "Поездки, убранные в архив" : "Выберите поездку"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-[#1d3b5c] rounded-full animate-spin" />
          </div>
        ) : showArchive ? (
          <>
            <button
              type="button"
              onClick={() => setShowArchive(false)}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-black/5 transition hover:text-[#1d3b5c]"
            >
              <ArrowLeft className="h-4 w-4" />
              К поездкам
            </button>

            {archivedTrips.length === 0 ? (
              <p className="rounded-2xl bg-white/70 p-6 text-center text-stone-500">
                Архив пуст.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    muted
                    onOpen={() => navigate(`/trip/${trip.id}`)}
                  >
                    <button
                      type="button"
                      onClick={() => handleRestore(trip)}
                      disabled={busyId === trip.id}
                      className={`${iconButton} hover:bg-stone-100 hover:text-[#1d3b5c]`}
                      aria-label="Вернуть из архива"
                      title="Вернуть из архива"
                    >
                      {busyId === trip.id ? spinner : <ArchiveRestore className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(trip)}
                      disabled={busyId === trip.id}
                      className={`${iconButton} hover:bg-[#f7e9e3] hover:text-[#a8451f]`}
                      aria-label="Удалить навсегда"
                      title="Удалить навсегда"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TripCard>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {error && <p className="mb-4 text-center text-sm text-[#a8451f]">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              {activeTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onOpen={() => navigate(`/trip/${trip.id}`)}>
                  <button
                    type="button"
                    onClick={() => setFormFor({ trip })}
                    className={`${iconButton} hover:bg-stone-100 hover:text-stone-700`}
                    aria-label="Изменить поездку"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(trip)}
                    disabled={busyId === trip.id}
                    className={`${iconButton} hover:bg-stone-100 hover:text-[#1d3b5c]`}
                    aria-label="В архив"
                    title="В архив"
                  >
                    {busyId === trip.id ? spinner : <Archive className="h-4 w-4" />}
                  </button>
                </TripCard>
              ))}

              <button
                type="button"
                onClick={() => setFormFor({ trip: null })}
                className="rounded-2xl border-2 border-dashed border-stone-300 p-5 text-stone-500 transition hover:border-[#1d3b5c] hover:text-[#1d3b5c] min-h-[120px] flex flex-col items-center justify-center gap-2"
              >
                <Plus className="h-6 w-6" />
                <span className="font-medium">Добавить поездку</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowArchive(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/60 p-4 text-stone-500 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-[#1d3b5c]"
            >
              <Archive className="h-5 w-5" />
              <span className="font-medium">Архив</span>
              {archivedTrips.length > 0 && (
                <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-xs font-semibold text-stone-600">
                  {archivedTrips.length}
                </span>
              )}
            </button>
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

      {deleting && (
        <PasscodeDialog
          title="Удалить навсегда"
          message={`Поездка «${deleting.city}, ${tripYearLabel(deleting)}» будет удалена вместе со всеми заметками и фотографиями. Введите код, чтобы подтвердить.`}
          onConfirm={() => removeTrip(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
