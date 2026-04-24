# HKDV Sources

This app now assumes the HKDV community wiki is the source of truth for item naming, bag origin, and the community value heuristic.

## Reference pages

- FAQs: https://hellokittydreamvillage.wiki.gg/wiki/FAQs
- Gacha content types: https://hellokittydreamvillage.wiki.gg/wiki/Gacha_Content_Types
- Standard Style My Melody: https://hellokittydreamvillage.wiki.gg/wiki/Standard_Style_My_Melody
- BASIC STYLE Kuromi: https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_Kuromi
- Pop-Up Store Wall: https://hellokittydreamvillage.wiki.gg/wiki/Pop-Up_Store_Wall

## Value heuristic used in the frontend

The frontend follows the wiki FAQ summary:

- Rarity units: `S = 4`, `R = 2`, `N = 1`
- Projected value: `rarity units x source multiplier x time multiplier`
- Community value: `projected value x demand multiplier`

The UI still labels fairness as an estimate only.

## Image handling

The React UI supports `imageUrl` on items now.

The project now includes a checked-in exporter at `scripts/export-hkdv-item-images.ps1`.

Run it with:

```powershell
npm run export:wiki-images
```

It writes:

- `data/wiki/hkdv-item-images.json`
- `data/wiki/hkdv-item-images.csv`

The export is thumbnail-first for UI use. Each row includes:

- `image_url`: resized wiki thumbnail URL
- `original_image_url`: full-size file URL
- `thumbnail_width` / `thumbnail_height`
- `source_kind`: whether the match came from a standalone item page or a Happy Bag table
- `source_page_title` / `source_page_url`: where the image + metadata were found
- wiki metadata such as `type` and `rarity`

The exporter uses two strategies:

- direct item pages that embed `Template:Item_Template`
- rendered Happy Bag item tables from the `Category:Happy Bag` crawl

That lets us backfill `items.image_url` with lighter-weight thumbnails while keeping originals available for detail views and expanding coverage for items that only appear inside bag pages.

## Derived assets

Run:

```bash
npm run build:wiki-derived
```

This creates:

- `public/wiki/hkdv-item-catalog.json`: a lazy-loaded browser catalog used by the Admin searchable item master
- `supabase/generated/wiki-item-catalog.seed.sql`: a generated SQL upsert for the raw wiki staging table

The full crawl output stays at `data/wiki/`, while the UI-facing catalog is moved into `public/wiki/` so it can be fetched on demand instead of bundled into the initial app load.

## Supabase staging table

`supabase/schema.sql` now includes `public.wiki_item_catalog`, a raw staging table for the full wiki crawl. It stores:

- wiki page title + URL
- item type and wiki rarity
- thumbnail and original image URLs
- source-page provenance
- normalized search text
- inferred `item_tier` and `source_type`

That table is meant to support:

- admin-side item search
- catalog reconciliation against `public.items`
- future promotion scripts that map wiki-derived records into the production item master

## Promotion into `public.items`

`supabase/promote-wiki-items.sql` adds:

- helper functions for release-window, demand, and value inference
- `public.wiki_item_catalog_promotions`, a normalized preview view
- `public.sync_items_from_wiki_catalog(limit_rows integer default null)`

Run:

```sql
select * from public.sync_items_from_wiki_catalog();
```

The sync updates existing `items` rows by case-insensitive name match first, then inserts any remaining wiki-derived rows with generated `HKDV-WIKI-*` item codes.

## Admin data source behavior

The Admin searchable item master now prefers the safe `public.get_wiki_item_catalog(...)` RPC when:

- `VITE_SUPABASE_URL` is set
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` is set

If that path is unavailable, the React app falls back to the checked-in `public/wiki/hkdv-item-catalog.json` file.

## Trader workspace RPCs

`supabase/app-access.sql` also adds a Supabase app-access layer for the trader desk:

- `public.get_my_trader_workspace()`
- `public.create_my_offer_from_bundle(...)`
- `public.withdraw_my_offer(uuid)`
- `public.reject_my_offer(uuid)`
- `public.accept_my_offer(uuid)`
- `public.upsert_my_wishlist_entry(...)`
- `public.delete_my_wishlist_entry(uuid)`
- `public.upsert_my_listing(...)`
- `public.cancel_my_listing(uuid)`

The React app now prefers those RPCs for the inventory, listings, offers, and trade-history screens when the Supabase env vars are present.

The legacy username-parameter functions stay in `supabase/app-access.sql` as internal helpers, but they are no longer granted to browser clients.

Auth linkage:

- the React app now uses real Supabase Auth sessions
- `public.app_current_trader_id()` matches the authenticated email against `public.traders.email`
- after the first successful match, the trader is persisted to `public.traders.auth_user_id`

For the seeded demo workspace, the trader emails are:

- `sora@hkdvtrade.local`
- `mika@hkdvtrade.local`
- `hana@hkdvtrade.local`
