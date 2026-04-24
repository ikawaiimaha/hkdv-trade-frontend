-- Repairs early live seed inconsistencies:
-- 1. seeded incoming offers referenced trader inventory rows that were never inserted
-- 2. the archived completed trade pointed at an unrelated active listing/offer pair

insert into public.trader_inventory (
  id,
  trader_id,
  item_id,
  quantity_owned,
  quantity_listed,
  is_tradeable_duplicate,
  source_note
)
values
  ('30000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, 0, true, 'Held for older-source flower trades.'),
  ('30000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 2, 0, true, 'Spare My Melody flower bundle support.'),
  ('30000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 1, 0, false, 'Single Lucky Clover wall for balanced room swaps.'),
  ('30000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1, 0, false, 'Wishlist target kept nearby for cross-character trades.'),
  ('30000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 2, 1, true, 'One wall posted, one kept in reserve for room-piece swaps.'),
  ('30000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 1, 0, false, 'Testing a lightweight permanent-for-standard wall swap.'),
  ('30000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 1, 0, false, 'Bed filler used in bundle offers.')
on conflict (trader_id, item_id) do update
set
  quantity_owned = greatest(public.trader_inventory.quantity_owned, excluded.quantity_owned),
  quantity_listed = greatest(public.trader_inventory.quantity_listed, excluded.quantity_listed),
  is_tradeable_duplicate = public.trader_inventory.is_tradeable_duplicate or excluded.is_tradeable_duplicate,
  source_note = coalesce(public.trader_inventory.source_note, excluded.source_note),
  updated_at = timezone('utc', now());

insert into public.listings (
  id,
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
values
  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', null, 1, 'have_item', 'completed', 'SR', '["BASIC STYLE Pompompurin", "Standard Style My Melody"]', '{"archive_only": true}', 'Historical completed wall swap kept for desk history seeding.', null)
on conflict (id) do update
set
  trader_id = excluded.trader_id,
  item_id = excluded.item_id,
  target_item_id = excluded.target_item_id,
  quantity_listed = excluded.quantity_listed,
  listing_type = excluded.listing_type,
  status = excluded.status,
  minimum_target_tier = excluded.minimum_target_tier,
  preferred_collections_json = excluded.preferred_collections_json,
  trade_rules_json = excluded.trade_rules_json,
  notes = excluded.notes,
  expires_at = excluded.expires_at,
  updated_at = timezone('utc', now());

insert into public.offers (
  id,
  listing_id,
  seller_id,
  buyer_id,
  status,
  fairness_label,
  fairness_score,
  buyer_note,
  seller_note,
  created_at
)
values
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'accepted', 'fair', 1.00, 'Old completed swap from the archive desk.', 'Closed cleanly.', '2026-04-09T13:20:00Z')
on conflict (id) do update
set
  listing_id = excluded.listing_id,
  seller_id = excluded.seller_id,
  buyer_id = excluded.buyer_id,
  status = excluded.status,
  fairness_label = excluded.fairness_label,
  fairness_score = excluded.fairness_score,
  buyer_note = excluded.buyer_note,
  seller_note = excluded.seller_note,
  created_at = excluded.created_at,
  updated_at = timezone('utc', now());

insert into public.offer_items (
  id,
  offer_id,
  item_id,
  quantity,
  value_snapshot
)
values
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 1, 92)
on conflict (id) do update
set
  offer_id = excluded.offer_id,
  item_id = excluded.item_id,
  quantity = excluded.quantity,
  value_snapshot = excluded.value_snapshot;

update public.trades
set
  listing_id = '50000000-0000-0000-0000-000000000006',
  accepted_offer_id = '60000000-0000-0000-0000-000000000004'
where id = '80000000-0000-0000-0000-000000000001';

insert into public.reputation_snapshots (
  id,
  trader_id,
  completed_trades_count,
  accepted_offers_count,
  rejected_offers_count,
  cancelled_trades_count,
  dispute_count,
  reputation_score
)
values
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 19, 22, 6, 1, 0, 76),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 11, 9, 4, 0, 0, 71),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 16, 14, 3, 1, 0, 79),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 7, 5, 8, 1, 1, 58)
on conflict (trader_id) do update
set
  completed_trades_count = excluded.completed_trades_count,
  accepted_offers_count = excluded.accepted_offers_count,
  rejected_offers_count = excluded.rejected_offers_count,
  cancelled_trades_count = excluded.cancelled_trades_count,
  dispute_count = excluded.dispute_count,
  reputation_score = excluded.reputation_score,
  updated_at = timezone('utc', now());
