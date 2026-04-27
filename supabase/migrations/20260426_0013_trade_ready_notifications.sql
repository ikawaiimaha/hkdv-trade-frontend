do $$ begin
  create type public.notification_type as enum (
    'wishlist_match',
    'trade_completed',
    'offer_received',
    'offer_accepted',
    'trade_ready'
  );
exception when duplicate_object then null; end $$;

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

alter table public.notifications enable row level security;
alter table public.trade_events enable row level security;

create index if not exists idx_notifications_trader_created
  on public.notifications (trader_id, is_read, created_at desc);

create unique index if not exists idx_notifications_trade_ready_pair
  on public.notifications (trader_id, type, listing_id, offered_item_id, requested_item_id)
  where type = 'trade_ready';

create index if not exists idx_trade_events_trader_created
  on public.trade_events (trader_id, created_at desc);

create index if not exists idx_trade_events_type_created
  on public.trade_events (event_type, created_at desc);

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
          + greatest(0, 260 - abs(bti.offered_value - lv.requested_value))
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
notifications as (
  select
    n.id,
    n.trader_id,
    n.type,
    n.title,
    n.body,
    n.seller_trader_id,
    n.buyer_trader_id,
    n.listing_id,
    n.item_id,
    n.offered_item_id,
    n.requested_item_id,
    n.priority,
    n.match_score,
    n.fairness_score,
    n.action_payload,
    n.is_read,
    n.created_at,
    seller.username as seller_username,
    offered_item.name as offered_item_name,
    requested_item.name as requested_item_name
  from public.notifications n
  left join public.traders seller
    on seller.id = n.seller_trader_id
  left join public.items offered_item
    on offered_item.id = n.offered_item_id
  left join public.items requested_item
    on requested_item.id = n.requested_item_id
  left join public.listings l
    on l.id = n.listing_id
  left join public.trader_inventory ti
    on ti.trader_id = n.trader_id
   and ti.item_id = n.offered_item_id
  where n.trader_id = (select id from current_trader)
    and (
      n.type <> 'trade_ready'
      or (
        coalesce(l.status, 'cancelled') = 'active'
        and coalesce(ti.quantity_available, 0) > 0
      )
    )
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
  'notifications',
  (
    select coalesce(
      jsonb_agg(
        to_jsonb(n)
        order by n.is_read asc, coalesce(n.match_score, 0) desc, n.created_at desc
      ),
      '[]'::jsonb
    )
    from notifications n
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

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_notification_id uuid;
begin
  update public.notifications n
  set
    is_read = true,
    read_at = coalesce(n.read_at, timezone('utc', now()))
  where n.id = p_notification_id
    and n.trader_id = v_trader_id
  returning n.id into v_notification_id;

  if v_notification_id is null then
    raise exception 'Notification % was not found for this trader.', p_notification_id;
  end if;

  return v_notification_id;
end;
$$;

create or replace function public.track_trade_event(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_event_type text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_event_id uuid;
begin
  if v_event_type is null then
    raise exception 'Trade event type is required.';
  end if;

  if p_metadata is not null and jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Trade event metadata must be a JSON object.';
  end if;

  insert into public.trade_events (
    trader_id,
    event_type,
    metadata
  )
  values (
    v_trader_id,
    v_event_type,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

grant execute on function public.mark_my_notification_read(uuid) to authenticated;
grant execute on function public.track_trade_event(text, jsonb) to authenticated;
