// Every trip's photos & documents go into its own folder inside the shared
// Drive folder (DRIVE_FOLDER_ID). The trip doc keeps it:
//
//   drive_folder: { id, by, limited, name }
//   drive_access: { [emailKey]: { email, pin_hash, at, perm, granted, folder } }
//
// A trip that is open → an ordinary sub-folder: everyone the shared folder is
// shared with opens it in Drive.
// A trip locked with a PIN → a "limited access" folder made by the trip's owner:
// the others see it greyed out in Drive and cannot open it. Entering the PIN in
// the app files a request in drive_access; the next time the owner's app is open
// with a Drive token it adds that person to the folder (writer, no e-mail).
// A new PIN takes them out again until they enter it. The app itself never needs
// the folder: every file is link-shared and shown by its link (see drive.js).
//
// drive.file only reaches files this account uploaded through the app, so each
// device moves its own files into the right folder, in the background.
// Like the PIN itself this is a privacy screen, not security: the file links
// are in Firestore, readable by every allow-listed account.

import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/api/firebase";
import { write, isOnline } from "@/api/offline";
import { updateTrip } from "@/api/trips";
import { emailKey } from "@/api/gcal";
import {
  hasDriveAccess,
  createDriveFolder,
  updateDriveFolder,
  shareDriveFolder,
  unshareDriveFolder,
  moveDriveFile,
} from "@/api/drive";
import { isTripLocked, isTripOwner } from "@/lib/tripLock";
import { ownerName } from "@/lib/family";
import { t } from "@/lib/i18n";

const me = () => auth.currentUser?.email || "";
const sameEmail = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const isDriveRefusal = (err) => /Drive (403|404)/.test(err?.message || "");

// A locked trip's folder must not give the trip away to whoever sees it greyed out.
export const tripFolderName = (trip) =>
  isTripLocked(trip)
    ? `Частная поездка · ${trip.startDate || trip.id}`
    : [trip.country, trip.city, trip.year].filter(Boolean).join(" · ") || trip.id;

// Folders this device has just written, until the trip list catches up — so a
// second upload right after the first does not make a second folder.
const written = new Map(); // tripId → { from, folder }

function currentFolder(trip) {
  const w = written.get(trip.id);
  if (w && (trip.drive_folder?.id || null) === w.from) return w.folder;
  return trip.drive_folder || null;
}

async function saveFolder(trip, folder) {
  written.set(trip.id, { from: trip.drive_folder?.id || null, folder });
  await updateTrip(trip.id, { drive_folder: folder });
  return folder;
}

// May this account put files into (and open) the trip's folder?
function canUse(trip, folder, email) {
  if (!folder?.id) return false;
  const access = trip.drive_access?.[emailKey(email)];
  const granted = !!access?.perm && access.folder === folder.id;
  if (isTripLocked(trip)) {
    if (!folder.limited) return false;
    return sameEmail(folder.by, email) || (granted && access.granted === trip.pin_hash);
  }
  return !folder.limited || sameEmail(folder.by, email) || granted;
}

// Bring the trip's folder to what the lock says, as far as this account can:
// only the owner makes (or opens up) a limited folder, and only a folder's
// maker can rename it. `create`: make one when there is none.
async function settleFolder(trip, { create }) {
  const email = me();
  const name = tripFolderName(trip);
  let folder = currentFolder(trip);
  const mine = folder && sameEmail(folder.by, email);

  if (isTripLocked(trip)) {
    if (!isTripOwner(trip, email)) return folder;
    if (!folder || !mine) {
      // Also when someone else made the old, open one: a folder's limited
      // access can only be switched by whoever made it.
      if (!create && !folder) return null;
      const id = await createDriveFolder(name);
      folder = await saveFolder(trip, { id, by: email, limited: false, name });
    }
    if (!folder.limited || folder.name !== name) {
      await updateDriveFolder(folder.id, { limited: true, name });
      folder = await saveFolder(trip, { ...folder, limited: true, name });
    }
    return folder;
  }

  if (!folder) {
    if (!create) return null;
    const id = await createDriveFolder(name);
    return saveFolder(trip, { id, by: email, limited: false, name });
  }
  if (mine && (folder.limited || folder.name !== name)) {
    await updateDriveFolder(folder.id, { limited: false, name });
    folder = await saveFolder(trip, { ...folder, limited: false, name });
  }
  return folder;
}

// The folder an upload to this trip goes into (made on the first upload).
// Throws a message for the person when the folder is not open to them yet.
export async function tripUploadFolder(trip) {
  const folder = await settleFolder(trip, { create: true });
  if (canUse(trip, folder, me())) return folder.id;
  throw new Error(
    t(
      "Папка этой поездки в Google Drive ещё не открыта для вас. Она откроется сама, когда {name} в следующий раз откроет приложение. Попробуйте позже.",
      { name: ownerName(trip) }
    )
  );
}

// Someone who got past the PIN asks to be let into the locked trip's folder.
const requested = new Set();

export async function requestFolderAccess(trip) {
  const email = me();
  if (!email || !isTripLocked(trip) || isTripOwner(trip, email)) return;
  const key = emailKey(email);
  const tag = `${trip.id}:${trip.pin_hash}`;
  if (requested.has(tag) || trip.drive_access?.[key]?.pin_hash === trip.pin_hash) return;
  requested.add(tag);
  await updateTrip(trip.id, {
    [`drive_access.${key}.email`]: email,
    [`drive_access.${key}.pin_hash`]: trip.pin_hash,
    [`drive_access.${key}.at`]: new Date().toISOString(),
  });
}

// The owner's device: let in whoever entered the current PIN, take out whoever
// only knows an old one.
async function settleAccess(trip, folder) {
  const email = me();
  if (!isTripLocked(trip) || !folder?.limited || !sameEmail(folder.by, email)) return false;
  let changed = false;
  for (const [key, a] of Object.entries(trip.drive_access || {})) {
    if (!a?.email || sameEmail(a.email, email)) continue;
    const path = (field) => `drive_access.${key}.${field}`;
    if (a.pin_hash === trip.pin_hash) {
      if (a.perm && a.folder === folder.id && a.granted === trip.pin_hash) continue;
      const perm = await shareDriveFolder(folder.id, a.email);
      await updateTrip(trip.id, {
        [path("perm")]: perm,
        [path("folder")]: folder.id,
        [path("granted")]: trip.pin_hash,
      });
      changed = true;
    } else if (a.perm && a.folder === folder.id) {
      await unshareDriveFolder(folder.id, a.perm).catch((err) => {
        if (!isDriveRefusal(err)) throw err;
      });
      await updateTrip(trip.id, { [path("perm")]: null, [path("folder")]: null, [path("granted")]: null });
      changed = true;
    }
  }
  return changed;
}

// Files Drive will not let this account move (uploaded outside the app, or the
// folder is not theirs): not tried again on this device.
const UNMOVABLE_KEY = "pp_drive_unmovable";

function unmovable() {
  try {
    return new Set(JSON.parse(localStorage.getItem(UNMOVABLE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markUnmovable(set, tag) {
  set.add(tag);
  try {
    localStorage.setItem(UNMOVABLE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// Move this account's files of the trip into its folder.
async function settleFiles(trip, folder, photos) {
  const email = me();
  if (!canUse(trip, folder, email)) return;
  const skip = unmovable();
  for (const p of photos) {
    if (!p.drive_file_id || p.drive_folder_id === folder.id) continue;
    if (!sameEmail(p.created_by, email)) continue;
    const tag = `${p.drive_file_id}>${folder.id}`;
    if (skip.has(tag)) continue;
    try {
      await moveDriveFile(p.drive_file_id, folder.id);
    } catch (err) {
      if (!isDriveRefusal(err)) throw err;
      markUnmovable(skip, tag);
      continue;
    }
    await write(updateDoc(doc(db, "trips", trip.id, "photos", p.id), { drive_folder_id: folder.id }));
  }
}

// Background upkeep for one trip, while a Drive token is at hand (it never asks
// for one). Returns true when the trip doc changed.
export async function syncTripFolder(trip, photos = []) {
  const email = me();
  if (!email || !isOnline() || !hasDriveAccess()) return false;
  const before = currentFolder(trip);
  const hasFiles = photos.some((p) => p.drive_file_id && sameEmail(p.created_by, email));
  const hasRequests = Object.keys(trip.drive_access || {}).length > 0;
  const folder = await settleFolder(trip, { create: hasFiles || (isTripLocked(trip) && hasRequests) });
  if (!folder) return false;
  const granted = await settleAccess(trip, folder);
  await settleFiles(trip, folder, photos);
  return granted || folder !== before;
}
