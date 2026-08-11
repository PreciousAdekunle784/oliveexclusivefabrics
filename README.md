# Olive Exclusive Fabrics — e-commerce store (Supabase-backed)

Conversion-focused fabric storefront + a real admin dashboard, built on the
existing design. Products, prices, stock, images, subscribers and announcements
are all managed from the admin and stored in Supabase — nothing is hardcoded.

## Get it running
See **SETUP.md** — create a Supabase project, run `sql/schema.sql` + `sql/seed.sql`,
paste your keys into `js/config.js`, promote your account to admin. ~10 minutes.

## Structure
```
index.html                     Home (trimmed, conversion-focused)
shop.html / new-arrivals.html /
collections.html / best-sellers.html
product … (quick-view modal on every grid)
about / contact / delivery / faq / wishlist / checkout .html
account/  sign-in, sign-up, forgot-password, reset-password, account
admin/    index (overview), products, subscribers, announcements
css/      styles.css (storefront)   admin.css (dashboard)
js/       config.js  ← your keys go here
          app.js     storefront + Supabase data layer
          auth.js    Supabase Auth flows + guards
          admin.js   dashboard: products/images/stock/price/subs/announcements
sql/      schema.sql (tables + RLS + storage + triggers)
          seed.sql   (categories + 15 starter fabrics)
```

## How it's wired
- **Auth:** Supabase Auth (email + password), sign up / in / out, forgot &
  reset password, customer account area. Errors handled (bad password, invalid
  email, existing account, loading states).
- **Data:** every product, price, image, subscriber and announcement lives in
  Supabase. The storefront reads it live; the admin writes it.
- **Security:** role-based. `profiles.role` = `customer` | `admin`. Row Level
  Security policies (see `sql/schema.sql`) enforce access at the database — a
  non-admin literally cannot read subscribers or write products, regardless of
  the frontend. Image storage is admin-write / public-read.
- **Announcement TV:** the top storefront bar is driven by the `announcements`
  table. Admin toggles ON/OFF; OFF hides the bar entirely.
- **Cart/wishlist:** kept in the browser (localStorage) and survive navigation.

## Still placeholder (replace anytime from the admin — no code)
Product photos (generated swatches until you upload real images), the seeded
descriptions, and the About/Delivery/FAQ copy. Payment stays inactive until
Paystack / Flutterwave keys are added.
