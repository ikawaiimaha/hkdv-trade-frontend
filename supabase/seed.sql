insert into public.traders (
  id,
  username,
  email,
  is_admin,
  display_name,
  passcode_hash,
  status,
  avatar_url,
  buddy_key,
  buddy_name,
  strawberry_title,
  profile_code,
  is_profile_code_visible,
  birth_month,
  birth_day,
  birthday_locked,
  birthday_set_at
)
values
  ('00000000-0000-0000-0000-000000000001', 'sora_desk', 'sora@hkdvtrade.local', true, 'Sora Desk', 'seed-passcode', 'active', '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png', 'my_melody', 'My Melody', 'Strawberry Cake', 'HKDV-SORA-041', true, 4, 23, true, '2026-04-01T09:00:00Z'),
  ('00000000-0000-0000-0000-000000000002', 'mika_mirror', 'mika@hkdvtrade.local', false, 'Mika Mirror', 'seed-passcode', 'active', '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png', 'my_melody', 'My Melody', 'Strawberry Parfait', 'HKDV-MIKA-112', false, 5, 8, true, '2026-04-02T09:00:00Z'),
  ('00000000-0000-0000-0000-000000000003', 'hana_collects', 'hana@hkdvtrade.local', false, 'Hana Collects', 'seed-passcode', 'active', '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png', 'pompompurin', 'Pompompurin', 'Strawberry Parfait', null, false, 11, 27, true, '2026-04-04T09:00:00Z'),
  ('00000000-0000-0000-0000-000000000004', 'emi_events', 'emi@hkdvtrade.local', false, 'Emi Events', 'seed-passcode', 'invited', '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png', 'kuromi', 'Kuromi', 'Strawberry Milk', null, false, null, null, false, null),
  ('00000000-0000-0000-0000-000000000005', 'rin_bagrun', 'rin@hkdvtrade.local', false, 'Rin Bag Run', 'seed-passcode', 'suspended', '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png', 'cinnamoroll', 'Cinnamoroll', 'Strawberry Cookie', null, false, 2, 12, true, '2026-04-05T09:00:00Z')
on conflict (id) do nothing;

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
  source_page_url,
  wiki_page_url,
  projected_value,
  community_value,
  value_notes,
  is_event_item,
  is_limited,
  notes
)
values
  ('10000000-0000-0000-0000-000000000001', 'HKDV-BS-HK-001', 'Hello Kitty Apple Ribbon Flower', 'SSR', 'S', 'BASIC STYLE Hello Kitty', 'flower', 'basic_style', 'late_2023', 'high', 88, null, 'https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_Hello_Kitty', null, 8.00, 10.80, 'Wiki bag table lists this as an S rarity permanent Basic Style pull.', false, false, 'High-demand Hello Kitty flower from the Basic Style refresh.'),
  ('10000000-0000-0000-0000-000000000002', 'HKDV-BS-HK-002', 'Hello Kitty Ruffle Wall', 'SSR', 'S', 'BASIC STYLE Hello Kitty', 'interior', 'basic_style', 'late_2023', 'medium', 73, null, 'https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_Hello_Kitty', null, 8.00, 9.20, 'Outdoor-style walls trend upward on the wiki FAQ because they stay popular in trades.', false, false, 'A clean Hello Kitty wall that fits the popular-wall trend.'),
  ('10000000-0000-0000-0000-000000000003', 'HKDV-BS-HK-003', 'Hello Kitty Sleep Tight Bed', 'SR', 'R', 'BASIC STYLE Hello Kitty', 'interior', 'basic_style', 'late_2023', 'medium', 61, null, 'https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_Hello_Kitty', null, 4.00, 4.60, 'R rarity Basic Style interior from the Hello Kitty permanent bag.', false, false, 'A solid mid-tier bed that traders use as bundle support.'),
  ('10000000-0000-0000-0000-000000000004', 'HKDV-BS-MM-001', 'My Melody Fairy Tale Pot Flower', 'SSR', 'S', 'BASIC STYLE My Melody', 'flower', 'basic_style', 'early_2024', 'high', 91, null, 'https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_My_Melody', null, 8.00, 10.80, 'Listed as an S rarity item on the Basic Style My Melody bag.', false, false, 'One of the stronger flower asks in this mock desk because demand stays high.'),
  ('10000000-0000-0000-0000-000000000005', 'HKDV-BS-MM-002', 'My Melody Fairy Tale Canopy Bed', 'SR', 'R', 'BASIC STYLE My Melody', 'interior', 'basic_style', 'early_2024', 'high', 84, null, 'https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_My_Melody', null, 4.00, 5.40, 'High-demand R rarity bed from the Basic Style My Melody bag.', false, false, 'A cozy bed that still gets a premium because the room set remains popular.'),
  ('10000000-0000-0000-0000-000000000006', 'HKDV-BS-PP-001', 'Pompompurin Lucky Clover Wall', 'SSR', 'S', 'BASIC STYLE Pompompurin', 'interior', 'basic_style', 'early_2024', 'medium', 69, null, 'https://hellokittydreamvillage.wiki.gg/wiki/BASIC_STYLE%E2%99%A1_Pompompurin', null, 8.00, 9.20, 'S rarity wall from the Basic Style Pompompurin bag.', false, false, 'Useful for traders who prefer warm interiors over raw rarity stacking.'),
  ('10000000-0000-0000-0000-000000000007', 'HKDV-STD-MM-001', 'My Melody''s Beloved Ribbon Flower', 'SSR', 'S', 'Standard Style My Melody', 'flower', 'standard', 'launch_2021', 'high', 95, null, 'https://hellokittydreamvillage.wiki.gg/wiki/Standard_Style_My_Melody', null, 27.00, 36.45, 'Standard 2021 origin makes the wiki-projected value materially higher than modern permanent bags.', false, true, 'A launch-era standard flower that trades above most recent permanent pulls.'),
  ('10000000-0000-0000-0000-000000000008', 'HKDV-48H-POP-001', 'Pop-Up Store Wall', 'SSR', 'S', 'Sanrio Characters POP-UP', 'interior', 'hour_48', 'launch_2021', 'high', 99, null, 'https://hellokittydreamvillage.wiki.gg/wiki/Pop-Up_Store_Wall', 'https://hellokittydreamvillage.wiki.gg/wiki/Pop-Up_Store_Wall', 36.00, 48.60, 'Wiki page explicitly calls this a first-ever 48 hour bag item and likely extinct.', true, true, 'This is the premium anchor in the mock catalog and should usually require a serious bundle.')
on conflict (id) do nothing;

insert into public.item_value_rules (
  id,
  wiki_rarity,
  source_type,
  release_window,
  demand_level,
  base_common_units,
  source_multiplier,
  time_multiplier,
  modifier_score,
  active,
  notes
)
values
  ('20000000-0000-0000-0000-000000000001', 'S', 'basic_style', 'late_2023', 'high', 4, 2, 1, 1.35, true, 'Modern high-demand Basic Style S rarity.'),
  ('20000000-0000-0000-0000-000000000002', 'S', 'standard', 'launch_2021', 'high', 4, 1.5, 4.5, 1.35, true, 'Launch-era standard high-demand S rarity.'),
  ('20000000-0000-0000-0000-000000000003', 'S', 'hour_48', 'launch_2021', 'high', 4, 2, 4.5, 1.35, true, 'Launch-era 48 hour bag high-demand S rarity.'),
  ('20000000-0000-0000-0000-000000000004', 'R', 'basic_style', 'early_2024', 'high', 2, 2, 1, 1.35, true, 'Modern Basic Style high-demand rare.')
on conflict (id) do nothing;

insert into public.trader_inventory (id, trader_id, item_id, quantity_owned, quantity_listed, is_tradeable_duplicate, source_note)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 3, 1, true, 'Pulled after the Basic Style Hello Kitty refresh.'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 2, 0, true, 'Comfort duplicate from a permanent reroll session.'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 1, 0, false, 'Favorite flower, not usually for trade.'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 2, 1, true, 'Recent My Melody duplicate.'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 2, 1, false, 'Launch-era pair: one stays listed, one only moves in premium target swaps.'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 1, 1, false, 'Extinct-looking wall listed for serious offers only.'),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 2, 0, true, 'Lucky Clover wall dupe from Pompompurin day.'),
  ('30000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 3, 1, true, 'One flower is posted for an exact-target swap, two stay loose for negotiation bundles.'),
  ('30000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 2, 0, true, 'Spare My Melody flower bundle support.'),
  ('30000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 1, 0, false, 'Single Lucky Clover wall for balanced room swaps.'),
  ('30000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 1, 1, false, 'Posted for an exact-item swap on the live board.'),
  ('30000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 2, 1, true, 'One wall posted, one kept in reserve for room-piece swaps.'),
  ('30000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 1, 0, false, 'Testing a lightweight permanent-for-standard wall swap.'),
  ('30000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 1, 0, false, 'Bed filler used in bundle offers.')
on conflict (id) do nothing;

insert into public.wishlist_entries (id, trader_id, item_id, priority, desired_quantity, notes)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'high', 1, 'Top permanent target from the Hello Kitty Basic Style catalog.'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'high', 1, 'Only worth chasing with a real bundle because the wiki marks it likely extinct.'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'medium', 1, 'Would still take one more for room-building trades.')
on conflict (id) do nothing;

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
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 1, 'wanted_item', 'active', 'SR', '["BASIC STYLE My Melody", "BASIC STYLE Hello Kitty"]', '{"prefer_exact_target": true}', 'Permanent flowers first, old standards welcome.', '2026-04-20T18:00:00Z'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', null, 1, 'have_item', 'active', 'SR', '["BASIC STYLE Pompompurin", "BASIC STYLE Hello Kitty"]', '{}'::jsonb, 'Open to clean room pieces, not random filler.', '2026-04-19T15:30:00Z'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 1, 'wanted_item', 'active', 'SR', '["BASIC STYLE My Melody"]', '{"prefer_exact_target": true}', 'Would like floral pieces or older standard flowers back.', '2026-04-22T10:00:00Z'),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', null, 1, 'have_item', 'active', 'SSR', '["Standard Style My Melody", "BASIC STYLE Hello Kitty"]', '{"wall_for_wall": true}', 'Old-source value matters more than raw count here.', '2026-04-21T12:00:00Z'),
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 1, 'wanted_item', 'active', 'SSR', '["BASIC STYLE Hello Kitty", "BASIC STYLE My Melody"]', '{"prefer_exact_target": true}', 'Will consider modern S-rarity only if demand is strong.', '2026-04-18T09:00:00Z'),
  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', null, 1, 'have_item', 'completed', 'SR', '["BASIC STYLE Pompompurin", "Standard Style My Melody"]', '{"archive_only": true}', 'Historical completed wall swap kept for desk history seeding.', null)
on conflict (id) do nothing;

insert into public.offers (
  id, listing_id, seller_id, buyer_id, status, fairness_label, fairness_score, buyer_note, seller_note, created_at
)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'pending', 'fair', 1.04, 'Both pieces are on current trend lists, so I think this is close.', '', '2026-04-16T06:10:00Z'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'pending', 'underpay', 0.68, 'Trying a light permanent-for-standard swap first.', '', '2026-04-15T20:45:00Z'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'pending', 'fair', 0.98, 'Offering older-source value plus one modern room piece.', '', '2026-04-16T05:20:00Z'),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'accepted', 'fair', 1.00, 'Old completed swap from the archive desk.', 'Closed cleanly.', '2026-04-09T13:20:00Z')
on conflict (id) do nothing;

insert into public.offer_items (id, offer_id, item_id, quantity, value_snapshot)
values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2, 108),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 2, 108),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 1, 92),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 1, 92),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 1, 46),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', 1, 365),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 1, 46),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 1, 92)
on conflict (id) do nothing;

insert into public.trades (id, listing_id, accepted_offer_id, seller_id, buyer_id, status, completed_at, created_at)
values
  ('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'completed', '2026-04-09T14:30:00Z', '2026-04-09T13:50:00Z')
on conflict (id) do nothing;

insert into public.trade_items (id, trade_id, from_trader_id, to_trader_id, item_id, quantity)
values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 1),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 1)
on conflict (id) do nothing;

insert into public.reputation_snapshots (
  id, trader_id, completed_trades_count, accepted_offers_count, rejected_offers_count, cancelled_trades_count, dispute_count, reputation_score
)
values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 48, 63, 17, 2, 0, 88),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 19, 22, 6, 1, 0, 76),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 11, 9, 4, 0, 0, 71),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 16, 14, 3, 1, 0, 79),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 7, 5, 8, 1, 1, 58)
on conflict (id) do nothing;
