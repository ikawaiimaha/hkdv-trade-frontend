-- Test catalog seed for the real HKDV schema.
-- Safe to run even if the optional public.collections table is not present.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'collections'
  ) then
    begin
      insert into public.collections (
        id,
        name,
        slug,
        image_url,
        character,
        source_type,
        description,
        released_at,
        is_limited,
        is_active,
        sort_order
      )
      values (
        'c1111111-1111-1111-1111-111111111111',
        'Strawberry Milk Cafe',
        'strawberry-milk-cafe',
        'https://placehold.co/400x300/FFEAF3/FF8CC6?text=Strawberry+Milk+Cafe',
        'Hello Kitty',
        'happy_bag',
        'A dreamy cafe collection featuring strawberry-themed treats and pastel decor.',
        '2026-04-01',
        true,
        true,
        1
      )
      on conflict (id) do update
      set
        name = excluded.name,
        slug = excluded.slug,
        image_url = excluded.image_url,
        character = excluded.character,
        source_type = excluded.source_type,
        description = excluded.description,
        released_at = excluded.released_at,
        is_limited = excluded.is_limited,
        is_active = excluded.is_active,
        sort_order = excluded.sort_order;
    exception
      when others then
        raise notice 'Skipping public.collections seed: %', sqlerrm;
    end;
  end if;
end $$;

insert into public.items (
  id,
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
  projected_value,
  community_value,
  is_limited,
  notes
)
values
  (
    'i1111111-1111-1111-1111-111111111111',
    'SMC-001',
    'Strawberry Milk Maid Dress',
    'SR',
    'R',
    'Strawberry Milk Cafe',
    'fashion',
    'regular_happy_bag',
    'year_2025_plus',
    'high',
    12,
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Maid+Dress',
    350,
    380,
    true,
    'Test item for the Strawberry Milk Cafe catalog section.'
  ),
  (
    'i1111111-1111-1111-1111-111111111112',
    'SMC-002',
    'Giant Strawberry Plush',
    'R',
    'R',
    'Strawberry Milk Cafe',
    'interior',
    'regular_happy_bag',
    'year_2025_plus',
    'medium',
    8,
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Plush',
    180,
    210,
    true,
    'Test item for the Strawberry Milk Cafe catalog section.'
  ),
  (
    'i1111111-1111-1111-1111-111111111113',
    'SMC-003',
    'Cafe Waitress Ribbon',
    'C',
    'N',
    'Strawberry Milk Cafe',
    'fashion',
    'regular_happy_bag',
    'year_2025_plus',
    'low',
    3,
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Ribbon',
    80,
    95,
    true,
    'Test item for the Strawberry Milk Cafe catalog section.'
  ),
  (
    'i1111111-1111-1111-1111-111111111114',
    'SMC-004',
    'Strawberry Parfait Tower',
    'SSR',
    'S',
    'Strawberry Milk Cafe',
    'interior',
    'regular_happy_bag',
    'year_2025_plus',
    'high',
    24,
    'https://placehold.co/150x150/FFEAF3/FF3B93?text=Parfait',
    700,
    760,
    true,
    'Test item for the Strawberry Milk Cafe catalog section.'
  ),
  (
    'i1111111-1111-1111-1111-111111111115',
    'SMC-005',
    'Milkshake Counter Set',
    'R',
    'R',
    'Strawberry Milk Cafe',
    'interior',
    'regular_happy_bag',
    'year_2025_plus',
    'medium',
    6,
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Counter',
    190,
    205,
    true,
    'Test item for the Strawberry Milk Cafe catalog section.'
  ),
  (
    'i1111111-1111-1111-1111-111111111116',
    'SMC-006',
    'Pink Latte Art Mug',
    'C',
    'N',
    'Strawberry Milk Cafe',
    'interior',
    'regular_happy_bag',
    'year_2025_plus',
    'low',
    4,
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Mug',
    75,
    90,
    true,
    'Test item for the Strawberry Milk Cafe catalog section.'
  )
on conflict (id) do update
set
  item_code = excluded.item_code,
  name = excluded.name,
  tier = excluded.tier,
  wiki_rarity = excluded.wiki_rarity,
  collection_name = excluded.collection_name,
  category = excluded.category,
  source_type = excluded.source_type,
  release_window = excluded.release_window,
  demand_level = excluded.demand_level,
  demand_score = excluded.demand_score,
  image_url = excluded.image_url,
  projected_value = excluded.projected_value,
  community_value = excluded.community_value,
  is_limited = excluded.is_limited,
  notes = excluded.notes,
  updated_at = timezone('utc', now());
