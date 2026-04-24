import { findWikiImageEntry } from "./wikiMedia";
import { hasSupabaseRestEnv, requestSupabaseRpc } from "./supabaseRest";
import {
  buddyKeyFromLegacyName,
  getBuddyLabel,
  getZodiacKey,
} from "./profileArt";

const SOURCE_LABELS = {
  regular_happy_bag: "Regular Happy Bag",
  event: "Event",
  attendance: "Attendance",
  standard: "Standard / Retired",
  basic_style: "Basic Style / Permanent",
  sweet_collection: "Sweet Collection",
  lucky_bag: "Lucky Bag",
  hour_48: "48-Hour / Likely Extinct",
  day_3: "3-Day Limited",
  hour_24: "24-Hour Limited",
  hour_24_sweet_collection: "24-Hour Sweet Collection",
};

const RELEASE_LABELS = {
  launch_2021: "Launch 2021",
  late_2021: "Late 2021",
  early_2022: "Early 2022",
  late_2022: "Late 2022",
  early_2023: "Early 2023",
  late_2023: "Late 2023",
  early_2024: "Early 2024",
  late_2024: "Late 2024",
  year_2025_plus: "2025+",
};

function toneFromSourceType(sourceType) {
  switch (sourceType) {
    case "hour_48":
      return "#8f85ff";
    case "standard":
      return "#e76aa6";
    case "basic_style":
      return "#ff8bb6";
    case "lucky_bag":
      return "#f4c75d";
    default:
      return "#ffbed4";
  }
}

function normalizeLegacyStrawberryTitle(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  const numericValue = Number(value) || 0;

  if (numericValue >= 70) {
    return "Strawberry Cake";
  }

  if (numericValue >= 55) {
    return "Strawberry Parfait";
  }

  if (numericValue >= 40) {
    return "Strawberry Milk";
  }

  if (numericValue >= 25) {
    return "Strawberry Macaron";
  }

  if (numericValue >= 10) {
    return "Strawberry Cookie";
  }

  return "Strawberry Syrup";
}

function mapTrader(trader, fallbackUsername) {
  if (!trader) {
    return null;
  }

  return {
    id: trader.id,
    username: trader.username,
    displayName: trader.display_name,
    buddyKey: trader.buddy_key ?? buddyKeyFromLegacyName(trader.buddy_name) ?? null,
    buddyName: getBuddyLabel(trader.buddy_key ?? trader.buddy_name),
    prideFlagKey: trader.pride_flag_key ?? null,
    strawberryTitle: normalizeLegacyStrawberryTitle(trader.strawberry_title ?? trader.strawberry_rank),
    profileCode: trader.profile_code ?? "",
    isProfileCodeVisible: Boolean(trader.is_profile_code_visible),
    isAdmin: Boolean(trader.is_admin),
    status: trader.status,
    avatarUrl: trader.avatar_url ?? null,
    createdAt: trader.created_at ?? null,
    birthMonth: trader.birth_month ?? null,
    birthDay: trader.birth_day ?? null,
    birthdayLocked: Boolean(trader.birthday_locked),
    birthdaySetAt: trader.birthday_set_at ?? null,
    zodiacKey:
      trader.zodiac_key ?? getZodiacKey(trader.birth_month, trader.birth_day),
    deskTag: trader.username === fallbackUsername ? "Supabase live desk" : `Desk ${trader.username}`,
    responseWindow: trader.username === fallbackUsername ? "Backed by Supabase" : "Trader profile",
  };
}

function mergeBirthdayIdentity(trader, payload) {
  if (!trader || !payload) {
    return trader;
  }

  return {
    ...trader,
    birthMonth: payload.birth_month ?? null,
    birthDay: payload.birth_day ?? null,
    birthdayLocked: Boolean(payload.birthday_locked),
    birthdaySetAt: payload.birthday_set_at ?? null,
    zodiacKey:
      payload.zodiac_key ?? getZodiacKey(payload.birth_month, payload.birth_day),
  };
}

function mergeProfileIdentity(trader, payload) {
  if (!trader || !payload) {
    return trader;
  }

  return {
    ...trader,
    prideFlagKey: payload.pride_flag_key ?? trader.prideFlagKey ?? null,
  };
}

function mapItem(item) {
  const wikiMatch = findWikiImageEntry(item.name);

  return {
    id: item.id,
    itemCode: item.item_code,
    name: item.name,
    tier: item.tier,
    wikiRarity: item.wiki_rarity,
    collectionName: item.collection_name,
    category: item.category,
    sourceType: item.source_type,
    sourceLabel: SOURCE_LABELS[item.source_type] ?? item.source_type,
    releaseWindow: item.release_window,
    releaseLabel: RELEASE_LABELS[item.release_window] ?? item.release_window,
    demandLevel: item.demand_level,
    demandScore: item.demand_score,
    imageAccent: toneFromSourceType(item.source_type),
    imageUrl: item.image_url ?? wikiMatch?.image_url ?? null,
    sourcePageUrl: item.source_page_url ?? wikiMatch?.source_page_url ?? null,
    wikiPageUrl: item.wiki_page_url ?? wikiMatch?.page_url ?? null,
    isEventItem: item.is_event_item,
    isLimited: item.is_limited,
    valueNote: item.value_notes ?? "",
    notes: item.notes ?? "",
  };
}

function mapInventoryEntry(entry) {
  return {
    id: entry.id,
    traderId: entry.trader_id,
    itemId: entry.item_id,
    quantityOwned: entry.quantity_owned,
    quantityListed: entry.quantity_listed,
    isTradeableDuplicate: entry.is_tradeable_duplicate,
    sourceNote: entry.source_note ?? "Supabase import",
  };
}

function mapWishlistEntry(entry) {
  return {
    id: entry.id,
    traderId: entry.trader_id,
    itemId: entry.item_id,
    priority: entry.priority,
    desiredQuantity: entry.desired_quantity,
    notes: entry.notes ?? "",
  };
}

function mapListing(entry) {
  return {
    id: entry.id,
    traderId: entry.trader_id,
    itemId: entry.item_id,
    targetItemId: entry.target_item_id ?? null,
    quantityListed: entry.quantity_listed,
    listingType: entry.listing_type,
    status: entry.status,
    minimumTargetTier: entry.minimum_target_tier,
    preferredCollections: entry.preferred_collections_json ?? [],
    tradeRules: entry.trade_rules_json ?? {},
    notes: entry.notes ?? "",
    expiresAt: entry.expires_at,
  };
}

function mapOfferItem(entry) {
  return {
    itemId: entry.item_id,
    quantity: entry.quantity,
    valueSnapshot: entry.value_snapshot,
  };
}

function mapOffer(entry) {
  return {
    id: entry.id,
    listingId: entry.listing_id,
    sellerId: entry.seller_id,
    buyerId: entry.buyer_id,
    status: entry.status,
    fairnessLabel: entry.fairness_label,
    fairnessScore: Number(entry.fairness_score),
    buyerNote: entry.buyer_note ?? "",
    sellerNote: entry.seller_note ?? "",
    createdAt: entry.created_at,
    offerItems: (entry.offer_items ?? []).map(mapOfferItem),
  };
}

function mapTradeItem(entry) {
  return {
    fromTraderId: entry.from_trader_id,
    toTraderId: entry.to_trader_id,
    itemId: entry.item_id,
    quantity: entry.quantity,
  };
}

function mapTrade(entry) {
  return {
    id: entry.id,
    listingId: entry.listing_id,
    acceptedOfferId: entry.accepted_offer_id,
    sellerId: entry.seller_id,
    buyerId: entry.buyer_id,
    status: entry.status,
    sellerConfirmedAt: entry.seller_confirmed_at ?? null,
    buyerConfirmedAt: entry.buyer_confirmed_at ?? null,
    completedAt: entry.completed_at,
    disputeReason: entry.dispute_reason ?? "",
    completionNote: entry.completion_note ?? "",
    resolvedAt: entry.resolved_at ?? null,
    createdAt: entry.created_at,
    tradeItems: (entry.trade_items ?? []).map(mapTradeItem),
  };
}

function mapReputation(entry, traderId) {
  if (!entry) {
    return {
      traderId,
      completedTradesCount: 0,
      acceptedOffersCount: 0,
      rejectedOffersCount: 0,
      cancelledTradesCount: 0,
      disputeCount: 0,
      responseRate: 100,
      reputationScore: 0,
    };
  }

  return {
    traderId: entry.trader_id,
    completedTradesCount: entry.completed_trades_count,
    acceptedOffersCount: entry.accepted_offers_count,
    rejectedOffersCount: entry.rejected_offers_count,
    cancelledTradesCount: entry.cancelled_trades_count,
    disputeCount: entry.dispute_count,
    responseRate: entry.response_rate ?? 100,
    reputationScore: entry.reputation_score,
  };
}

function mapCollectionProgress(entry) {
  return {
    collectionName: entry.collection_name,
    sourceType: entry.source_type,
    sourceLabel: SOURCE_LABELS[entry.source_type] ?? entry.source_type,
    releaseWindow: entry.release_window,
    releaseLabel: RELEASE_LABELS[entry.release_window] ?? entry.release_window,
    totalItems: entry.total_items ?? 0,
    ownedItems: entry.owned_items ?? 0,
  };
}

function mapWorkspacePayload(payload) {
  const trader = mapTrader(payload.current_trader, payload.current_trader?.username);

  return {
    currentTrader: trader,
    traderDirectory: (payload.trader_directory ?? []).map((entry) =>
      mapTrader(entry, payload.current_trader?.username)
    ),
    items: (payload.items ?? []).map(mapItem),
    inventory: (payload.inventory ?? []).map(mapInventoryEntry),
    wishlistEntries: (payload.wishlist_entries ?? []).map(mapWishlistEntry),
    marketListings: (payload.market_listings ?? []).map(mapListing),
    myListings: (payload.my_listings ?? []).map(mapListing),
    incomingOffers: (payload.incoming_offers ?? []).map(mapOffer),
    outgoingOffers: (payload.outgoing_offers ?? []).map(mapOffer),
    tradeHistory: (payload.trade_history ?? []).map(mapTrade),
    collectionProgress: (payload.collection_progress ?? []).map(mapCollectionProgress),
    reputationSnapshot: mapReputation(payload.reputation_snapshot, trader?.id ?? null),
  };
}

export function hasSupabaseWorkspaceEnv() {
  return hasSupabaseRestEnv();
}

async function loadOptionalBirthdayIdentity() {
  try {
    const rows = await requestSupabaseRpc("get_my_birthday");
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

async function loadOptionalProfileIdentity() {
  try {
    const rows = await requestSupabaseRpc("get_my_profile_identity");
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function loadTraderWorkspaceWithSource() {
  const [payload, birthdayRows, profileIdentityRows] = await Promise.all([
    requestSupabaseRpc("get_my_trader_workspace"),
    loadOptionalBirthdayIdentity(),
    loadOptionalProfileIdentity(),
  ]);
  const workspace = mapWorkspacePayload(payload);

  return {
    source: "supabase",
    workspace: {
      ...workspace,
      currentTrader: mergeProfileIdentity(
        mergeBirthdayIdentity(workspace.currentTrader, birthdayRows),
        profileIdentityRows
      ),
    },
  };
}

export async function loadAdminTradeOversight() {
  const payload = await requestSupabaseRpc("get_admin_trade_oversight");
  return (payload ?? []).map(mapTrade);
}

export async function createOfferFromBundle({
  listingId,
  buyerNote,
  fairnessLabel,
  fairnessScore,
  offerItems,
}) {
  return requestSupabaseRpc("create_my_offer_from_bundle", {
    p_listing_id: listingId,
    p_buyer_note: buyerNote,
    p_fairness_label: fairnessLabel,
    p_fairness_score: fairnessScore,
    p_offer_items: offerItems.map((item) => ({
      item_id: item.itemId,
      quantity: item.quantity,
      value_snapshot: item.valueSnapshot,
    })),
  });
}

export async function withdrawWorkspaceOffer(offerId) {
  return requestSupabaseRpc("withdraw_my_offer", {
    p_offer_id: offerId,
  });
}

export async function rejectIncomingWorkspaceOffer(offerId) {
  return requestSupabaseRpc("reject_my_offer", {
    p_offer_id: offerId,
  });
}

export async function acceptIncomingWorkspaceOffer(offerId) {
  return requestSupabaseRpc("accept_my_offer", {
    p_offer_id: offerId,
  });
}

export async function upsertWishlistEntry({
  entryId,
  itemId,
  priority,
  desiredQuantity,
  notes,
}) {
  return requestSupabaseRpc("upsert_my_wishlist_entry", {
    p_entry_id: entryId ?? null,
    p_item_id: itemId,
    p_priority: priority,
    p_desired_quantity: desiredQuantity,
    p_notes: notes,
  });
}

export async function deleteWishlistEntry(entryId) {
  return requestSupabaseRpc("delete_my_wishlist_entry", {
    p_entry_id: entryId,
  });
}

export async function upsertTraderProfile({
  displayName,
  buddyKey,
  prideFlagKey,
  strawberryTitle,
  profileCode,
  isProfileCodeVisible,
}) {
  return requestSupabaseRpc("upsert_my_trader_profile", {
    p_display_name: displayName,
    p_buddy_key: buddyKey ?? null,
    p_pride_flag_key: prideFlagKey ?? null,
    p_strawberry_title: strawberryTitle ?? "Strawberry Syrup",
    p_profile_code: profileCode ?? null,
    p_is_profile_code_visible: Boolean(isProfileCodeVisible),
  });
}

export async function setMyBirthday({ birthMonth, birthDay }) {
  const rows = await requestSupabaseRpc("set_my_birthday", {
    p_birth_month: birthMonth,
    p_birth_day: birthDay,
  });

  return rows?.[0] ?? null;
}

export async function upsertListing({
  listingId,
  itemId,
  targetItemId,
  quantityListed,
  listingType,
  minimumTargetTier,
  preferredCollections,
  tradeRules,
  notes,
  status,
}) {
  return requestSupabaseRpc("upsert_my_listing", {
    p_listing_id: listingId ?? null,
    p_item_id: itemId,
    p_target_item_id: targetItemId ?? null,
    p_quantity_listed: quantityListed,
    p_listing_type: listingType,
    p_minimum_target_tier: minimumTargetTier ?? null,
    p_preferred_collections_json: preferredCollections ?? [],
    p_trade_rules_json: tradeRules ?? {},
    p_notes: notes ?? "",
    p_status: status ?? null,
  });
}

export async function cancelListing(listingId) {
  return requestSupabaseRpc("cancel_my_listing", {
    p_listing_id: listingId,
  });
}

export async function confirmTradeCompletion(tradeId, completionNote = "") {
  return requestSupabaseRpc("confirm_my_trade_completion", {
    p_trade_id: tradeId,
    p_completion_note: completionNote,
  });
}

export async function disputeTrade(tradeId, reason) {
  return requestSupabaseRpc("dispute_my_trade", {
    p_trade_id: tradeId,
    p_reason: reason,
  });
}

export async function adminMarkTradeCompleted(tradeId, resolutionNote = "") {
  return requestSupabaseRpc("admin_mark_trade_completed", {
    p_trade_id: tradeId,
    p_resolution_note: resolutionNote,
  });
}

export async function adminMarkTradeReversed(tradeId, resolutionNote = "") {
  return requestSupabaseRpc("admin_mark_trade_reversed", {
    p_trade_id: tradeId,
    p_resolution_note: resolutionNote,
  });
}
