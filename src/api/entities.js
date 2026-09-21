// Firestore-backed replacement for the Base44 entities API.
// Same surface the components used: filter(where) / create / update / delete.
//
// Layout:  trips/{TRIP_ID}/notes/*   and   trips/{TRIP_ID}/photos/*
// One shared itinerary — every allowed account reads and writes the same data.

import {
  collection,
  query,
  where as fsWhere,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/api/firebase";
import { readDocs, write } from "@/api/offline";
import { TRIP_ID } from "@/config";

// Which trip the UI is currently showing. TripProvider sets this as soon as a
// trip is opened; notes & photos are always written under that trip.
let activeTripId = TRIP_ID;

export function setActiveTripId(id) {
  if (id) activeTripId = id;
}

export function getActiveTripId() {
  return activeTripId;
}

function coll(name) {
  return collection(db, "trips", activeTripId, name);
}

function ref(name, id) {
  return doc(db, "trips", activeTripId, name, id);
}

function makeEntity(name) {
  return {
    async filter(criteria = {}) {
      const clauses = Object.entries(criteria).map(([k, v]) => fsWhere(k, "==", v));
      const snap = await readDocs(query(coll(name), ...clauses));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async create(data) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      const ref = doc(coll(name));
      await write(
        setDoc(ref, {
          ...clean,
          created_by: auth.currentUser?.email || null,
          created_date: serverTimestamp(),
        })
      );
      return { id: ref.id, ...clean };
    },
    async update(id, data) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      await write(
        updateDoc(ref(name, id), {
          ...clean,
          updated_date: serverTimestamp(),
        })
      );
      return { id, ...clean };
    },
    async delete(id) {
      await write(deleteDoc(ref(name, id)));
    },
  };
}

export const TripNote = makeEntity("notes");
export const TripPhoto = makeEntity("photos");
