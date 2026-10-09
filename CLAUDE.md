# Nriju — Nigerian prepared & cooked food store

## What this is
A full e-commerce platform for **Nriju**, a Nigerian food business. Shark Colours is the agency building it — we do not stock or sell products; Nriju does.

## Stack
- **Backend:** Node.js + Express + Mongoose (MongoDB), JWT in HttpOnly cookie, Google OAuth, Paystack, Brevo, Cloudinary
- **Frontend:** React 19 + Vite + Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui + React Router + Redux Toolkit + React Query + Sonner toasts
- **Single-platform deployable:** Express serves the built React SPA from `client/dist`. Works on Render, Railway, or a VPS.

## Run commands (from repo root)
- `npm run dev` — concurrently runs backend (nodemon) + client (Vite)
- `npm run server` — backend only
- `npm run client` — client only
- `npm run seed` — populate DB with categories, products, users, coupons
- `npm run build` — install deps + build client for production

## Key decisions (non-obvious — trust these over assumptions)

**Product model.** Nriju sells **prepared/cooked food**, not packaged groceries. Three types:
- `cooked` (fresh) — sold by portion/bowl/500ml/piece. Expiry hours-days. Own fleet or pickup, **same-day**.
- `frozen` — sold by litre/portion. Expiry days-weeks. Pickup/own/3rd party, 3-4 working days.
- `packaged` — soup mix, seasonings, oils, snacks, drinks. Shelf-stable. All delivery options, 3-4 days.

Cooked and packaged are **separate SKUs** (e.g. cooked Obe Ata by the bowl vs packaged Obe Ata soup mix).

**Delivery is computed per-cart**, not a flat list. Most restrictive item wins — fresh stew forces own-fleet same-day; packaged-only opens all three options.

**Order status lifecycle:** `pending` → `confirmed` → `preparing` → `ready_for_pickup` / `on_the_way` → `delivered` / `picked_up` → `cancelled` / `refunded`

**Proteins are a separate category**, not a field on soups. Dried (500g), frozen (per kg), cooked (piece).

**Slugs** auto-generate from name on create; admins can override on edit. Server-side only.

**Token schemas** (`EmailVerificationToken`, `PasswordResetToken`) are separate collections — never raw token strings on the User document. TTL indexes auto-purge them. Verification: 12h. Reset: 30min.

**Inventory** is a separate schema with batches + expiry dates. `Product.stock` is a computed sum of active, unexpired batches. Non-negotiable for cooked food.

**Admin roles:** `customer`, `admin`, `superAdmin`. Super admin cannot be edited or deleted by other admins.

## Reference repos (mirror these patterns)
- `WEB/PROJECTS/MERN-AUTH-OTP-APP` — backend structure, JWT cookie auth, seed scripts, error middleware
- `WEB/PROJECTS/EZEEVEEK` — frontend Vite + Tailwind v4 + Redux Toolkit + React Router structure

## Methodology
Build proceeds in 4 phases: Foundation → Storefront → Transaction → Polish. Each ends with a shippable increment. Vitest (unit/integration) + Playwright (E2E).

## ⚠️ Pricing caveat
The 62 mock products in `Backend/seed/products.js` use prices based on market knowledge, **not** verified live data. Nigerian food prices are volatile — validate against real supplier/competitor prices before launch. The structure (units, types, regional mix, portion logic) is solid; the numbers need confirmation.

## Regional mix in seed data
Western 26, Eastern 8, South-South 10, Northern 9, Cross-regional 2. Not Yoruba-only.