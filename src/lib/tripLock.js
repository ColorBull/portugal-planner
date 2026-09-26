// A trip's owner (trips/{id}.created_by) can lock it behind a 4-digit PIN.
// Only the PIN's SHA-256 is stored (trip.pin_hash), salted with the trip id.
// This is a family privacy screen, not security: every allow-listed account
// can still read the trip straight from Firestore, and four digits hash back
// in no time. firestore.rules only makes sure nobody but the owner sets it.
//
// "Remember" is per device: localStorage keeps the hash that was unlocked, so
// changing the PIN (or removing the lock) invalidates it everywhere.
//
// A locked trip is "Частная поездка" in the trip list (no city, country or
// dates, no map tint) for everyone but its owner, until this device has once
// entered the right PIN — that is kept under its own key, whether or not
// "Запомнить пароль" was ticked, and a new PIN hides the trip again.

import { useEffect, useState } from "react";

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const PIN_LENGTH = 4;
export const isValidPin = (pin) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin || "");

export const hashPin = (tripId, pin) => sha256(`${tripId}:${pin}`);

export const isTripLocked = (trip) => !!trip?.pin_hash;

export const isTripOwner = (trip, email) =>
  !!trip?.created_by && !!email && trip.created_by.toLowerCase() === email.toLowerCase();

const storageKey = (tripId) => `trip-pin:${tripId}`;
const seenKey = (tripId) => `trip-seen:${tripId}`;

// Lets everything showing trip names re-render once a PIN is entered.
const CHANGE_EVENT = "trip-lock-change";
const notify = () => window.dispatchEvent(new Event(CHANGE_EVENT));

export function useTripLockChanges() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(CHANGE_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(CHANGE_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
}

function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function markRevealed(trip, pinHash) {
  try {
    localStorage.setItem(seenKey(trip.id), pinHash);
  } catch {
    // Blocked storage: the trip stays "private" in the list on this device.
  }
  notify();
}

// May this viewer see the trip's name and details in the list?
export function canSeeTrip(trip, email) {
  if (!isTripLocked(trip) || isTripOwner(trip, email)) return true;
  return stored(seenKey(trip.id)) === trip.pin_hash || isRemembered(trip);
}

export const PRIVATE_TRIP_LABEL = "Частная поездка";

export function isRemembered(trip) {
  if (!isTripLocked(trip)) return false;
  return stored(storageKey(trip.id)) === trip.pin_hash;
}

export function rememberUnlock(trip, pinHash) {
  try {
    localStorage.setItem(storageKey(trip.id), pinHash);
  } catch {
    // Private mode / blocked storage: the PIN is simply asked again next time.
  }
}

export function forgetUnlock(tripId) {
  try {
    localStorage.removeItem(storageKey(tripId));
  } catch {
    // ignore
  }
}
