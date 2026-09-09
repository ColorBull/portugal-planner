# Setup — Portugal Planner

One-time steps to bring the app online. ~30 minutes. Everything here is free.

You will fill in real values in **two** places and they must match:
`src/config.js` and `firestore.rules`.

---

## 1. Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
   Name it e.g. `portugal-planner`. Google Analytics: not needed.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
   Set a support e-mail, Save.
3. **Build → Firestore Database → Create database.**
   Start in **production mode**. Location: pick `eur3` (Europe) or the closest.
4. **Project settings (gear icon) → General → Your apps → Web app (`</>`)**.
   Register the app (nickname `web`, no Hosting). Copy the `firebaseConfig`
   object it shows you.

Paste those six values into **`src/config.js`** → `firebaseConfig`.

---

## 2. Allow-list the two Google accounts

Decide which Google accounts (father, mother) may open the planner.

- In **`src/config.js`** → `ALLOWED_EMAILS`: put both addresses, lower-case.
- In **`firestore.rules`** → the `email in [ ... ]` list: the same two addresses.

Then publish the rules — either:

- Firebase Console → Firestore → **Rules** tab → paste the file contents → Publish, **or**
- `npx firebase-tools deploy --only firestore:rules` (after `npx firebase-tools login`).

---

## 3. Google Drive API + upload scope

The app uploads photos to Drive using the account that signs in.

1. Open <https://console.cloud.google.com>, top bar → select the **same project**
   (it shares the id with Firebase).
2. **APIs & Services → Library →** search **Google Drive API** → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**. Fill app name + your e-mail.
   - **Scopes → Add or remove scopes →** add
     `.../auth/drive.file` (listed as "See, edit, create, and delete only the
     specific Google Drive files you use with this app"). Save.
   - **Test users →** add both parents' e-mails.
   - You can leave the app in **Testing** — that is enough for two known users
     and needs no Google review. (Optionally **Publish app**; `drive.file` is a
     non-sensitive scope, so no verification is required.)

---

## 4. Shared Drive folder

1. In the father's Google Drive create a folder, e.g. **`Portugal Planner`**.
2. Share it with the mother's account as **Editor** (so both can add photos).
3. Open the folder; the URL is
   `https://drive.google.com/drive/folders/XXXXXXXXXXXX` — copy the `XXXX` part.
4. Put it in **`src/config.js`** → `DRIVE_FOLDER_ID`.

(The app also sets each uploaded file to "anyone with the link can view" so the
other parent's browser can render the thumbnail.)

---

## 5. GitHub Pages

1. Create a GitHub repo, e.g. `portugal-planner` (public or private both work
   with Pages on a free account for public; private Pages needs Pro — use public,
   the repo only contains public-by-design config).
2. Push this folder to it (`main` branch).
3. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on
   every push to `main`. First run appears under the **Actions** tab.
5. Your URL will be `https://<user>.github.io/<repo>/`.

### Back in Firebase — authorize that domain

Firebase Console → **Authentication → Settings → Authorized domains → Add domain**
→ `<user>.github.io`. Without this, sign-in fails with `unauthorized-domain`.

---

## 6. Local development (optional)

Needs **Node.js 20+** (not currently installed on this machine —
<https://nodejs.org>).

```bash
npm install
npm run dev        # http://localhost:5173
```

`localhost` is already an authorized domain in Firebase by default.

---

## Checklist

- [ ] `src/config.js` — all six `firebaseConfig` values filled
- [ ] `src/config.js` + `firestore.rules` — same two e-mails
- [ ] Firestore rules published
- [ ] Google Drive API enabled, `drive.file` scope added, test users added
- [ ] `DRIVE_FOLDER_ID` filled, folder shared with both parents
- [ ] Repo pushed, Pages source = GitHub Actions, first deploy green
- [ ] `<user>.github.io` added to Firebase Authorized domains
