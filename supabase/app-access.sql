-- App access layer for Supabase-backed trader workflows.
-- This file:
--   - enables row-level security on app tables
--   - exposes safe RPCs for wiki catalog reads
--   - exposes workspace + offer/trade RPCs for the trader desk
--   - adds authenticated wrappers for trader actions
--
-- Note:
--   The current React app uses the authenticated wrappers near the bottom of this file.
--   The older username-parameter functions are kept as internal building blocks and
--   migration helpers, but production traffic should go through the auth-backed RPCs.

alter table public.traders enable row level security;
alter table public.items enable row level security;
alter table public.trader_inventory enable row level security;
alter table public.wishlist_entries enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;
alter table public.reputation_snapshots enable row level security;
alter table public.wiki_item_catalog enable row level security;
alter table public.trader_birthday_gifts enable row level security;

create or replace function public.app_trader_id(p_trader_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trader_id uuid;
begin
  select t.id
  into v_trader_id
  from public.traders t
  where t.username = p_trader_username
    and t.status in ('active', 'invited');

  if v_trader_id is null then
    raise exception 'Trader % was not found or is not active.', p_trader_username;
  end if;

  return v_trader_id;
end;
$$;

create or replace function public.get_wiki_item_catalog(p_limit integer default 15000)
returns table (
  wiki_key text,
  page_title text,
  item_type text,
  wiki_rarity text,
  image_url text,
  page_url text,
  source_kind text,
  source_page_title text,
  source_page_url text,
  source_collection_title text,
  search_text text
)
language sql
security definer
set search_path = public
as $$
  select
    w.wiki_key,
    w.page_title,
    w.item_type,
    w.wiki_rarity,
    coalesce(w.thumbnail_url, w.image_url, w.original_image_url) as image_url,
    w.page_url,
    w.source_kind,
    w.source_page_title,
    w.source_page_url,
    w.source_collection_title,
    w.search_text
  from public.wiki_item_catalog w
  order by w.page_title
  limit greatest(1, least(coalesce(p_limit, 15000), 15000));
$$;

create or replace function public.search_wiki_item_catalog(
  p_search_text text default null,
  p_rarity text default null,
  p_source_kind text default null,
  p_limit integer default 200
)
returns table (
  wiki_key text,
  page_title text,
  item_type text,
  wiki_rarity text,
  image_url text,
  page_url text,
  source_kind text,
  source_page_title text,
  source_page_url text,
  source_collection_title text,
  search_text text
)
language sql
security definer
set search_path = public
as $$
  select
    w.wiki_key,
    w.page_title,
    w.item_type,
    w.wiki_rarity,
    coalesce(w.thumbnail_url, w.image_url, w.original_image_url) as image_url,
    w.page_url,
    w.source_kind,
    w.source_page_title,
    w.source_page_url,
    w.source_collection_title,
    w.search_text
  from public.wiki_item_catalog w
  where
    (coalesce(p_rarity, '') = '' or w.wiki_rarity = p_rarity)
    and (coalesce(p_source_kind, '') = '' or w.source_kind = p_source_kind)
    and (
      coalesce(p_search_text, '') = ''
      or w.search_text ilike '%' || lower(p_search_text) || '%'
    )
  order by w.page_title
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

create or replace function public.get_trader_workspace(p_trader_username text)
returns jsonb
language sql
security definer
set search_path = public
as $$
with current_trader as (
  select
    t.id,
    t.username,
    t.display_name,
    t.pride_flag_key,
    t.buddy_key,
    t.buddy_name,
    t.strawberry_title,
    t.profile_code,
    t.is_profile_code_visible,
    t.is_admin,
    t.status,
    t.avatar_url,
    t.created_at
  from public.traders t
  where t.id = public.app_trader_id(p_trader_username)
),
workspace_item_ids as (
  select ti.item_id
  from public.trader_inventory ti
  where ti.trader_id = (select id from current_trader)
  union
  select w.item_id
  from public.wishlist_entries w
  where w.trader_id = (select id from current_trader)
  union
  select l.item_id
  from public.listings l
  where l.status = 'active'
     or l.trader_id = (select id from current_trader)
  union
  select l.target_item_id
  from public.listings l
  where l.target_item_id is not null
    and (l.status = 'active' or l.trader_id = (select id from current_trader))
  union
  select oi.item_id
  from public.offers o
  join public.offer_items oi on oi.offer_id = o.id
  where o.buyer_id = (select id from current_trader)
     or o.seller_id = (select id from current_trader)
  union
  select ti.item_id
  from public.trades tr
  join public.trade_items ti on ti.trade_id = tr.id
  where tr.buyer_id = (select id from current_trader)
     or tr.seller_id = (select id from current_trader)
  union
  select ti.item_id
  from public.trades tr
  join public.trade_items ti on ti.trade_id = tr.id
  where (select coalesce(is_admin, false) from current_trader)
    and tr.status in ('pending_completion', 'disputed')
),
workspace_items as (
  select
    i.id,
    i.item_code,
    i.name,
    i.tier,
    i.wiki_rarity,
    i.collection_name,
    i.category,
    i.source_type,
    i.release_window,
    i.demand_level,
    i.demand_score,
    i.image_url,
    i.source_page_url,
    i.wiki_page_url,
    i.projected_value,
    i.community_value,
    i.value_notes,
    i.is_event_item,
    i.is_limited,
    i.notes
  from public.items i
  where i.id in (select item_id from workspace_item_ids)
),
market_listings as (
  select
    l.id,
    l.trader_id,
    l.item_id,
    l.target_item_id,
    l.quantity_listed,
    l.listing_type,
    l.status,
    l.minimum_target_tier,
    l.preferred_collections_json,
    l.trade_rules_json,
    l.notes,
    l.expires_at
  from public.listings l
  where l.status = 'active'
    and l.trader_id <> (select id from current_trader)
  order by l.created_at desc
),
my_listings as (
  select
    l.id,
    l.trader_id,
    l.item_id,
    l.target_item_id,
    l.quantity_listed,
    l.listing_type,
    l.status,
    l.minimum_target_tier,
    l.preferred_collections_json,
    l.trade_rules_json,
    l.notes,
    l.expires_at
  from public.listings l
  where l.trader_id = (select id from current_trader)
  order by l.created_at desc
),
incoming_offers as (
  select
    o.id,
    o.listing_id,
    o.seller_id,
    o.buyer_id,
    o.status,
    o.fairness_label,
    o.fairness_score,
    o.buyer_note,
    o.seller_note,
    o.created_at,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'item_id', oi.item_id,
            'quantity', oi.quantity,
            'value_snapshot', oi.value_snapshot
          )
          order by oi.created_at, oi.id
        ),
        '[]'::jsonb
      )
      from public.offer_items oi
      where oi.offer_id = o.id
    ) as offer_items
  from public.offers o
  where o.seller_id = (select id from current_trader)
  order by o.created_at desc
),
outgoing_offers as (
  select
    o.id,
    o.listing_id,
    o.seller_id,
    o.buyer_id,
    o.status,
    o.fairness_label,
    o.fairness_score,
    o.buyer_note,
    o.seller_note,
    o.created_at,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'item_id', oi.item_id,
            'quantity', oi.quantity,
            'value_snapshot', oi.value_snapshot
          )
          order by oi.created_at, oi.id
        ),
        '[]'::jsonb
      )
      from public.offer_items oi
      where oi.offer_id = o.id
    ) as offer_items
  from public.offers o
  where o.buyer_id = (select id from current_trader)
  order by o.created_at desc
),
trade_history as (
  select
    tr.id,
    tr.listing_id,
    tr.accepted_offer_id,
    tr.seller_id,
    tr.buyer_id,
    tr.status,
    tr.seller_confirmed_at,
    tr.buyer_confirmed_at,
    tr.completed_at,
    tr.dispute_reason,
    tr.completion_note,
    tr.resolved_at,
    tr.created_at,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'from_trader_id', ti.from_trader_id,
            'to_trader_id', ti.to_trader_id,
            'item_id', ti.item_id,
            'quantity', ti.quantity
          )
          order by ti.created_at, ti.id
        ),
        '[]'::jsonb
      )
      from public.trade_items ti
      where ti.trade_id = tr.id
    ) as trade_items
  from public.trades tr
  where tr.buyer_id = (select id from current_trader)
     or tr.seller_id = (select id from current_trader)
  order by coalesce(tr.completed_at, tr.created_at) desc
),
collection_progress as (
  select
    i.collection_name,
    i.source_type,
    i.release_window,
    count(*)::integer as total_items,
    count(*) filter (where coalesce(ti.quantity_owned, 0) > 0)::integer as owned_items
  from public.items i
  left join public.trader_inventory ti
    on ti.item_id = i.id
   and ti.trader_id = (select id from current_trader)
  group by i.collection_name, i.source_type, i.release_window
)
select jsonb_build_object(
  'current_trader',
  (
    select to_jsonb(ct)
    from current_trader ct
  ),
  'trader_directory',
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'username', t.username,
          'display_name', t.display_name,
          'pride_flag_key', t.pride_flag_key,
          'buddy_key', t.buddy_key,
          'buddy_name', t.buddy_name,
          'strawberry_title', t.strawberry_title,
          'profile_code', case when t.is_profile_code_visible then t.profile_code else null end,
          'is_profile_code_visible', t.is_profile_code_visible,
          'is_admin', t.is_admin,
          'status', t.status,
          'avatar_url', t.avatar_url,
          'created_at', t.created_at
        )
        order by t.display_name
      ),
      '[]'::jsonb
    )
    from public.traders t
  ),
  'items',
  (
    select coalesce(jsonb_agg(to_jsonb(i) order by i.name), '[]'::jsonb)
    from workspace_items i
  ),
  'inventory',
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ti.id,
          'trader_id', ti.trader_id,
          'item_id', ti.item_id,
          'quantity_owned', ti.quantity_owned,
          'quantity_listed', ti.quantity_listed,
          'is_tradeable_duplicate', ti.is_tradeable_duplicate,
          'source_note', ti.source_note
        )
        order by ti.created_at
      ),
      '[]'::jsonb
    )
    from public.trader_inventory ti
    where ti.trader_id = (select id from current_trader)
  ),
  'wishlist_entries',
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', w.id,
          'trader_id', w.trader_id,
          'item_id', w.item_id,
          'priority', w.priority,
          'desired_quantity', w.desired_quantity,
          'notes', w.notes
        )
        order by w.created_at
      ),
      '[]'::jsonb
    )
    from public.wishlist_entries w
    where w.trader_id = (select id from current_trader)
  ),
  'market_listings',
  (
    select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)
    from market_listings l
  ),
  'my_listings',
  (
    select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)
    from my_listings l
  ),
  'incoming_offers',
  (
    select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc), '[]'::jsonb)
    from incoming_offers o
  ),
  'outgoing_offers',
  (
    select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc), '[]'::jsonb)
    from outgoing_offers o
  ),
  'trade_history',
  (
    select coalesce(jsonb_agg(to_jsonb(tr) order by coalesce(tr.completed_at, tr.created_at) desc), '[]'::jsonb)
    from trade_history tr
  ),
  'collection_progress',
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'collection_name', cp.collection_name,
          'source_type', cp.source_type,
          'release_window', cp.release_window,
          'total_items', cp.total_items,
          'owned_items', cp.owned_items
        )
        order by
          (cp.owned_items = cp.total_items and cp.total_items > 0) desc,
          cp.owned_items desc,
          cp.collection_name asc
      ),
      '[]'::jsonb
    )
    from collection_progress cp
  ),
  'reputation_snapshot',
  (
    select coalesce(
      to_jsonb(rs) || jsonb_build_object(
        'response_rate',
        greatest(40, 100 - (coalesce(rs.cancelled_trades_count, 0) * 3) - (coalesce(rs.dispute_count, 0) * 10))
      ),
      jsonb_build_object(
        'trader_id', (select id from current_trader),
        'completed_trades_count', 0,
        'accepted_offers_count', 0,
        'rejected_offers_count', 0,
        'cancelled_trades_count', 0,
        'dispute_count', 0,
        'reputation_score', 0,
        'response_rate', 100
      )
    )
    from public.reputation_snapshots rs
    where rs.trader_id = (select id from current_trader)
  )
);
$$;

create or replace function public.create_offer_from_bundle(
  p_actor_username text,
  p_listing_id uuid,
  p_buyer_note text,
  p_fairness_label public.fairness_label,
  p_fairness_score numeric,
  p_offer_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.app_trader_id(p_actor_username);
  v_listing record;
  v_offer_id uuid;
  v_requested record;
begin
  if jsonb_typeof(p_offer_items) <> 'array' or jsonb_array_length(p_offer_items) = 0 then
    raise exception 'Offer items are required.';
  end if;

  select
    l.id,
    l.trader_id,
    l.item_id,
    l.status
  into v_listing
  from public.listings l
  where l.id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing % was not found.', p_listing_id;
  end if;

  if v_listing.status <> 'active' then
    raise exception 'Listing % is not active.', p_listing_id;
  end if;

  if v_listing.trader_id = v_actor_id then
    raise exception 'A trader cannot offer on their own listing.';
  end if;

  for v_requested in
    select
      (entry->>'item_id')::uuid as item_id,
      sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_offer_items) entry
    group by 1
  loop
    perform 1
    from public.trader_inventory ti
    where ti.trader_id = v_actor_id
      and ti.item_id = v_requested.item_id
      and ti.quantity_available >= v_requested.quantity
    for update;

    if not found then
      raise exception 'Insufficient available quantity for item %.', v_requested.item_id;
    end if;
  end loop;

  insert into public.offers (
    listing_id,
    seller_id,
    buyer_id,
    status,
    fairness_label,
    fairness_score,
    buyer_note,
    seller_note
  )
  values (
    p_listing_id,
    v_listing.trader_id,
    v_actor_id,
    'pending',
    p_fairness_label,
    greatest(p_fairness_score, 0),
    coalesce(p_buyer_note, ''),
    ''
  )
  returning id into v_offer_id;

  insert into public.offer_items (
    offer_id,
    item_id,
    quantity,
    value_snapshot
  )
  select
    v_offer_id,
    requested.item_id,
    requested.quantity,
    coalesce(requested.value_snapshot, greatest(round(i.community_value * 10), 0)::integer)
  from (
    select
      (entry->>'item_id')::uuid as item_id,
      (entry->>'quantity')::integer as quantity,
      nullif(entry->>'value_snapshot', '')::integer as value_snapshot
    from jsonb_array_elements(p_offer_items) entry
  ) requested
  join public.items i on i.id = requested.item_id;

  return v_offer_id;
end;
$$;

create or replace function public.withdraw_offer(
  p_actor_username text,
  p_offer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.app_trader_id(p_actor_username);
  v_offer_id uuid;
begin
  update public.offers o
  set
    status = 'withdrawn',
    updated_at = timezone('utc', now())
  where o.id = p_offer_id
    and o.buyer_id = v_actor_id
    and o.status = 'pending'
  returning o.id into v_offer_id;

  if v_offer_id is null then
    raise exception 'Pending outgoing offer % was not found for trader %.', p_offer_id, p_actor_username;
  end if;

  return v_offer_id;
end;
$$;

create or replace function public.reject_offer(
  p_actor_username text,
  p_offer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.app_trader_id(p_actor_username);
  v_offer_id uuid;
begin
  update public.offers o
  set
    status = 'rejected',
    updated_at = timezone('utc', now())
  where o.id = p_offer_id
    and o.seller_id = v_actor_id
    and o.status = 'pending'
  returning o.id into v_offer_id;

  if v_offer_id is null then
    raise exception 'Pending incoming offer % was not found for trader %.', p_offer_id, p_actor_username;
  end if;

  insert into public.reputation_snapshots (trader_id)
  values (v_actor_id)
  on conflict (trader_id) do nothing;

  update public.reputation_snapshots
  set
    rejected_offers_count = rejected_offers_count + 1,
    updated_at = timezone('utc', now())
  where trader_id = v_actor_id;

  return v_offer_id;
end;
$$;

create or replace function public.accept_offer(
  p_actor_username text,
  p_offer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.app_trader_id(p_actor_username);
  v_offer record;
  v_trade_id uuid;
  v_requested record;
  v_item_name text;
  v_seller_inventory record;
  v_required_reserved integer;
begin
  select
    o.id,
    o.listing_id,
    o.seller_id,
    o.buyer_id,
    o.status as offer_status,
    l.item_id as listing_item_id,
    l.quantity_listed,
    l.status as listing_status
  into v_offer
  from public.offers o
  join public.listings l on l.id = o.listing_id
  where o.id = p_offer_id
  for update of o, l;

  if not found then
    raise exception 'Offer % was not found.', p_offer_id;
  end if;

  if v_offer.seller_id <> v_actor_id then
    raise exception 'Trader % cannot accept offer %.', p_actor_username, p_offer_id;
  end if;

  if v_offer.offer_status <> 'pending' then
    raise exception 'Offer % is not pending.', p_offer_id;
  end if;

  if v_offer.listing_status <> 'active' then
    raise exception 'Listing for offer % is not active.', p_offer_id;
  end if;

  perform 1
  from public.listings l
  where l.trader_id = v_offer.seller_id
    and l.item_id = v_offer.listing_item_id
    and l.status in ('active', 'paused')
  for update;

  select *
  into v_seller_inventory
  from public.trader_inventory ti
  where ti.trader_id = v_offer.seller_id
    and ti.item_id = v_offer.listing_item_id
  for update;

  if not found then
    raise exception 'Seller inventory is not available for accepted listing item.';
  end if;

  select coalesce(sum(l.quantity_listed), 0)::integer
  into v_required_reserved
  from public.listings l
  where l.trader_id = v_offer.seller_id
    and l.item_id = v_offer.listing_item_id
    and l.status in ('active', 'paused');

  if v_seller_inventory.quantity_owned < greatest(v_offer.quantity_listed, v_required_reserved) then
    select i.name into v_item_name
    from public.items i
    where i.id = v_offer.listing_item_id;

    raise exception 'Seller inventory is no longer available for %.', coalesce(v_item_name, v_offer.listing_item_id::text);
  end if;

  if coalesce(v_seller_inventory.quantity_listed, 0) < v_required_reserved then
    update public.trader_inventory
    set
      quantity_listed = v_required_reserved,
      updated_at = timezone('utc', now())
    where id = v_seller_inventory.id;

    v_seller_inventory.quantity_listed := v_required_reserved;
  end if;

  if v_seller_inventory.quantity_listed < v_offer.quantity_listed then
    select i.name into v_item_name
    from public.items i
    where i.id = v_offer.listing_item_id;

    raise exception 'Seller listing reservation is not available for %.', coalesce(v_item_name, v_offer.listing_item_id::text);
  end if;

  for v_requested in
    select
      oi.item_id,
      sum(oi.quantity)::integer as quantity
    from public.offer_items oi
    where oi.offer_id = p_offer_id
    group by oi.item_id
  loop
    perform 1
    from public.trader_inventory ti
    where ti.trader_id = v_offer.buyer_id
      and ti.item_id = v_requested.item_id
      and ti.quantity_available >= v_requested.quantity
    for update;

    if not found then
      select i.name into v_item_name
      from public.items i
      where i.id = v_requested.item_id;

      raise exception 'Buyer inventory is no longer available for %.', coalesce(v_item_name, v_requested.item_id::text);
    end if;
  end loop;

  insert into public.trades (
    listing_id,
    accepted_offer_id,
    seller_id,
    buyer_id,
    status,
    completed_at,
    seller_confirmed_at,
    buyer_confirmed_at,
    dispute_reason,
    completion_note,
    resolved_at
  )
  values (
    v_offer.listing_id,
    p_offer_id,
    v_offer.seller_id,
    v_offer.buyer_id,
    'pending_completion',
    null,
    null,
    null,
    null,
    null,
    null
  )
  returning id into v_trade_id;

  insert into public.trade_items (
    trade_id,
    from_trader_id,
    to_trader_id,
    item_id,
    quantity
  )
  values (
    v_trade_id,
    v_offer.seller_id,
    v_offer.buyer_id,
    v_offer.listing_item_id,
    v_offer.quantity_listed
  );

  insert into public.trade_items (
    trade_id,
    from_trader_id,
    to_trader_id,
    item_id,
    quantity
  )
  select
    v_trade_id,
    v_offer.buyer_id,
    v_offer.seller_id,
    oi.item_id,
    sum(oi.quantity)::integer
  from public.offer_items oi
  where oi.offer_id = p_offer_id
  group by oi.item_id;

  update public.trader_inventory
  set
    quantity_owned = quantity_owned - v_offer.quantity_listed,
    quantity_listed = quantity_listed - v_offer.quantity_listed,
    updated_at = timezone('utc', now())
  where trader_id = v_offer.seller_id
    and item_id = v_offer.listing_item_id;

  insert into public.trader_inventory (
    trader_id,
    item_id,
    quantity_owned,
    quantity_listed,
    is_tradeable_duplicate,
    source_note
  )
  values (
    v_offer.buyer_id,
    v_offer.listing_item_id,
    v_offer.quantity_listed,
    0,
    false,
    'Accepted trade'
  )
  on conflict (trader_id, item_id) do update
  set
    quantity_owned = public.trader_inventory.quantity_owned + excluded.quantity_owned,
    updated_at = timezone('utc', now());

  for v_requested in
    select
      oi.item_id,
      sum(oi.quantity)::integer as quantity
    from public.offer_items oi
    where oi.offer_id = p_offer_id
    group by oi.item_id
  loop
    update public.trader_inventory
    set
      quantity_owned = quantity_owned - v_requested.quantity,
      updated_at = timezone('utc', now())
    where trader_id = v_offer.buyer_id
      and item_id = v_requested.item_id;

    insert into public.trader_inventory (
      trader_id,
      item_id,
      quantity_owned,
      quantity_listed,
      is_tradeable_duplicate,
      source_note
    )
    values (
      v_offer.seller_id,
      v_requested.item_id,
      v_requested.quantity,
      0,
      v_requested.quantity > 1,
      'Accepted trade'
    )
    on conflict (trader_id, item_id) do update
    set
      quantity_owned = public.trader_inventory.quantity_owned + excluded.quantity_owned,
      updated_at = timezone('utc', now());
  end loop;

  update public.offers
  set
    status = case
      when id = p_offer_id then 'accepted'::public.offer_status
      else 'cancelled'::public.offer_status
    end,
    updated_at = timezone('utc', now())
  where listing_id = v_offer.listing_id
    and status = 'pending';

  update public.listings
  set
    status = 'completed',
    updated_at = timezone('utc', now())
  where id = v_offer.listing_id;

  insert into public.reputation_snapshots (trader_id)
  values (v_offer.seller_id), (v_offer.buyer_id)
  on conflict (trader_id) do nothing;

  update public.reputation_snapshots
  set
    accepted_offers_count = accepted_offers_count + 1,
    updated_at = timezone('utc', now())
  where trader_id = v_offer.seller_id;

  return v_trade_id;
end;
$$;
comment on function public.get_wiki_item_catalog(integer) is 'Returns a safe subset of public wiki catalog columns for the Admin browser.';
comment on function public.search_wiki_item_catalog(text, text, text, integer) is 'Searches the wiki catalog with server-side filters and a bounded result size.';
comment on function public.get_trader_workspace(text) is 'Returns the trader desk workspace payload as JSON for inventory, listings, offers, trades, and reputation.';
comment on function public.create_offer_from_bundle(text, uuid, text, public.fairness_label, numeric, jsonb) is 'Creates a pending offer from a JSON bundle after inventory validation.';
comment on function public.withdraw_offer(text, uuid) is 'Withdraws a pending outgoing offer for the acting trader.';
comment on function public.reject_offer(text, uuid) is 'Rejects a pending incoming offer for the acting trader.';
comment on function public.accept_offer(text, uuid) is 'Accepts a pending incoming offer, transfers inventory, completes the listing, and creates a pending-completion trade record.';

create or replace function public.app_current_trader_id()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_email_local text;
  v_display_name text;
  v_username_base text;
  v_username_candidate text;
  v_username_suffix text;
  v_trader_id uuid;
begin
  if v_auth_user_id is null and v_email = '' then
    raise exception 'A Supabase session is required.';
  end if;

  select t.id
  into v_trader_id
  from public.traders t
  where
    (v_auth_user_id is not null and t.auth_user_id = v_auth_user_id)
    or (v_email <> '' and lower(coalesce(t.email, '')) = v_email)
  order by case when t.auth_user_id = v_auth_user_id then 0 else 1 end
  limit 1;

  if v_trader_id is null then
    v_email_local := split_part(
      coalesce(nullif(v_email, ''), coalesce(v_auth_user_id::text, 'trader')),
      '@',
      1
    );
    v_display_name := nullif(
      trim(
        coalesce(
          auth.jwt() -> 'user_metadata' ->> 'display_name',
          auth.jwt() -> 'user_metadata' ->> 'full_name',
          ''
        )
      ),
      ''
    );

    if v_display_name is null then
      v_display_name := nullif(
        trim(initcap(regexp_replace(v_email_local, '[_\.\-]+', ' ', 'g'))),
        ''
      );
    end if;

    if v_display_name is null then
      v_display_name := 'HKDV Trader';
    end if;

    v_username_base := lower(regexp_replace(v_email_local, '[^a-z0-9]+', '_', 'g'));
    v_username_base := trim(both '_' from v_username_base);

    if v_username_base = '' then
      v_username_base := 'trader';
    end if;

    v_username_candidate := left(v_username_base, 24);

    if v_username_candidate = '' then
      v_username_candidate := 'trader';
    end if;

    while exists (
      select 1
      from public.traders t
      where t.username = v_username_candidate
    ) loop
      v_username_suffix := substr(encode(gen_random_bytes(3), 'hex'), 1, 6);
      v_username_candidate := left(v_username_base, 17) || '_' || v_username_suffix;
    end loop;

    insert into public.traders (
      username,
      email,
      auth_user_id,
      display_name,
      passcode_hash,
      status
    )
    values (
      v_username_candidate,
      nullif(v_email, ''),
      v_auth_user_id,
      v_display_name,
      'supabase-auth:' || coalesce(v_auth_user_id::text, v_email, gen_random_uuid()::text),
      'active'
    )
    returning id
    into v_trader_id;
  end if;

  if v_auth_user_id is not null then
    update public.traders
    set
      auth_user_id = coalesce(auth_user_id, v_auth_user_id),
      email = coalesce(email, nullif(v_email, '')),
      updated_at = timezone('utc', now())
    where id = v_trader_id
      and (
        auth_user_id is null
        or (email is null and v_email <> '')
      );
  end if;

  return v_trader_id;
end;
$$;

create or replace function public.get_my_trader_workspace()
returns jsonb
language sql
security definer
set search_path = public, auth
as $$
  select public.get_trader_workspace(t.username)
  from public.traders t
  where t.id = public.app_current_trader_id();
$$;

create or replace function public.get_my_buddy()
returns table (
  trader_id uuid,
  buddy_key text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    t.id as trader_id,
    t.buddy_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

create or replace function public.get_my_profile_identity()
returns table (
  trader_id uuid,
  pride_flag_key text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    t.id as trader_id,
    t.pride_flag_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

create or replace function public.get_my_birthday()
returns table (
  trader_id uuid,
  birth_month integer,
  birth_day integer,
  birthday_locked boolean,
  birthday_set_at timestamptz,
  zodiac_key text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    t.id as trader_id,
    t.birth_month,
    t.birth_day,
    t.birthday_locked,
    t.birthday_set_at,
    case
      when t.birth_month is not null and t.birth_day is not null
        then public.get_zodiac_key(t.birth_month, t.birth_day)
      else null
    end as zodiac_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

create or replace function public.set_my_buddy(
  p_buddy_key text
)
returns table (
  trader_id uuid,
  buddy_key text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_buddy_key text := nullif(trim(coalesce(p_buddy_key, '')), '');
begin
  if v_buddy_key is not null and v_buddy_key not in (
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
  ) then
    raise exception 'Buddy key must be one of the supported HKDV characters.';
  end if;

  update public.traders
  set
    buddy_key = v_buddy_key,
    buddy_name = case v_buddy_key
      when 'my_melody' then 'My Melody'
      when 'hello_kitty' then 'Hello Kitty'
      when 'pompompurin' then 'Pompompurin'
      when 'kuromi' then 'Kuromi'
      when 'kerokerokeroppi' then 'Kerokerokeroppi'
      when 'tuxedosam' then 'Tuxedosam'
      when 'pochacco' then 'Pochacco'
      when 'badtz_maru' then 'Badtz-Maru'
      when 'kiki_lala' then 'Little Twin Stars (Kiki & Lala)'
      when 'gudetama' then 'Gudetama'
      when 'cinnamoroll' then 'Cinnamoroll'
      when 'wish_me_mell' then 'Wish me mell'
      when 'cogimyun' then 'Cogimyun'
      when 'hangyodon' then 'Hangyodon'
      when 'ahirunopekkle' then 'Ahiru No Pekkle'
      else null
    end,
    updated_at = timezone('utc', now())
  where id = v_trader_id;

  return query
  select t.id, t.buddy_key
  from public.traders t
  where t.id = v_trader_id;
end;
$$;

create or replace function public.set_my_birthday(
  p_birth_month integer,
  p_birth_day integer
)
returns table (
  trader_id uuid,
  birth_month integer,
  birth_day integer,
  birthday_locked boolean,
  birthday_set_at timestamptz,
  zodiac_key text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_birthday_locked boolean;
  v_zodiac_key text;
begin
  if p_birth_month is null or p_birth_day is null then
    raise exception 'Birth month and day are required.';
  end if;

  select coalesce(t.birthday_locked, false)
  into v_birthday_locked
  from public.traders t
  where t.id = v_trader_id;

  if v_birthday_locked then
    raise exception 'Birthday has already been set and is locked.';
  end if;

  v_zodiac_key := public.get_zodiac_key(p_birth_month, p_birth_day);

  update public.traders
  set
    birth_month = p_birth_month,
    birth_day = p_birth_day,
    birthday_locked = true,
    birthday_set_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_trader_id;

  return query
  select
    t.id,
    t.birth_month,
    t.birth_day,
    t.birthday_locked,
    t.birthday_set_at,
    v_zodiac_key
  from public.traders t
  where t.id = v_trader_id;
end;
$$;

create or replace function public.upsert_my_trader_profile(
  p_display_name text,
  p_buddy_key text default null,
  p_pride_flag_key text default null,
  p_strawberry_title text default 'Strawberry Syrup',
  p_profile_code text default null,
  p_is_profile_code_visible boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_buddy_key text := nullif(trim(coalesce(p_buddy_key, '')), '');
  v_pride_flag_key text := nullif(trim(coalesce(p_pride_flag_key, '')), '');
  v_strawberry_title text := nullif(trim(coalesce(p_strawberry_title, '')), '');
  v_profile_code text := nullif(upper(trim(coalesce(p_profile_code, ''))), '');
  v_payload jsonb;
begin
  if v_display_name is null then
    raise exception 'Display name is required.';
  end if;

  if v_buddy_key is not null and v_buddy_key not in (
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
  ) then
    raise exception 'Buddy key must be one of the supported HKDV characters.';
  end if;

  if v_pride_flag_key is not null and v_pride_flag_key not in (
    'rainbow',
    'progress_pride',
    'lesbian',
    'gay',
    'bisexual',
    'pansexual',
    'asexual',
    'aromantic',
    'demisexual',
    'queer',
    'questioning',
    'transgender',
    'nonbinary',
    'genderfluid',
    'agender',
    'intersex'
  ) then
    raise exception 'Identity badge must be one of the supported pride flag options.';
  end if;

  if v_strawberry_title is null or v_strawberry_title not in (
    'Strawberry Syrup',
    'Strawberry Cookie',
    'Strawberry Macaron',
    'Strawberry Milk',
    'Strawberry Parfait',
    'Strawberry Cake'
  ) then
    raise exception 'Strawberry rank must be one of the supported Strawberry titles.';
  end if;

  update public.traders
  set
    display_name = v_display_name,
    pride_flag_key = v_pride_flag_key,
    buddy_key = v_buddy_key,
    buddy_name = case v_buddy_key
      when 'my_melody' then 'My Melody'
      when 'hello_kitty' then 'Hello Kitty'
      when 'pompompurin' then 'Pompompurin'
      when 'kuromi' then 'Kuromi'
      when 'kerokerokeroppi' then 'Kerokerokeroppi'
      when 'tuxedosam' then 'Tuxedosam'
      when 'pochacco' then 'Pochacco'
      when 'badtz_maru' then 'Badtz-Maru'
      when 'kiki_lala' then 'Little Twin Stars (Kiki & Lala)'
      when 'gudetama' then 'Gudetama'
      when 'cinnamoroll' then 'Cinnamoroll'
      when 'wish_me_mell' then 'Wish me mell'
      when 'cogimyun' then 'Cogimyun'
      when 'hangyodon' then 'Hangyodon'
      when 'ahirunopekkle' then 'Ahiru No Pekkle'
      else null
    end,
    strawberry_title = v_strawberry_title,
    profile_code = v_profile_code,
    is_profile_code_visible = coalesce(p_is_profile_code_visible, false),
    updated_at = timezone('utc', now())
  where id = v_trader_id;

  select to_jsonb(t)
  into v_payload
  from public.traders t
  where t.id = v_trader_id;

  return v_payload;
end;
$$;

create or replace function public.app_current_trader_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_admin boolean;
begin
  select coalesce(t.is_admin, false)
  into v_is_admin
  from public.traders t
  where t.id = public.app_current_trader_id();

  if v_is_admin is null then
    raise exception 'No trader profile is linked to the authenticated user.';
  end if;

  return v_is_admin;
end;
$$;

create or replace function public.get_admin_trade_oversight()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_payload jsonb;
begin
  if not public.app_current_trader_is_admin() then
    raise exception 'Admin access is required.';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(tr) order by case when tr.status = 'disputed' then 0 else 1 end, tr.created_at asc),
    '[]'::jsonb
  )
  into v_payload
  from (
    select
      tr.id,
      tr.listing_id,
      tr.accepted_offer_id,
      tr.seller_id,
      tr.buyer_id,
      tr.status,
      tr.seller_confirmed_at,
      tr.buyer_confirmed_at,
      tr.completed_at,
      tr.dispute_reason,
      tr.completion_note,
      tr.resolved_at,
      tr.created_at,
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'from_trader_id', ti.from_trader_id,
              'to_trader_id', ti.to_trader_id,
              'item_id', ti.item_id,
              'quantity', ti.quantity
            )
            order by ti.created_at, ti.id
          ),
          '[]'::jsonb
        )
        from public.trade_items ti
        where ti.trade_id = tr.id
      ) as trade_items
    from public.trades tr
    where tr.status in ('pending_completion', 'disputed')
  ) tr;

  return v_payload;
end;
$$;

create or replace function public.create_my_offer_from_bundle(
  p_listing_id uuid,
  p_buyer_note text,
  p_fairness_label public.fairness_label,
  p_fairness_score numeric,
  p_offer_items jsonb
)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.create_offer_from_bundle(
    t.username,
    p_listing_id,
    p_buyer_note,
    p_fairness_label,
    p_fairness_score,
    p_offer_items
  )
  from public.traders t
  where t.id = public.app_current_trader_id();
$$;

create or replace function public.withdraw_my_offer(p_offer_id uuid)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.withdraw_offer(t.username, p_offer_id)
  from public.traders t
  where t.id = public.app_current_trader_id();
$$;

create or replace function public.reject_my_offer(p_offer_id uuid)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.reject_offer(t.username, p_offer_id)
  from public.traders t
  where t.id = public.app_current_trader_id();
$$;

create or replace function public.accept_my_offer(p_offer_id uuid)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.accept_offer(t.username, p_offer_id)
  from public.traders t
  where t.id = public.app_current_trader_id();
$$;

create or replace function public.confirm_my_trade_completion(
  p_trade_id uuid,
  p_completion_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := public.app_current_trader_id();
  v_actor_username text;
  v_trade public.trades%rowtype;
  v_note text := nullif(btrim(coalesce(p_completion_note, '')), '');
  v_note_entry text;
begin
  select t.username
  into v_actor_username
  from public.traders t
  where t.id = v_actor_id;

  select *
  into v_trade
  from public.trades tr
  where tr.id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade % was not found.', p_trade_id;
  end if;

  if v_trade.status = 'completed' then
    return v_trade.id;
  end if;

  if v_trade.status <> 'pending_completion' then
    raise exception 'Trade % is not awaiting completion.', p_trade_id;
  end if;

  if v_actor_id not in (v_trade.seller_id, v_trade.buyer_id) then
    raise exception 'Trader cannot confirm completion for trade %.', p_trade_id;
  end if;

  if v_note is not null then
    v_note_entry := coalesce(v_actor_username, 'Trader') || ': ' || v_note;
  end if;

  update public.trades
  set
    seller_confirmed_at = case
      when v_actor_id = seller_id then coalesce(seller_confirmed_at, timezone('utc', now()))
      else seller_confirmed_at
    end,
    buyer_confirmed_at = case
      when v_actor_id = buyer_id then coalesce(buyer_confirmed_at, timezone('utc', now()))
      else buyer_confirmed_at
    end,
    completion_note = case
      when v_note_entry is null then completion_note
      when completion_note is null or btrim(completion_note) = '' then v_note_entry
      when completion_note like '%' || v_note_entry || '%' then completion_note
      else completion_note || E'\n' || v_note_entry
    end
  where id = p_trade_id
  returning * into v_trade;

  if v_trade.seller_confirmed_at is not null
     and v_trade.buyer_confirmed_at is not null
     and v_trade.completed_at is null then
    update public.trades
    set
      status = 'completed',
      completed_at = timezone('utc', now()),
      resolved_at = timezone('utc', now())
    where id = p_trade_id
    returning * into v_trade;

    insert into public.reputation_snapshots (trader_id)
    values (v_trade.seller_id), (v_trade.buyer_id)
    on conflict (trader_id) do nothing;

    update public.reputation_snapshots
    set
      completed_trades_count = completed_trades_count + 1,
      updated_at = timezone('utc', now())
    where trader_id in (v_trade.seller_id, v_trade.buyer_id);
  end if;

  return v_trade.id;
end;
$$;

create or replace function public.dispute_my_trade(
  p_trade_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := public.app_current_trader_id();
  v_trade public.trades%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null then
    raise exception 'A dispute reason is required.';
  end if;

  select *
  into v_trade
  from public.trades tr
  where tr.id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade % was not found.', p_trade_id;
  end if;

  if v_actor_id not in (v_trade.seller_id, v_trade.buyer_id) then
    raise exception 'Trader cannot dispute trade %.', p_trade_id;
  end if;

  if v_trade.status = 'disputed' then
    return v_trade.id;
  end if;

  if v_trade.status not in ('pending_completion', 'completed') then
    raise exception 'Trade % cannot be disputed from status %.', p_trade_id, v_trade.status;
  end if;

  update public.trades
  set
    status = 'disputed',
    dispute_reason = v_reason,
    resolved_at = timezone('utc', now())
  where id = p_trade_id
  returning * into v_trade;

  insert into public.reputation_snapshots (trader_id)
  values (v_trade.seller_id), (v_trade.buyer_id)
  on conflict (trader_id) do nothing;

  update public.reputation_snapshots
  set
    dispute_count = dispute_count + 1,
    updated_at = timezone('utc', now())
  where trader_id in (v_trade.seller_id, v_trade.buyer_id);

  return v_trade.id;
end;
$$;

create or replace function public.admin_mark_trade_completed(
  p_trade_id uuid,
  p_resolution_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trade public.trades%rowtype;
  v_note text := nullif(btrim(coalesce(p_resolution_note, '')), '');
begin
  if not public.app_current_trader_is_admin() then
    raise exception 'Admin access is required.';
  end if;

  select *
  into v_trade
  from public.trades tr
  where tr.id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade % was not found.', p_trade_id;
  end if;

  if v_trade.status = 'completed' then
    return v_trade.id;
  end if;

  if v_trade.status not in ('pending_completion', 'disputed') then
    raise exception 'Trade % cannot be completed from status %.', p_trade_id, v_trade.status;
  end if;

  update public.trades
  set
    status = 'completed',
    seller_confirmed_at = coalesce(seller_confirmed_at, timezone('utc', now())),
    buyer_confirmed_at = coalesce(buyer_confirmed_at, timezone('utc', now())),
    completed_at = coalesce(completed_at, timezone('utc', now())),
    dispute_reason = null,
    completion_note = case
      when v_note is null then completion_note
      when completion_note is null or btrim(completion_note) = '' then v_note
      else completion_note || E'\n' || v_note
    end,
    resolved_at = timezone('utc', now())
  where id = p_trade_id
  returning * into v_trade;

  insert into public.reputation_snapshots (trader_id)
  values (v_trade.seller_id), (v_trade.buyer_id)
  on conflict (trader_id) do nothing;

  update public.reputation_snapshots
  set
    completed_trades_count = completed_trades_count + 1,
    updated_at = timezone('utc', now())
  where trader_id in (v_trade.seller_id, v_trade.buyer_id);

  return v_trade.id;
end;
$$;

create or replace function public.admin_mark_trade_reversed(
  p_trade_id uuid,
  p_resolution_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trade public.trades%rowtype;
  v_note text := nullif(btrim(coalesce(p_resolution_note, '')), '');
begin
  if not public.app_current_trader_is_admin() then
    raise exception 'Admin access is required.';
  end if;

  select *
  into v_trade
  from public.trades tr
  where tr.id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade % was not found.', p_trade_id;
  end if;

  if v_trade.status = 'reversed' then
    return v_trade.id;
  end if;

  if v_trade.status not in ('pending_completion', 'disputed') then
    raise exception 'Trade % cannot be reversed from status %.', p_trade_id, v_trade.status;
  end if;

  update public.trades
  set
    status = 'reversed',
    completion_note = case
      when v_note is null then completion_note
      when completion_note is null or btrim(completion_note) = '' then v_note
      else completion_note || E'\n' || v_note
    end,
    resolved_at = timezone('utc', now())
  where id = p_trade_id
  returning * into v_trade;

  insert into public.reputation_snapshots (trader_id)
  values (v_trade.seller_id), (v_trade.buyer_id)
  on conflict (trader_id) do nothing;

  update public.reputation_snapshots
  set
    cancelled_trades_count = cancelled_trades_count + 1,
    updated_at = timezone('utc', now())
  where trader_id in (v_trade.seller_id, v_trade.buyer_id);

  return v_trade.id;
end;
$$;

create or replace function public.upsert_my_wishlist_entry(
  p_entry_id uuid default null,
  p_item_id uuid default null,
  p_priority public.wishlist_priority default 'medium',
  p_desired_quantity integer default 1,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := public.app_current_trader_id();
  v_entry_id uuid;
begin
  if p_item_id is null then
    raise exception 'Wishlist item is required.';
  end if;

  if p_desired_quantity < 1 then
    raise exception 'Desired quantity must be at least 1.';
  end if;

  if p_entry_id is null then
    insert into public.wishlist_entries (
      trader_id,
      item_id,
      priority,
      desired_quantity,
      notes
    )
    values (
      v_actor_id,
      p_item_id,
      p_priority,
      p_desired_quantity,
      nullif(coalesce(p_notes, ''), '')
    )
    on conflict (trader_id, item_id) do update
    set
      priority = excluded.priority,
      desired_quantity = excluded.desired_quantity,
      notes = excluded.notes,
      updated_at = timezone('utc', now())
    returning id into v_entry_id;
  else
    update public.wishlist_entries w
    set
      item_id = p_item_id,
      priority = p_priority,
      desired_quantity = p_desired_quantity,
      notes = nullif(coalesce(p_notes, ''), ''),
      updated_at = timezone('utc', now())
    where w.id = p_entry_id
      and w.trader_id = v_actor_id
    returning w.id into v_entry_id;

    if v_entry_id is null then
      raise exception 'Wishlist entry % was not found for this trader.', p_entry_id;
    end if;
  end if;

  return v_entry_id;
end;
$$;

create or replace function public.delete_my_wishlist_entry(p_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := public.app_current_trader_id();
  v_entry_id uuid;
begin
  delete from public.wishlist_entries w
  where w.id = p_entry_id
    and w.trader_id = v_actor_id
  returning w.id into v_entry_id;

  if v_entry_id is null then
    raise exception 'Wishlist entry % was not found for this trader.', p_entry_id;
  end if;

  return v_entry_id;
end;
$$;

create or replace function public.upsert_my_listing(
  p_listing_id uuid default null,
  p_item_id uuid default null,
  p_target_item_id uuid default null,
  p_quantity_listed integer default 1,
  p_listing_type public.listing_type default 'have_item',
  p_minimum_target_tier public.item_tier default null,
  p_preferred_collections_json jsonb default '[]'::jsonb,
  p_trade_rules_json jsonb default '{}'::jsonb,
  p_notes text default null,
  p_status public.listing_status default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := public.app_current_trader_id();
  v_existing public.listings%rowtype;
  v_inventory public.trader_inventory%rowtype;
  v_target_status public.listing_status;
  v_listing_id uuid;
  v_delta integer;
begin
  if p_item_id is null then
    raise exception 'Listing item is required.';
  end if;

  if p_quantity_listed < 1 then
    raise exception 'Listed quantity must be at least 1.';
  end if;

  if jsonb_typeof(coalesce(p_preferred_collections_json, '[]'::jsonb)) <> 'array' then
    raise exception 'Preferred collections must be a JSON array.';
  end if;

  if jsonb_typeof(coalesce(p_trade_rules_json, '{}'::jsonb)) <> 'object' then
    raise exception 'Trade rules must be a JSON object.';
  end if;

  if p_listing_type = 'wanted_item' and p_target_item_id is null then
    raise exception 'Wanted listings require a target item.';
  end if;

  if p_listing_type = 'wanted_item' and p_target_item_id = p_item_id then
    raise exception 'Wanted listings must target a different item than the listed item.';
  end if;

  if p_listing_id is null then
    select *
    into v_inventory
    from public.trader_inventory ti
    where ti.trader_id = v_actor_id
      and ti.item_id = p_item_id
    for update;

    if not found or v_inventory.quantity_available < p_quantity_listed then
      raise exception 'Not enough available inventory to create this listing.';
    end if;

    insert into public.listings (
      trader_id,
      item_id,
      target_item_id,
      quantity_listed,
      listing_type,
      status,
      minimum_target_tier,
      preferred_collections_json,
      trade_rules_json,
      notes,
      expires_at
    )
    values (
      v_actor_id,
      p_item_id,
      case when p_listing_type = 'wanted_item' then p_target_item_id else null end,
      p_quantity_listed,
      p_listing_type,
      coalesce(p_status, 'active'),
      p_minimum_target_tier,
      coalesce(p_preferred_collections_json, '[]'::jsonb),
      coalesce(p_trade_rules_json, '{}'::jsonb),
      nullif(coalesce(p_notes, ''), ''),
      p_expires_at
    )
    returning id into v_listing_id;

    update public.trader_inventory
    set
      quantity_listed = quantity_listed + p_quantity_listed,
      updated_at = timezone('utc', now())
    where id = v_inventory.id;

    return v_listing_id;
  end if;

  select *
  into v_existing
  from public.listings l
  where l.id = p_listing_id
    and l.trader_id = v_actor_id
  for update;

  if not found then
    raise exception 'Listing % was not found for this trader.', p_listing_id;
  end if;

  if v_existing.status in ('completed', 'expired') then
    raise exception 'Listing % can no longer be edited.', p_listing_id;
  end if;

  v_target_status := coalesce(p_status, v_existing.status);

  if v_target_status not in ('active', 'paused') then
    raise exception 'Listings can only be edited into active or paused status.';
  end if;

  if v_existing.item_id = p_item_id then
    select *
    into v_inventory
    from public.trader_inventory ti
    where ti.trader_id = v_actor_id
      and ti.item_id = p_item_id
    for update;

    v_delta := p_quantity_listed - v_existing.quantity_listed;

    if v_delta > 0 and v_inventory.quantity_available < v_delta then
      raise exception 'Not enough available inventory to increase this listing.';
    end if;

    update public.trader_inventory
    set
      quantity_listed = quantity_listed + v_delta,
      updated_at = timezone('utc', now())
    where id = v_inventory.id;
  else
    update public.trader_inventory
    set
      quantity_listed = quantity_listed - v_existing.quantity_listed,
      updated_at = timezone('utc', now())
    where trader_id = v_actor_id
      and item_id = v_existing.item_id;

    select *
    into v_inventory
    from public.trader_inventory ti
    where ti.trader_id = v_actor_id
      and ti.item_id = p_item_id
    for update;

    if not found or v_inventory.quantity_available < p_quantity_listed then
      raise exception 'Not enough available inventory for the updated listing item.';
    end if;

    update public.trader_inventory
    set
      quantity_listed = quantity_listed + p_quantity_listed,
      updated_at = timezone('utc', now())
    where id = v_inventory.id;
  end if;

  update public.listings
  set
    item_id = p_item_id,
    target_item_id = case when p_listing_type = 'wanted_item' then p_target_item_id else null end,
    quantity_listed = p_quantity_listed,
    listing_type = p_listing_type,
    status = v_target_status,
    minimum_target_tier = p_minimum_target_tier,
    preferred_collections_json = coalesce(p_preferred_collections_json, '[]'::jsonb),
    trade_rules_json = coalesce(p_trade_rules_json, '{}'::jsonb),
    notes = nullif(coalesce(p_notes, ''), ''),
    expires_at = p_expires_at,
    updated_at = timezone('utc', now())
  where id = p_listing_id
  returning id into v_listing_id;

  return v_listing_id;
end;
$$;
create or replace function public.cancel_my_listing(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := public.app_current_trader_id();
  v_listing public.listings%rowtype;
  v_listing_id uuid;
begin
  select *
  into v_listing
  from public.listings l
  where l.id = p_listing_id
    and l.trader_id = v_actor_id
  for update;

  if not found then
    raise exception 'Listing % was not found for this trader.', p_listing_id;
  end if;

  if v_listing.status in ('completed', 'cancelled', 'expired') then
    raise exception 'Listing % can no longer be cancelled.', p_listing_id;
  end if;

  update public.trader_inventory
  set
    quantity_listed = quantity_listed - v_listing.quantity_listed,
    updated_at = timezone('utc', now())
  where trader_id = v_actor_id
    and item_id = v_listing.item_id;

  update public.listings
  set
    status = 'cancelled',
    updated_at = timezone('utc', now())
  where id = p_listing_id
  returning id into v_listing_id;

  update public.offers
  set
    status = 'cancelled',
    updated_at = timezone('utc', now())
  where listing_id = p_listing_id
    and status = 'pending';

  return v_listing_id;
end;
$$;

comment on function public.app_current_trader_id() is 'Resolves the current trader from the authenticated Supabase user, linking by email when possible and auto-creating a trader desk when none exists yet.';
comment on function public.app_current_trader_is_admin() is 'Returns true when the authenticated trader is allowed to moderate invites, disputes, and completion review.';
comment on function public.get_admin_trade_oversight() is 'Returns the live admin moderation queue for pending-completion and disputed trades.';
comment on function public.get_my_trader_workspace() is 'Returns the current authenticated trader workspace as JSON.';
comment on function public.get_my_buddy() is 'Returns the authenticated trader buddy_key selection.';
comment on function public.is_valid_month_day(integer, integer) is 'Validates birthday month/day combinations without requiring a birth year.';
comment on function public.get_zodiac_key(integer, integer) is 'Returns the zodiac badge key for a valid birthday month/day.';
comment on function public.get_my_birthday() is 'Returns the authenticated trader birthday identity fields and computed zodiac key.';
comment on function public.set_my_buddy(text) is 'Updates the authenticated trader buddy_key selection.';
comment on function public.get_my_profile_identity() is 'Returns the authenticated trader profile identity badge fields.';
comment on function public.set_my_birthday(integer, integer) is 'Sets the authenticated trader birthday identity once and locks it for future edits.';
comment on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) is 'Updates the authenticated trader profile fields used by the desk identity surface.';
comment on function public.create_my_offer_from_bundle(uuid, text, public.fairness_label, numeric, jsonb) is 'Auth-backed wrapper for creating a pending offer from a JSON bundle.';
comment on function public.withdraw_my_offer(uuid) is 'Auth-backed wrapper for withdrawing a pending outgoing offer.';
comment on function public.reject_my_offer(uuid) is 'Auth-backed wrapper for rejecting a pending incoming offer.';
comment on function public.accept_my_offer(uuid) is 'Auth-backed wrapper for accepting a pending incoming offer and moving the trade into pending completion.';
comment on function public.confirm_my_trade_completion(uuid, text) is 'Marks the authenticated trader side as completed and finalizes the trade when both sides confirm.';
comment on function public.dispute_my_trade(uuid, text) is 'Marks a trade as disputed for the authenticated trader and records the dispute reason.';
comment on function public.admin_mark_trade_completed(uuid, text) is 'Allows an authenticated admin to close a pending or disputed trade into the completed ledger.';
comment on function public.admin_mark_trade_reversed(uuid, text) is 'Allows an authenticated admin to reverse a pending or disputed trade after manual review.';
comment on function public.upsert_my_wishlist_entry(uuid, uuid, public.wishlist_priority, integer, text) is 'Creates or updates a wishlist entry for the authenticated trader.';
comment on function public.delete_my_wishlist_entry(uuid) is 'Deletes a wishlist entry for the authenticated trader.';
comment on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) is 'Creates or updates a listing while keeping trader_inventory.quantity_listed in sync.';
comment on function public.cancel_my_listing(uuid) is 'Cancels a listing, releases listed quantity back to inventory, and cancels pending offers.';

revoke execute on function public.app_trader_id(text) from public;
revoke execute on function public.get_wiki_item_catalog(integer) from public;
revoke execute on function public.search_wiki_item_catalog(text, text, text, integer) from public;
revoke execute on function public.get_trader_workspace(text) from public;
revoke execute on function public.create_offer_from_bundle(text, uuid, text, public.fairness_label, numeric, jsonb) from public;
revoke execute on function public.withdraw_offer(text, uuid) from public;
revoke execute on function public.reject_offer(text, uuid) from public;
revoke execute on function public.accept_offer(text, uuid) from public;
revoke execute on function public.app_current_trader_id() from public;
revoke execute on function public.app_current_trader_is_admin() from public;
revoke execute on function public.get_admin_trade_oversight() from public;
revoke execute on function public.get_my_trader_workspace() from public;
revoke execute on function public.is_valid_month_day(integer, integer) from public;
revoke execute on function public.get_zodiac_key(integer, integer) from public;
revoke execute on function public.get_my_buddy() from public;
revoke execute on function public.get_my_profile_identity() from public;
revoke execute on function public.get_my_birthday() from public;
revoke execute on function public.set_my_buddy(text) from public;
revoke execute on function public.set_my_birthday(integer, integer) from public;
revoke execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) from public;
revoke execute on function public.create_my_offer_from_bundle(uuid, text, public.fairness_label, numeric, jsonb) from public;
revoke execute on function public.withdraw_my_offer(uuid) from public;
revoke execute on function public.reject_my_offer(uuid) from public;
revoke execute on function public.accept_my_offer(uuid) from public;
revoke execute on function public.confirm_my_trade_completion(uuid, text) from public;
revoke execute on function public.dispute_my_trade(uuid, text) from public;
revoke execute on function public.admin_mark_trade_completed(uuid, text) from public;
revoke execute on function public.admin_mark_trade_reversed(uuid, text) from public;
revoke execute on function public.upsert_my_wishlist_entry(uuid, uuid, public.wishlist_priority, integer, text) from public;
revoke execute on function public.delete_my_wishlist_entry(uuid) from public;
revoke execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) from public;
revoke execute on function public.cancel_my_listing(uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.app_trader_id(text) from anon;
    revoke execute on function public.get_wiki_item_catalog(integer) from anon;
    revoke execute on function public.search_wiki_item_catalog(text, text, text, integer) from anon;
    revoke execute on function public.get_trader_workspace(text) from anon;
    revoke execute on function public.create_offer_from_bundle(text, uuid, text, public.fairness_label, numeric, jsonb) from anon;
    revoke execute on function public.withdraw_offer(text, uuid) from anon;
    revoke execute on function public.reject_offer(text, uuid) from anon;
    revoke execute on function public.accept_offer(text, uuid) from anon;
    revoke execute on function public.app_current_trader_id() from anon;
    revoke execute on function public.app_current_trader_is_admin() from anon;
    revoke execute on function public.get_admin_trade_oversight() from anon;
    revoke execute on function public.get_my_trader_workspace() from anon;
    revoke execute on function public.is_valid_month_day(integer, integer) from anon;
    revoke execute on function public.get_zodiac_key(integer, integer) from anon;
    revoke execute on function public.get_my_buddy() from anon;
    revoke execute on function public.get_my_profile_identity() from anon;
    revoke execute on function public.get_my_birthday() from anon;
    revoke execute on function public.set_my_buddy(text) from anon;
    revoke execute on function public.set_my_birthday(integer, integer) from anon;
    revoke execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) from anon;
    revoke execute on function public.create_my_offer_from_bundle(uuid, text, public.fairness_label, numeric, jsonb) from anon;
    revoke execute on function public.withdraw_my_offer(uuid) from anon;
    revoke execute on function public.reject_my_offer(uuid) from anon;
    revoke execute on function public.accept_my_offer(uuid) from anon;
    revoke execute on function public.confirm_my_trade_completion(uuid, text) from anon;
    revoke execute on function public.dispute_my_trade(uuid, text) from anon;
    revoke execute on function public.admin_mark_trade_completed(uuid, text) from anon;
    revoke execute on function public.admin_mark_trade_reversed(uuid, text) from anon;
    revoke execute on function public.upsert_my_wishlist_entry(uuid, uuid, public.wishlist_priority, integer, text) from anon;
    revoke execute on function public.delete_my_wishlist_entry(uuid) from anon;
    revoke execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) from anon;
    revoke execute on function public.cancel_my_listing(uuid) from anon;
    grant execute on function public.get_wiki_item_catalog(integer) to anon;
    grant execute on function public.search_wiki_item_catalog(text, text, text, integer) to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.app_trader_id(text) from authenticated;
    revoke execute on function public.get_wiki_item_catalog(integer) from authenticated;
    revoke execute on function public.search_wiki_item_catalog(text, text, text, integer) from authenticated;
    revoke execute on function public.get_trader_workspace(text) from authenticated;
    revoke execute on function public.create_offer_from_bundle(text, uuid, text, public.fairness_label, numeric, jsonb) from authenticated;
    revoke execute on function public.withdraw_offer(text, uuid) from authenticated;
    revoke execute on function public.reject_offer(text, uuid) from authenticated;
    revoke execute on function public.accept_offer(text, uuid) from authenticated;
    revoke execute on function public.app_current_trader_id() from authenticated;
    revoke execute on function public.app_current_trader_is_admin() from authenticated;
    revoke execute on function public.get_admin_trade_oversight() from authenticated;
    revoke execute on function public.get_my_trader_workspace() from authenticated;
    revoke execute on function public.is_valid_month_day(integer, integer) from authenticated;
    revoke execute on function public.get_zodiac_key(integer, integer) from authenticated;
    revoke execute on function public.get_my_buddy() from authenticated;
    revoke execute on function public.get_my_profile_identity() from authenticated;
    revoke execute on function public.get_my_birthday() from authenticated;
    revoke execute on function public.set_my_buddy(text) from authenticated;
    revoke execute on function public.set_my_birthday(integer, integer) from authenticated;
    revoke execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) from authenticated;
    revoke execute on function public.create_my_offer_from_bundle(uuid, text, public.fairness_label, numeric, jsonb) from authenticated;
    revoke execute on function public.withdraw_my_offer(uuid) from authenticated;
    revoke execute on function public.reject_my_offer(uuid) from authenticated;
    revoke execute on function public.accept_my_offer(uuid) from authenticated;
    revoke execute on function public.confirm_my_trade_completion(uuid, text) from authenticated;
    revoke execute on function public.dispute_my_trade(uuid, text) from authenticated;
    revoke execute on function public.admin_mark_trade_completed(uuid, text) from authenticated;
    revoke execute on function public.admin_mark_trade_reversed(uuid, text) from authenticated;
    revoke execute on function public.upsert_my_wishlist_entry(uuid, uuid, public.wishlist_priority, integer, text) from authenticated;
    revoke execute on function public.delete_my_wishlist_entry(uuid) from authenticated;
    revoke execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) from authenticated;
    revoke execute on function public.cancel_my_listing(uuid) from authenticated;
    grant execute on function public.get_wiki_item_catalog(integer) to authenticated;
    grant execute on function public.search_wiki_item_catalog(text, text, text, integer) to authenticated;
    grant execute on function public.get_my_trader_workspace() to authenticated;
    grant execute on function public.is_valid_month_day(integer, integer) to authenticated;
    grant execute on function public.get_zodiac_key(integer, integer) to authenticated;
    grant execute on function public.get_my_buddy() to authenticated;
    grant execute on function public.get_my_profile_identity() to authenticated;
    grant execute on function public.get_my_birthday() to authenticated;
    grant execute on function public.set_my_buddy(text) to authenticated;
    grant execute on function public.set_my_birthday(integer, integer) to authenticated;
    grant execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) to authenticated;
    grant execute on function public.create_my_offer_from_bundle(uuid, text, public.fairness_label, numeric, jsonb) to authenticated;
    grant execute on function public.withdraw_my_offer(uuid) to authenticated;
    grant execute on function public.reject_my_offer(uuid) to authenticated;
    grant execute on function public.accept_my_offer(uuid) to authenticated;
    grant execute on function public.confirm_my_trade_completion(uuid, text) to authenticated;
    grant execute on function public.dispute_my_trade(uuid, text) to authenticated;
    grant execute on function public.get_admin_trade_oversight() to authenticated;
    grant execute on function public.admin_mark_trade_completed(uuid, text) to authenticated;
    grant execute on function public.admin_mark_trade_reversed(uuid, text) to authenticated;
    grant execute on function public.upsert_my_wishlist_entry(uuid, uuid, public.wishlist_priority, integer, text) to authenticated;
    grant execute on function public.delete_my_wishlist_entry(uuid) to authenticated;
    grant execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) to authenticated;
    grant execute on function public.cancel_my_listing(uuid) to authenticated;
  end if;
end $$;


