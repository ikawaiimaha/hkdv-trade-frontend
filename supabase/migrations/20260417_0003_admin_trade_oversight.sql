-- Adds admin-linked trader moderation, live oversight queue RPCs, and auth grants for completion review.

alter table public.traders add column if not exists is_admin boolean not null default false;
comment on column public.traders.is_admin is 'Allows invite, moderation, and dispute-resolution actions in the trader OS.';

comment on function public.accept_offer(text, uuid) is 'Accepts a pending incoming offer, transfers inventory, completes the listing, and creates a pending-completion trade record.';

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
    t.is_admin,
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
          'is_admin', t.is_admin,
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

comment on function public.app_current_trader_id() is 'Resolves the current trader from the authenticated Supabase user and links auth_user_id when email matches.';
comment on function public.app_current_trader_is_admin() is 'Returns true when the authenticated trader is allowed to moderate invites, disputes, and completion review.';
comment on function public.get_admin_trade_oversight() is 'Returns the live admin moderation queue for pending-completion and disputed trades.';
comment on function public.get_my_trader_workspace() is 'Returns the current authenticated trader workspace as JSON.';
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

