# Portugal Planner — notes for Claude

A private family trip planner. It started as one hard-coded Portugal itinerary
(30 Oct – 6 Nov 2026) and is now **multi-trip**: the welcome screen lists trips
(country / city / year), you pick one, confirm, and land on that trip's
dashboard. Every day plan is editable in the app — add / edit / delete blocks
and items, and drag them to reorder.
Originally a Base44 app; now a plain **Vite + React** app with its own backend.

## Stack

- **UI** — React 18, Vite, Tailwind, shadcn/ui, framer-motion. Untouched from the
  Base44 export except the data layer.
- **Auth** — Firebase Auth, Google sign-in only. Access is gated by an e-mail
  allow-list in `src/config.js` (mirrored in `firestore.rules`).
- **Data** — Cloud Firestore. One document per trip at `trips/{tripId}`, each
  with `days/*` (the editable itinerary), `notes/*` and `photos/*`
  sub-collections. `src/api/entities.js` keeps the old `TripNote` / `TripPhoto`
  `.filter/.create/.update/.delete` surface and writes under whichever trip is
  open (`setActiveTripId`). `trips/__meta__` is bookkeeping, never a trip.
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
| `src/api/trips.js` | trips + day-plan CRUD, and the one-time seed from `tripPlans.js` |
| `src/lib/TripContext.jsx` | trip list, the open trip, its days, save helpers |
| `src/lib/tripDays.js` | start/end date → day cards (Russian labels, UTC) |
| `src/pages/TripPicker.jsx` | welcome screen: choose / add / edit / delete a trip |
| `src/pages/Home.jsx` | one trip's dashboard (`#/trip/:tripId`) |
| `src/components/DayPlanEditor.jsx` | edit mode: add/delete/drag blocks & items |
| `src/data/planStyles.js` | icon map, palette, icon picker options |
| `src/data/tripPlans.js` | the original Portugal itinerary — **seed data only** |
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
- `firestore.rules` uses `rules_version = '2'`, where a recursive wildcard
  matches **one or more** segments (v1 matched zero or more). So
  `match /trips/{tripId}/{document=**}` covers the sub-collections but **not**
  the `trips/{tripId}` document itself — trip docs need their own `match`
  block, or listing trips and opening one is denied. Rules are not deployed by
  the GitHub Action; publish them by hand (Console → Firestore → Rules) or with
  `npx firebase-tools deploy --only firestore:rules`.
- Day docs are keyed by date (`days/2026-10-30`), and item ids are preserved
  when seeding, so existing notes & photos (which key off `day_key` +
  `item_id`) still line up with the migrated plans.
- Dragging uses `@hello-pangea/dnd`. It positions the dragged clone with
  `position: fixed`, which breaks if an ancestor has a CSS transform — the
  modal's framer-motion entry animation settles to `transform: none`, so drag
  works once the open animation finishes. Don't add a lingering transform to
  the modal shell.
- The pre-Firebase Base44 source is preserved in the first git commit
  ("Snapshot: original Base44 export").
