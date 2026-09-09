# Португалия 2026 — Portugal Planner

**Live:** <https://colorbull.github.io/portugal-planner/> · Firebase project `portugal-planner-53a05`

A small private web app for one family trip to Portugal (30 Oct – 6 Nov 2026):
eight day-cards, each opening a detailed itinerary where every stop can carry a
**note + link** and a grid of **photos / documents**.

Rebuilt from a Base44 export to run on a self-owned backend:

| Concern | Before (Base44) | Now |
|---|---|---|
| Auth | Base44 accounts | Firebase Auth — Google sign-in, 2-person allow-list |
| Database | Base44 entities | Cloud Firestore (`trips/portugal-2026/{notes,photos}`) |
| File uploads | Base44 Core storage | Google Drive (`drive.file` scope → shared folder) |
| Hosting | Base44 | GitHub Pages (Actions build) |

The React UI is unchanged from the export — only the data layer was swapped.

## First-time setup

See **[SETUP.md](SETUP.md)**. Short version: create a free Firebase project,
enable Google auth + Firestore, enable the Drive API with the `drive.file` scope,
make one shared Drive folder, fill in `src/config.js` and `firestore.rules`, push
to GitHub, turn on Pages.

## Develop locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

## How it works

- `src/config.js` holds the Firebase web config, the allowed e-mails, the Drive
  folder id and the trip id. These are **public by design** — the data is
  protected by `firestore.rules` and Firebase's authorized-domain list.
- On sign-in the app also receives a Google OAuth token with `drive.file`
  access. Uploads go straight to the shared Drive folder; only a file id is
  stored in Firestore.
- `src/api/entities.js` reproduces the old `TripNote` / `TripPhoto` API on top of
  Firestore, so the components barely changed.

The original Base44 source is kept as the first commit in git history.
