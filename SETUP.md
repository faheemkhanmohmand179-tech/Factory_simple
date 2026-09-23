# NEW ALMAKKA FACTORY — نیو المکہ فیکٹری

Marble factory manager (Urdu + English) built with **Vite + React 18 + TypeScript + Tailwind + Supabase**.

Bills (بل) · Customers & ledgers (گاہک کھاتہ) · Labour + attendance + wages (لیبر، حاضری، اجرتیں) ·
Machinery & maintenance (مشینیں) · Marble types & sizes · Stock (اسٹاک) · Expenses (خرچے) ·
Reports (رپورٹس) · PDF / Excel / Word / CSV / WhatsApp exports · Excel import with preview · PWA installable.

---

## 1) Requirements

- **Node.js 18 or newer** (Node 20+ recommended) — check with `node -v`
- A free [Supabase](https://supabase.com) project (the live database + login)

## 2) Quick start

```bash
# inside this folder
npm install

# create your .env (see step 3 below)
cp .env.example .env

npm run dev        # → http://localhost:5173
```

Other commands:

```bash
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build locally
```

## 3) How to connect Supabase (5 minutes)

1. **Create project** — go to <https://supabase.com> → **New project** → choose a name (e.g. *almakka-factory*) and a strong database password. Wait ~2 minutes for it to be ready.
2. **Run the schema** — in the Supabase dashboard open **SQL Editor** → **New query** → paste the ENTIRE contents of `supabase/schema.sql` → press **Run**.
   This creates every table, relationship, index, Row Level Security policy (signed-in users only), realtime updates, and the seed data (marble types, sizes, app settings).
3. **Create the owner login** — dashboard → **Authentication** → **Users** → **Add user** → enter email + password → ✅ tick **Auto Confirm User** → **Add user**.
   (There is NO public signup page in the app — accounts are made here only. Add one more user the same way if a helper needs access.)
4. **Copy your keys** — dashboard → **Project Settings** (⚙) → **API**:
   - **Project URL** → copy
   - **anon public** key → copy
5. **Paste into `.env`** (in the project root, next to `package.json`):

   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...........
   ```

6. Restart the dev server (`npm run dev`) and sign in with the email + password from step 3. **Done!**

> The app shows a friendly yellow warning on the login screen if Supabase is not connected yet.

## 4) Daily use notes

- **Internet is required to save/load data** (Supabase is the database). The navbar shows
  **آن لائن / آف لائن** — if it is red, wait for internet before saving.
- The **app shell works offline** (installed PWA opens instantly) but data actions need internet.
- Language toggle **اردو / English** is in the navbar (and on the login screen); the choice is saved.
- Every screen's **درآمد (Import)** button first downloads a **نمونہ فائل (template)** with a
  filled example row and an instructions sheet in Urdu + English.
- **Backup**: Settings → بیک اپ ڈاؤن لوڈ کریں downloads all data as one JSON file.

## 5) Deploy (free)

### Vercel
1. Push this folder to a GitHub repo.
2. <https://vercel.com> → **Add New → Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output `dist`.
4. **Environment Variables** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Production + Preview).
5. Deploy → you get `https://your-app.vercel.app`.

### Netlify
1. <https://netlify.com> → **Add new site → Import an existing project** (GitHub).
2. Build command: `npm run build` · Publish directory: `dist`.
3. **Site settings → Environment variables** → add the same two `VITE_` variables.
4. Deploy.

> Because the app uses HashRouter, deep links work on any static host without extra rewrite rules.

## 6) Install as a phone app (PWA)

**Android (Chrome):**
1. Open the site URL.
2. Menu (⋮) → **Add to Home screen / Install app** → Install.
(The app also shows its own **انسٹال کریں** banner and a button in Settings.)

**iPhone/iPad (Safari):**
1. Open the site URL in **Safari**.
2. Share button (⬆) → **Add to Home Screen** → Add.

The app opens full-screen like a real app, in portrait, with the المکہ فیکٹری icon.
When a new version is released, a **نیا ورژن دستیاب ہے** toast appears with a Reload button.

## 7) Troubleshooting

| Problem | Fix |
| --- | --- |
| Yellow "Supabase is not connected" on login | `.env` missing/empty → paste URL + anon key, restart dev server |
| "Wrong email or password" | Create the user in Supabase → Authentication → Users (tick **Auto Confirm**) |
| Data not loading after schema run | Run the whole `supabase/schema.sql` in one go; check you ran it in the right project |
| Tables don't update live on second device | Ensure the schema ran with the `alter publication supabase_realtime …` lines (they are included) |
| Urdu looks boxy in PDF | Let the page finish loading fonts first (Google Fonts) — the PDF engine rasterizes the real page |
| Blank page after deploy | You forgot to add the two `VITE_` env variables on the host — redeploy after adding |

## 8) Tech notes

- **Urdu in PDF**: jsPDF cannot shape Arabic script, so every PDF/Print is rendered as hidden
  HTML (browser shapes Nastaliq correctly) → `html2canvas` at scale 3 → embedded into jsPDF
  (A4 for reports, A5 for bills). Digits stay Latin (`1234`) in both languages.
- **Excel/CSV Urdu**: CSV is written with a UTF-8 BOM so Urdu opens correctly in Excel.
- **Numbers**: only Latin digits everywhere, with thousand separators (`1,234,567`).
- **Security**: Row Level Security is enabled on every table — only signed-in users can read/write.
