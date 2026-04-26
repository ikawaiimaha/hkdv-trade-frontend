-- ============================================================================
-- 🍓 MomoMint Test Data — Happy Bag: Strawberry Milk Cafe
-- Run this in your Supabase SQL Editor to populate the catalog
-- ============================================================================

-- 1. Insert the Happy Bag Collection
insert into collections (id, name, slug, image_url, character, source_type, description, released_at, is_limited, is_active, sort_order)
values (
  'c1111111-1111-1111-1111-111111111111',
  'Strawberry Milk Cafe',
  'strawberry-milk-cafe',
  'https://placehold.co/400x300/FFEAF3/FF8CC6?text=Strawberry+Milk+Cafe',
  'Hello Kitty',
  'happy_bag',
  'A dreamy cafe collection featuring strawberry-themed treats and pastel decor. From the Hello Kitty Dream Village Wiki.',
  '2026-04-01',
  true,
  true,
  1
)
on conflict (id) do nothing;

-- 2. Insert Items for the Collection
insert into items (id, name, item_code, rarity, collection_id, collection_name, category, character, image_url, is_limited, wishlist_count, created_at)
values
  (
    'i1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Maid Dress',
    'SMC-001',
    'SR',
    'c1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Cafe',
    'fashion',
    'Hello Kitty',
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Maid+Dress',
    true,
    12,
    now()
  ),
  (
    'i1111111-1111-1111-1111-111111111112',
    'Giant Strawberry Plush',
    'SMC-002',
    'R',
    'c1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Cafe',
    'interior',
    'Hello Kitty',
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Plush',
    true,
    8,
    now()
  ),
  (
    'i1111111-1111-1111-1111-111111111113',
    'Cafe Waitress Ribbon',
    'SMC-003',
    'N',
    'c1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Cafe',
    'fashion',
    'Hello Kitty',
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Ribbon',
    true,
    3,
    now()
  ),
  (
    'i1111111-1111-1111-1111-111111111114',
    'Strawberry Parfait Tower',
    'SMC-004',
    'SSR',
    'c1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Cafe',
    'interior',
    'Hello Kitty',
    'https://placehold.co/150x150/FFEAF3/FF3B93?text=Parfait',
    true,
    24,
    now()
  ),
  (
    'i1111111-1111-1111-1111-111111111115',
    'Milkshake Counter Set',
    'SMC-005',
    'R',
    'c1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Cafe',
    'interior',
    'Hello Kitty',
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Counter',
    true,
    6,
    now()
  ),
  (
    'i1111111-1111-1111-1111-111111111116',
    'Pink Latte Art Mug',
    'SMC-006',
    'N',
    'c1111111-1111-1111-1111-111111111111',
    'Strawberry Milk Cafe',
    'interior',
    'Hello Kitty',
    'https://placehold.co/150x150/FFEAF3/FF8CC6?text=Mug',
    true,
    4,
    now()
  )
on conflict (id) do nothing;

-- ============================================================================
-- ✅ Test data inserted!
-- Visit /collection/c1111111-1111-1111-1111-111111111111 to see it live.
-- ============================================================================
