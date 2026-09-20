import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  listTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  listDays,
  saveDay,
  ensureSeeded,
} from "@/api/trips";
import { setActiveTripId } from "@/api/entities";

const TripContext = createContext(null);

export function TripProvider({ children }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tripId, setTripId] = useState(null);
  const [days, setDays] = useState({});
  const [daysLoading, setDaysLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureSeeded();
      setTrips(await listTrips());
    } catch (e) {
      console.error(e);
      // A denied read almost always means the Firestore rules on the server
      // are older than firestore.rules in this repo — say so instead of
      // leaving a dead end.
      setError(
        e?.code === "permission-denied"
          ? "Нет доступа к базе. Опубликуйте правила Firestore из firestore.rules " +
            "(Firebase Console → Firestore → Rules → Publish)."
          : `Не удалось загрузить поездки. ${e?.code || e?.message || ""}`.trim()
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Open a trip: notes & photos follow it, and its day plans are fetched.
  const openTrip = useCallback(async (id) => {
    if (!id) return;
    setActiveTripId(id);
    setTripId(id);
    setDaysLoading(true);
    try {
      setDays(await listDays(id));
    } catch (e) {
      console.error(e);
      setDays({});
    } finally {
      setDaysLoading(false);
    }
  }, []);

  // Persist one day's plan and keep the local copy in sync.
  const saveDayPlan = useCallback(
    async (dateKey, data) => {
      if (!tripId) return;
      await saveDay(tripId, dateKey, data);
      setDays((prev) => ({ ...prev, [dateKey]: { id: dateKey, ...prev[dateKey], ...data } }));
    },
    [tripId]
  );

  const addTrip = useCallback(
    async (data) => {
      const trip = await createTrip(data);
      await refresh();
      return trip;
    },
    [refresh]
  );

  const editTrip = useCallback(
    async (id, data) => {
      await updateTrip(id, data);
      await refresh();
    },
    [refresh]
  );

  const removeTrip = useCallback(
    async (id) => {
      await deleteTrip(id);
      if (id === tripId) {
        setTripId(null);
        setDays({});
      }
      await refresh();
    },
    [refresh, tripId]
  );

  const value = {
    trips,
    loading,
    error,
    refresh,
    tripId,
    trip: trips.find((t) => t.id === tripId) || null,
    days,
    daysLoading,
    openTrip,
    saveDayPlan,
    addTrip,
    editTrip,
    removeTrip,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrips must be used within a TripProvider");
  return ctx;
}
