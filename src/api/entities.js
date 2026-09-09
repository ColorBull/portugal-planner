// Firestore-backed replacement for the Base44 entities API.
// Same surface the components used: filter(where) / create / update / delete.
//
// Layout:  trips/{TRIP_ID}/notes/*   and   trips/{TRIP_ID}/photos/*
// One shared itinerary — every allowed account reads and writes the same data.

import {
  collection,
  query,
  where as fsWhere,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/api/firebase";
import { TRIP_ID } from "@/config";

function coll(name) {
  return collection(db, "trips", TRIP_ID, name);
}

function makeEntity(name) {
  return {
    async filter(criteria = {}) {
      const clauses = Object.entries(criteria).map(([k, v]) => fsWhere(k, "==", v));
      const snap = await getDocs(query(coll(name), ...clauses));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async create(data) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      const ref = await addDoc(coll(name), {
        ...clean,
        created_by: auth.currentUser?.email || null,
        created_date: serverTimestamp(),
      });
      return { id: ref.id, ...clean };
    },
    async update(id, data) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      await updateDoc(doc(db, "trips", TRIP_ID, name, id), {
        ...clean,
        updated_date: serverTimestamp(),
      });
      return { id, ...clean };
    },
    async delete(id) {
      await deleteDoc(doc(db, "trips", TRIP_ID, name, id));
    },
  };
}

export const TripNote = makeEntity("notes");
export const TripPhoto = makeEntity("photos");
