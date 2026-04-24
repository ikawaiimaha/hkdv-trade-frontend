-- Refresh the auth-backed RPC layer for pending completion trades and wanted-item listings.

DROP FUNCTION IF EXISTS public.upsert_my_listing(uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, text, public.listing_status, timestamptz);

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
    t.status,
    t.avatar_url
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
          'status', t.status,
          'avatar_url', t.avatar_url
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
  from public.trader_inventory ti
  where ti.trader_id = v_offer.seller_id
    and ti.item_id = v_offer.listing_item_id
    and ti.quantity_owned >= v_offer.quantity_listed
    and ti.quantity_listed >= v_offer.quantity_listed
  for update;

  if not found then
    raise exception 'Seller inventory is not available for accepted listing item.';
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
      raise exception 'Buyer inventory is no longer available for item %.', v_requested.item_id;
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
    status = case when id = p_offer_id then 'accepted' else 'cancelled' end,
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
comment on function public.accept_offer(text, uuid) is 'Accepts a pending incoming offer, transfers inventory, finalizes the listing, and creates trade records.';


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

comment on function public.app_current_trader_id() is 'Resolves the current trader from the authenticated Supabase user and links auth_user_id when email matches.';
comment on function public.get_my_trader_workspace() is 'Returns the current authenticated trader workspace as JSON.';
comment on function public.create_my_offer_from_bundle(uuid, text, public.fairness_label, numeric, jsonb) is 'Auth-backed wrapper for creating a pending offer from a JSON bundle.';
comment on function public.withdraw_my_offer(uuid) is 'Auth-backed wrapper for withdrawing a pending outgoing offer.';
comment on function public.reject_my_offer(uuid) is 'Auth-backed wrapper for rejecting a pending incoming offer.';

comment on function public.accept_my_offer(uuid) is 'Auth-backed wrapper for accepting a pending incoming offer and moving the trade into pending completion.';
comment on function public.confirm_my_trade_completion(uuid, text) is 'Marks the authenticated trader side as completed and finalizes the trade when both sides confirm.';
comment on function public.dispute_my_trade(uuid, text) is 'Marks a trade as disputed for the authenticated trader and records the dispute reason.';
comment on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) is 'Creates or updates a listing while keeping trader_inventory.quantity_listed in sync.';
comment on function public.cancel_my_listing(uuid) is 'Cancels a listing, releases listed quantity back to inventory, and cancels pending offers.';

revoke execute on function public.get_trader_workspace(text) from public;
revoke execute on function public.accept_offer(text, uuid) from public;
revoke execute on function public.get_my_trader_workspace() from public;
revoke execute on function public.accept_my_offer(uuid) from public;
revoke execute on function public.confirm_my_trade_completion(uuid, text) from public;
revoke execute on function public.dispute_my_trade(uuid, text) from public;
revoke execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) from public;
revoke execute on function public.cancel_my_listing(uuid) from public;

do 
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.get_trader_workspace(text) from anon;
    revoke execute on function public.accept_offer(text, uuid) from anon;
    revoke execute on function public.get_my_trader_workspace() from anon;
    revoke execute on function public.accept_my_offer(uuid) from anon;
    revoke execute on function public.confirm_my_trade_completion(uuid, text) from anon;
    revoke execute on function public.dispute_my_trade(uuid, text) from anon;
    revoke execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) from anon;
    revoke execute on function public.cancel_my_listing(uuid) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.get_trader_workspace(text) from authenticated;
    revoke execute on function public.accept_offer(text, uuid) from authenticated;
    revoke execute on function public.get_my_trader_workspace() from authenticated;
    revoke execute on function public.accept_my_offer(uuid) from authenticated;
    revoke execute on function public.confirm_my_trade_completion(uuid, text) from authenticated;
    revoke execute on function public.dispute_my_trade(uuid, text) from authenticated;
    revoke execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) from authenticated;
    revoke execute on function public.cancel_my_listing(uuid) from authenticated;
    grant execute on function public.get_my_trader_workspace() to authenticated;
    grant execute on function public.accept_my_offer(uuid) to authenticated;
    grant execute on function public.confirm_my_trade_completion(uuid, text) to authenticated;
    grant execute on function public.dispute_my_trade(uuid, text) to authenticated;
    grant execute on function public.upsert_my_listing(uuid, uuid, uuid, integer, public.listing_type, public.item_tier, jsonb, jsonb, text, public.listing_status, timestamptz) to authenticated;
    grant execute on function public.cancel_my_listing(uuid) to authenticated;
  end if;
end ;
