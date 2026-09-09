# Portugal Planner — notes for Claude

A private trip planner for one family trip to Portugal (30 Oct – 6 Nov 2026).
Originally a Base44 app; now a plain **Vite + React** app with its own backend.

## Stack

- **UI** — React 18, Vite, Tailwind, shadcn/ui, framer-motion. Untouched from the
  Base44 export except the data layer.
- **Auth** — Firebase Auth, Google sign-in only. Access is gated by an e-mail
  allow-list in `src/config.js` (mirrored in `firestore.rules`).
- **Data** — Cloud Firestore. One shared itinerary at `trips/{TRIP_ID}`, with
  `notes/*` and `photos/*` sub-collections. The `src/api/entities.js` shim keeps
  the old `TripNote` / `TripPhoto` `.filter/.create/.update/.delete` surface.
- **Files** — Google Drive. Photos & documents are uploaded (via the `drive.file`
  OAuth scope granted at sign-in) into one shared Drive folder
  (`DRIVE_FOLDER_ID`), link-shared, and rendered through
  `https://drive.google.com/thumbnail?id=…`.
- **Hosting** — GitHub Pages, built by `.github/workflows/deploy.yml` on push to
  `main`. `HashRouter` + `base: "./"` so it works from any sub-path.

## Key files

| File | Role |
|---|---|
| `src/config.js` | Firebase config, allow-list, Drive folder id, trip id. **Public by design.** |
| `src/api/firebase.js` | Firebase app / auth / firestore / Google provider |
| `src/api/entities.js` | Firestore-backed `TripNote` / `TripPhoto` |
| `src/api/drive.js` | Drive upload / delete / thumbnail URLs + OAuth token cache |
| `src/lib/AuthContext.jsx` | sign-in, allow-list check, Drive token capture & refresh |
| `src/App.jsx` | gate: loading → sign-in → access-restricted → app |
| `src/data/tripPlans.js` | the itinerary (static, Russian) |
| `firestore.rules` | only allow-listed verified e-mails touch `trips/**` |

## Gotchas

- The Firebase web API key is meant to be in the source (see afula-move). Real
  protection = `firestore.rules` + Firebase "Authorized domains".
- The Google **service-account** JSON is a real secret — `.gitignore`d, never used
  by the frontend.
- Drive OAuth access tokens last ~1 h and Firebase does not refresh them.
  `drive.js` re-pops the Google dialog on a 401 and retries once.
- Google's consent screen shows the `drive.file` permission as an **optional
  checkbox** (granular permissions). Clicking through without ticking it =
  signed in but no Drive scope → uploads 403 "insufficient authentication
  scopes". `tokenGrantsDrive()` (tokeninfo endpoint) detects this; `authorize()`
  re-prompts once and the upload path shows a Russian "tick the box" message.
- No local build was possible on the authoring machine (no Node). The GitHub
  Action is the source of truth for "does it build".
- The pre-Firebase Base44 source is preserved in the first git commit
  ("Snapshot: original Base44 export").
