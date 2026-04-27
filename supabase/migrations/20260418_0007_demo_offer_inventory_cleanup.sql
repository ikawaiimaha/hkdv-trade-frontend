-- Cleans up the remaining seeded demo-offer inconsistency and makes
-- accept_offer() respect both active and paused listing reservations.

do $$
declare
  v_repair_tag constant text := '[demo integrity repair 20260418_0007]';
begin
  -- Fresh/live demo projects originally seeded Sora with only one Beloved
  -- Ribbon Flower while also seeding both an active listing and a pending
  -- outgoing offer that spend that same item. If the row still matches that
  -- stale state, add the missing second copy once.
  if exists (
    select 1
    from public.trader_inventory ti
    join public.offers o
      on o.id = '60000000-0000-0000-0000-000000000003'
    where ti.id = '30000000-0000-0000-0000-000000000005'
      and ti.trader_id = '00000000-0000-0000-0000-000000000001'
      and ti.item_id = '10000000-0000-0000-0000-000000000007'
      and ti.quantity_owned = 1
      and ti.quantity_listed = 1
      and o.status = 'pending'
      and coalesce(ti.source_note, '') not like '%' || v_repair_tag || '%'
  ) then
    update public.trader_inventory
    set
      quantity_owned = 2,
      source_note = 'Launch-era pair: one stays listed, one only moves in premium target swaps. ' || v_repair_tag,
      updated_at = timezone('utc', now())
    where id = '30000000-0000-0000-0000-000000000005';
  end if;
end $$;

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
