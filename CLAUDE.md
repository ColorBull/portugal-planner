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
  scope, asked for through Google Identity Services on the first upload — sign-in
  itself is identity only, no Drive permission screen) into one shared Drive folder
  (`DRIVE_FOLDER_ID`), link-shared, and rendered through
  `https://lh3.googleusercontent.com/d/<id>=w<size>` (not
  `drive.google.com/thumbnail`: that one refuses CORS, so the service worker
  could not tell a failed thumbnail from a real one and cached errors).
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
| `src/api/offline.js` | cache-fallback reads, non-blocking writes (see Offline) |
| `public/sw.js` | service worker: app shell + Drive thumbnails + flags offline |
| `src/api/drive.js` | Drive upload / delete / thumbnail URLs + OAuth token cache |
| `src/api/tripFolders.js` | per-trip Drive folders, limited access for locked trips |
| `src/lib/AuthContext.jsx` | sign-in, allow-list check, Drive token capture & refresh |
| `src/App.jsx` | gate: loading → sign-in → access-restricted → app |
| `src/api/trips.js` | trips + day-plan CRUD, and the one-time seed from `tripPlans.js` |
| `src/lib/TripContext.jsx` | trip list, the open trip, its days, save helpers |
| `src/lib/tripDays.js` | start/end date → day cards (Russian labels, UTC) |
| `src/pages/TripPicker.jsx` | welcome screen: choose / add / edit / delete a trip |
| `src/pages/Home.jsx` | one trip's dashboard (`#/trip/:tripId`) |
| `src/components/TripSummaryModal.jsx` | the "Итоги" page after the last day |
| `src/lib/tripSummary.js` | rating questions, per-city / cost stats for it |
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

## Archive

Trips are archived, not deleted: `archived: true` (+ `archived_date`,
`archived_by`) on `trips/{id}`; days, notes and photos are untouched.
`TripContext` exposes `trips` (all — an archived trip still opens by URL),
`activeTrips`, `archivedTrips` and `archiveTrip(id, archived)`. The picker's
"Архив" view restores trips or deletes them for good behind a passcode
(`PasscodeDialog.jsx`; only its SHA-256 is in the source). That passcode is a
guard against accidents, not security — `firestore.rules` is the real gate.

## Costs

Every plan item has an optional `cost` (a number, in the trip's `currency`,
chosen in the trip form; default €). Day 1 also carries `insurance` and `sim`
(`{ company, cost }`) on its day doc; their documents are ordinary uploads with
`item_id` `"insurance"` / `"sim"`. The day view ends with "Итого за день" —
`dayTotal()` in `src/lib/money.js`. Prices can also be set or changed
straight from the day view (`InlineCost` in `DayPlanModal.jsx`: tap the badge
or "+ цена"), which saves only that field. Moving a trip's start date leaves the
insurance/SIM on the old first date.

## Trip summary

After the last day tile the grid has one more tile, "Итоги" (trophy), which
opens `TripSummaryModal` — not a day: no date, not counted. The last day's
"next" button / swipe leads to it (`selectedKey === "summary"`); it counts as a
tile in the 30-per-page pagination. Computed from the days: length (days /
nights), cities with days and spend each (`plan.city || trip.city`), total
spend (sum of `dayTotal`), most expensive day. Entered afterwards, stored on
the trip doc as `trip.summary`: `note`, `ratings_by` (per person, keyed by `emailKey`:
`{ email, food: 1-5, … }`; each sets their own stars and sees the family
average per question and overall; questions in `RATING_QUESTIONS`; tap the same
star to clear), `highlights` and
`actions` (maps `id → { text, at, by[, done] }`). Saved by field path
(`setTripSummary`, null deletes) with an optimistic local update and no
refresh, so two people editing different entries don't clobber each other.
The NotebookLM export ends with it.

## PIN lock

The trip's creator (`created_by`) can lock it with a 4-digit PIN from the lock
button in the trip header. Only `pin_hash` = SHA-256(`tripId:pin`) is stored.
Everyone — owner included — enters the PIN on opening, unless "Запомнить
пароль" put that hash in this device's `localStorage` (`trip-pin:<id>`);
changing the PIN invalidates it. It is a privacy screen, not security (the data
is still readable by any allow-listed account); `firestore.rules` only stops
non-owners from setting or clearing it. For everyone but the owner a locked
trip shows as "Частная поездка" in the list, the trip header and the unlock
prompt (no city, country, map zoom, edit button; but with who made it —
`lib/family.js` — and its dates, so two private trips can be told apart) until this device has
entered the right PIN once — `trip-seen:<id>` in `localStorage`, set on every
correct unlock regardless of "Запомнить пароль"; `canSeeTrip()` decides. Logic in `src/lib/tripLock.js`, UI in
`TripLockDialog.jsx`.

## Drive folders per trip

`src/api/tripFolders.js`. Each trip's uploads (and its NotebookLM doc) go into
its own folder inside the shared `DRIVE_FOLDER_ID`, made on the first upload and
kept on the trip as `drive_folder: { id, by, limited, name }`. A trip locked
with a PIN gets a Drive **limited-access** folder (`inheritedPermissionsDisabled`)
made by the trip's owner and named "Частная поездка · <start date>": the
others see it greyed out in Drive and can't open it. Getting past the PIN in
the app writes a request into `trip.drive_access[emailKey]` (`email`,
`pin_hash`); the owner's app, next time it is open with a Drive token, adds that
person to the folder (writer, no e-mail) and records `perm` / `granted` /
`folder`. Until then that person's uploads to the trip are refused with a
"try later" message. A new PIN removes those who only know the old one; unlocking
switches limited access off again. Only a folder's maker can switch it, so
locking a trip whose open folder someone else made creates a fresh one.
In the background (`syncTripFolder`, from `TripContext`'s prefetch loop, never
asking for a token) each device moves the files **it** uploaded into the trip's
folder (drive.file reaches nothing else) and marks them `drive_folder_id` on the
photo record; files Drive refuses are remembered in `pp_drive_unmovable` and
left alone (e.g. the Base44-era uploads stay in the root). The app itself never
needs folder access — files are link-shared and shown by link.

## Settings, theme, Google Calendar

The gear at the top left of the trip list / sign-in (`SettingsButton.jsx`) opens
language, theme and (signed in) Google Calendar sync; its foot shows the build
time (`__BUILD_TIME__`, `define` in `vite.config.js`, Jerusalem time) — compare it
with the last push to see whether a device has the latest version. **Theme** (`lib/theme.jsx`):
system / dark / light in `localStorage` `pp_theme`, applied as `html.dark` (an
inline script in `index.html` sets it before first paint). The app uses literal
Tailwind colours and inline hex, so the dark palette is one block at the end of
`src/index.css` that remaps those utility classes and the rgb() form of the
inline styles; a new colour needs a line there. Pastel icon chips carry
`plan-chip` (inverted), the map `map-land` / `map-border`.
**Calendar** (`api/gcal.js`, `CalendarSettings.jsx`): per trip, a secondary
calendar made by the app (scope `calendar.app.created` through the Google
Identity Services token client, same `GOOGLE_OAUTH_CLIENT_ID`; its id is kept on
the trip, per account, in `trip.gcal`). Push: every plan item is an all-day event
(id derived from the item id, the item id also in its private extended
properties), so re-pushing updates in place and deletes what was removed. Pull:
events edited since the last push are diffed against the plan (renamed / moved /
deleted / new) and shown to the user to tick before anything is written.
Needs the **Google Calendar API enabled** in the Google Cloud project, or every
call answers 403 accessNotConfigured.

## Languages

Russian, English and Hebrew (RTL), chosen with the globe button at the top left
of the trip list / sign-in screen (`LanguageSwitch.jsx`), kept in `localStorage`
(`pp_lang`). `src/lib/i18n.jsx`: the **Russian text is the key** —
`t("Сохранить")`, `t("Введите {n} цифры.", { n })` — looked up in
`src/lib/i18n/en.js` / `he.js`; a missing entry just shows the Russian. Constants
holding Russian text (`EXTRAS`, `ICON_OPTIONS`, `PRIVATE_TRIP_LABEL`) stay
Russian and are translated where shown: `t(label)`. A switch remounts the routes
(`key={lang}` in `App.jsx`) so `t` is re-run. Country names come from `nameEn` /
`Intl.DisplayNames` (`countryName` in `lib/countries.js`; `trip.country` stays
the stored Russian name); month / weekday names from `lib/tripDays.js`. What
the family types (cities, plan items, notes) is data and is never translated.
Adding a string: wrap it in `t()` and add it to both dictionaries.
RTL: `<html dir>` flips; use logical classes (`ms-`, `me-`, `ps-`, `pe-`,
`start-`, `end-`, `text-start`, `border-s`, `rtl:rotate-180` on arrows), never
`ml-`/`pl-`/`left-`/`text-left`. The map layer is forced `dir="ltr"`, and so is
the language button. The NotebookLM export follows the language too.

## Phone layout

The day view is a full-page sheet on every screen size (`h-dvh`; header, body
and footer content sit in a centred `max-w-3xl` column). Below Tailwind's `sm`
(640px) it also has safe-area padding, big touch targets, 16px inputs so iOS
doesn't zoom, and
‹ / › day buttons in the footer and a sideways swipe. The editor stacks each item
into one column; `useIsPhone()` switches the card markup, because the drag handle
may exist only once per card. Address suggestions are in the flow on phones (a
scrolling list inside the scrolling sheet fights for every swipe) and float from
`sm` up. In the reading view each plan item has one "⋯" menu (`ActionMenu` in
`DayPlanModal.jsx`, a bottom sheet on phones) instead of add-buttons: price,
address, photo, document, note. The menu drives the children through refs
(`InlineCost`, `ItemAddress`, `PlanPhotoGrid.pickPhoto/pickDocument`,
`PlanNoteBox.open`). Press-and-hold (right-click on a computer) on a price
badge, an address link or a note opens a change / delete menu (`useHoldMenu`,
same gesture as photos); tapping an item's title edits it in place. What is already set (price badge, address link, photos,
note) still shows. `formatMoney` joins amount and currency with a non-breaking space so
they never wrap apart.

## NotebookLM export

The book button in the trip header (`TripExportDialog.jsx`) writes the whole
trip — days, prices, notes, document links — as HTML (`lib/tripExport.js`) and
uploads it to the shared Drive folder converted to a native **Google Doc**
(`saveGoogleDoc` in `api/drive.js`). The doc id is kept on the trip
(`export_doc_id`, `export_date`), so "Обновить" overwrites the same file and the
link never changes. In NotebookLM it is added as a *Google Drive* source, which
can be re-synced with one click after an update. It is a manual snapshot, not
live sync. `drive.file` only lets an account overwrite docs it created itself;
for anyone else `saveGoogleDoc` falls back to creating a fresh doc.

## Offline

Each device keeps its own copy, so a trip opens with no signal.

- **Data** — Firestore runs with `persistentLocalCache` (IndexedDB). All reads go
  through `readDocs` / `readDoc` in `src/api/offline.js`: cache when
  `navigator.onLine` is false or the server takes > 4 s (and the cache has
  something). All writes go through `write()`, which stops waiting after a few
  seconds / immediately offline — the change is already in the cache and the
  queued write syncs later, even across reloads. New docs get client-minted ids
  (`doc(coll)` + `setDoc`), never `addDoc`. Don't call `getDocs` / `await setDoc`
  directly in UI paths, or the app hangs offline.
- **Prefetch** — after the trip list loads, `TripContext` reads every trip's
  days / notes / photos and fetches each photo's 600px thumbnail, so trips never
  opened on this device are cached too.
- **App shell** — `public/sw.js` (production only). `index.html` network-first,
  hashed bundles cache-first; after each load it caches every file listed in
  `dist/asset-manifest.json` (`build.manifest` in `vite.config.js`) and prunes old
  ones. It ignores `/backup/`. Drive images (fetched with CORS; only
  real `image/*` responses are cached) and flagcdn flags are cache-first; an
  uncached size falls back to any cached size of the same photo.
- **Installable (PWA)** — `public/manifest.webmanifest` + `icon-192/512.png`,
  `apple-touch-icon.png` (plane on `#1d3b5c`), linked from `index.html` with
  root paths (`/manifest.webmanifest`; Vite adds the base). Install it: the
  service worker's scope is `/portugal-planner/`, so a browser tab opened at
  `…/portugal-planner` (no trailing slash) is outside it and shows Chrome's
  offline page — the installed app always starts at `./`.
- The "silent" Drive renewal (`googleToken.js`, GIS token client) opens a Google
  window — in the installed app a briefly visible Chrome tab, and offline a
  dino page — so it never runs offline. It still runs in the background
  online (the family prefers that to a consent dialog on every upload), and
  `ensureDriveAccess` tries it before falling back to the interactive dialog.
  It is only silent where Google has a session to reuse; on a device where it
  fails once (`pp_silent_renewal` = "failed" in `localStorage`), the on-open /
  background renewal stops for good, so that device is not greeted by a Google
  window at every start. Uploads and exports still try it on demand, and a
  success re-enables it.
- Not offline: uploads (blocked with a message), Google sign-in, address search.
  Firebase Auth restores the signed-in user from IndexedDB without a network.

## Gotchas

- The Firebase web API key is meant to be in the source (see afula-move). Real
  protection = `firestore.rules` + Firebase "Authorized domains".
- The Google **service-account** JSON is a real secret — `.gitignore`d, never used
  by the frontend.
- Sign-in (Firebase, Google popup — redirect where popups are blocked) is
  identity only: no Drive scope, no `prompt: "consent"`, so signing in again is one
  tap. Drive access is a separate Google Identity Services token
  (`requestDriveAccess` in `drive.js`, `AuthContext.ensureDriveAccess`), asked for
  from a tap on the first upload. Its tokens last ~1 h; `drive.js` renews them
  (quietly where Google has a session, else Google's window) and on a 401 retries
  once. Persistent storage is requested at start (`firebase.js`) so a phone short
  of space does not throw the sign-in away — that is what made one device ask to
  sign in at every start.
- Google shows the `drive.file` permission as an **optional checkbox** (granular
  permissions). Clicking through without ticking it = a token with no Drive scope
  → uploads 403 "insufficient authentication scopes". `requestDriveAccess`
  checks the granted scope and the upload path shows a Russian "tick the box"
  message.
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
- `openExternal` opens http(s) links (documents, note links) with
  `target="_blank"`. The old same-window navigation was for the Base44 Android
  shell; in a browser or the PWA it unloads the app and reloads it on return.
- Anything full-screen with `backdrop-filter`, and any opacity or scale
  animation on a modal as it opens, makes Chrome paint a black frame. The photo lightbox
  has no fade either. Both are
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
