// Trips + their day plans, stored in Firestore.
//
//   trips/{tripId}                 { country, city, year, startDate, endDate }
//   trips/{tripId}/days/{dateKey}  { city, sections: [ { id, title, icon,
//                                      mapUrl, items: [ { id, text, address,
//                                      mapUrl } ] } ] }
//   trips/{tripId}/notes/*         (see api/entities.js)
//   trips/{tripId}/photos/*
//
// trips/_meta is a bookkeeping doc, never shown as a trip. (Firestore reserves
// ids matching __.*__, so it must not be called __meta__.)

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/api/firebase";
import { readDoc, readDocs, write, isOnline } from "@/api/offline";
import { TRIP_ID } from "@/config";
import { tripPlans, tripDays as portugalDays } from "@/data/tripPlans";

const META_ID = "_meta";

export const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// ---------------------------------------------------------------- trips ----

export async function listTrips() {
  const snap = await readDocs(collection(db, "trips"));
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
  // The id is minted locally so this also works offline.
  const ref = doc(collection(db, "trips"));
  await write(
    setDoc(ref, {
      ...stripUndefined(data),
      created_by: auth.currentUser?.email || null,
      created_date: serverTimestamp(),
    })
  );
  return { id: ref.id, ...data };
}

export async function updateTrip(id, data) {
  await write(
    updateDoc(doc(db, "trips", id), {
      ...stripUndefined(data),
      updated_date: serverTimestamp(),
    })
  );
}

async function deleteAll(tripId, name) {
  const snap = await readDocs(collection(db, "trips", tripId, name));
  await write(Promise.all(snap.docs.map((d) => deleteDoc(d.ref))));
}

export async function deleteTrip(id) {
  await deleteAll(id, "days");
  await deleteAll(id, "notes");
  await deleteAll(id, "photos");
  await write(deleteDoc(doc(db, "trips", id)));
}

// ----------------------------------------------------------------- days ----

// Pull a trip's days, notes and photo records into the device cache, so the
// whole trip can be opened offline later. Returns the photo records.
export async function warmTrip(tripId) {
  const [, , photos] = await Promise.all(
    ["days", "notes", "photos"].map((name) => readDocs(collection(db, "trips", tripId, name)))
  );
  return photos.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// { [dateKey]: { city, sections } }
export async function listDays(tripId) {
  const snap = await readDocs(collection(db, "trips", tripId, "days"));
  const out = {};
  snap.docs.forEach((d) => {
    out[d.id] = { id: d.id, ...d.data() };
  });
  return out;
}

export async function saveDay(tripId, dateKey, data) {
  await write(
    setDoc(
      doc(db, "trips", tripId, "days", dateKey),
      {
        ...stripUndefined(data),
        updated_by: auth.currentUser?.email || null,
        updated_date: serverTimestamp(),
      },
      { merge: true }
    )
  );
}

export async function deleteDay(tripId, dateKey) {
  await write(deleteDoc(doc(db, "trips", tripId, "days", dateKey)));
}

// -------------------------------------------------------------- seeding ----

// The original Portugal itinerary lived in src/data/tripPlans.js. The first
// time the app runs against an empty database we copy it into Firestore so the
// existing notes & photos (which key off day_key + item_id) still line up.
export async function ensureSeeded() {
  // Seeding needs the server's answer; offline the cache is all there is.
  if (!isOnline()) return;
  const metaRef = doc(db, "trips", META_ID);
  const meta = await readDoc(metaRef);
  if (meta.exists() && meta.data()?.seeded) return;

  const tripRef = doc(db, "trips", TRIP_ID);
  if (!(await readDoc(tripRef)).exists()) {
    await setDoc(tripRef, {
      country: "Португалия",
      city: "Порту и Лиссабон",
      year: 2026,
      startDate: portugalDays[0].key,
      endDate: portugalDays[portugalDays.length - 1].key,
      created_by: auth.currentUser?.email || null,
      created_date: serverTimestamp(),
    });
  }

  // Seed the days whenever they are still missing — not just when the trip doc
  // was created above. An earlier run that created the trip and then failed
  // half way through the days would otherwise leave the itinerary empty.
  const days = await readDocs(collection(db, "trips", TRIP_ID, "days"));
  if (days.empty) {
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
