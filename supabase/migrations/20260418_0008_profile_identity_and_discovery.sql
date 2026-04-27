alter table public.traders add column if not exists buddy_name text;
alter table public.traders add column if not exists strawberry_rank integer not null default 0;
alter table public.traders add column if not exists profile_code text;
alter table public.traders add column if not exists is_profile_code_visible boolean not null default false;

update public.traders
set
  buddy_name = case id
    when '00000000-0000-0000-0000-000000000001' then 'Mikaela'
    when '00000000-0000-0000-0000-000000000002' then 'My Melody'
    when '00000000-0000-0000-0000-000000000003' then 'Pompompurin'
    when '00000000-0000-0000-0000-000000000004' then 'Kuromi'
    when '00000000-0000-0000-0000-000000000005' then 'Cinnamoroll'
    else buddy_name
  end,
  strawberry_rank = case id
    when '00000000-0000-0000-0000-000000000001' then 74
    when '00000000-0000-0000-0000-000000000002' then 66
    when '00000000-0000-0000-0000-000000000003' then 58
    when '00000000-0000-0000-0000-000000000004' then 39
    when '00000000-0000-0000-0000-000000000005' then 22
    else coalesce(strawberry_rank, 0)
  end,
  profile_code = case id
    when '00000000-0000-0000-0000-000000000001' then 'HKDV-SORA-041'
    when '00000000-0000-0000-0000-000000000002' then 'HKDV-MIKA-112'
    else profile_code
  end,
  is_profile_code_visible = case id
    when '00000000-0000-0000-0000-000000000001' then true
    else coalesce(is_profile_code_visible, false)
  end,
  updated_at = timezone('utc', now())
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);

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
    t.buddy_name,
    t.strawberry_rank,
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
          'buddy_name', t.buddy_name,
          'strawberry_rank', t.strawberry_rank,
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

create or replace function public.upsert_my_trader_profile(
  p_display_name text,
  p_buddy_name text default null,
  p_strawberry_rank integer default 0,
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
  v_profile_code text := nullif(upper(trim(coalesce(p_profile_code, ''))), '');
  v_payload jsonb;
begin
  if v_display_name is null then
    raise exception 'Display name is required.';
  end if;

  update public.traders
  set
    display_name = v_display_name,
    buddy_name = nullif(trim(coalesce(p_buddy_name, '')), ''),
    strawberry_rank = greatest(coalesce(p_strawberry_rank, 0), 0),
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

comment on function public.upsert_my_trader_profile(text, text, integer, text, boolean) is 'Updates the authenticated trader profile fields used by the desk identity surface.';

revoke execute on function public.upsert_my_trader_profile(text, text, integer, text, boolean) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.upsert_my_trader_profile(text, text, integer, text, boolean) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.upsert_my_trader_profile(text, text, integer, text, boolean) from authenticated;
    grant execute on function public.upsert_my_trader_profile(text, text, integer, text, boolean) to authenticated;
  end if;
end $$;
