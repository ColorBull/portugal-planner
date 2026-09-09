// ---------------------------------------------------------------------------
// Google Drive is the file host for trip photos & documents.
//
// The OAuth access token comes from the Google sign-in (see AuthContext).
// Firebase does not refresh that token, so it lives ~1h; when Drive answers
// 401 we ask AuthContext to pop the Google dialog again and retry once.
// ---------------------------------------------------------------------------

import { DRIVE_FOLDER_ID } from "@/config";

const TOKEN_KEY = "pp_drive_token";

let accessToken = null;
let expiresAt = 0;
let reauthorize = null; // async () => newToken, registered by AuthContext

try {
  const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");
  if (saved && saved.token && saved.expiresAt > Date.now()) {
    accessToken = saved.token;
    expiresAt = saved.expiresAt;
  }
} catch {
  /* ignore */
}

export function setDriveToken(token, lifetimeSeconds = 3600) {
  accessToken = token || null;
  expiresAt = token ? Date.now() + (lifetimeSeconds - 120) * 1000 : 0;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function registerReauthorize(fn) {
  reauthorize = fn;
}

export function hasDriveAccess() {
  return !!accessToken && expiresAt > Date.now();
}

async function token() {
  if (accessToken && expiresAt > Date.now()) return accessToken;
  if (!reauthorize) throw new Error("Drive access is not available");
  const fresh = await reauthorize();
  if (!fresh) throw new Error("Drive authorization was cancelled");
  return fresh;
}

async function driveFetch(url, options = {}, retry = true) {
  const t = await token();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${t}` },
  });
  if ((res.status === 401 || res.status === 403) && retry && reauthorize) {
    const fresh = await reauthorize();
    if (fresh) return driveFetch(url, options, false);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Drive ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

// Upload a File/Blob into the shared folder and make it viewable by anyone
// with the link (so the other parent's browser can render the thumbnail).
// Returns the Drive file id.
export async function uploadToDrive(file, { name } = {}) {
  const metadata = {
    name: name || file.name || `photo-${Date.now()}`,
    parents:
      DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== "REPLACE_ME" ? [DRIVE_FOLDER_ID] : undefined,
  };

  // multipart/related body (the form the Drive v3 multipart upload expects):
  // part 1 = JSON metadata, part 2 = the raw file bytes.
  const boundary = `pp${Date.now()}${Math.random().toString(16).slice(2)}`;
  const head =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = new Blob([head, file, tail], { type: `multipart/related; boundary=${boundary}` });

  const res = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  const { id } = await res.json();

  // Best-effort: link-sharing so the co-traveller can see the image.
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  }).catch(() => {});

  return id;
}

export async function deleteFromDrive(fileId) {
  if (!fileId) return;
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
  }).catch(() => {});
}

// Public thumbnail endpoint — works in <img> for link-shared files.
export function driveImageUrl(fileId, size = 1200) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

export function driveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
