-- Promote rows from public.wiki_item_catalog into public.items.
-- Run after:
--   1. supabase/schema.sql
--   2. supabase/seed.sql
--   3. supabase/generated/wiki-item-catalog.seed.sql
--
-- Then execute:
--   select * from public.sync_items_from_wiki_catalog();

create or replace function public.hkdv_category_from_type(item_type text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '_' from regexp_replace(lower(coalesce(item_type, '')), '[^a-z0-9]+', '_', 'g')),
      ''
    ),
    'misc'
  );
$$;

create or replace function public.hkdv_generated_item_code(wiki_key text)
returns text
language sql
immutable
as $$
  select 'HKDV-WIKI-' || upper(replace(coalesce(nullif(wiki_key, ''), md5('missing-wiki-key')), ' ', '-'));
$$;

create or replace function public.hkdv_base_common_units(wiki_rarity text)
returns numeric
language sql
immutable
as $$
  select case upper(coalesce(wiki_rarity, ''))
    when 'S' then 4
    when 'R' then 2
    else 1
  end;
$$;

create or replace function public.hkdv_source_multiplier(source_type public.item_source_type)
returns numeric
language sql
immutable
as $$
  select case source_type
    when 'standard' then 1.5
    when 'basic_style' then 2
    when 'sweet_collection' then 2
    when 'lucky_bag' then 2
    when 'hour_48' then 2
    when 'day_3' then 2
    when 'hour_24' then 3
    when 'hour_24_sweet_collection' then 4
    else 1
  end;
$$;

create or replace function public.hkdv_time_multiplier(release_window public.item_release_window)
returns numeric
language sql
immutable
as $$
  select case release_window
    when 'launch_2021' then 4.5
    when 'late_2021' then 4
    when 'early_2022' then 3
    when 'late_2022' then 2
    when 'year_2025_plus' then 0.9
    else 1
  end;
$$;

create or replace function public.hkdv_demand_multiplier(demand_level public.demand_level)
returns numeric
language sql
immutable
as $$
  select case demand_level
    when 'high' then 1.35
    when 'medium' then 1.15
    else 1
  end;
$$;

create or replace function public.hkdv_release_window_from_wiki(
  source_page_title text,
  source_type public.item_source_type
)
returns public.item_release_window
language sql
immutable
as $$
  with normalized as (
    select lower(coalesce(source_page_title, '')) as title
  )
  select (
    case
      when title ~ '2026|2025' then 'year_2025_plus'
      when title ~ '2024' then 'late_2024'
      when title ~ '2023' then 'late_2023'
      when title ~ '2022' then 'early_2022'
      when title ~ '2021' and source_type in ('standard', 'hour_48') then 'launch_2021'
      when title ~ '2021' then 'late_2021'
      when source_type in ('standard', 'hour_48') then 'launch_2021'
      when source_type = 'basic_style' then 'late_2023'
      when source_type in ('hour_24', 'hour_24_sweet_collection', 'day_3', 'sweet_collection', 'lucky_bag', 'regular_happy_bag', 'attendance') then 'early_2024'
      when source_type = 'event' then 'late_2024'
      else 'early_2024'
    end
  )::public.item_release_window
  from normalized;
$$;

create or replace function public.hkdv_demand_level_from_wiki(
  wiki_rarity text,
  source_type public.item_source_type,
  item_type text
)
returns public.demand_level
language sql
immutable
as $$
  select (
    case
      when source_type in ('standard', 'hour_48', 'hour_24', 'hour_24_sweet_collection') then 'high'
      when upper(coalesce(wiki_rarity, '')) = 'S' then 'high'
      when upper(coalesce(wiki_rarity, '')) = 'R' then 'medium'
      when source_type in ('basic_style', 'sweet_collection', 'lucky_bag', 'day_3', 'event', 'attendance') then 'medium'
      when lower(coalesce(item_type, '')) like '%flower%' then 'medium'
      else 'low'
    end
  )::public.demand_level;
$$;

create or replace function public.hkdv_demand_score(demand_level public.demand_level)
returns integer
language sql
immutable
as $$
  select case demand_level
    when 'high' then 90
    when 'medium' then 68
    else 45
  end;
$$;

create or replace function public.hkdv_is_event_item(
  source_page_title text,
  source_type public.item_source_type
)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select lower(coalesce(source_page_title, '')) as title
  )
  select
    source_type in ('event', 'hour_48', 'hour_24', 'hour_24_sweet_collection', 'day_3')
    or title ~ 'event|anniversary|birthday|halloween|christmas|holiday|festival|summer|spring|winter|valentine'
  from normalized;
$$;

create or replace function public.hkdv_is_limited_item(source_type public.item_source_type)
returns boolean
language sql
immutable
as $$
  select source_type in ('event', 'standard', 'hour_48', 'hour_24', 'hour_24_sweet_collection', 'day_3');
$$;

create or replace view public.wiki_item_catalog_promotions as
with normalized as (
  select
    w.wiki_key,
    w.page_title as name,
    public.hkdv_generated_item_code(w.wiki_key) as item_code,
    coalesce(
      w.inferred_item_tier,
      case upper(coalesce(w.wiki_rarity, ''))
        when 'S' then 'SSR'::public.item_tier
        when 'R' then 'SR'::public.item_tier
        else 'R'::public.item_tier
      end
    ) as tier,
    case upper(coalesce(w.wiki_rarity, ''))
      when 'S' then 'S'::public.item_wiki_rarity
      when 'R' then 'R'::public.item_wiki_rarity
      else 'N'::public.item_wiki_rarity
    end as wiki_rarity,
    coalesce(nullif(w.source_collection_title, ''), nullif(w.source_page_title, ''), 'Unknown Collection') as collection_name,
    public.hkdv_category_from_type(w.item_type) as category,
    coalesce(w.inferred_source_type, 'regular_happy_bag'::public.item_source_type) as source_type,
    public.hkdv_release_window_from_wiki(
      coalesce(w.source_page_title, w.source_collection_title),
      coalesce(w.inferred_source_type, 'regular_happy_bag'::public.item_source_type)
    ) as release_window,
    public.hkdv_demand_level_from_wiki(
      w.wiki_rarity,
      coalesce(w.inferred_source_type, 'regular_happy_bag'::public.item_source_type),
      w.item_type
    ) as demand_level,
    public.hkdv_demand_score(
      public.hkdv_demand_level_from_wiki(
        w.wiki_rarity,
        coalesce(w.inferred_source_type, 'regular_happy_bag'::public.item_source_type),
        w.item_type
      )
    ) as demand_score,
    coalesce(w.thumbnail_url, w.image_url, w.original_image_url) as image_url,
    w.source_page_url,
    coalesce(w.page_url, w.source_page_url) as wiki_page_url,
    public.hkdv_is_event_item(
      coalesce(w.source_page_title, w.source_collection_title),
      coalesce(w.inferred_source_type, 'regular_happy_bag'::public.item_source_type)
    ) as is_event_item,
    public.hkdv_is_limited_item(
      coalesce(w.inferred_source_type, 'regular_happy_bag'::public.item_source_type)
    ) as is_limited,
    w.source_kind,
    w.source_page_title,
    w.source_collection_title
  from public.wiki_item_catalog w
),
valued as (
  select
    n.*,
    coalesce(r.base_common_units, public.hkdv_base_common_units(n.wiki_rarity::text)) as base_common_units,
    coalesce(r.source_multiplier, public.hkdv_source_multiplier(n.source_type)) as source_multiplier,
    coalesce(r.time_multiplier, public.hkdv_time_multiplier(n.release_window)) as time_multiplier,
    coalesce(r.modifier_score, public.hkdv_demand_multiplier(n.demand_level)) as demand_multiplier
  from normalized n
  left join lateral (
    select
      r.base_common_units,
      r.source_multiplier,
      r.time_multiplier,
      r.modifier_score
    from public.item_value_rules r
    where r.active
      and r.wiki_rarity = n.wiki_rarity
      and r.source_type = n.source_type
      and r.release_window = n.release_window
      and (r.demand_level = n.demand_level or r.demand_level is null)
    order by
      case when r.demand_level is null then 1 else 0 end,
      r.updated_at desc
    limit 1
  ) r on true
)
select
  wiki_key,
  item_code,
  name,
  tier,
  wiki_rarity,
  collection_name,
  category,
  source_type,
  release_window,
  demand_level,
  demand_score,
  image_url,
  source_page_url,
  wiki_page_url,
  round((base_common_units * source_multiplier * time_multiplier)::numeric, 2) as projected_value,
  round((base_common_units * source_multiplier * time_multiplier * demand_multiplier)::numeric, 2) as community_value,
  format(
    'Promoted from wiki_item_catalog via %s (%s).',
    coalesce(source_page_title, source_collection_title, 'unknown source'),
    replace(source_kind, '_', ' ')
  ) as value_notes,
  is_event_item,
  is_limited,
  format(
    'Synced from wiki source %s.',
    coalesce(source_page_title, source_collection_title, 'unknown source')
  ) as notes
from valued;

create or replace function public.sync_items_from_wiki_catalog(limit_rows integer default null)
returns table(updated_count integer, inserted_count integer)
language plpgsql
as $$
begin
  return query
  with source_rows as (
    select *
    from public.wiki_item_catalog_promotions
    order by name
    limit case when limit_rows is null or limit_rows < 1 then 2147483647 else limit_rows end
  ),
  updated as (
    update public.items as i
    set
      tier = s.tier,
      wiki_rarity = s.wiki_rarity,
      collection_name = s.collection_name,
      category = s.category,
      source_type = s.source_type,
      release_window = s.release_window,
      demand_level = s.demand_level,
      demand_score = s.demand_score,
      image_url = coalesce(s.image_url, i.image_url),
      source_page_url = coalesce(s.source_page_url, i.source_page_url),
      wiki_page_url = coalesce(s.wiki_page_url, i.wiki_page_url),
      projected_value = s.projected_value,
      community_value = s.community_value,
      value_notes = s.value_notes,
      is_event_item = s.is_event_item,
      is_limited = s.is_limited,
      notes = s.notes,
      updated_at = timezone('utc', now())
    from source_rows s
    where lower(i.name) = lower(s.name)
    returning i.id
  ),
  inserted as (
    insert into public.items (
      item_code,
      name,
      tier,
      wiki_rarity,
      collection_name,
      category,
      source_type,
      release_window,
      demand_level,
      demand_score,
      image_url,
      source_page_url,
      wiki_page_url,
      projected_value,
      community_value,
      value_notes,
      is_event_item,
      is_limited,
      notes
    )
    select
      s.item_code,
      s.name,
      s.tier,
      s.wiki_rarity,
      s.collection_name,
      s.category,
      s.source_type,
      s.release_window,
      s.demand_level,
      s.demand_score,
      s.image_url,
      s.source_page_url,
      s.wiki_page_url,
      s.projected_value,
      s.community_value,
      s.value_notes,
      s.is_event_item,
      s.is_limited,
      s.notes
    from source_rows s
    where not exists (
      select 1
      from public.items i
      where lower(i.name) = lower(s.name)
    )
    returning id
  )
  select
    (select count(*)::integer from updated),
    (select count(*)::integer from inserted);
end;
$$;

comment on view public.wiki_item_catalog_promotions is 'Normalized HKDV wiki staging rows, ready to promote into public.items.';
comment on function public.sync_items_from_wiki_catalog(integer) is 'Updates existing items by case-insensitive name match and inserts missing HKDV items from public.wiki_item_catalog.';
