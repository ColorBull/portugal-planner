// Trips + their day plans, stored in Firestore.
//
//   trips/{tripId}                 { country, city, year, startDate, endDate }
//   trips/{tripId}/days/{dateKey}  { city, sections: [ { id, title, icon,
//                                      mapUrl, items: [ { id, text, address,
//                                      mapUrl } ] } ] }
//   trips/{tripId}/notes/*         (see api/entities.js)
//   trips/{tripId}/photos/*
//
// trips/__meta__ is a bookkeeping doc, never shown as a trip.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/api/firebase";
import { TRIP_ID } from "@/config";
import { tripPlans, tripDays as portugalDays } from "@/data/tripPlans";

const META_ID = "__meta__";

export const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// ---------------------------------------------------------------- trips ----

export async function listTrips() {
  const snap = await getDocs(collection(db, "trips"));
  return snap.docs
    .filter((d) => d.id !== META_ID)
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ay = Number(a.year) || 0;
      const by = Number(b.year) || 0;
      if (ay !== by) return ay - by;
      return String(a.startDate || "").localeCompare(String(b.startDate || ""));
    });
}

export async function createTrip(data) {
  const ref = await addDoc(collection(db, "trips"), {
    ...stripUndefined(data),
    created_by: auth.currentUser?.email || null,
    created_date: serverTimestamp(),
  });
  return { id: ref.id, ...data };
}

export async function updateTrip(id, data) {
  await updateDoc(doc(db, "trips", id), {
    ...stripUndefined(data),
    updated_date: serverTimestamp(),
  });
}

async function deleteAll(tripId, name) {
  const snap = await getDocs(collection(db, "trips", tripId, name));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function deleteTrip(id) {
  await deleteAll(id, "days");
  await deleteAll(id, "notes");
  await deleteAll(id, "photos");
  await deleteDoc(doc(db, "trips", id));
}

// ----------------------------------------------------------------- days ----

// { [dateKey]: { city, sections } }
export async function listDays(tripId) {
  const snap = await getDocs(collection(db, "trips", tripId, "days"));
  const out = {};
  snap.docs.forEach((d) => {
    out[d.id] = { id: d.id, ...d.data() };
  });
  return out;
}

export async function saveDay(tripId, dateKey, data) {
  await setDoc(
    doc(db, "trips", tripId, "days", dateKey),
    {
      ...stripUndefined(data),
      updated_by: auth.currentUser?.email || null,
      updated_date: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteDay(tripId, dateKey) {
  await deleteDoc(doc(db, "trips", tripId, "days", dateKey));
}

// -------------------------------------------------------------- seeding ----

// The original Portugal itinerary lived in src/data/tripPlans.js. The first
// time the app runs against an empty database we copy it into Firestore so the
// existing notes & photos (which key off day_key + item_id) still line up.
export async function ensureSeeded() {
  const metaRef = doc(db, "trips", META_ID);
  const meta = await getDoc(metaRef);
  if (meta.exists() && meta.data()?.seeded) return;

  const existing = await getDoc(doc(db, "trips", TRIP_ID));
  if (!existing.exists()) {
    await setDoc(doc(db, "trips", TRIP_ID), {
      country: "Португалия",
      city: "Порту и Лиссабон",
      year: 2026,
      startDate: portugalDays[0].key,
      endDate: portugalDays[portugalDays.length - 1].key,
      created_by: auth.currentUser?.email || null,
      created_date: serverTimestamp(),
    });

    await Promise.all(
      Object.entries(tripPlans).map(([dateKey, plan]) =>
        setDoc(doc(db, "trips", TRIP_ID, "days", dateKey), {
          city: plan.city || "",
          sections: (plan.sections || []).map((s) => ({
            id: uid("sec"),
            title: s.title || "",
            icon: s.icon || "MapPin",
            mapUrl: s.mapUrl || "",
            items: (s.items || []).map((it) => ({
              id: it.id || uid("item"),
              text: it.text || "",
              address: it.address || "",
              mapUrl: it.mapUrl || "",
            })),
          })),
        })
      )
    );
  }

  await setDoc(metaRef, { seeded: true, seeded_date: serverTimestamp() }, { merge: true });
}
