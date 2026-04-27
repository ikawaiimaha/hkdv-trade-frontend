create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

do $$ begin
  create type public.trader_status as enum ('active', 'suspended', 'invited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_tier as enum ('SSR', 'SR', 'R', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_wiki_rarity as enum ('S', 'R', 'N');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_source_type as enum (
    'regular_happy_bag',
    'event',
    'attendance',
    'standard',
    'basic_style',
    'sweet_collection',
    'lucky_bag',
    'hour_48',
    'day_3',
    'hour_24',
    'hour_24_sweet_collection'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_release_window as enum (
    'launch_2021',
    'late_2021',
    'early_2022',
    'late_2022',
    'early_2023',
    'late_2023',
    'early_2024',
    'late_2024',
    'year_2025_plus'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.demand_level as enum ('high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_type as enum ('have_item', 'wanted_item');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_status as enum ('active', 'paused', 'completed', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fairness_label as enum ('underpay', 'fair', 'overpay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trade_status as enum ('pending_completion', 'completed', 'disputed', 'reversed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wishlist_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'wishlist_match',
    'trade_completed',
    'offer_received',
    'offer_accepted',
    'trade_ready'
  );
exception when duplicate_object then null; end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_valid_month_day(p_birth_month integer, p_birth_day integer)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_birth_month is null or p_birth_day is null then
    return false;
  end if;

  if p_birth_month < 1 or p_birth_month > 12 then
    return false;
  end if;

  if p_birth_day < 1 then
    return false;
  end if;

  case
    when p_birth_month in (1, 3, 5, 7, 8, 10, 12) then
      return p_birth_day <= 31;
    when p_birth_month in (4, 6, 9, 11) then
      return p_birth_day <= 30;
    when p_birth_month = 2 then
      return p_birth_day <= 29;
    else
      return false;
  end case;
end;
$$;

create or replace function public.get_zodiac_key(p_birth_month integer, p_birth_day integer)
returns text
language plpgsql
immutable
as $$
begin
  if not public.is_valid_month_day(p_birth_month, p_birth_day) then
    raise exception 'Invalid month/day';
  end if;

  if (p_birth_month = 12 and p_birth_day >= 22) or (p_birth_month = 1 and p_birth_day <= 19) then
    return 'zodiac_capricorn';
  elsif (p_birth_month = 1 and p_birth_day >= 20) or (p_birth_month = 2 and p_birth_day <= 18) then
    return 'zodiac_aquarius';
  elsif (p_birth_month = 2 and p_birth_day >= 19) or (p_birth_month = 3 and p_birth_day <= 20) then
    return 'zodiac_pisces';
  elsif (p_birth_month = 3 and p_birth_day >= 21) or (p_birth_month = 4 and p_birth_day <= 19) then
    return 'zodiac_aries';
  elsif (p_birth_month = 4 and p_birth_day >= 20) or (p_birth_month = 5 and p_birth_day <= 20) then
    return 'zodiac_taurus';
  elsif (p_birth_month = 5 and p_birth_day >= 21) or (p_birth_month = 6 and p_birth_day <= 20) then
    return 'zodiac_gemini';
  elsif (p_birth_month = 6 and p_birth_day >= 21) or (p_birth_month = 7 and p_birth_day <= 22) then
    return 'zodiac_cancer';
  elsif (p_birth_month = 7 and p_birth_day >= 23) or (p_birth_month = 8 and p_birth_day <= 22) then
    return 'zodiac_leo';
  elsif (p_birth_month = 8 and p_birth_day >= 23) or (p_birth_month = 9 and p_birth_day <= 22) then
    return 'zodiac_virgo';
  elsif (p_birth_month = 9 and p_birth_day >= 23) or (p_birth_month = 10 and p_birth_day <= 22) then
    return 'zodiac_libra';
  elsif (p_birth_month = 10 and p_birth_day >= 23) or (p_birth_month = 11 and p_birth_day <= 21) then
    return 'zodiac_scorpio';
  end if;

  return 'zodiac_sagittarius';
end;
$$;

create table if not exists public.traders (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text,
  auth_user_id uuid,
  is_admin boolean not null default false,
  display_name text not null,
  passcode_hash text not null,
  status public.trader_status not null default 'invited',
  avatar_url text,
  buddy_key text check (
    buddy_key is null
    or buddy_key in (
      'my_melody',
      'hello_kitty',
      'pompompurin',
      'kuromi',
      'kerokerokeroppi',
      'tuxedosam',
      'pochacco',
      'badtz_maru',
      'kiki_lala',
      'gudetama',
      'cinnamoroll',
      'wish_me_mell',
      'cogimyun',
      'hangyodon',
      'ahirunopekkle'
    )
  ),
  buddy_name text check (
    buddy_name is null
    or buddy_name in (
      'Hello Kitty',
      'My Melody',
      'Little Twin Stars (Kiki & Lala)',
      'Tuxedosam',
      'Cinnamoroll',
      'Pompompurin',
      'Pochacco',
      'Kuromi',
      'Gudetama',
      'Badtz-Maru',
      'Wish me mell',
      'Cogimyun',
      'Kerokerokeroppi',
      'Hangyodon',
      'Ahiru No Pekkle'
    )
  ),
  strawberry_title text not null default 'Strawberry Syrup' check (
    strawberry_title in (
      'Strawberry Syrup',
      'Strawberry Cookie',
      'Strawberry Macaron',
      'Strawberry Milk',
      'Strawberry Parfait',
      'Strawberry Cake'
    )
  ),
  profile_code text,
  is_profile_code_visible boolean not null default false,
  birth_month integer,
  birth_day integer,
  birthday_locked boolean not null default false,
  birthday_set_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.traders add column if not exists email text;
alter table public.traders add column if not exists auth_user_id uuid;
alter table public.traders add column if not exists is_admin boolean not null default false;
alter table public.traders add column if not exists buddy_key text;
alter table public.traders add column if not exists buddy_name text;
alter table public.traders add column if not exists strawberry_title text not null default 'Strawberry Syrup';
alter table public.traders add column if not exists profile_code text;
alter table public.traders add column if not exists is_profile_code_visible boolean not null default false;
alter table public.traders add column if not exists birth_month integer;
alter table public.traders add column if not exists birth_day integer;
alter table public.traders add column if not exists birthday_locked boolean not null default false;
alter table public.traders add column if not exists birthday_set_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_buddy_key_valid'
  ) then
    alter table public.traders
      add constraint traders_buddy_key_valid
      check (
        buddy_key is null
        or buddy_key in (
          'my_melody',
          'hello_kitty',
          'pompompurin',
          'kuromi',
          'kerokerokeroppi',
          'tuxedosam',
          'pochacco',
          'badtz_maru',
          'kiki_lala',
          'gudetama',
          'cinnamoroll',
          'wish_me_mell',
          'cogimyun',
          'hangyodon',
          'ahirunopekkle'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_buddy_name_valid'
  ) then
    alter table public.traders
      add constraint traders_buddy_name_valid
      check (
        buddy_name is null
        or buddy_name in (
          'Hello Kitty',
          'My Melody',
          'Little Twin Stars (Kiki & Lala)',
          'Tuxedosam',
          'Cinnamoroll',
          'Pompompurin',
          'Pochacco',
          'Kuromi',
          'Gudetama',
          'Badtz-Maru',
          'Wish me mell',
          'Cogimyun',
          'Kerokerokeroppi',
          'Hangyodon',
          'Ahiru No Pekkle'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_strawberry_title_valid'
  ) then
    alter table public.traders
      add constraint traders_strawberry_title_valid
      check (
        strawberry_title in (
          'Strawberry Syrup',
          'Strawberry Cookie',
          'Strawberry Macaron',
          'Strawberry Milk',
          'Strawberry Parfait',
          'Strawberry Cake'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_birth_month_valid'
  ) then
    alter table public.traders
      add constraint traders_birth_month_valid
      check (birth_month is null or birth_month between 1 and 12);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_birth_day_valid'
  ) then
    alter table public.traders
      add constraint traders_birth_day_valid
      check (birth_day is null or birth_day between 1 and 31);
  end if;
end $$;

create index if not exists traders_birthday_lookup_idx
  on public.traders (birth_month, birth_day)
  where birth_month is not null
    and birth_day is not null
    and birthday_locked = true;

create table if not exists public.trader_birthday_gifts (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  gift_year integer not null,
  gifted_at timestamptz not null default timezone('utc', now()),
  constraint trader_birthday_gifts_unique unique (trader_id, gift_year)
);

create or replace function public.grant_due_birthday_gifts(
  p_target_date date default (timezone('utc', now()))::date
)
returns table (
  trader_id uuid,
  gift_year integer,
  gifted_at timestamptz,
  zodiac_key text
)
language sql
security definer
set search_path = public
as $$
  with due_traders as (
    select
      t.id as trader_id,
      extract(year from p_target_date)::integer as gift_year,
      public.get_zodiac_key(t.birth_month, t.birth_day) as zodiac_key
    from public.traders t
    where t.status = 'active'
      and coalesce(t.birthday_locked, false) = true
      and t.birth_month = extract(month from p_target_date)::integer
      and t.birth_day = extract(day from p_target_date)::integer
  ),
  inserted as (
    insert into public.trader_birthday_gifts (trader_id, gift_year)
    select trader_id, gift_year
    from due_traders
    on conflict (trader_id, gift_year) do nothing
    returning trader_id, gift_year, gifted_at
  )
  select
    inserted.trader_id,
    inserted.gift_year,
    inserted.gifted_at,
    due_traders.zodiac_key
  from inserted
  join due_traders
    on due_traders.trader_id = inserted.trader_id
   and due_traders.gift_year = inserted.gift_year;
$$;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  name text not null,
  tier public.item_tier not null,
  wiki_rarity public.item_wiki_rarity not null default 'N',
  collection_name text not null,
  category text not null,
  source_type public.item_source_type not null default 'regular_happy_bag',
  release_window public.item_release_window not null default 'early_2024',
  demand_level public.demand_level not null default 'medium',
  demand_score integer not null default 0 check (demand_score >= 0),
  image_url text,
  source_page_url text,
  wiki_page_url text,
  projected_value numeric(10,2) not null default 0 check (projected_value >= 0),
  community_value numeric(10,2) not null default 0 check (community_value >= 0),
  value_notes text,
  is_event_item boolean not null default false,
  is_limited boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trader_inventory (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  quantity_owned integer not null default 0 check (quantity_owned >= 0),
  quantity_listed integer not null default 0 check (quantity_listed >= 0),
  quantity_available integer generated always as (greatest(quantity_owned - quantity_listed, 0)) stored,
  is_tradeable_duplicate boolean not null default false,
  source_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trader_inventory_qty_check check (quantity_listed <= quantity_owned),
  constraint trader_inventory_unique unique (trader_id, item_id)
);

create table if not exists public.wishlist_entries (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  priority public.wishlist_priority not null default 'medium',
  desired_quantity integer not null default 1 check (desired_quantity > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wishlist_unique unique (trader_id, item_id)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  target_item_id uuid references public.items(id) on delete restrict,
  quantity_listed integer not null check (quantity_listed > 0),
  listing_type public.listing_type not null default 'have_item',
  status public.listing_status not null default 'active',
  minimum_target_tier public.item_tier,
  preferred_collections_json jsonb not null default '[]'::jsonb,
  trade_rules_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  constraint listings_trade_rules_object check (jsonb_typeof(trade_rules_json) = 'object')
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.traders(id) on delete restrict,
  buyer_id uuid not null references public.traders(id) on delete restrict,
  status public.offer_status not null default 'pending',
  fairness_label public.fairness_label not null,
  fairness_score numeric(6,2) not null check (fairness_score >= 0),
  buyer_note text,
  seller_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint offers_distinct_traders check (seller_id <> buyer_id)
);

create table if not exists public.offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  value_snapshot integer not null check (value_snapshot >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  accepted_offer_id uuid not null references public.offers(id) on delete restrict,
  seller_id uuid not null references public.traders(id) on delete restrict,
  buyer_id uuid not null references public.traders(id) on delete restrict,
  status public.trade_status not null default 'pending_completion',
  seller_confirmed_at timestamptz,
  buyer_confirmed_at timestamptz,
  completed_at timestamptz,
  dispute_reason text,
  completion_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint trades_distinct_traders check (seller_id <> buyer_id)
);

create table if not exists public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  from_trader_id uuid not null references public.traders(id) on delete restrict,
  to_trader_id uuid not null references public.traders(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint trade_items_distinct_traders check (from_trader_id <> to_trader_id)
);

create table if not exists public.reputation_snapshots (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null unique references public.traders(id) on delete cascade,
  completed_trades_count integer not null default 0 check (completed_trades_count >= 0),
  accepted_offers_count integer not null default 0 check (accepted_offers_count >= 0),
  rejected_offers_count integer not null default 0 check (rejected_offers_count >= 0),
  cancelled_trades_count integer not null default 0 check (cancelled_trades_count >= 0),
  dispute_count integer not null default 0 check (dispute_count >= 0),
  reputation_score integer not null default 0 check (reputation_score >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  type public.notification_type not null default 'trade_ready',
  title text not null,
  body text not null default '',
  seller_trader_id uuid references public.traders(id) on delete cascade,
  buyer_trader_id uuid references public.traders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  offered_item_id uuid references public.items(id) on delete set null,
  requested_item_id uuid references public.items(id) on delete set null,
  priority public.wishlist_priority,
  match_score numeric(8,2),
  fairness_score numeric(6,2),
  action_payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_action_payload_object check (jsonb_typeof(action_payload) = 'object')
);

create table if not exists public.trade_events (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid references public.traders(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint trade_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.item_value_rules (
  id uuid primary key default gen_random_uuid(),
  wiki_rarity public.item_wiki_rarity not null,
  source_type public.item_source_type not null,
  release_window public.item_release_window not null,
  demand_level public.demand_level,
  base_common_units numeric(6,2) not null default 0,
  source_multiplier numeric(6,2) not null default 1,
  time_multiplier numeric(6,2) not null default 1,
  modifier_score numeric(6,2) not null default 1,
  active boolean not null default true,
  notes text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wiki_item_catalog (
  wiki_key text primary key,
  page_title text not null,
  page_slug text,
  page_url text,
  item_type text,
  wiki_rarity text,
  file_title text,
  image_url text,
  thumbnail_url text,
  thumbnail_width integer,
  thumbnail_height integer,
  original_image_url text,
  description_url text,
  description_short_url text,
  source_kind text not null,
  source_page_title text,
  source_page_url text,
  source_collection_title text,
  source_collection_url text,
  search_text text not null,
  inferred_item_tier public.item_tier,
  inferred_source_type public.item_source_type,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wiki_item_catalog_source_kind_check check (source_kind in ('item_page', 'happy_bag'))
);

create or replace function public.notify_trade_ready_for_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_username text;
  v_listing_item_name text;
begin
  if new.status <> 'active' or coalesce(new.quantity_listed, 0) <= 0 then
    return new;
  end if;

  select t.username
  into v_seller_username
  from public.traders t
  where t.id = new.trader_id;

  select i.name
  into v_listing_item_name
  from public.items i
  where i.id = new.item_id;

  insert into public.notifications (
    trader_id,
    type,
    title,
    body,
    seller_trader_id,
    buyer_trader_id,
    listing_id,
    item_id,
    offered_item_id,
    requested_item_id,
    priority,
    match_score,
    fairness_score,
    action_payload,
    is_read
  )
  with seller_wishlist as (
    select
      w.item_id,
      w.priority,
      case w.priority
        when 'high' then 3
        when 'medium' then 2
        else 1
      end as priority_weight
    from public.wishlist_entries w
    where w.trader_id = new.trader_id
      and w.priority in ('medium', 'high')
  ),
  interested_buyers as (
    select
      w.trader_id as buyer_trader_id,
      w.priority as buyer_priority,
      case w.priority
        when 'high' then 3
        when 'medium' then 2
        else 1
      end as buyer_priority_weight
    from public.wishlist_entries w
    where w.item_id = new.item_id
      and w.trader_id <> new.trader_id
      and w.priority in ('medium', 'high')
  ),
  buyer_tradeable_inventory as (
    select
      ib.buyer_trader_id,
      ib.buyer_priority,
      ib.buyer_priority_weight,
      ti.item_id as offered_item_id,
      sw.priority as seller_priority,
      sw.priority_weight as seller_priority_weight,
      i.name as offered_item_name,
      greatest(
        coalesce(nullif(i.community_value, 0), nullif(i.projected_value, 0), 0),
        (
          case i.wiki_rarity
            when 'S' then 700
            when 'R' then 300
            else 90
          end
          + coalesce(i.demand_score, 0) * 5
        )::numeric
      ) as offered_value
    from interested_buyers ib
    join public.trader_inventory ti
      on ti.trader_id = ib.buyer_trader_id
     and ti.quantity_available > 0
     and coalesce(ti.is_tradeable_duplicate, false) = true
    join seller_wishlist sw
      on sw.item_id = ti.item_id
    join public.items i
      on i.id = ti.item_id
  ),
  listing_value as (
    select
      new.item_id as requested_item_id,
      coalesce(v_listing_item_name, 'listed item') as requested_item_name,
      greatest(
        coalesce(nullif(i.community_value, 0), nullif(i.projected_value, 0), 0),
        (
          case i.wiki_rarity
            when 'S' then 700
            when 'R' then 300
            else 90
          end
          + coalesce(i.demand_score, 0) * 5
        )::numeric
      ) as requested_value
    from public.items i
    where i.id = new.item_id
  ),
  scored_pairs as (
    select
      bti.buyer_trader_id,
      bti.offered_item_id,
      lv.requested_item_id,
      bti.buyer_priority,
      bti.buyer_priority_weight,
      bti.seller_priority,
      bti.seller_priority_weight,
      bti.offered_item_name,
      lv.requested_item_name,
      round(
        greatest(
          0,
          100 - (
            abs(bti.offered_value - lv.requested_value)
            / greatest(bti.offered_value, lv.requested_value, 1)
            * 100
          )
        )::numeric,
        1
      ) as fairness_score,
      round(
        (
          (bti.buyer_priority_weight * 120)
          + (bti.seller_priority_weight * 105)
          + greatest(
            0,
            260 - abs(bti.offered_value - lv.requested_value)
          )
          + case
              when bti.buyer_priority_weight = 3 and bti.seller_priority_weight = 3
                then 220
              else 0
            end
        )::numeric,
        1
      ) as match_score
    from buyer_tradeable_inventory bti
    cross join listing_value lv
  ),
  best_per_buyer as (
    select distinct on (sp.buyer_trader_id)
      sp.*
    from scored_pairs sp
    where sp.fairness_score >= 65
      and not exists (
        select 1
        from public.offers o
        where o.listing_id = new.id
          and o.buyer_id = sp.buyer_trader_id
          and o.status = 'pending'
      )
    order by sp.buyer_trader_id, sp.match_score desc, sp.fairness_score desc
  )
  select
    bpb.buyer_trader_id,
    'trade_ready',
    'Trade Ready Now',
    'A strong trade is available with @' || coalesce(v_seller_username, 'trader') || '.',
    new.trader_id,
    bpb.buyer_trader_id,
    new.id,
    new.item_id,
    bpb.offered_item_id,
    bpb.requested_item_id,
    case
      when bpb.buyer_priority_weight = 3 and bpb.seller_priority_weight = 3 then 'high'::public.wishlist_priority
      else 'medium'::public.wishlist_priority
    end,
    bpb.match_score,
    bpb.fairness_score,
    jsonb_build_object(
      'targetTraderId', new.trader_id,
      'listingId', new.id,
      'youGiveItemId', bpb.offered_item_id,
      'youGetItemId', bpb.requested_item_id,
      'youGiveName', bpb.offered_item_name,
      'youGetName', bpb.requested_item_name,
      'sellerUsername', coalesce(v_seller_username, 'trader'),
      'matchScore', bpb.match_score,
      'fairnessScore', bpb.fairness_score
    ),
    false
  from best_per_buyer bpb
  where not exists (
    select 1
    from public.notifications n
    where n.trader_id = bpb.buyer_trader_id
      and n.type = 'trade_ready'
      and n.listing_id = new.id
      and n.offered_item_id = bpb.offered_item_id
      and n.requested_item_id = bpb.requested_item_id
  );

  return new;
end;
$$;

create index if not exists idx_trader_inventory_trader on public.trader_inventory (trader_id);
create unique index if not exists idx_traders_email_unique on public.traders (lower(email)) where email is not null;
create unique index if not exists idx_traders_auth_user_id_unique on public.traders (auth_user_id) where auth_user_id is not null;
create index if not exists idx_trader_inventory_item on public.trader_inventory (item_id);
create index if not exists idx_wishlist_trader on public.wishlist_entries (trader_id, priority);
create index if not exists idx_listings_status on public.listings (status, expires_at);
create index if not exists idx_listings_trader on public.listings (trader_id, status);
create index if not exists idx_listings_target_item on public.listings (target_item_id) where target_item_id is not null;
create index if not exists idx_listings_trade_rules on public.listings using gin (trade_rules_json);
create index if not exists idx_offers_listing on public.offers (listing_id, status);
create index if not exists idx_offers_buyer on public.offers (buyer_id, status);
create index if not exists idx_trades_seller on public.trades (seller_id, created_at desc);
create index if not exists idx_trade_items_trade on public.trade_items (trade_id);
create index if not exists idx_notifications_trader_created on public.notifications (trader_id, is_read, created_at desc);
create unique index if not exists idx_notifications_trade_ready_pair
  on public.notifications (trader_id, type, listing_id, offered_item_id, requested_item_id)
  where type = 'trade_ready';
create index if not exists idx_trade_events_trader_created on public.trade_events (trader_id, created_at desc);
create index if not exists idx_trade_events_type_created on public.trade_events (event_type, created_at desc);
create index if not exists idx_wiki_item_catalog_source_page on public.wiki_item_catalog (source_page_title);
create index if not exists idx_wiki_item_catalog_source_kind on public.wiki_item_catalog (source_kind);
create index if not exists idx_wiki_item_catalog_rarity on public.wiki_item_catalog (wiki_rarity);
create index if not exists idx_wiki_item_catalog_inferred_tier on public.wiki_item_catalog (inferred_item_tier);
create index if not exists idx_wiki_item_catalog_search on public.wiki_item_catalog using gin (search_text gin_trgm_ops);

create or replace trigger set_traders_updated_at
before update on public.traders
for each row execute function public.touch_updated_at();

create or replace trigger set_items_updated_at
before update on public.items
for each row execute function public.touch_updated_at();

create or replace trigger set_trader_inventory_updated_at
before update on public.trader_inventory
for each row execute function public.touch_updated_at();

create or replace trigger set_wishlist_updated_at
before update on public.wishlist_entries
for each row execute function public.touch_updated_at();

create or replace trigger set_listings_updated_at
before update on public.listings
for each row execute function public.touch_updated_at();

create or replace trigger set_offers_updated_at
before update on public.offers
for each row execute function public.touch_updated_at();

create or replace trigger set_reputation_updated_at
before update on public.reputation_snapshots
for each row execute function public.touch_updated_at();

drop trigger if exists trg_notify_trade_ready_listing_insert on public.listings;
create trigger trg_notify_trade_ready_listing_insert
after insert on public.listings
for each row
when (new.status = 'active' and coalesce(new.quantity_listed, 0) > 0)
execute function public.notify_trade_ready_for_listing();

drop trigger if exists trg_notify_trade_ready_listing_update on public.listings;
create trigger trg_notify_trade_ready_listing_update
after update of status, quantity_listed on public.listings
for each row
when (
  new.status = 'active'
  and coalesce(new.quantity_listed, 0) > 0
  and (
    old.status is distinct from new.status
    or old.quantity_listed is distinct from new.quantity_listed
  )
)
execute function public.notify_trade_ready_for_listing();

create or replace trigger set_wiki_item_catalog_updated_at
before update on public.wiki_item_catalog
for each row execute function public.touch_updated_at();

comment on table public.item_value_rules is 'Optional configuration table for the HKDV wiki value heuristic: rarity units x source multiplier x time multiplier x demand.';
comment on table public.wiki_item_catalog is 'Raw wiki-derived item master staging table for HKDV imports, search, and catalog reconciliation.';
comment on column public.listings.preferred_collections_json is 'JSON array for MVP; normalize later if matching needs become more advanced.';
comment on column public.listings.target_item_id is 'Optional desired target item for wanted listings. The listing item is still the inventory item being offered.';
comment on column public.listings.trade_rules_json is 'Structured trade rules such as wall-for-wall or prefers exact target matches.';
comment on column public.offers.fairness_score is 'Stored machine score used at submission time; label remains UI-friendly.';
comment on column public.items.wiki_rarity is 'Wiki bag rarity, usually S, R, or N.';
comment on column public.items.source_type is 'How the item entered the game, used in projected value calculation.';
comment on column public.items.release_window is 'Community age bucket from the HKDV wiki FAQ.';
comment on column public.traders.email is 'Email used to link Supabase Auth users to trader profiles.';
comment on column public.traders.auth_user_id is 'Optional auth.users.id link for Supabase Auth-backed trader access.';
comment on column public.traders.is_admin is 'Allows invite, moderation, and dispute-resolution actions in the trader OS.';
