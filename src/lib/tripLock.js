// A trip's owner (trips/{id}.created_by) can lock it behind a 4-digit PIN.
// Only the PIN's SHA-256 is stored (trip.pin_hash), salted with the trip id.
// This is a family privacy screen, not security: every allow-listed account
// can still read the trip straight from Firestore, and four digits hash back
// in no time. firestore.rules only makes sure nobody but the owner sets it.
//
// "Remember" is per device: localStorage keeps the hash that was unlocked, so
// changing the PIN (or removing the lock) invalidates it everywhere.

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

export function isRemembered(trip) {
  if (!isTripLocked(trip)) return false;
  try {
    return localStorage.getItem(storageKey(trip.id)) === trip.pin_hash;
  } catch {
    return false;
  }
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
