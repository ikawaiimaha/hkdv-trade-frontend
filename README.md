# HKDV Trader OS

A React/Vite MVP surface for an invite-only HKDV trading desk.

## Product docs

- `docs/hkdv-product-spec.md`
- `docs/hkdv-schema-api-plan.md`
- `docs/hkdv-react-ui-backlog.md`
- `docs/hkdv-data-sources.md`

## What changed

- Upgraded the static prototype into a React app with dashboard, inventory, duplicates, wishlist, listings, offers, trades, and admin views.
- Replaced placeholder value math with the HKDV wiki FAQ heuristic: rarity units, source multiplier, time multiplier, and demand.
- Swapped the mock catalog toward real HKDV item names and bag sources.
- Added `supabase/schema.sql` and `supabase/seed.sql` for the domain model you outlined.
- Added `docs/hkdv-data-sources.md` to document the wiki-driven sourcing assumptions.
- Preserved the original mockup under `legacy-prototype/` for review reference.

## Run locally

```bash
npm install
npm run dev
```

## PWA support

The app now ships with a Web App Manifest and service worker so it can be installed as a Progressive Web App.

- On desktop, use the browser install action from the address bar or app menu.
- On mobile, use Add to Home Screen / Install App in a supported browser.
- The app shell and static assets are cached for faster repeat visits.
- Live Supabase auth and RPC traffic are not cached by the service worker.

## Export wiki item images

```bash
npm run export:wiki-images
```

This generates thumbnail-first exports at:

- `data/wiki/hkdv-item-images.json`
- `data/wiki/hkdv-item-images.csv`

The exporter now combines two wiki passes:

- standalone item pages using `Template:Item_Template`
- Happy Bag pages parsed from rendered item tables for broader catalog coverage

Each row keeps the thumbnail URL, the original wiki file URL, and the source page that produced the match so the frontend can choose lighter card images while keeping provenance visible.

For the current mock React surface, the app consumes a small curated lookup in `src/data/mock-item-media.json` that was derived from the full export. That keeps the client bundle small while still using real wiki thumbnails for the mocked catalog.

## Build derived wiki assets

```bash
npm run build:wiki-derived
```

This reads `data/wiki/hkdv-item-images.json` and generates:

- `public/wiki/hkdv-item-catalog.json`
- `supabase/generated/wiki-item-catalog.seed.sql`

The public JSON is lazy-loaded only when the Admin view opens the searchable wiki item master. That keeps the initial React bundle lean while still exposing the full crawl in the UI.

## Refresh the whole wiki pipeline

```bash
npm run refresh:wiki-data
```

That runs the exporter first and then rebuilds the derived frontend + Supabase assets.

## Supabase import flow

Apply these in order:

1. `supabase/schema.sql`
2. `supabase/seed.sql`
3. `supabase/generated/wiki-item-catalog.seed.sql`
4. `supabase/promote-wiki-items.sql`
5. `supabase/app-access.sql`

The generated seed upserts the full wiki crawl into `public.wiki_item_catalog`, which is intended as a raw staging table for search, reconciliation, and future promotion into `public.items`.

After applying `supabase/promote-wiki-items.sql`, run:

```sql
select * from public.sync_items_from_wiki_catalog();
```

That updates any existing `items` rows by case-insensitive name match and inserts missing wiki-derived items for the rest of the crawl.

## Optional live catalog loading

If `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` are set, the Admin wiki item master will try to read the safe `public.get_wiki_item_catalog(...)` RPC from Supabase.

If those env vars are missing or the request fails, the app falls back to:

- `public/wiki/hkdv-item-catalog.json`

## Supabase-backed trader workspace

If these env vars are set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

the app enables Supabase Auth plus RPC-backed inventory, listings, offers, and trades instead of local mock state.

The checked-in RPC layer in `supabase/app-access.sql` includes:

- `public.get_my_trader_workspace()`
- `public.create_my_offer_from_bundle(...)`
- `public.withdraw_my_offer(uuid)`
- `public.reject_my_offer(uuid)`
- `public.accept_my_offer(uuid)`
- `public.upsert_my_wishlist_entry(...)`
- `public.delete_my_wishlist_entry(uuid)`
- `public.upsert_my_listing(...)`
- `public.cancel_my_listing(uuid)`
- `public.get_wiki_item_catalog(integer)`
- `public.search_wiki_item_catalog(...)`

Important:

- direct table access is locked behind RLS
- only the auth-backed trader RPCs are exposed to the client; the older username-parameter helpers are left internal
- the app now expects a real Supabase session for trader workspace RPCs
- trader profiles are linked by matching the authenticated email to `public.traders.email`, then persisted to `public.traders.auth_user_id`
- the seeded demo traders use emails like `sora@hkdvtrade.local`, `mika@hkdvtrade.local`, and `hana@hkdvtrade.local`

## Environment

Copy `.env.example` to `.env` when you are ready to wire the app to Supabase.

## Deploy on Vercel

The repo is set up to build as a Vite app on Vercel with `npm run build` and `dist/` as the output directory.

If you deploy from GitHub Actions, add these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The checked-in workflow creates preview deployments for pull requests into `main` and production deployments for pushes to `main`.

If you deploy from the CLI instead, run `vercel pull --yes --environment=production` once before `vercel build` so the local project settings match the linked Vercel project.

## Turn on live mode

The preview will stay in mock mode until the Supabase client env vars are present.

1. Add these env vars locally in `.env` and in Vercel preview / production:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - or `VITE_SUPABASE_ANON_KEY` if your project has not moved to publishable keys yet
2. Apply the SQL import flow from the `Supabase import flow` section.
3. Create Supabase Auth users whose emails match `public.traders.email`.
4. Sign in with one of those linked traders so `public.get_my_trader_workspace()` can return a live desk instead of the mock snapshot.

Once those pieces are in place, the app switches from the `Mock mode` badge to `Supabase live` automatically.
