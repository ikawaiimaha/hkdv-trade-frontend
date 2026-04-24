# HKDV Trader OS Schema And API Plan

This document turns the current product direction into concrete additive schema changes and route or RPC recommendations. It is written to fit the existing Supabase setup in this repo.

## Planning rules

- Prefer additive changes over destructive rewrites.
- Keep raw wiki data and production item data separate.
- Expose only auth-backed trader RPCs to the browser.
- Keep fairness as an estimate and store component signals separately when needed.

## Current baseline

The repo already includes:

- traders, items, inventory, wishlist, listings, offers, trades, reputation
- Supabase Auth linkage through `traders.email` and `traders.auth_user_id`
- safe wiki catalog RPCs
- auth-backed trader workspace RPCs

## Recommended schema changes

### 1. Replace `wishlist_priority` listing mode with an explicit wanted mode

Current `listing_type`:

- `open_offers`
- `wishlist_priority`

Recommended `listing_type`:

- `have_item`
- `wanted_item`

Reason:

- `wishlist_priority` describes ranking, not trade intent
- `wanted_item` cleanly supports the second core loop

Suggested migration shape:

```sql
alter type public.listing_type rename to listing_type_old;

create type public.listing_type as enum ('have_item', 'wanted_item');

alter table public.listings
  alter column listing_type drop default;

alter table public.listings
  alter column listing_type type public.listing_type
  using (
    case listing_type::text
      when 'open_offers' then 'have_item'::public.listing_type
      else 'wanted_item'::public.listing_type
    end
  );

alter table public.listings
  alter column listing_type set default 'have_item';

drop type public.listing_type_old;
```

### 2. Add listing rules and targeting fields

Recommended columns on `public.listings`:

```sql
alter table public.listings
  add column if not exists target_item_id uuid references public.items(id) on delete restrict,
  add column if not exists desired_quantity integer check (desired_quantity > 0),
  add column if not exists trade_rules_json jsonb not null default '{}'::jsonb,
  add column if not exists wishlist_match_required boolean not null default false;
```

Use:

- `item_id` for the owned item on `have_item`
- `target_item_id` for the desired item on `wanted_item`
- `desired_quantity` for wanted posts
- `trade_rules_json` for rules like `wall_for_wall`, `same_collection_only`, `wishlist_only`

Index guidance:

```sql
create index if not exists idx_listings_type_status on public.listings (listing_type, status);
create index if not exists idx_listings_target_item on public.listings (target_item_id) where target_item_id is not null;
create index if not exists idx_listings_rules_gin on public.listings using gin (trade_rules_json);
```

### 3. Support variable-value items explicitly

Recommended columns on `public.items`:

```sql
alter table public.items
  add column if not exists community_value_low numeric(10,2),
  add column if not exists community_value_high numeric(10,2),
  add column if not exists value_confidence smallint,
  add column if not exists trade_tags_json jsonb not null default '[]'::jsonb;
```

Use:

- `community_value_low` and `community_value_high` for flexible items
- `value_confidence` for rough confidence in the current heuristic
- `trade_tags_json` for searchable tags like `wall`, `buyer_shop`, `flower`, `variable_value`

### 4. Persist offer evaluation components separately

Recommended columns on `public.offers`:

```sql
alter table public.offers
  add column if not exists seller_value_total numeric(10,2),
  add column if not exists buyer_value_total numeric(10,2),
  add column if not exists wishlist_match_score integer,
  add column if not exists trust_context_score integer,
  add column if not exists evaluation_notes text;
```

Reason:

- the UI currently shows one fairness result
- storing component signals gives you better explainability and future analytics

### 5. Add a real trade completion workflow

Current `trade_status`:

- `completed`
- `disputed`
- `reversed`

Recommended `trade_status`:

- `pending_completion`
- `completed`
- `disputed`
- `reversed`
- `cancelled`

Recommended columns on `public.trades`:

```sql
alter table public.trades
  add column if not exists seller_confirmed_at timestamptz,
  add column if not exists buyer_confirmed_at timestamptz,
  add column if not exists dispute_reason text,
  add column if not exists completion_note text,
  add column if not exists resolved_at timestamptz;
```

Reason:

- accepted offers should not jump straight to completed
- disputes need basic structured evidence

### 6. Add a small notification table

Recommended new table:

```sql
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_trader_created
  on public.notifications (trader_id, created_at desc);
```

Initial kinds:

- `offer_received`
- `offer_withdrawn`
- `offer_accepted`
- `offer_rejected`
- `trade_pending_completion`
- `trade_confirmed`
- `trade_disputed`
- `wishlist_match`

### 7. Admin invite support

Recommended columns on `public.traders`:

```sql
alter table public.traders
  add column if not exists invited_by uuid references public.traders(id) on delete set null,
  add column if not exists invite_token text,
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_invite_at timestamptz;

create unique index if not exists idx_traders_invite_token_unique
  on public.traders (invite_token)
  where invite_token is not null;
```

Reason:

- makes invite flow explicit
- reduces manual user creation steps

## Recommended API shape

If you stay on Supabase RPCs, the function names below should be the source of truth. If you later add an HTTP layer, mirror the same intent in routes.

## Trader workspace

### Existing

- `public.get_my_trader_workspace()`

### Recommended additions

- `public.get_my_notifications(p_limit integer default 50)`
- `public.mark_my_notification_read(p_notification_id uuid)`

HTTP mirror:

- `GET /me/workspace`
- `GET /me/notifications`
- `POST /me/notifications/:id/read`

## Wishlist

### Existing

- `public.upsert_my_wishlist_entry(...)`
- `public.delete_my_wishlist_entry(uuid)`

HTTP mirror:

- `GET /wishlist`
- `POST /wishlist`
- `PATCH /wishlist/:id`
- `DELETE /wishlist/:id`

## Listings

### Existing

- `public.upsert_my_listing(...)`
- `public.cancel_my_listing(uuid)`

### Recommended additions

- `public.pause_my_listing(p_listing_id uuid)`
- `public.resume_my_listing(p_listing_id uuid)`

HTTP mirror:

- `GET /listings`
- `POST /listings`
- `PATCH /listings/:id`
- `POST /listings/:id/pause`
- `POST /listings/:id/resume`
- `POST /listings/:id/cancel`

## Offers

### Existing

- `public.create_my_offer_from_bundle(...)`
- `public.withdraw_my_offer(uuid)`
- `public.reject_my_offer(uuid)`
- `public.accept_my_offer(uuid)`

Behavior upgrade:

- `accept_my_offer` should create a `pending_completion` trade instead of a completed trade

HTTP mirror:

- `POST /offers`
- `GET /offers/incoming`
- `GET /offers/outgoing`
- `POST /offers/:id/withdraw`
- `POST /offers/:id/reject`
- `POST /offers/:id/accept`

## Trades

### Recommended additions

- `public.confirm_my_trade_completion(p_trade_id uuid)`
- `public.dispute_my_trade(p_trade_id uuid, p_reason text)`

HTTP mirror:

- `GET /trades`
- `GET /trades/:id`
- `POST /trades/:id/confirm`
- `POST /trades/:id/dispute`

## Wiki catalog and admin

### Existing

- `public.get_wiki_item_catalog(integer)`
- `public.search_wiki_item_catalog(...)`
- `public.sync_items_from_wiki_catalog(limit_rows integer default null)`

### Recommended additions

- `public.create_trader_invite(...)`
- `public.accept_trader_invite(...)`
- `public.seed_trader_inventory(...)`
- `public.promote_wiki_items(...)`

HTTP mirror:

- `POST /admin/traders/invite`
- `POST /admin/traders/:id/resend-invite`
- `POST /admin/traders/accept-invite`
- `POST /admin/inventory/seed`
- `POST /admin/items/promote-from-wiki`

## Implementation order

### Phase 1

- rename listing mode concept to `have_item` and `wanted_item`
- add listing rules and target fields
- add trade pending completion fields and status

### Phase 2

- update offer acceptance flow to create `pending_completion`
- add trade confirm and dispute RPCs
- add notifications table and read RPCs

### Phase 3

- add item value ranges and trade tags
- persist offer evaluation component scores
- add invite lifecycle fields and RPCs

