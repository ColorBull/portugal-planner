# Portugal Planner — notes for Claude

A private family trip planner. It started as one hard-coded Portugal itinerary
(30 Oct – 6 Nov 2026) and is now **multi-trip**: the welcome screen lists trips
(country / city / year), you pick one, confirm, and land on that trip's
dashboard. Every day plan is editable in the app — add / edit / delete blocks
and items, and drag them to reorder. Behind everything sits one vector world
map: the trip list shows the whole world, opening a trip zooms into that
country's continent and tints the country.
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
  open (`setActiveTripId`). `trips/_meta` is bookkeeping, never a trip.
- **Files** — Google Drive. Photos & documents are uploaded (via the `drive.file`
  OAuth scope granted at sign-in) into one shared Drive folder
  (`DRIVE_FOLDER_ID`), link-shared, and rendered through
  `https://drive.google.com/thumbnail?id=…`.
- **Map** — no map library and no tiles. Natural Earth outlines are projected
  at build time into `src/data/worldMap.js` as plain SVG path strings; at
  runtime a single `<path>` is panned and scaled. See the gotcha below before
  reaching for d3-geo.
- **Hosting** — GitHub Pages, built by `.github/workflows/deploy.yml` on push to
  `main`. `HashRouter` + `base: "./"` so it works from any sub-path. The Action
  runs its own `npm install`, so **a push is the normal way to see a change** —
  see the `node_modules` gotcha.

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
| `src/components/MapBackdrop.jsx` | the one map layer, above the router so it survives navigation |
| `src/components/WorldMapBackground.jsx` | draws the map; world ↔ continent is a CSS transform |
| `src/components/CountrySelect.jsx` | type-to-search country picker with flags |
| `src/lib/countries.js` | country lookup by code or name, flag emoji, search |
| `src/data/worldMap.js` | **generated** — SVG paths, continent windows, country points |
| `src/data/countries.js` | **generated** — 250 countries: code, ccn3, Russian name, continent |
| `scripts/gen-worldmap.mjs` | regenerates `worldMap.js` from a Natural Earth topology |
| `scripts/gen-countries.mjs` | regenerates `countries.js` from the `world-countries` dataset |
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
- Firestore rejects document ids matching `__.*__` with `invalid-argument`, so
  the bookkeeping doc is `trips/_meta`, not `trips/__meta__`.
- Day docs are keyed by date (`days/2026-10-30`), and item ids are preserved
  when seeding, so existing notes & photos (which key off `day_key` +
  `item_id`) still line up with the migrated plans.
- Dragging uses `@hello-pangea/dnd`. It positions the dragged clone with
  `position: fixed`, which breaks if an ancestor has a CSS transform. The modal
  no longer animates on open (see the black-flash gotcha), so there is no
  transform to wait out — but don't add one to the modal shell.
- **`npm install` does not work in this folder.** The project lives on a Google
  Drive mount (`G:`), whose filesystem tops out around 7 small-file writes a
  second and rejects npm's parallel tar extraction outright
  (`TAR_ENTRY_ERROR UNKNOWN: write`, and npm still exits 0). Restoring ~40k
  files takes over an hour and usually fails part-way. Drive also supports no
  links, so `node_modules` cannot be junctioned to a real disk. Consequences:
  - Never run `npm install` here casually — it deletes the existing tree first,
    so a failed run leaves the app unable to start.
  - Adding a dependency is expensive. Prefer generating data at build time
    (that is why the map is precomputed) over pulling in a library.
  - To see a change, commit and push: the GitHub Action installs and builds in
    seconds, and a broken build simply fails without touching the live site.
- Verifying locally without `node_modules` — both install into the npm cache on
  `C:`, not into the project:
  - syntax: `npx esbuild@0.25.0 $(find src -name '*.jsx' -o -name '*.js') --loader:.js=jsx --outdir=<tmp>`
  - CSS: `npx tailwindcss@3.4.17 -c <config without the animate plugin> -i src/index.css -o <tmp>`
  A `{/* … */}` comment in a ternary's expression slot has broken the build
  before; esbuild catches exactly that.
- Anything full-screen with `backdrop-filter`, and any opacity or scale
  animation on a modal as it opens, makes Chrome paint a black frame. Both are
  gone from the modals: the scrims are plain translucent black and the panels
  appear at once (closing still animates). Don't reintroduce either.
- The map must never move on its own. Two mobile traps: a phone hides its
  address bar on scroll, which resizes the viewport — so the backdrop is sized
  with `100lvh` (`.viewport-tall`), the `<svg>` is pinned to a pixel size rather
  than `100%`, and `useSize` keeps the tallest height it has seen. Pages use
  `min-h-svh` so a screenful of content doesn't scroll by exactly the toolbar's
  height.
- `countries.js` and `worldMap.js` are joined by `ccn3`, the UN numeric country
  code, which is also the id in the Natural Earth topology. The 110m outlines
  drop countries smaller than roughly Luxembourg; those fall back to a pin at
  `MAP_POINTS[ccn3]`. Flags are images from flagcdn.com, because Windows has no
  colour flag glyphs.
- The pre-Firebase Base44 source is preserved in the first git commit
  ("Snapshot: original Base44 export").
