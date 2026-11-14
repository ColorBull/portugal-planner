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
  LogOut,
} from "lucide-react";
import { useTrips } from "@/lib/TripContext";
import { tripRangeLabel, tripYearLabel } from "@/lib/tripDays";
import TripFormModal from "@/components/TripFormModal";
import PasscodeDialog from "@/components/PasscodeDialog";
import CountryFlag from "@/components/CountryFlag";
import { tripCountry, countryLabel } from "@/lib/countries";
import { ownerName } from "@/lib/family";
import SettingsButton from "@/components/SettingsButton";
import ActionMenu from "@/components/ActionMenu";
import PinnedCorner from "@/components/PinnedCorner";
import TripRatingBadge from "@/components/TripRatingBadge";
import { useAuth } from "@/lib/AuthContext";
import { canSeeTrip, useTripLockChanges, PRIVATE_TRIP_LABEL } from "@/lib/tripLock";
import { t } from "@/lib/i18n";

// While a card's action runs, its "⋯" is a spinner.
const busySpinner = (
  <span className="grid h-9 w-9 place-items-center text-stone-400">
    <Loader2 className="h-4 w-4 animate-spin" />
  </span>
);

function TripCard({ trip, hidden, muted, onOpen, onRate, children }) {
  const country = hidden ? null : tripCountry(trip);
  return (
    <div
      className={`relative rounded-[22px] p-5 text-start shadow-sm ring-1 ring-black/5 transition hover:bg-white ${
        muted ? "bg-white/60" : "bg-white/90"
      }`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-start pe-10">
        <div className="flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-wide text-stone-500">
          {country && <CountryFlag code={country.code} width={18} />}
          {hidden ? t("PIN-код") : countryLabel(trip)}
          {trip.pin_hash && (
            <Lock className="h-3.5 w-3.5 text-[#1d3b5c]" aria-label={t("Закрыта PIN-кодом")} />
          )}
        </div>
        <div className={`mt-0.5 text-[24px] font-bold leading-tight tracking-tight ${muted ? "text-stone-500" : "text-stone-900"}`}>
          {hidden ? t(PRIVATE_TRIP_LABEL) : trip.city}
        </div>
        {/* The family's score, always on its own line under the name. */}
        {!hidden && <TripRatingBadge trip={trip} onRate={onRate} className="mt-1.5" />}
        {/* Behind a PIN the place stays secret, but who made it and when is
            shown, so two private trips can be told apart. */}
        {hidden && ownerName(trip) && (
          <div className="mt-1 text-sm font-medium text-stone-600">
            {t("От: {name}", { name: ownerName(trip) })}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-[15px] text-stone-500">
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

      <div className="absolute end-2 top-3">{children}</div>
    </div>
  );
}

export default function TripPicker() {
  const navigate = useNavigate();
  const { activeTrips, archivedTrips, loading, error, addTrip, editTrip, archiveTrip, removeTrip } =
    useTrips();
  const { user, signOut } = useAuth();
  useTripLockChanges();
  const isHidden = (trip) => !canSeeTrip(trip, user?.email);
  // Confirmations name the trip only when this viewer may see it.
  const tripName = (trip) =>
    isHidden(trip)
      ? [t(PRIVATE_TRIP_LABEL), ownerName(trip), tripRangeLabel(trip)].filter(Boolean).join(", ")
      : `${trip.city}, ${tripYearLabel(trip)}`;

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
      t("Перенести поездку «{name}» в архив? Все заметки и фотографии сохранятся.", { name: tripName(trip) })
    );
    if (ok) run(trip, () => archiveTrip(trip.id, true), t("Не удалось перенести поездку в архив."));
  };

  const handleRestore = (trip) =>
    run(trip, () => archiveTrip(trip.id, false), t("Не удалось вернуть поездку из архива."));


  return (
    // The page scrolls inside this box, not the document, so a phone's own
    // address-bar handling never gets involved. The settings and sign-out buttons
    // are at the top of the page and scroll away with it.
    <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain">
    <div className="relative flex min-h-full w-full flex-col items-center justify-center px-4 pb-12 pt-16 sm:pt-20">
      <SettingsButton calendar />
      <PinnedCorner side="right">
        <button
          type="button"
          onClick={signOut}
          title={t("Выйти")}
          aria-label={t("Выйти")}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-black/5 transition hover:bg-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </PinnedCorner>
      <div className="relative z-10 w-full max-w-3xl">
        {/* One compact row on a phone (icon beside the title); centred and large from sm up. */}
        <div className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-[22px] bg-white/90 px-4 py-3 shadow-sm ring-1 ring-black/5 sm:mb-10 sm:flex-col sm:gap-0 sm:rounded-[28px] sm:px-8 sm:py-6 sm:text-center">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl"
            style={{ backgroundColor: "#1d3b5c", color: "white" }}
          >
            {showArchive ? <Archive className="h-5 w-5 sm:h-7 sm:w-7" /> : <Plane className="h-5 w-5 sm:h-7 sm:w-7" />}
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              {showArchive ? t("Архив") : t("Куда летим?")}
            </h1>
            <p className="text-[15px] text-stone-500 sm:mt-2 sm:text-lg">
              {showArchive ? t("Поездки, убранные в архив") : t("Выберите поездку")}
            </p>
          </div>
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
              className="mb-4 inline-flex h-10 items-center gap-0.5 rounded-full bg-white/90 pe-3.5 ps-2 text-[17px] text-[#2c5f8a] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
              {t("К поездкам")}
            </button>

            {archivedTrips.length === 0 ? (
              <p className="rounded-2xl bg-white/70 p-6 text-center text-stone-500">
                {t("Архив пуст.")}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    hidden={isHidden(trip)}
                    muted
                    onOpen={() => navigate(`/trip/${trip.id}`)}
                    onRate={() => navigate(`/trip/${trip.id}?view=summary`)}
                  >
                    {busyId === trip.id ? (
                      busySpinner
                    ) : (
                      <ActionMenu
                      corner="page"
                        actions={[
                          { key: "restore", icon: ArchiveRestore, label: t("Вернуть из архива"), run: () => handleRestore(trip) },
                          { key: "delete", icon: Trash2, danger: true, label: t("Удалить навсегда"), run: () => setDeleting(trip) },
                        ]}
                      />
                    )}
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
                <TripCard
                  key={trip.id}
                  trip={trip}
                  hidden={isHidden(trip)}
                  onOpen={() => navigate(`/trip/${trip.id}`)}
                  onRate={() => navigate(`/trip/${trip.id}?view=summary`)}
                >
                  {busyId === trip.id ? (
                    busySpinner
                  ) : (
                    <ActionMenu
                      corner="page"
                      actions={[
                        // The edit form would show what the lock hides.
                        ...(isHidden(trip)
                          ? []
                          : [{ key: "edit", icon: Pencil, label: t("Изменить поездку"), run: () => setFormFor({ trip }) }]),
                        { key: "archive", icon: Archive, label: t("В архив"), run: () => handleArchive(trip) },
                      ]}
                    />
                  )}
                </TripCard>
              ))}

            </div>

            <button
              type="button"
              onClick={() => setFormFor({ trip: null })}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1d3b5c] px-5 text-[17px] font-semibold text-white shadow-sm transition hover:bg-[#2c5f8a]"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              {t("Добавить поездку")}
            </button>

            <button
              type="button"
              onClick={() => setShowArchive(true)}
              className="mx-auto mt-2 flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/90 px-5 text-[15px] font-medium text-[#2c5f8a] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
            >
              <Archive className="h-5 w-5" />
              <span className="font-medium">{t("Архив")}</span>
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
          title={t("Удалить навсегда")}
          trip={deleting}
          message={t(
            "Поездка «{name}» будет удалена вместе со всеми заметками и фотографиями. {prompt}, чтобы подтвердить.",
            {
              name: tripName(deleting),
              prompt: deleting.pin_hash ? t("Введите PIN-код поездки") : t("Введите код"),
            }
          )}
          onConfirm={() => removeTrip(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
    </div>
  );
}
