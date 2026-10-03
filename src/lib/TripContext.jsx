import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  listTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  setTripArchived,
  setTripPin,
  setTripExport,
  setTripGcal,
  setTripSummary,
  listDays,
  saveDay,
  ensureSeeded,
  warmTrip,
} from "@/api/trips";
import { setActiveTripId } from "@/api/entities";
import { isOnline } from "@/api/offline";
import { driveImageUrl } from "@/api/drive";
import { useOnline } from "@/lib/useOnline";
import { t } from "@/lib/i18n";

// Photo thumbnails already requested this session. Fetching one through the
// service worker (public/sw.js) is what stores it on the device.
const warmedImages = new Set();

async function warmImages(photos) {
  if (!navigator.serviceWorker?.controller) return;
  for (const p of photos) {
    if (p.kind === "document" || !p.drive_file_id) continue;
    const url = driveImageUrl(p.drive_file_id, 600);
    if (warmedImages.has(url)) continue;
    warmedImages.add(url);
    if (!isOnline()) return;
    const ok = await fetch(url)
      .then((res) => res.ok)
      .catch(() => false);
    // Not there yet (e.g. Google is still making the thumbnail): retry later.
    if (!ok) warmedImages.delete(url);
  }
}

// { "a.b.c": v } applied to a copy of obj, as Firestore applies field paths;
// null deletes the field.
function applyFieldPaths(obj, patch) {
  const out = { ...obj };
  Object.entries(patch).forEach(([path, value]) => {
    const keys = path.split(".");
    let node = out;
    keys.slice(0, -1).forEach((k) => {
      node[k] = { ...(node[k] && typeof node[k] === "object" ? node[k] : {}) };
      node = node[k];
    });
    const last = keys[keys.length - 1];
    if (value === null) delete node[last];
    else node[last] = value;
  });
  return out;
}

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
          ? t("Нет доступа к базе. Опубликуйте правила Firestore из firestore.rules ") +
            "(Firebase Console → Firestore → Rules → Publish)."
          : `${t("Не удалось загрузить поездки.")} ${e?.code || e?.message || ""}`.trim()
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Coming back online: pick up whatever changed on the other devices.
  const online = useOnline();
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) refresh();
    wasOnline.current = online;
  }, [online, refresh]);

  // Save every trip onto this device in the background — plans, notes, photo
  // records and thumbnails — so any of them opens later without a connection.
  useEffect(() => {
    if (loading || !trips.length || !isOnline()) return;
    let cancelled = false;
    (async () => {
      for (const t of trips) {
        if (cancelled) return;
        try {
          await warmImages(await warmTrip(t.id));
        } catch (e) {
          console.warn("Could not cache trip", t.id, e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trips, loading]);

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

  const archiveTrip = useCallback(
    async (id, archived = true) => {
      await setTripArchived(id, archived);
      await refresh();
    },
    [refresh]
  );

  const setTripLock = useCallback(
    async (id, pinHash) => {
      await setTripPin(id, pinHash);
      await refresh();
    },
    [refresh]
  );

  const saveTripExport = useCallback(
    async (id, docId) => {
      await setTripExport(id, docId);
      await refresh();
    },
    [refresh]
  );

  const saveTripGcal = useCallback(
    async (id, gcal) => {
      await setTripGcal(id, gcal);
      await refresh();
    },
    [refresh]
  );

  // Shown at once; no full refresh, so a tap on a star stays instant.
  const saveTripSummary = useCallback(async (id, patch) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? applyFieldPaths(t, patch) : t)));
    await setTripSummary(id, patch);
  }, []);

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
    // Every trip, archived included — an archived trip can still be opened.
    trips,
    activeTrips: trips.filter((t) => !t.archived),
    archivedTrips: trips.filter((t) => t.archived),
    archiveTrip,
    setTripLock,
    saveTripExport,
    saveTripGcal,
    saveTripSummary,
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
