# Olive Exclusive Fabrics — Setup (Supabase backend)

This turns the store on. Takes about 10 minutes. You do **not** need to touch
any other code — only `js/config.js` and the Supabase dashboard.

---

## 1. Create a Supabase project
1. Go to https://supabase.com → sign in → **New project**.
2. Give it a name and a database password. Pick the region closest to Nigeria.
3. Wait ~2 minutes for it to provision.

## 2. Run the database schema
1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of **`sql/schema.sql`** and click **Run**.
   (Creates all tables, security policies, the image storage bucket and triggers.)
3. New query again → paste **`sql/seed.sql`** → **Run**.
   (Loads your 4 categories + 15 starter fabrics into the real database.)

## 3. Add your keys to the site
1. In Supabase: **Project Settings → API**.
2. Copy **Project URL** and the **anon public** key.
3. Open **`js/config.js`** and paste them in:
   ```js
   SUPABASE_URL:      "https://xxxxxxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...your anon key...",
   WA_NUMBER:         "2348012345678",   // your WhatsApp, digits only
   ```
   The anon key is meant to live in the browser — Row Level Security (already
   set up in step 2) is what actually protects your data.

## 4. Turn on email auth
1. **Authentication → Providers → Email** — make sure it's enabled.
2. For quick testing you can turn **"Confirm email" OFF** (Authentication →
   Providers → Email). For production, leave it ON so new customers verify
   their address.
3. **Authentication → URL Configuration →** set the **Site URL** to wherever
   you host the site (e.g. `https://oliveexclusive.ng`). This makes the
   password-reset and confirm links point to the right place.

## 5. Create your admin account  ← important
1. Open the live site and go to **`/account/sign-up.html`**. Create your own
   account (name, email, password).
2. Back in Supabase: **SQL Editor → New query**, run this with YOUR email:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@youremail.com';
   ```
3. Now sign in and open **`/admin/index.html`** — you're in. Anyone who isn't
   an admin gets an "Access denied" screen, enforced by the database (RLS),
   not just the frontend.

## 6. Deploy
It's a plain static site — host the whole folder anywhere:
- **Netlify / Vercel / Cloudflare Pages:** drag-and-drop the folder, or connect a repo.
- **Any web host / cPanel:** upload the folder as-is.
No build step. `index.html` is the storefront home.

---

## What the admin can do (no code needed)
- **Products:** add / edit / delete, change name, description, price, sale price,
  category, mark In stock / Out of stock (a switch), flag New / Best seller.
- **Images:** upload multiple per product (stored in Supabase Storage), set the
  cover, reorder, replace, and delete (deleting also removes the file from storage).
- **Announcement TV:** create promo messages, toggle **ON/OFF** — ON shows the
  bar on the storefront, OFF hides it completely.
- **Subscribers:** see everyone who joined the newsletter, search, delete, and
  the total count.

Every change is live on the storefront on the next page load — no redeploy.

---

## Local testing (optional)
Any static server works, e.g.:
```
python3 -m http.server 8000
```
then open http://localhost:8000 . Auth email links resolve against the Site URL
you set in step 4, so full auth is best tested on the deployed URL.

## Notes
- Until you complete steps 1–3, the storefront shows a small "not connected"
  notice and the admin/auth pages say the site isn't connected yet. That's expected.
- Product photos: until you upload real images in the admin, each fabric shows a
  tasteful generated swatch so the store still looks complete.
- Payment: checkout is prepared for Paystack / Flutterwave / bank transfer but
  stays inactive until you add live payment keys (separate from this setup).
