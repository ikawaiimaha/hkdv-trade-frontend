import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  DEMAND_MULTIPLIER,
  RARITY_COMMON_UNITS,
  SOURCE_MULTIPLIER,
  TIME_MULTIPLIER,
  evaluateOffer,
  getItemScore,
  getValueBreakdown,
} from "./lib/fairness";
import {
  acceptIncomingWorkspaceOffer,
  adminMarkTradeCompleted,
  adminMarkTradeReversed,
  loadAdminTradeOversight,
  confirmTradeCompletion,
  createOfferFromBundle,
  cancelListing,
  loadTraderWorkspaceWithSource,
  deleteWishlistEntry,
  disputeTrade,
  rejectIncomingWorkspaceOffer,
  upsertListing,
  setMyBirthday,
  upsertTraderProfile,
  upsertWishlistEntry,
  withdrawWorkspaceOffer,
} from "./lib/traderWorkspaceClient";
import {
  getInitialAuthState,
  hasSupabaseAuthEnv,
  signInWithPassword,
  signOutSupabase,
  signUpWithPassword,
  subscribeToAuthChanges,
} from "./lib/supabaseAuth";
import { usePwaInstallPrompt, useServiceWorkerUpdate } from "./lib/pwaRuntime";
import {
  BUDDY_KEYS,
  BUDDY_META,
  formatBirthdayLabel,
  getBirthDayLimit,
  getBuddyLabel,
  getBuddyMeta,
  getPrideFlagGradient,
  getPrideFlagMeta,
  getRankVisual,
  getResolvedAvatarUrl,
  getZodiacKey,
  getZodiacMeta,
  PRIDE_FLAG_KEYS,
  PRIDE_FLAG_META,
} from "./lib/profileArt";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", description: "Trading desk overview" },
  { id: "profile", label: "Profile", description: "Desk identity and trust" },
  { id: "inventory", label: "Inventory", description: "Owned item ledger" },
  { id: "duplicates", label: "Duplicates", description: "Tradeable surplus" },
  { id: "wishlist", label: "Wishlist", description: "Demand radar" },
  { id: "listings", label: "Listings", description: "Open market + your posts" },
  { id: "offers", label: "Offers", description: "Incoming and outgoing" },
  { id: "trades", label: "Trades", description: "Completed swaps" },
  { id: "admin", label: "Admin", description: "Invites and seed control" },
];

const NUMBER = new Intl.NumberFormat("en-US");
const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const WIKI_CATALOG_RESULT_LIMIT = 120;
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };
const TIER_WEIGHT = { SSR: 4, SR: 3, R: 2, C: 1 };
const STRAWBERRY_TITLE_OPTIONS = [
  "Strawberry Syrup",
  "Strawberry Cookie",
  "Strawberry Macaron",
  "Strawberry Milk",
  "Strawberry Parfait",
  "Strawberry Cake",
];
const STRAWBERRY_TITLE_SCORE = {
  "Strawberry Syrup": 8,
  "Strawberry Cookie": 18,
  "Strawberry Macaron": 30,
  "Strawberry Milk": 44,
  "Strawberry Parfait": 60,
  "Strawberry Cake": 78,
};
const BIRTH_MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];
const RELEASE_SORT_ORDER = {
  launch_2021: 1,
  late_2021: 2,
  early_2022: 3,
  late_2022: 4,
  early_2023: 5,
  late_2023: 6,
  early_2024: 7,
  late_2024: 8,
  year_2025_plus: 9,
};
const EMPTY_TRADER = {
  id: "desk-loading",
  username: "desk_loading",
  displayName: "Trader Desk",
  buddyKey: null,
  buddyName: "",
  prideFlagKey: null,
  strawberryTitle: "Strawberry Syrup",
  profileCode: "",
  isProfileCodeVisible: false,
  isAdmin: false,
  status: "invited",
  avatarUrl: null,
  birthMonth: null,
  birthDay: null,
  birthdayLocked: false,
  birthdaySetAt: null,
  zodiacKey: null,
  createdAt: null,
  deskTag: "Loading",
  responseWindow: "Pending workspace",
};
const EMPTY_REPUTATION = {
  traderId: null,
  completedTradesCount: 0,
  acceptedOffersCount: 0,
  rejectedOffersCount: 0,
  cancelledTradesCount: 0,
  disputeCount: 0,
  responseRate: 100,
  reputationScore: 0,
};

async function loadMockWorkspaceBundle() {
  const mockModule = await import("./data/mockData");

  return {
    source: "mock",
    workspace: {
      currentTrader: mockModule.currentTrader,
      traderDirectory: mockModule.traderDirectory,
      items: mockModule.items,
      wishlistEntries: mockModule.wishlistEntries,
      reputationSnapshot: mockModule.reputationSnapshot,
      marketListings: mockModule.marketListings,
      myListings: mockModule.myListings,
      inventory: mockModule.inventory,
      incomingOffers: mockModule.incomingOffers,
      outgoingOffers: mockModule.outgoingOffers,
      tradeHistory: mockModule.tradeHistory,
      collectionProgress: [],
    },
    adminSeedJobs: mockModule.adminSeedJobs ?? [],
  };
}
const CHARACTER_MATCHERS = [
  "Hello Kitty",
  "My Melody",
  "Pompompurin",
  "Kuromi",
  "Cinnamoroll",
  "Pochacco",
  "Keroppi",
  "Badtz-Maru",
  "Tuxedosam",
  "Little Twin Stars",
  "Kiki",
  "Lala",
];

function readViewFromHash() {
  if (typeof window === "undefined") {
    return "dashboard";
  }

  const viewId = window.location.hash.replace("#", "");
  return NAV_ITEMS.some((item) => item.id === viewId) ? viewId : "dashboard";
}

function formatNumber(value) {
  return NUMBER.format(value);
}

function formatDateTime(value) {
  return DATE_TIME.format(new Date(value));
}

function describeItem(item) {
  return `${item.wikiRarity} / ${item.sourceLabel} / ${item.releaseLabel}`;
}

function formatValuePoints(value) {
  return `${formatNumber(value)} pts`;
}

function getReleaseWeight(releaseWindow) {
  return RELEASE_SORT_ORDER[releaseWindow] ?? 999;
}

function getSanrioCharacter(item) {
  const haystack = `${item?.name ?? ""} ${item?.collectionName ?? ""}`.toLowerCase();

  if (haystack.includes("little twin stars") || haystack.includes("kiki") || haystack.includes("lala")) {
    return "Little Twin Stars";
  }

  return CHARACTER_MATCHERS.find((label) => haystack.includes(label.toLowerCase())) ?? "Mixed / Other";
}

function getCollectionProgressFallback(items, inventoryRows) {
  const ownedItemIds = new Set(
    inventoryRows.filter((row) => row.quantityOwned > 0).map((row) => row.itemId ?? row.item?.id)
  );
  const grouped = new Map();

  items.forEach((item) => {
    const key = `${item.collectionName}__${item.sourceType}__${item.releaseWindow}`;
    const entry = grouped.get(key) ?? {
      collectionName: item.collectionName,
      sourceType: item.sourceType,
      sourceLabel: item.sourceLabel,
      releaseWindow: item.releaseWindow,
      releaseLabel: item.releaseLabel,
      totalItems: 0,
      ownedItems: 0,
    };

    entry.totalItems += 1;
    if (ownedItemIds.has(item.id)) {
      entry.ownedItems += 1;
    }

    grouped.set(key, entry);
  });

  return sortImmutable(Array.from(grouped.values()), (left, right) => {
    const leftComplete = left.totalItems > 0 && left.ownedItems === left.totalItems;
    const rightComplete = right.totalItems > 0 && right.ownedItems === right.totalItems;

    return Number(rightComplete) - Number(leftComplete) || right.ownedItems - left.ownedItems || left.collectionName.localeCompare(right.collectionName, "en");
  });
}

function getCompletionRatio(progress) {
  if (!progress?.totalItems) {
    return 0;
  }

  return progress.ownedItems / progress.totalItems;
}

function derivePlatformRank(trader, reputationSnapshot) {
  const createdAt = trader?.createdAt ? new Date(trader.createdAt) : null;
  const monthsActive = createdAt
    ? Math.max(
        1,
        Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
      )
    : 1;
  const trustScore =
    (reputationSnapshot?.reputationScore ?? 0) +
    (reputationSnapshot?.completedTradesCount ?? 0) * 1.35 +
    monthsActive * 1.8 +
    (STRAWBERRY_TITLE_SCORE[trader?.strawberryTitle] ?? STRAWBERRY_TITLE_SCORE["Strawberry Syrup"]) * 0.18 -
    (reputationSnapshot?.disputeCount ?? 0) * 7;

  if (trustScore >= 170) {
    const visual = getRankVisual("legendary");
    return {
      id: "legendary",
      label: "Legendary",
      tone: "accent",
      summary: "Top-tier desk with elite trust, long tenure, and the kind of history that closes serious trades.",
      avatarPalette: ["#ff8cb7", "#ffc86a"],
      badgeImageUrl: visual.badgeImageUrl,
      frameImageUrl: visual.frameImageUrl,
    };
  }

  if (trustScore >= 125) {
    const visual = getRankVisual("dream_collector");
    return {
      id: "dream_collector",
      label: "Dream Collector",
      tone: "good",
      summary: "Trusted collector desk with a polished close rate, steady activity, and visible platform momentum.",
      avatarPalette: ["#7ad1c0", "#89b8ff"],
      badgeImageUrl: visual.badgeImageUrl,
      frameImageUrl: visual.frameImageUrl,
    };
  }

  if (trustScore >= 85) {
    const visual = getRankVisual("treasure_keeper");
    return {
      id: "treasure_keeper",
      label: "Treasure Keeper",
      tone: "warm",
      summary: "Dependable desk with enough completed swaps and curation discipline to feel organized and safe.",
      avatarPalette: ["#f4b36c", "#ff8fb8"],
      badgeImageUrl: visual.badgeImageUrl,
      frameImageUrl: visual.frameImageUrl,
    };
  }

  const visual = getRankVisual("charm_trader");
  return {
    id: "charm_trader",
    label: "Charm Trader",
    tone: "muted",
    summary: "Friendly early-stage desk still building proof through completed swaps, consistency, and clean listings.",
    avatarPalette: ["#c3bfd7", "#f0cadc"],
    badgeImageUrl: visual.badgeImageUrl,
    frameImageUrl: visual.frameImageUrl,
  };
}

function formatCountUnit(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function getProgressPercent(current, target) {
  if (!target) {
    return 0;
  }

  return Math.min((current / target) * 100, 100);
}

function getAchievementTier(progressPercent, earned) {
  if (earned) {
    return {
      label: "Gold Stamp",
      tone: "accent",
    };
  }

  if (progressPercent >= 72) {
    return {
      label: "Silver Track",
      tone: "good",
    };
  }

  if (progressPercent >= 35) {
    return {
      label: "Bronze Track",
      tone: "warm",
    };
  }

  return {
    label: "Seed Track",
    tone: "muted",
  };
}

function getRewardTrackTier(points) {
  if (points >= 320) {
    return {
      label: "Dream Parade",
      stamp: "Grand Ribbon Sheet",
      tone: "accent",
      minPoints: 320,
      nextPoints: null,
      nextLabel: null,
    };
  }

  if (points >= 210) {
    return {
      label: "Ribbon Album",
      stamp: "Collection Crest",
      tone: "good",
      minPoints: 210,
      nextPoints: 320,
      nextLabel: "Dream Parade",
    };
  }

  if (points >= 110) {
    return {
      label: "Strawberry Sheet",
      stamp: "Sweet Trader Card",
      tone: "warm",
      minPoints: 110,
      nextPoints: 210,
      nextLabel: "Ribbon Album",
    };
  }

  return {
    label: "Starter Card",
    stamp: "Fresh Desk Stamp",
    tone: "muted",
    minPoints: 0,
    nextPoints: 110,
    nextLabel: "Strawberry Sheet",
  };
}

function deriveAchievementBoard({
  reputationSnapshot,
  tradeHistory,
  collectionProgress,
  duplicateRows,
  wishlistRows,
  inventoryRows,
  myListings,
}) {
  const completedTrades = Math.max(
    reputationSnapshot?.completedTradesCount ?? 0,
    tradeHistory.filter((trade) => trade.status === "completed").length
  );
  const trustScore = reputationSnapshot?.reputationScore ?? 0;
  const responseRate = reputationSnapshot?.responseRate ?? 0;
  const acceptedOffers = reputationSnapshot?.acceptedOffersCount ?? 0;
  const completedCollections = collectionProgress.filter(
    (entry) => entry.totalItems > 0 && entry.ownedItems === entry.totalItems
  ).length;
  const liveWishlistMatches = wishlistRows.filter(
    (entry) => (entry.matches ?? 0) + (entry.requestedMatches ?? 0) > 0
  ).length;
  const duplicateCount = duplicateRows.length;
  const legacyItems = inventoryRows.filter(
    (row) => row.item && getReleaseWeight(row.item.releaseWindow) <= RELEASE_SORT_ORDER.early_2022
  ).length;
  const activeListings = myListings.filter((listing) => listing.status === "active").length;
  const uniqueItems = inventoryRows.length;

  const achievements = [
    {
      id: "first-completed-trade",
      category: "Trading",
      label: "First Completed Trade",
      stampLabel: "Ribbon Starter",
      description: "Finish one trade from offer to confirmed completion.",
      rewardPoints: 24,
      tone: "good",
      earned: completedTrades >= 1,
      progressPercent: getProgressPercent(completedTrades, 1),
      statusLabel: completedTrades >= 1 ? "Unlocked" : `${formatCountUnit(completedTrades, "trade")} / 1 trade`,
      progressCopy:
        completedTrades >= 1
          ? `${formatCountUnit(completedTrades, "completed trade")} logged in the desk history.`
          : "Close your first item-for-item swap to activate this milestone.",
    },
    {
      id: "five-trade-ribbon",
      category: "Trading",
      label: "Five Trade Ribbon",
      stampLabel: "Trade Garland",
      description: "Build a desk that has already closed a meaningful set of trades.",
      rewardPoints: 42,
      tone: "accent",
      earned: completedTrades >= 5,
      progressPercent: getProgressPercent(completedTrades, 5),
      statusLabel: completedTrades >= 5 ? "Unlocked" : `${formatCountUnit(completedTrades, "trade")} / 5 trades`,
      progressCopy:
        completedTrades >= 5
          ? "Your desk has enough finished swaps to feel established."
          : "Keep closing clean trades to turn momentum into visible trust.",
    },
    {
      id: "trusted-trader",
      category: "Trust",
      label: "Trusted Trader",
      stampLabel: "Trust Crest",
      description: "Reach a trust score that feels reliable even before someone opens your history.",
      rewardPoints: 38,
      tone: "good",
      earned: trustScore >= 90,
      progressPercent: getProgressPercent(trustScore, 90),
      statusLabel: trustScore >= 90 ? "Unlocked" : `${formatNumber(trustScore)} / 90 trust`,
      progressCopy:
        trustScore >= 90
          ? "Your reputation stack is strong enough to carry a visible trust badge."
          : "Completed trades, good response rate, and steady activity all move this upward.",
    },
    {
      id: "wishlist-closer",
      category: "Matching",
      label: "Wishlist Closer",
      stampLabel: "Wish Radar",
      description: "Keep enough live overlaps on the board that your wishlist can actually move.",
      rewardPoints: 28,
      tone: "warm",
      earned: liveWishlistMatches >= 2,
      progressPercent: getProgressPercent(liveWishlistMatches, 2),
      statusLabel:
        liveWishlistMatches >= 2
          ? "Unlocked"
          : `${formatCountUnit(liveWishlistMatches, "live overlap")} / 2 live overlaps`,
      progressCopy:
        liveWishlistMatches >= 2
          ? "Your current desk has multiple live paths into wishlist progress."
          : "Add or refresh wishlist targets until at least two have real market overlap.",
    },
    {
      id: "set-finisher",
      category: "Collections",
      label: "Set Finisher",
      stampLabel: "Complete Stamp",
      description: "Complete at least one bag or event set all the way through.",
      rewardPoints: 36,
      tone: "accent",
      earned: completedCollections >= 1,
      progressPercent: getProgressPercent(completedCollections, 1),
      statusLabel:
        completedCollections >= 1
          ? "Unlocked"
          : `${formatCountUnit(completedCollections, "finished set")} / 1 finished set`,
      progressCopy:
        completedCollections >= 1
          ? `${formatCountUnit(completedCollections, "completed collection")} now carries a finished stamp.`
          : "Collection progress stamps will light this up as soon as one set is fully owned.",
    },
    {
      id: "duplicate-specialist",
      category: "Inventory",
      label: "Duplicate Specialist",
      stampLabel: "Bundle Stock",
      description: "Keep a healthy stack of tradeable surplus ready for clean bundles.",
      rewardPoints: 24,
      tone: "warm",
      earned: duplicateCount >= 4,
      progressPercent: getProgressPercent(duplicateCount, 4),
      statusLabel: duplicateCount >= 4 ? "Unlocked" : `${formatCountUnit(duplicateCount, "duplicate row")} / 4 rows`,
      progressCopy:
        duplicateCount >= 4
          ? "You have enough surplus inventory to respond flexibly to new offers."
          : "Tradeable duplicate rows make the desk feel alive and easier to match.",
    },
    {
      id: "legacy-collector",
      category: "Collection Age",
      label: "Legacy Collector",
      stampLabel: "Archive Seal",
      description: "Hold a small shelf of older launch-era or early-run HKDV items.",
      rewardPoints: 38,
      tone: "accent",
      earned: legacyItems >= 4,
      progressPercent: getProgressPercent(legacyItems, 4),
      statusLabel: legacyItems >= 4 ? "Unlocked" : `${formatCountUnit(legacyItems, "legacy item")} / 4 items`,
      progressCopy:
        legacyItems >= 4
          ? "Older source history is now part of your public desk identity."
          : "Launch-era and early-run items are counted here when they land in inventory.",
    },
    {
      id: "market-maker",
      category: "Listings",
      label: "Market Maker",
      stampLabel: "Open Desk Seal",
      description: "Post enough active listings that your desk is discoverable without feed-chasing.",
      rewardPoints: 30,
      tone: "good",
      earned: activeListings >= 3,
      progressPercent: getProgressPercent(activeListings, 3),
      statusLabel: activeListings >= 3 ? "Unlocked" : `${formatCountUnit(activeListings, "active listing")} / 3 listings`,
      progressCopy:
        activeListings >= 3
          ? "Your desk is posting enough structured intent to invite responses."
          : "Have-item and wanted-item posts both count toward this listing milestone.",
    },
    {
      id: "fast-responder",
      category: "Trust",
      label: "Fast Responder",
      stampLabel: "Quick Reply Mark",
      description: "Pair a strong response rate with at least one accepted offer.",
      rewardPoints: 26,
      tone: "good",
      earned: responseRate >= 95 && acceptedOffers >= 1,
      progressPercent: acceptedOffers >= 1 ? getProgressPercent(responseRate, 95) : 0,
      statusLabel:
        responseRate >= 95 && acceptedOffers >= 1
          ? "Unlocked"
          : acceptedOffers < 1
            ? "Answer 1 offer first"
            : `${formatNumber(responseRate)}% / 95% response`,
      progressCopy:
        responseRate >= 95 && acceptedOffers >= 1
          ? "Your desk is responding quickly enough to earn a visible speed signal."
          : acceptedOffers < 1
            ? "Accept or reject at least one live offer so response quality can count."
            : "Keep the queue moving and this one will unlock on its own.",
    },
    {
      id: "full-room-board",
      category: "Collection Depth",
      label: "Room Builder",
      stampLabel: "Room Bloom",
      description: "Reach a broad owned catalog measured by unique item names, not raw quantity.",
      rewardPoints: 34,
      tone: "warm",
      earned: uniqueItems >= 12,
      progressPercent: getProgressPercent(uniqueItems, 12),
      statusLabel: uniqueItems >= 12 ? "Unlocked" : `${formatCountUnit(uniqueItems, "unique item")} / 12 items`,
      progressCopy:
        uniqueItems >= 12
          ? "Your desk catalog is deep enough to feel like a real room-building board."
          : "Unique owned item names drive this milestone, not duplicate counts.",
    },
  ]
    .map((achievement) => ({
      ...achievement,
      tier: getAchievementTier(achievement.progressPercent, achievement.earned),
      sortScore: achievement.earned ? 1000 : achievement.progressPercent,
    }))
    .sort(
      (left, right) =>
        Number(right.earned) - Number(left.earned) ||
        right.sortScore - left.sortScore ||
        left.label.localeCompare(right.label, "en")
    );

  const unlockedCount = achievements.filter((achievement) => achievement.earned).length;
  const nextUp = achievements.find((achievement) => !achievement.earned) ?? null;
  const rewardPoints = achievements.reduce(
    (sum, achievement) => sum + (achievement.earned ? achievement.rewardPoints : 0),
    0
  );
  const trackTier = getRewardTrackTier(rewardPoints);

  return {
    achievements,
    unlockedCount,
    totalCount: achievements.length,
    nextUp,
    rewardPoints,
    trackTier,
  };
}

function sortImmutable(items, compareFn) {
  return [...items].sort(compareFn);
}

function normalizeCatalogSearch(value) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getInitials(label) {
  return label
    .split(" ")
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase();
}

function updateInventorySnapshot(entries, traderId, itemId, ownedDelta, listedDelta = 0) {
  const existingEntry = entries.find((entry) => entry.itemId === itemId);

  if (!existingEntry && ownedDelta <= 0) {
    return entries;
  }

  if (!existingEntry) {
    return [
      ...entries,
      {
        id: `inv-${itemId}`,
        traderId,
        itemId,
        quantityOwned: Math.max(ownedDelta, 0),
        quantityListed: Math.max(listedDelta, 0),
        isTradeableDuplicate: ownedDelta > 1,
        sourceNote: "Accepted trade",
      },
    ];
  }

  const nextEntry = {
    ...existingEntry,
    quantityOwned: Math.max(existingEntry.quantityOwned + ownedDelta, 0),
    quantityListed: Math.max(existingEntry.quantityListed + listedDelta, 0),
  };

  nextEntry.isTradeableDuplicate =
    existingEntry.isTradeableDuplicate || nextEntry.quantityOwned > 1;

  if (nextEntry.quantityOwned === 0 && nextEntry.quantityListed === 0) {
    return entries.filter((entry) => entry.itemId !== itemId);
  }

  return entries.map((entry) => (entry.itemId === itemId ? nextEntry : entry));
}

function buildAcceptedTrade(offer, listing) {
  const createdAt = new Date().toISOString();

  return {
    id: `trade-${offer.id}`,
    listingId: listing.id,
    acceptedOfferId: offer.id,
    sellerId: listing.traderId,
    buyerId: offer.buyerId,
    status: "pending_completion",
    sellerConfirmedAt: null,
    buyerConfirmedAt: null,
    completedAt: null,
    disputeReason: "",
    completionNote: "",
    resolvedAt: null,
    createdAt,
    tradeItems: [
      {
        fromTraderId: listing.traderId,
        toTraderId: offer.buyerId,
        itemId: listing.itemId,
        quantity: listing.quantityListed,
      },
      ...offer.offerItems.map((item) => ({
        fromTraderId: offer.buyerId,
        toTraderId: listing.traderId,
        itemId: item.itemId,
        quantity: item.quantity,
      })),
    ],
  };
}

function toneForStatus(status) {
  switch (status) {
    case "active":
    case "fair":
    case "completed":
    case "ready":
      return "good";
    case "pending_completion":
    case "pending":
    case "queued":
    case "medium":
      return "warm";
    case "disputed":
    case "underpay":
    case "rejected":
    case "cancelled":
    case "suspended":
      return "danger";
    case "overpay":
    case "high":
      return "accent";
    case "withdrawn":
    case "reversed":
    case "expired":
    case "low":
    case "invited":
      return "muted";
    default:
      return "neutral";
  }
}

function toneForWikiRarity(rarity) {
  switch ((rarity ?? "").toUpperCase()) {
    case "S":
    case "SSR":
      return "accent";
    case "R":
    case "SR":
      return "warm";
    default:
      return "muted";
  }
}

function formatSourceKind(value) {
  switch (value) {
    case "happy_bag":
      return "Happy Bag";
    case "item_page":
      return "Item Page";
    default:
      return value ?? "Unknown";
  }
}

function formatCatalogSource(value) {
  switch (value) {
    case "supabase":
      return "Supabase live";
    case "static":
    default:
      return "Generated JSON";
  }
}

function formatListingType(value) {
  switch (value) {
    case "have_item":
      return "Have Item";
    case "wanted_item":
      return "Wanted Item";
    default:
      return value?.replaceAll("_", " ") ?? "Have Item";
  }
}

function parseCollectionInput(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getListingActionLabel(listingType) {
  return listingType === "wanted_item" ? "Build Response" : "Build Offer";
}

function getListingEyebrow(listingType) {
  return listingType === "wanted_item" ? "Wanted Post" : "Have Listing";
}

function formatTradeRules(tradeRules = {}) {
  const labels = [];

  if (tradeRules.preferExactTarget) {
    labels.push("Exact target preferred");
  }

  if (tradeRules.wallForWall) {
    labels.push("Wall for wall");
  }

  return labels;
}

function buildTradeRules(listingType, preferExactTarget) {
  if (listingType !== "wanted_item") {
    return {};
  }

  return preferExactTarget ? { preferExactTarget: true } : {};
}

function isVariableValueItem(item) {
  if (!item) {
    return false;
  }

  return (
    item.tier === "SSR" ||
    item.category === "flower" ||
    item.name.toLowerCase().includes("wall") ||
    item.valueNote.toLowerCase().includes("premium")
  );
}

function getPriorityWeight(priority) {
  return PRIORITY_WEIGHT[priority] ?? 1;
}

function meetsTierFloor(item, minimumTargetTier) {
  if (!minimumTargetTier) {
    return true;
  }

  return (TIER_WEIGHT[item?.tier] ?? 0) >= (TIER_WEIGHT[minimumTargetTier] ?? 0);
}

function isWallLikeItem(item) {
  if (!item) {
    return false;
  }

  return item.name.toLowerCase().includes("wall") || item.category === "interior";
}

function buildDraftFromBundle(bundle) {
  return bundle.reduce((draft, entry) => {
    draft[entry.item.id] = entry.quantity;
    return draft;
  }, {});
}

function summarizeBundle(bundle) {
  if (!bundle.length) {
    return "No clean bundle is ready yet.";
  }

  return bundle
    .map((entry) => `${entry.item.name} x${entry.quantity}`)
    .join(" + ");
}

function formatAgeLabel(hours) {
  if (hours >= 48) {
    return `${Math.round(hours / 24)}d open`;
  }

  if (hours <= 1) {
    return "1h open";
  }

  return `${hours}h open`;
}

function appendResolutionNote(existingNote, note) {
  if (!note) {
    return existingNote ?? "";
  }

  if (!existingNote) {
    return note;
  }

  return `${existingNote}\n${note}`;
}

function buildSuggestedBundle({ listing, availableRows, itemIndex }) {
  const targetItem = itemIndex.get(listing.itemId);
  const emptyFairness = evaluateOffer({
    targetItem,
    quantityListed: listing.quantityListed,
    offeredItems: [],
    desiredItemId: listing.targetItemId ?? null,
  });

  if (!targetItem) {
    return {
      bundle: [],
      fairness: emptyFairness,
      reasons: ["Target item data is still loading."],
      exactTargetAvailable: false,
      collectionOverlap: 0,
    };
  }

  const preferredCollections = new Set(listing.preferredCollections ?? []);
  const wallForWall = Boolean(listing.tradeRules?.wallForWall);
  const targetScore = getItemScore(targetItem) * Math.max(listing.quantityListed ?? 1, 1);

  const candidates = availableRows
    .filter((row) => row.quantityAvailable > 0)
    .map((row) => {
      const item = row.item;
      const exactTarget = Boolean(listing.targetItemId && item.id === listing.targetItemId);
      const preferredCollection = preferredCollections.has(item.collectionName);
      const floorMatch = meetsTierFloor(item, listing.minimumTargetTier);
      const wallMatch = !wallForWall || isWallLikeItem(item);
      let rank = getItemScore(item);

      if (exactTarget) {
        rank += 2000;
      }

      if (preferredCollection) {
        rank += 180;
      }

      if (floorMatch) {
        rank += 60;
      } else {
        rank -= 160;
      }

      if (wallForWall) {
        rank += wallMatch ? 240 : -220;
      }

      if (row.isTradeableDuplicate) {
        rank += 24;
      }

      if (item.demandLevel === "high") {
        rank += 18;
      }

      return {
        row,
        item,
        unitScore: getItemScore(item),
        exactTarget,
        preferredCollection,
        floorMatch,
        wallMatch,
        rank,
      };
    })
    .filter((candidate) => candidate.exactTarget || (candidate.floorMatch && candidate.wallMatch));

  const collectionOverlap = candidates.filter((candidate) => candidate.preferredCollection).length;
  const exactTargetAvailable = candidates.some((candidate) => candidate.exactTarget);

  if (!candidates.length) {
    return {
      bundle: [],
      fairness: emptyFairness,
      reasons: [
        wallForWall ? "No wall-for-wall pieces are free right now." : "Nothing free on your desk meets this listing cleanly yet.",
      ],
      exactTargetAvailable,
      collectionOverlap,
    };
  }

  const sortedCandidates = sortImmutable(
    candidates,
    (left, right) =>
      right.rank - left.rank ||
      right.unitScore - left.unitScore ||
      right.row.quantityAvailable - left.row.quantityAvailable
  );

  const threshold = targetScore * (listing.targetItemId ? 0.92 : 0.88);
  const bundleMap = new Map();
  let runningScore = 0;
  let totalUnits = 0;
  const unitLimit = listing.tradeRules?.preferExactTarget ? 3 : 4;

  for (const candidate of sortedCandidates) {
    const maxUnits = Math.min(candidate.row.quantityAvailable, candidate.exactTarget ? 1 : 2);
    let usedUnits = 0;

    while (
      usedUnits < maxUnits &&
      totalUnits < unitLimit &&
      (runningScore < threshold || (candidate.exactTarget && !bundleMap.has(candidate.item.id)))
    ) {
      const existing = bundleMap.get(candidate.item.id);

      bundleMap.set(candidate.item.id, {
        item: candidate.item,
        quantity: (existing?.quantity ?? 0) + 1,
      });

      runningScore += candidate.unitScore;
      totalUnits += 1;
      usedUnits += 1;
    }

    if (runningScore >= threshold && totalUnits > 0 && !listing.tradeRules?.preferExactTarget) {
      break;
    }
  }

  if (!bundleMap.size) {
    const fallback = sortedCandidates[0];
    bundleMap.set(fallback.item.id, {
      item: fallback.item,
      quantity: 1,
    });
  }

  const bundle = Array.from(bundleMap.values());
  const fairness = evaluateOffer({
    targetItem,
    quantityListed: listing.quantityListed,
    offeredItems: bundle,
    desiredItemId: listing.targetItemId ?? null,
  });
  const reasons = [];

  if (bundle.some((entry) => entry.item.id === listing.targetItemId)) {
    reasons.push("Exact target included");
  }

  if (collectionOverlap > 0) {
    reasons.push(`${collectionOverlap} preferred-collection option${collectionOverlap === 1 ? "" : "s"}`);
  }

  if (wallForWall && bundle.some((entry) => isWallLikeItem(entry.item))) {
    reasons.push("Wall-for-wall rule satisfied");
  }

  if (fairness.label === "fair") {
    reasons.push("Suggested bundle lands inside the fair band");
  } else if (fairness.label === "overpay") {
    reasons.push("Suggested bundle is strong enough to start the conversation");
  } else {
    reasons.push("Close, but may need one more support piece");
  }

  return {
    bundle,
    fairness,
    reasons,
    exactTargetAvailable,
    collectionOverlap,
  };
}

function SurfaceSection({ eyebrow, title, description, children, className = "" }) {
  return (
    <section className={`surface ${className}`.trim()}>
      <header className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function StatusPill({ tone, children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function AchievementBoard({ achievements, summary, compact = false, limit = achievements.length }) {
  const visibleAchievements = achievements.slice(0, limit);

  return (
    <div className={`achievement-board ${compact ? "compact" : ""}`.trim()}>
      <div className="achievement-summary">
        <div className="achievement-summary-copy">
          <div>
            <strong>{summary.trackTier.label}</strong>
            <p>
              {summary.nextUp
                ? `Next stamp: ${summary.nextUp.stampLabel}. ${summary.nextUp.progressCopy}`
                : "Every current achievement is active on this desk right now."}
            </p>
          </div>
          <div className="achievement-summary-grid">
            <article className="achievement-summary-metric">
              <span>Reward points</span>
              <strong>{formatNumber(summary.rewardPoints)}</strong>
            </article>
            <article className="achievement-summary-metric">
              <span>Unlocked</span>
              <strong>
                {formatNumber(summary.unlockedCount)} / {formatNumber(summary.totalCount)}
              </strong>
            </article>
            <article className="achievement-summary-metric">
              <span>Track stamp</span>
              <strong>{summary.trackTier.stamp}</strong>
            </article>
          </div>
          <p className="achievement-track-note">
            {summary.trackTier.nextPoints
              ? `${formatNumber(summary.trackTier.nextPoints - summary.rewardPoints)} more points to reach ${summary.trackTier.nextLabel}.`
              : "Top reward track reached. Future stamps can layer onto this tier."}
          </p>
        </div>
        <div className="achievement-summary-badges">
          <StatusPill tone={summary.trackTier.tone}>{summary.trackTier.label}</StatusPill>
          <span className={`achievement-stamp tone-${summary.trackTier.tone}`.trim()}>
            {summary.trackTier.stamp}
          </span>
        </div>
      </div>
      <div className={`achievement-grid ${compact ? "compact" : ""}`.trim()}>
        {visibleAchievements.map((achievement) => (
          <article
            key={achievement.id}
            className={`achievement-card ${achievement.earned ? "earned" : "locked"} tone-${achievement.tone}`.trim()}
          >
            <div className="achievement-card-head">
              <div>
                <span>{achievement.category}</span>
                <strong>{achievement.label}</strong>
              </div>
              <div className="achievement-meta-row">
                <StatusPill tone={achievement.earned ? achievement.tone : "muted"}>
                  {achievement.earned ? "Unlocked" : "In progress"}
                </StatusPill>
                <span className={`achievement-stamp tone-${achievement.tier.tone}`.trim()}>
                  {achievement.stampLabel}
                </span>
              </div>
            </div>
            <p>{achievement.description}</p>
            <div className="achievement-progress" aria-hidden="true">
              <span style={{ width: `${achievement.progressPercent}%` }} />
            </div>
            <div className="achievement-foot">
              <strong>{achievement.statusLabel}</strong>
              <span className={`achievement-tier tone-${achievement.tier.tone}`.trim()}>
                {achievement.tier.label} · {formatNumber(achievement.rewardPoints)} pts
              </span>
              <small>{achievement.progressCopy}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RankBadgePill({ rankSummary, compact = false }) {
  return (
    <span className={`rank-pill tone-${rankSummary.tone} ${compact ? "compact" : ""}`.trim()}>
      <img src={rankSummary.badgeImageUrl} alt="" loading="lazy" decoding="async" />
      <span>{rankSummary.label}</span>
    </span>
  );
}

function BuddyBadgeChip({ buddyKey, compact = false }) {
  const buddy = getBuddyMeta(buddyKey);

  if (!buddy) {
    return null;
  }

  return (
    <span className={`buddy-chip ${compact ? "compact" : ""}`.trim()}>
      <img src={buddy.imageUrl} alt="" loading="lazy" decoding="async" />
      <span>{buddy.label}</span>
    </span>
  );
}

function ZodiacBadgeChip({ zodiacKey, compact = false }) {
  const zodiac = getZodiacMeta(zodiacKey);

  if (!zodiac) {
    return null;
  }

  return (
    <span className={`zodiac-chip tone-${zodiac.tone} ${compact ? "compact" : ""}`.trim()}>
      <span className="zodiac-chip-stamp">{zodiac.stamp}</span>
      <span>{zodiac.label}</span>
    </span>
  );
}

function PrideFlagChip({ prideFlagKey, compact = false }) {
  const prideFlag = getPrideFlagMeta(prideFlagKey);

  if (!prideFlag) {
    return null;
  }

  return (
    <span className={`pride-chip ${compact ? "compact" : ""}`.trim()}>
      <span
        className="pride-chip-swatch"
        style={{ "--pride-gradient": getPrideFlagGradient(prideFlag.key) }}
        aria-hidden="true"
      />
      <span>{prideFlag.label}</span>
    </span>
  );
}

function AutoAvatar({ trader, rankSummary, compact = false }) {
  const palette = rankSummary?.avatarPalette ?? ["#ffbed4", "#ffc7df"];
  const avatarUrl = getResolvedAvatarUrl(trader?.avatarUrl, trader?.buddyKey ?? trader?.buddyName, rankSummary?.id);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl, trader?.id]);

  return (
    <div
      className={`auto-avatar ${compact ? "compact" : ""}`.trim()}
      style={{
        "--avatar-start": palette[0],
        "--avatar-end": palette[1],
      }}
      aria-hidden="true"
    >
      <div className="auto-avatar-core">
        {avatarUrl && !imageFailed ? (
          <img
            className="auto-avatar-image"
            src={avatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="auto-avatar-fallback">{getInitials(trader?.displayName ?? trader?.username ?? "Desk")}</span>
        )}
      </div>
      {rankSummary?.frameImageUrl ? (
        <img className="auto-avatar-frame-art" src={rankSummary.frameImageUrl} alt="" loading="lazy" decoding="async" />
      ) : null}
      {rankSummary?.badgeImageUrl ? (
        <img className="auto-avatar-badge-art" src={rankSummary.badgeImageUrl} alt="" loading="lazy" decoding="async" />
      ) : null}
    </div>
  );
}

function TradeCelebrationOverlay({ celebration, currentTrader, rankSummary, onDismiss }) {
  if (!celebration) {
    return null;
  }

  return (
    <div className="celebration-backdrop" role="presentation" onClick={onDismiss}>
      <section
        className="celebration-shell"
        aria-label="Trade completed"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button celebration-close"
          aria-label="Dismiss celebration"
          onClick={onDismiss}
        >
          ×
        </button>
        <div className="celebration-orb celebration-orb-one" aria-hidden="true" />
        <div className="celebration-orb celebration-orb-two" aria-hidden="true" />
        <span className="celebration-ribbon">Trade Complete</span>
        <div className="celebration-stage">
          <AutoAvatar trader={currentTrader} rankSummary={rankSummary} />
          <div className="celebration-copy">
            <p className="eyebrow">Celebration</p>
            <h3>Your trade with {celebration.counterpartyName} is complete.</h3>
            <p>
              Cute desk moment unlocked. The swap is now in your completed ledger and the profile trust stack can
              reflect it immediately.
            </p>
            <div className="celebration-chip-row">
              <RankBadgePill rankSummary={rankSummary} compact />
              <BuddyBadgeChip buddyKey={currentTrader?.buddyKey} compact />
              <PrideFlagChip prideFlagKey={currentTrader?.prideFlagKey} compact />
            </div>
          </div>
        </div>
        <div className="celebration-loot">
          <article className="celebration-loot-card">
            <span>Received</span>
            <strong>{celebration.receivedLabel}</strong>
            <p>{celebration.receivedItems.join(" • ")}</p>
          </article>
          <article className="celebration-loot-card">
            <span>Sent</span>
            <strong>{celebration.sentLabel}</strong>
            <p>{celebration.sentItems.join(" • ")}</p>
          </article>
        </div>
        <div className="celebration-footer">
          <p>{celebration.note}</p>
          <button className="button primary" type="button" onClick={onDismiss}>
            Back to Desk
          </button>
        </div>
      </section>
    </div>
  );
}

function buildTradeCelebration(trade, currentTraderId, traderIndex, itemIndex) {
  const counterparty =
    trade.sellerId === currentTraderId
      ? traderIndex.get(trade.buyerId)
      : traderIndex.get(trade.sellerId);
  const sentItems = trade.tradeItems
    .filter((item) => item.fromTraderId === currentTraderId)
    .map((item) => `${itemIndex.get(item.itemId)?.name ?? "Item"} x${item.quantity}`);
  const receivedItems = trade.tradeItems
    .filter((item) => item.toTraderId === currentTraderId)
    .map((item) => `${itemIndex.get(item.itemId)?.name ?? "Item"} x${item.quantity}`);

  return {
    id: `${trade.id}-${trade.completedAt ?? trade.createdAt ?? Date.now()}`,
    counterpartyName: counterparty?.displayName ?? "your trading partner",
    sentItems: sentItems.length ? sentItems : ["Your outgoing bundle"],
    receivedItems: receivedItems.length ? receivedItems : ["Your incoming bundle"],
    sentLabel:
      sentItems.length === 1 ? "One item traded out" : `${formatNumber(sentItems.length)} items traded out`,
    receivedLabel:
      receivedItems.length === 1 ? "One item collected" : `${formatNumber(receivedItems.length)} items collected`,
    note: "Confetti moment only. The ledger, trust score, and history stay grounded in real completion data.",
  };
}

function ItemTone({ item, compact = false, large = false }) {
  const tone = item.imageAccent ?? "#ffbed4";
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imageFailed;
  const style = { "--tone": tone };

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.imageUrl]);

  return (
    <div
      className={`item-tone ${hasImage ? "has-image" : ""} ${compact ? "compact" : ""} ${large ? "large" : ""}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {hasImage ? (
        <img
          className="item-tone-image"
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <span>{getInitials(item.name)}</span>
    </div>
  );
}

function Sidebar({
  navigation,
  activeView,
  pendingIncomingCount,
  currentTrader,
  rankSummary,
  isCompactShell,
  isSidebarOpen,
  onClose,
}) {
  return (
    <>
      {isCompactShell && isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`sidebar ${isCompactShell ? "compact-shell" : ""} ${isSidebarOpen ? "open" : ""}`.trim()}
        aria-hidden={isCompactShell && !isSidebarOpen ? "true" : undefined}
      >
        <div className="sidebar-header">
          <div className="brand-lockup">
            <p className="eyebrow" translate="no">
              HKDV Trader OS
            </p>
            <h1 translate="no">HKDV</h1>
            <p className="sidebar-copy">
              Inventory, listings, offers, fairness, and trade history for invited desks.
            </p>
          </div>
          {isCompactShell ? (
            <button type="button" className="button tertiary sidebar-close" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
        <nav aria-label="Primary" className="nav-cluster">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-link ${activeView === item.id ? "active" : ""}`}
              aria-current={activeView === item.id ? "page" : undefined}
              onClick={isCompactShell ? onClose : undefined}
            >
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              {item.count != null ? <em>{item.count}</em> : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot surface-dark">
          <div className="sidebar-profile">
            <AutoAvatar trader={currentTrader} rankSummary={rankSummary} compact />
            <div>
              <strong>{currentTrader.displayName}</strong>
              <RankBadgePill rankSummary={rankSummary} compact />
            </div>
          </div>
          <span className="pill warm">{pendingIncomingCount} incoming</span>
          <p>Desk seat: {currentTrader.deskTag}</p>
          <strong>{currentTrader.responseWindow}</strong>
        </div>
      </aside>
    </>
  );
}

function TopBar({
  activeViewMeta,
  pendingIncomingCount,
  onOpenBuilder,
  onSignOut,
  workspaceSource,
  isCompactShell,
  onToggleSidebar,
  canInstall,
  installPending,
  onInstallApp,
  pwaStatusLabel,
  pwaStatusTone,
}) {
  return (
    <header className="topbar">
      <div className="topbar-head">
        {isCompactShell ? (
          <button type="button" className="button secondary topbar-menu" onClick={onToggleSidebar}>
            Menu
          </button>
        ) : null}
        <div>
          <p className="eyebrow">Trading surface</p>
          <h2>{activeViewMeta.label}</h2>
          <p className="topbar-copy">{activeViewMeta.description}</p>
        </div>
      </div>
      <div className="topbar-actions">
        {workspaceSource === "supabase" ? (
          <span className="pill good">Supabase live</span>
        ) : (
          <span className="pill muted">Mock mode</span>
        )}
        {pwaStatusLabel ? <span className={`pill ${pwaStatusTone}`}>{pwaStatusLabel}</span> : null}
        <a className="button secondary" href="#offers">
          Review Queue ({pendingIncomingCount})
        </a>
        <button className="button primary" type="button" onClick={onOpenBuilder}>
          Build Offer
        </button>
        {canInstall ? (
          <button className="button secondary" type="button" onClick={onInstallApp} disabled={installPending}>
            {installPending ? "Opening install..." : "Install App"}
          </button>
        ) : null}
        {onSignOut ? (
          <button className="button tertiary" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        ) : null}
      </div>
    </header>
  );
}

function formatAuthFeedbackMessage(message) {
  if (!message) {
    return "Unable to continue with Supabase Auth.";
  }

  const normalized = String(message).trim();

  if (/failed to fetch/i.test(normalized)) {
    return "The app could not reach Supabase. Check the project URL, publishable key, and project health.";
  }

  if (/invalid login credentials/i.test(normalized)) {
    return "That email and password did not match a Supabase Auth user.";
  }

  return normalized;
}

function AuthScreen({
  authError,
  onSignIn,
  onSignUp,
  canInstall,
  installPending,
  onInstallApp,
  pwaStatusLabel,
  pwaStatusTone,
}) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "sign-in") {
        await onSignIn({ email, password });
        setMessage("Signed in. Loading your trading desk...");
      } else {
        await onSignUp({ email, password });
        setMessage("Account created. If email confirmation is enabled, confirm first, then sign in. Your trader desk will be created automatically on first access.");
      }
    } catch (error) {
      setMessage(formatAuthFeedbackMessage(error.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-surface">
        <p className="eyebrow">Supabase Auth</p>
        <h2>{mode === "sign-in" ? "Sign in to your desk" : "Create your desk login"}</h2>
        <p>
          Existing trader emails link to their desk automatically. New signups create a trader desk on first authenticated access.
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sora@hkdvtrade.local"
              required
            />
          </label>
          <label className="field-stack">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>
          <div className="button-row">
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Working..." : mode === "sign-in" ? "Sign In" : "Sign Up"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
                setMessage("");
              }}
            >
              {mode === "sign-in" ? "Need an account?" : "Have an account?"}
            </button>
          </div>
        </form>
        {canInstall ? (
          <div className="button-row start auth-actions">
            <button className="button tertiary" type="button" onClick={onInstallApp} disabled={installPending}>
              {installPending ? "Opening install..." : "Install App"}
            </button>
          </div>
        ) : null}
        {pwaStatusLabel ? <span className={`pill ${pwaStatusTone} auth-pwa-pill`}>{pwaStatusLabel}</span> : null}
        {authError ? <p className="catalog-state error">{authError}</p> : null}
        {message ? <p className="catalog-state">{message}</p> : null}
      </section>
    </div>
  );
}

function UpdateBanner({ isUpdating, onApplyUpdate, onDismiss }) {
  return (
    <section className="update-banner" aria-label="App update available">
      <div>
        <p className="eyebrow">App update</p>
        <strong>A newer version of HKDV Trader OS is ready.</strong>
        <p>Reload once to switch the desk to the latest cached app shell.</p>
      </div>
      <div className="button-row update-banner-actions">
        <button className="button primary" type="button" onClick={onApplyUpdate} disabled={isUpdating}>
          {isUpdating ? "Updating..." : "Update now"}
        </button>
        <button className="button tertiary" type="button" onClick={onDismiss} disabled={isUpdating}>
          Dismiss
        </button>
      </div>
    </section>
  );
}

function LoadingScreen({ label }) {
  return (
    <div className="auth-shell">
      <section className="auth-surface">
        <p className="eyebrow">Supabase</p>
        <h2>{label}</h2>
        <p>Hang tight while we sync your trader workspace.</p>
      </section>
    </div>
  );
}

function LiveModeNotice({ authEnabled, session, workspaceSource, workspaceWarning, currentTrader }) {
  const sessionEmail = session?.user?.email ?? "";
  const statusRows = [
    {
      label: "Config",
      tone: authEnabled ? "good" : "warm",
      value: authEnabled ? "Ready" : "Missing env",
      detail: authEnabled
        ? "Supabase URL and client key are available to the app."
        : "Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to turn on live mode.",
    },
    {
      label: "Auth",
      tone: session ? "good" : authEnabled ? "warm" : "muted",
      value: session ? "Signed in" : authEnabled ? "Sign in needed" : "Waiting on env",
      detail: session
        ? `Session active for ${sessionEmail || "your trader account"}.`
        : authEnabled
          ? "Use a Supabase Auth user whose email matches a traders.email row."
          : "Auth activates automatically once the environment variables are present.",
    },
    {
      label: "Desk",
      tone: workspaceSource === "supabase" ? "good" : workspaceWarning ? "danger" : "warm",
      value: workspaceSource === "supabase" ? "Live workspace" : "Mock snapshot",
      detail:
        workspaceSource === "supabase"
          ? `Connected as ${currentTrader?.displayName ?? "your trader desk"}.`
          : workspaceWarning || "Apply the SQL files, then sign in to load inventory, listings, offers, and trades from Supabase.",
    },
  ];

  return (
    <section className="live-setup-banner" aria-label="Live workspace setup">
      <div className="live-setup-copy">
        <p className="eyebrow">Live setup</p>
        <h3>Mock mode is active until the Supabase workspace is connected.</h3>
        <p>
          The trader desk is already wired for live RPC-backed data. The remaining step is configuration:
          environment variables, matching Auth users, and the SQL import flow.
        </p>
        <div className="button-row start">
          <a className="button secondary" href="#admin">
            Open Admin
          </a>
        </div>
      </div>
      <div className="live-setup-status">
        {statusRows.map((row) => (
          <article className="live-setup-card" key={row.label}>
            <div className="live-setup-head">
              <span>{row.label}</span>
              <StatusPill tone={row.tone}>{row.value}</StatusPill>
            </div>
            <p>{row.detail}</p>
          </article>
        ))}
      </div>
      <ul className="live-setup-list">
        <li>Apply `supabase/schema.sql`, `supabase/seed.sql`, `supabase/generated/wiki-item-catalog.seed.sql`, `supabase/promote-wiki-items.sql`, and `supabase/app-access.sql`.</li>
        <li>Create Supabase Auth users whose emails match the seeded trader profiles, like `sora@hkdvtrade.local`.</li>
        <li>Add the same `VITE_SUPABASE_*` env vars to Vercel preview and production so deployed builds stop falling back to mock data.</li>
      </ul>
    </section>
  );
}

function InspectorRail({ opportunityRows, reputationSnapshot: snapshot, pendingIncomingCount }) {
  return (
    <aside className="inspector-rail">
      <SurfaceSection
        eyebrow="Opportunity Radar"
        title="Best responses now"
        description="Keep the desk aimed at the cleanest overlaps, not just the loudest posts."
      >
        <ul className="compact-list">
          {opportunityRows.length ? (
            opportunityRows.map((row) => (
              <li key={row.listing.id}>
                <div>
                  <strong>{row.targetItem.name}</strong>
                  <span>{row.reason}</span>
                </div>
                <StatusPill tone={row.readinessTone}>{row.readinessLabel}</StatusPill>
              </li>
            ))
          ) : (
            <li>
              <div>
                <strong>No live overlaps yet</strong>
                <span>As the board refreshes, the cleanest responses will surface here automatically.</span>
              </div>
            </li>
          )}
        </ul>
      </SurfaceSection>
      <SurfaceSection
        eyebrow="Fairness"
        title="Wiki Value Model"
        description="Pulled from the HKDV wiki FAQ: use it as a guide, not objective truth."
      >
        <ul className="formula-list">
          <li>
            <span>Rarity units</span>
            <strong>S {RARITY_COMMON_UNITS.S} / R {RARITY_COMMON_UNITS.R} / N {RARITY_COMMON_UNITS.N}</strong>
          </li>
          <li>
            <span>Source multiplier</span>
            <strong>
              Standard x{SOURCE_MULTIPLIER.standard}, Basic Style x{SOURCE_MULTIPLIER.basic_style}, 48hr x{SOURCE_MULTIPLIER.hour_48}
            </strong>
          </li>
          <li>
            <span>Time + demand</span>
            <strong>
              2021 x{TIME_MULTIPLIER.launch_2021}, High demand x{DEMAND_MULTIPLIER.high}
            </strong>
          </li>
        </ul>
      </SurfaceSection>
      <SurfaceSection
        eyebrow="Reputation"
        title="Desk trust"
        description="Keep response rate and dispute count visible."
      >
        <dl className="metric-stack">
          <div>
            <dt>Response rate</dt>
            <dd>{snapshot.responseRate}%</dd>
          </div>
          <div>
            <dt>Completed trades</dt>
            <dd>{snapshot.completedTradesCount}</dd>
          </div>
          <div>
            <dt>Disputes</dt>
            <dd>{snapshot.disputeCount}</dd>
          </div>
        </dl>
        <p className="inspector-note">Pending actions in queue: {pendingIncomingCount}</p>
      </SurfaceSection>
    </aside>
  );
}

function DashboardView({
  stats,
  duplicateRows,
  smartOpportunityRows,
  incomingOffers,
  openOfferBuilder,
  traderIndex,
  wishlistRows,
  workspaceSource,
  currentTrader,
  rankSummary,
  achievementBoard,
}) {
  const activeBuddy = getBuddyMeta(currentTrader?.buddyKey);
  const prideFlag = getPrideFlagMeta(currentTrader?.prideFlagKey);

  return (
    <div className="view-stack">
      <section className="hero-surface">
        <div>
          <p className="eyebrow">Desk status</p>
          <h3>Trade against real HKDV bag history, not placeholder rarity math.</h3>
          <p className="hero-copy">
            The catalog and value language now follow the community wiki: bag source, age, rarity units, and demand are visible in the desk itself.
          </p>
          <div className="hero-copy-chips">
            <RankBadgePill rankSummary={rankSummary} compact />
            {activeBuddy ? <BuddyBadgeChip buddyKey={activeBuddy.key} compact /> : null}
            {prideFlag ? <PrideFlagChip prideFlagKey={prideFlag.key} compact /> : null}
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-stage-card">
            <div className="hero-stage-copy">
              <span className="pill accent">Wiki-sourced</span>
              <strong>{currentTrader.displayName}</strong>
              <p>
                {activeBuddy
                  ? `${activeBuddy.label} is active on this desk.`
                  : "Choose a buddy in Profile to personalize the desk."}
              </p>
            </div>
            <AutoAvatar trader={currentTrader} rankSummary={rankSummary} />
            <div className="hero-stage-note">
              <span>Queue</span>
              <strong>{incomingOffers.length} live offers</strong>
              <p>Best offers and clean bundle routes stay one tap away on every device size.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Desk metrics">
        {stats.map((stat) => (
          <article className="stat-tile" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      {workspaceSource === "supabase" ? (
        <section className="surface live-runbook" aria-label="Live desk test guide">
          <div className="section-head">
            <p className="eyebrow">Live Run</p>
            <h3>End-to-end test path</h3>
            <p className="catalog-copy">
              Use this pass to validate the real trader flow before wider rollout. You are signed in as{" "}
              {currentTrader?.displayName ?? "your trader desk"}.
            </p>
          </div>
          <div className="runbook-grid">
            <article className="runbook-step">
              <span>Step 1</span>
              <strong>Check your live listings</strong>
              <p>Open Listings and confirm your seeded posts loaded from Supabase instead of the mock snapshot.</p>
              <a className="button tertiary" href="#listings">
                Open Listings
              </a>
            </article>
            <article className="runbook-step">
              <span>Step 2</span>
              <strong>Review or send an offer</strong>
              <p>Open Offers to inspect the incoming queue, or build a bundle from the dashboard suggestions.</p>
              <a className="button tertiary" href="#offers">
                Open Offers
              </a>
            </article>
            <article className="runbook-step">
              <span>Step 3</span>
              <strong>Move one trade to completion</strong>
              <p>Accept an offer, then confirm it from Trades so both-trader completion status is visible.</p>
              <a className="button tertiary" href="#trades">
                Open Trades
              </a>
            </article>
            {currentTrader?.isAdmin ? (
              <article className="runbook-step">
                <span>Step 4</span>
                <strong>Check dispute oversight</strong>
                <p>Use Admin to verify pending-completion and disputed trades can still be moderated live.</p>
                <a className="button tertiary" href="#admin">
                  Open Admin
                </a>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      <SurfaceSection
        eyebrow="Milestones"
        title="Achievement board"
        description="Derived from real desk behavior so these unlock from actual trading, collecting, and listing activity."
      >
        <AchievementBoard
          achievements={achievementBoard.achievements}
          summary={achievementBoard}
          compact
          limit={6}
        />
      </SurfaceSection>

      <div className="content-grid two-up">
        <SurfaceSection
          eyebrow="Open Market"
          title="Best suggested trades"
          description="Scored by wishlist overlap, target-fit, and whether a clean bundle is already available."
        >
          <ul className="market-list">
            {smartOpportunityRows.length ? (
              smartOpportunityRows.map((plan) => {
                return (
                  <li key={plan.listing.id} className="market-row tall">
                    <div className="market-main">
                      <ItemTone item={plan.targetItem} />
                      <div className="market-copy">
                        <strong>{plan.targetItem.name}</strong>
                        <span>
                          {plan.seller?.displayName ?? "Trader"} / {formatListingType(plan.listing.listingType)}
                        </span>
                        <small>{plan.reason}</small>
                        <small>{plan.bundleSummary}</small>
                        <div className="listing-chip-row">
                          <StatusPill tone={plan.readinessTone}>{plan.readinessLabel}</StatusPill>
                          <StatusPill tone={toneForStatus(plan.fairness.label)}>{plan.fairness.label}</StatusPill>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button tertiary"
                      onClick={() => openOfferBuilder(plan.listing.id)}
                    >
                      Build From Suggestion
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="empty-copy">
                The board is quiet right now. Fresh overlaps will surface here as soon as the market changes.
              </li>
            )}
          </ul>
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Wishlist Heat"
          title="Demand matches"
          description="Prioritize posts that actually move your board forward."
        >
          <ul className="compact-list">
            {wishlistRows.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.item.name}</strong>
                  <span>{row.bestAction}</span>
                </div>
                <StatusPill tone={toneForStatus(row.priority)}>{row.matchLabel}</StatusPill>
              </li>
            ))}
          </ul>
        </SurfaceSection>
      </div>

      <div className="content-grid two-up">
        <SurfaceSection
          eyebrow="Duplicates"
          title="Ready to move"
          description="Surplus inventory available for clean bundles."
        >
          <ul className="duplicate-list">
            {duplicateRows.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.item.name}</strong>
                  <span>{row.quantityAvailable} available now / {formatValuePoints(row.score)}</span>
                </div>
                <StatusPill tone="muted">{row.item.sourceLabel}</StatusPill>
              </li>
            ))}
          </ul>
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Queue"
          title="Incoming offers"
          description="Anything that needs a call from you today."
        >
          <ul className="compact-list">
            {incomingOffers.length ? (
              incomingOffers.map((offer) => {
                const buyer = traderIndex.get(offer.buyerId);
                return (
                  <li key={offer.id}>
                    <div>
                      <strong>{buyer?.displayName ?? "Trader"}</strong>
                      <span>{formatDateTime(offer.createdAt)}</span>
                    </div>
                    <StatusPill tone={toneForStatus(offer.fairnessLabel)}>
                      {offer.fairnessLabel}
                    </StatusPill>
                  </li>
                );
              })
            ) : (
              <li>
                <div>
                  <strong>No incoming offers right now</strong>
                  <span>Try building from one of the suggested trades to create a fresh live action.</span>
                </div>
              </li>
            )}
          </ul>
        </SurfaceSection>
      </div>
    </div>
  );
}
function ProfileView({
  currentTrader,
  rankSummary,
  inventoryRows,
  collectionProgress,
  reputationSnapshot,
  onSaveProfile,
  onSetBirthday,
  achievementBoard,
}) {
  const [draft, setDraft] = useState({
    displayName: currentTrader.displayName ?? "",
    buddyKey: currentTrader.buddyKey ?? null,
    prideFlagKey: currentTrader.prideFlagKey ?? null,
    strawberryTitle: currentTrader.strawberryTitle ?? "Strawberry Syrup",
    profileCode: currentTrader.profileCode ?? "",
    isProfileCodeVisible: Boolean(currentTrader.isProfileCodeVisible),
  });
  const [saving, setSaving] = useState(false);
  const [birthdayDraft, setBirthdayDraft] = useState({
    birthMonth: currentTrader.birthMonth ? String(currentTrader.birthMonth) : "",
    birthDay: currentTrader.birthDay ? String(currentTrader.birthDay) : "",
  });
  const [birthdaySaving, setBirthdaySaving] = useState(false);
  const uniqueItemsOwned = inventoryRows.length;
  const completedCollections = collectionProgress.filter(
    (entry) => entry.totalItems > 0 && entry.ownedItems === entry.totalItems
  ).length;
  const birthdayLocked = Boolean(currentTrader.birthdayLocked);
  const birthdayLabel = formatBirthdayLabel(currentTrader.birthMonth, currentTrader.birthDay);
  const selectedBirthMonth = Number(birthdayDraft.birthMonth) || null;
  const selectedBirthDay = Number(birthdayDraft.birthDay) || null;
  const birthDayLimit = getBirthDayLimit(selectedBirthMonth);
  const zodiacPreviewKey =
    currentTrader.zodiacKey ??
    getZodiacKey(
      birthdayLocked ? currentTrader.birthMonth : selectedBirthMonth,
      birthdayLocked ? currentTrader.birthDay : selectedBirthDay
    );

  useEffect(() => {
    setDraft({
      displayName: currentTrader.displayName ?? "",
      buddyKey: currentTrader.buddyKey ?? null,
      prideFlagKey: currentTrader.prideFlagKey ?? null,
      strawberryTitle: currentTrader.strawberryTitle ?? "Strawberry Syrup",
      profileCode: currentTrader.profileCode ?? "",
      isProfileCodeVisible: Boolean(currentTrader.isProfileCodeVisible),
    });
  }, [
    currentTrader.buddyKey,
    currentTrader.displayName,
    currentTrader.isProfileCodeVisible,
    currentTrader.prideFlagKey,
    currentTrader.profileCode,
    currentTrader.strawberryTitle,
  ]);

  useEffect(() => {
    setBirthdayDraft({
      birthMonth: currentTrader.birthMonth ? String(currentTrader.birthMonth) : "",
      birthDay: currentTrader.birthDay ? String(currentTrader.birthDay) : "",
    });
  }, [currentTrader.birthDay, currentTrader.birthMonth]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await onSaveProfile({
        displayName: draft.displayName.trim(),
        buddyKey: draft.buddyKey,
        prideFlagKey: draft.prideFlagKey,
        strawberryTitle: draft.strawberryTitle,
        profileCode: draft.profileCode.trim().toUpperCase(),
        isProfileCodeVisible: draft.isProfileCodeVisible,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleBirthdaySubmit(event) {
    event.preventDefault();

    if (birthdayLocked) {
      return;
    }

    setBirthdaySaving(true);

    try {
      await onSetBirthday({
        birthMonth: selectedBirthMonth,
        birthDay: selectedBirthDay,
      });
    } finally {
      setBirthdaySaving(false);
    }
  }

  function handleBirthMonthChange(event) {
    const nextBirthMonth = event.target.value;
    const nextLimit = getBirthDayLimit(Number(nextBirthMonth) || null);

    setBirthdayDraft((current) => ({
      birthMonth: nextBirthMonth,
      birthDay:
        current.birthDay && Number(current.birthDay) > nextLimit
          ? ""
          : current.birthDay,
    }));
  }

  return (
    <div className="view-stack">
      <section className="surface profile-hero">
        <div className="profile-hero-lockup">
          <AutoAvatar trader={currentTrader} rankSummary={rankSummary} />
          <div>
            <p className="eyebrow">Desk Identity</p>
            <h3>{currentTrader.displayName}</h3>
            <p>
              Keep game identity fields editable here, while trust and avatar styling stay derived from real desk activity.
            </p>
            <div className="profile-pill-row">
              <BuddyBadgeChip buddyKey={currentTrader.buddyKey} compact />
              <PrideFlagChip prideFlagKey={currentTrader.prideFlagKey} compact />
              <RankBadgePill rankSummary={rankSummary} />
              <ZodiacBadgeChip zodiacKey={currentTrader.zodiacKey} compact />
              <StatusPill tone="warm">{currentTrader.strawberryTitle ?? "Strawberry Syrup"}</StatusPill>
            </div>
          </div>
        </div>
        <div className="profile-hero-copy">
          <strong>{rankSummary.summary}</strong>
          <p>
            Unique items are counted by item name, not raw quantity. Public profile code stays hidden until you explicitly switch it on.
          </p>
        </div>
      </section>

      <section className="profile-grid">
        <SurfaceSection
          eyebrow="Profile"
          title="Editable desk profile"
          description="Use one public name field here instead of a separate nickname + display name pair."
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Public name</span>
              <input
                type="text"
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Sora Desk"
                required
              />
            </label>
            <label className="field-stack">
              <span>Strawberry rank</span>
              <select
                value={draft.strawberryTitle}
                onChange={(event) => setDraft((current) => ({ ...current, strawberryTitle: event.target.value }))}
              >
                {STRAWBERRY_TITLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-stack full profile-buddy-block">
              <span>Choose your buddy</span>
              <div className="profile-buddy-selected">
                {draft.buddyKey ? (
                  <BuddyBadgeChip buddyKey={draft.buddyKey} />
                ) : (
                  <span className="profile-buddy-empty">No buddy selected.</span>
                )}
              </div>
              <div className="profile-buddy-grid">
                {BUDDY_KEYS.map((buddyKey) => (
                  <button
                    key={buddyKey}
                    type="button"
                    className={`buddy-option ${draft.buddyKey === buddyKey ? "is-active" : ""}`.trim()}
                    onClick={() => setDraft((current) => ({ ...current, buddyKey }))}
                  >
                    <img
                      src={BUDDY_META[buddyKey].imageUrl}
                      alt=""
                      className="buddy-option-img"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="buddy-option-label">{BUDDY_META[buddyKey].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field-stack full profile-pride-block">
              <span>Identity badge</span>
              <div className="profile-pride-selected">
                {draft.prideFlagKey ? (
                  <PrideFlagChip prideFlagKey={draft.prideFlagKey} />
                ) : (
                  <span className="profile-buddy-empty">No identity badge selected.</span>
                )}
              </div>
              <div className="profile-pride-grid">
                {PRIDE_FLAG_KEYS.map((prideFlagKey) => (
                  <button
                    key={prideFlagKey}
                    type="button"
                    className={`pride-option ${draft.prideFlagKey === prideFlagKey ? "is-active" : ""}`.trim()}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        prideFlagKey: current.prideFlagKey === prideFlagKey ? null : prideFlagKey,
                      }))
                    }
                  >
                    <span
                      className="pride-option-swatch"
                      style={{ "--pride-gradient": getPrideFlagGradient(prideFlagKey) }}
                      aria-hidden="true"
                    />
                    <span className="pride-option-label">{PRIDE_FLAG_META[prideFlagKey].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="field-stack">
              <span>Profile code</span>
              <input
                type="text"
                value={draft.profileCode}
                onChange={(event) => setDraft((current) => ({ ...current, profileCode: event.target.value }))}
                placeholder="HKDV-SORA-041"
              />
            </label>
            <label className="toggle-row full">
              <input
                type="checkbox"
                checked={draft.isProfileCodeVisible}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isProfileCodeVisible: event.target.checked,
                  }))
                }
              />
              <span>Show profile code on your public trader profile</span>
            </label>
            <div className="button-row start full">
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
          <div className="profile-settings-divider" />
          <form className="form-grid" onSubmit={handleBirthdaySubmit}>
            <div className="field-stack full profile-birthday-block">
              <span>Birthday identity</span>
              <div className="profile-zodiac-selected">
                {zodiacPreviewKey ? (
                  <ZodiacBadgeChip zodiacKey={zodiacPreviewKey} />
                ) : (
                  <span className="profile-buddy-empty">No zodiac badge yet.</span>
                )}
              </div>
              <p className="field-helper">
                Used for your zodiac badge and yearly birthday gifts. This can only be set once.
              </p>
            </div>
            {birthdayLocked ? (
              <div className="birthday-lock-card full">
                <strong>Birthday already set.</strong>
                <p>
                  {birthdayLabel
                    ? `${birthdayLabel} is locked on this desk profile.`
                    : "Your birthday is locked on this desk profile."}
                </p>
              </div>
            ) : (
              <>
                <label className="field-stack">
                  <span>Birth month</span>
                  <select value={birthdayDraft.birthMonth} onChange={handleBirthMonthChange} required>
                    <option value="">Choose month</option>
                    {BIRTH_MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Birth day</span>
                  <select
                    value={birthdayDraft.birthDay}
                    disabled={!selectedBirthMonth}
                    onChange={(event) =>
                      setBirthdayDraft((current) => ({
                        ...current,
                        birthDay: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Choose day</option>
                    {Array.from({ length: birthDayLimit }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="button-row start full">
                  <button
                    className="button primary"
                    type="submit"
                    disabled={birthdaySaving || !selectedBirthMonth || !selectedBirthDay}
                  >
                    {birthdaySaving ? "Saving..." : "Save birthday"}
                  </button>
                </div>
              </>
            )}
          </form>
        </SurfaceSection>

        <SurfaceSection
          eyebrow="Trust"
          title="Platform rank system"
          description="Website rank should be derived from behavior and tenure, not entered manually into the profile."
        >
          <div className="profile-metrics-grid">
            <article className="mini-metric">
              <span>Unique items</span>
              <strong>{formatNumber(uniqueItemsOwned)}</strong>
            </article>
            <article className="mini-metric">
              <span>Completed sets</span>
              <strong>{formatNumber(completedCollections)}</strong>
            </article>
            <article className="mini-metric">
              <span>Successful trades</span>
              <strong>{formatNumber(reputationSnapshot.completedTradesCount)}</strong>
            </article>
            <article className="mini-metric">
              <span>Trust score</span>
              <strong>{formatNumber(reputationSnapshot.reputationScore)}</strong>
            </article>
          </div>
          <div className="profile-note-stack">
            <p>
              Automatic avatar tier: <RankBadgePill rankSummary={rankSummary} compact />
            </p>
            <p>
              Zodiac badge:{" "}
              <strong>{getZodiacMeta(currentTrader.zodiacKey)?.label ?? "Not set yet"}</strong>
            </p>
            <p>
              Identity badge:{" "}
              <strong>{getPrideFlagMeta(currentTrader.prideFlagKey)?.label ?? "Not set yet"}</strong>
            </p>
            <p>
              Public code:{" "}
              <strong>
                {currentTrader.profileCode
                  ? currentTrader.isProfileCodeVisible
                    ? currentTrader.profileCode
                    : "Hidden by you"
                  : "Not set yet"}
              </strong>
            </p>
          </div>
        </SurfaceSection>
      </section>

      <SurfaceSection
        eyebrow="Achievements"
        title="Desk milestone board"
        description="These are derived milestones, not manual badges, so the profile reflects what the desk is actually doing right now."
      >
        <AchievementBoard
          achievements={achievementBoard.achievements}
          summary={achievementBoard}
        />
      </SurfaceSection>
    </div>
  );
}

function InventoryView({ inventoryRows, collectionProgress }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("release_desc");
  const [tierFilter, setTierFilter] = useState("all");
  const [characterFilter, setCharacterFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const characterOptions = useMemo(
    () =>
      Array.from(new Set(inventoryRows.map((row) => getSanrioCharacter(row.item))))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "en")),
    [inventoryRows]
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(inventoryRows.map((row) => row.item.category)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "en")),
    [inventoryRows]
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeCatalogSearch(deferredQuery);

    return sortImmutable(
      inventoryRows.filter((row) => {
        const character = getSanrioCharacter(row.item);
        const searchableText = normalizeCatalogSearch(
          [
            row.item.name,
            row.item.collectionName,
            row.item.sourceLabel,
            row.item.category,
            character,
            row.sourceNote,
          ].join(" ")
        );

        if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
          return false;
        }

        if (tierFilter !== "all" && row.item.tier !== tierFilter) {
          return false;
        }

        if (characterFilter !== "all" && character !== characterFilter) {
          return false;
        }

        if (categoryFilter !== "all" && row.item.category !== categoryFilter) {
          return false;
        }

        if (availabilityFilter === "tradeable" && row.quantityAvailable <= 0) {
          return false;
        }

        if (availabilityFilter === "listed" && row.quantityListed <= 0) {
          return false;
        }

        return true;
      }),
      (left, right) => {
        switch (sortBy) {
          case "release_asc":
            return getReleaseWeight(left.item.releaseWindow) - getReleaseWeight(right.item.releaseWindow);
          case "popularity":
            return right.item.demandScore - left.item.demandScore || right.score - left.score;
          case "value_desc":
            return right.score - left.score;
          case "name_asc":
            return left.item.name.localeCompare(right.item.name, "en");
          case "release_desc":
          default:
            return getReleaseWeight(right.item.releaseWindow) - getReleaseWeight(left.item.releaseWindow);
        }
      }
    );
  }, [availabilityFilter, categoryFilter, characterFilter, deferredQuery, inventoryRows, sortBy, tierFilter]);
  const highlightedCollections = useMemo(
    () =>
      sortImmutable(
        collectionProgress.filter((entry) => entry.totalItems > 1 && entry.ownedItems > 0),
        (left, right) =>
          Number(getCompletionRatio(right) === 1) - Number(getCompletionRatio(left) === 1) ||
          getCompletionRatio(right) - getCompletionRatio(left) ||
          right.ownedItems - left.ownedItems
      ).slice(0, 8),
    [collectionProgress]
  );

  return (
    <div className="view-stack">
      <SurfaceSection
        eyebrow="Inventory"
        title="Owned item ledger"
        description="Advanced search keeps rarity, character, category, release age, and popularity in one place."
      >
        <div className="filter-toolbar">
          <label className="field-stack full">
            <span>Advanced search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search item, collection, character, source, or notes"
            />
          </label>
          <label className="field-stack">
            <span>Order</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="release_desc">Release date: newest first</option>
              <option value="release_asc">Release date: oldest first</option>
              <option value="popularity">Popularity</option>
              <option value="value_desc">Desk value</option>
              <option value="name_asc">Name</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Tier</span>
            <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}>
              <option value="all">All tiers</option>
              <option value="SSR">SSR</option>
              <option value="SR">SR</option>
              <option value="R">R</option>
              <option value="C">C</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Sanrio character</span>
            <select value={characterFilter} onChange={(event) => setCharacterFilter(event.target.value)}>
              <option value="all">All characters</option>
              {characterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-stack">
            <span>Category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-stack">
            <span>Availability</span>
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
              <option value="all">All rows</option>
              <option value="tradeable">Available now</option>
              <option value="listed">Currently listed</option>
            </select>
          </label>
        </div>
        <div className="inventory-summary-row">
          <p>
            Showing <strong>{filteredRows.length}</strong> of <strong>{inventoryRows.length}</strong> unique item names.
          </p>
          <p>
            Completed collection stamps:{" "}
            <strong>
              {collectionProgress.filter((entry) => entry.totalItems > 0 && entry.ownedItems === entry.totalItems).length}
            </strong>
          </p>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Wiki</th>
                <th>Owned</th>
                <th>Listed</th>
                <th>Available</th>
                <th>Desk value</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="item-cell">
                      <ItemTone item={row.item} compact />
                      <div>
                        <strong>{row.item.name}</strong>
                        <span>
                          {getSanrioCharacter(row.item)} / {row.item.category} / {row.item.sourceLabel}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusPill tone={toneForStatus(row.item.tier)}>{row.item.wikiRarity}</StatusPill>
                  </td>
                  <td>{row.quantityOwned}</td>
                  <td>{row.quantityListed}</td>
                  <td>{row.quantityAvailable}</td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceSection>
      <SurfaceSection
        eyebrow="Completion"
        title="Collection stamps"
        description="A collection gets stamped once every item in that bag or event set is owned at least once."
      >
        <div className="completion-grid">
          {highlightedCollections.map((entry) => {
            const isComplete = entry.totalItems > 0 && entry.ownedItems === entry.totalItems;
            return (
            <article
              className={`completion-card ${isComplete ? "complete" : ""}`.trim()}
              key={`${entry.collectionName}-${entry.sourceType}-${entry.releaseWindow}`}
            >
                <div className="completion-head">
                  <div>
                    <strong>{entry.collectionName}</strong>
                    <span>
                      {entry.sourceLabel} / {entry.releaseLabel}
                    </span>
                  </div>
                  {isComplete ? <span className="completed-stamp">Completed</span> : null}
                </div>
                <div className="completion-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(getCompletionRatio(entry) * 100, 6)}%` }} />
                </div>
                <p>
                  {entry.ownedItems} / {entry.totalItems} item names owned
                </p>
              </article>
            );
          })}
        </div>
      </SurfaceSection>
    </div>
  );
}

function DuplicatesView({ duplicateRows }) {
  return (
    <div className="view-stack">
      <SurfaceSection
        eyebrow="Duplicates"
        title="Tradeable surplus"
        description="Manual duplicate flags stay visible even when quantity logic is close."
      >
        <div className="duplicate-grid">
          {duplicateRows.map((row) => (
            <article className="duplicate-tile" key={row.id}>
              <ItemTone item={row.item} />
              <div>
                <strong>{row.item.name}</strong>
                <p>{row.quantityAvailable} open units / {row.item.sourceLabel}</p>
              </div>
              <div className="duplicate-meta">
                <StatusPill tone={toneForStatus(row.item.demandLevel)}>
                  {row.item.demandLevel} demand
                </StatusPill>
                <span>{formatValuePoints(row.score)}</span>
              </div>
            </article>
          ))}
        </div>
      </SurfaceSection>
    </div>
  );
}

function WishlistView({
  wishlistRows,
  itemOptions,
  onCreateWishlistEntry,
  onUpdateWishlistEntry,
  onDeleteWishlistEntry,
}) {
  const [draft, setDraft] = useState({
    itemId: itemOptions[0]?.id ?? "",
    priority: "medium",
    desiredQuantity: 1,
    notes: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft.itemId && itemOptions[0]?.id) {
      setDraft((current) => ({
        ...current,
        itemId: itemOptions[0].id,
      }));
    }
  }, [draft.itemId, itemOptions]);

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onCreateWishlistEntry(draft);
      setDraft({
        itemId: itemOptions[0]?.id ?? "",
        priority: "medium",
        desiredQuantity: 1,
        notes: "",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editingId || !editingDraft) {
      return;
    }

    setSubmitting(true);

    try {
      await onUpdateWishlistEntry(editingId, editingDraft);
      setEditingId(null);
      setEditingDraft(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="view-stack">
      <div className="content-grid two-up">
        <SurfaceSection
          eyebrow="Wishlist"
          title="Demand board"
          description="Priority and live market matches sit together so you can decide fast."
        >
          <ul className="wishlist-list">
            {wishlistRows.map((row) => {
              const isEditing = editingId === row.id;

              return (
                <li key={row.id}>
                  {isEditing ? (
                    <form className="editor-stack" onSubmit={handleUpdate}>
                      <label className="field-stack">
                        <span>Priority</span>
                        <select
                          value={editingDraft.priority}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              priority: event.target.value,
                            }))
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                      <label className="field-stack">
                        <span>Desired quantity</span>
                        <input
                          type="number"
                          min={1}
                          value={editingDraft.desiredQuantity}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              desiredQuantity: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="field-stack full">
                        <span>Notes</span>
                        <textarea
                          rows={3}
                          value={editingDraft.notes}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="button-row">
                        <button className="button primary" type="submit" disabled={submitting}>
                          Save
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingDraft(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{row.item.name}</strong>
                        <p>{row.notes}</p>
                      </div>
                      <div className="wishlist-meta">
                        <StatusPill tone={toneForStatus(row.priority)}>{row.priority}</StatusPill>
                        <span>{row.matchLabel}</span>
                        <div className="button-row compact">
                          <button
                            className="button tertiary"
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setEditingDraft({
                                priority: row.priority,
                                desiredQuantity: row.desiredQuantity,
                                notes: row.notes ?? "",
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => onDeleteWishlistEntry(row.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Add target"
          title="Create wishlist entry"
          description="Track demand directly from the desk instead of keeping notes elsewhere."
        >
          <form className="form-grid" onSubmit={handleCreate}>
            <label className="field-stack">
              <span>Item</span>
              <select
                value={draft.itemId}
                onChange={(event) => setDraft((current) => ({ ...current, itemId: event.target.value }))}
                required
              >
                {itemOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Priority</span>
              <select
                value={draft.priority}
                onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="field-stack">
              <span>Desired quantity</span>
              <input
                type="number"
                min={1}
                value={draft.desiredQuantity}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    desiredQuantity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field-stack full">
              <span>Notes</span>
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Why this item matters for your board"
              />
            </label>
            <button className="button primary" type="submit" disabled={!itemOptions.length || submitting}>
              Add wishlist entry
            </button>
          </form>
        </SurfaceSection>
      </div>
    </div>
  );
}

function ListingsView({
  marketListings,
  myListings,
  inventoryRows,
  itemIndex,
  traderIndex,
  openOfferBuilder,
  listingIncomingCounts,
  onCreateListing,
  onUpdateListing,
  onCancelListing,
}) {
  const createOptions = inventoryRows.filter((row) => row.quantityAvailable > 0);
  const allItemOptions = useMemo(
    () => Array.from(itemIndex.values()).sort((left, right) => left.name.localeCompare(right.name, "en")),
    [itemIndex]
  );
  const makeInitialDraft = () => ({
    itemId: createOptions[0]?.item.id ?? "",
    targetItemId: "",
    quantityListed: createOptions[0] ? 1 : 0,
    listingType: "have_item",
    minimumTargetTier: "SR",
    preferredCollections: "",
    preferExactTarget: false,
    notes: "",
    status: "active",
  });
  const [draft, setDraft] = useState(makeInitialDraft);
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft.itemId && createOptions[0]?.item.id) {
      setDraft((current) => ({
        ...current,
        itemId: createOptions[0].item.id,
        quantityListed: 1,
      }));
    }
  }, [createOptions, draft.itemId]);

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onCreateListing({
        itemId: draft.itemId,
        targetItemId: draft.listingType === "wanted_item" ? draft.targetItemId || null : null,
        quantityListed: draft.quantityListed,
        listingType: draft.listingType,
        minimumTargetTier: draft.minimumTargetTier,
        preferredCollections: parseCollectionInput(draft.preferredCollections),
        tradeRules: buildTradeRules(draft.listingType, draft.preferExactTarget),
        notes: draft.notes,
        status: "active",
      });
      setDraft(makeInitialDraft());
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editingId || !editingDraft) {
      return;
    }

    setSubmitting(true);

    try {
      await onUpdateListing(editingId, {
        itemId: editingDraft.itemId,
        targetItemId: editingDraft.listingType === "wanted_item" ? editingDraft.targetItemId || null : null,
        quantityListed: editingDraft.quantityListed,
        listingType: editingDraft.listingType,
        minimumTargetTier: editingDraft.minimumTargetTier,
        preferredCollections: parseCollectionInput(editingDraft.preferredCollections),
        tradeRules: buildTradeRules(editingDraft.listingType, editingDraft.preferExactTarget),
        notes: editingDraft.notes,
        status: editingDraft.status,
      });
      setEditingId(null);
      setEditingDraft(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="view-stack">
      <div className="content-grid two-up">
        <SurfaceSection
          eyebrow="Open Market"
          title="Listings you can target"
          description="Have listings and wanted posts stay structured before you respond."
        >
          <ul className="market-list stacked">
            {marketListings.map((listing) => {
              const item = itemIndex.get(listing.itemId);
              const desiredItem = listing.targetItemId ? itemIndex.get(listing.targetItemId) : null;
              const trader = traderIndex.get(listing.traderId);
              const ruleLabels = formatTradeRules(listing.tradeRules);
              return (
                <li key={listing.id} className="market-row tall">
                  <div className="market-main">
                    <ItemTone item={item} />
                    <div className="market-copy">
                      <strong>{item.name}</strong>
                      <span>
                        {trader?.displayName} / {formatListingType(listing.listingType)}
                      </span>
                      <small>
                        {desiredItem
                          ? `Seeks ${desiredItem.name} / floor ${listing.minimumTargetTier}`
                          : `Open to fitting offers / floor ${listing.minimumTargetTier}`}
                      </small>
                      <small>
                        {item.releaseLabel} / {listing.preferredCollections.join(", ") || "No collection preference"}
                      </small>
                      {ruleLabels.length ? (
                        <div className="listing-chip-row">
                          {ruleLabels.map((rule) => (
                            <StatusPill key={rule} tone="muted">
                              {rule}
                            </StatusPill>
                          ))}
                        </div>
                      ) : null}
                      {listing.notes ? <small>{listing.notes}</small> : null}
                      {desiredItem ? (
                        <div className="listing-focus">
                          <span>Target item</span>
                          <strong>{desiredItem.name}</strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={() => openOfferBuilder(listing.id)}
                  >
                    {getListingActionLabel(listing.listingType)}
                  </button>
                </li>
              );
            })}
          </ul>
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Your Listings"
          title="Posted for offers"
          description="Create either a have listing or a wanted post with a clear target item."
        >
          <form className="form-grid listing-composer" onSubmit={handleCreate}>
            <label className="field-stack">
              <span>Inventory item</span>
              <select
                value={draft.itemId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    itemId: event.target.value,
                    targetItemId: current.targetItemId === event.target.value ? "" : current.targetItemId,
                  }))
                }
                required
              >
                {createOptions.map((row) => (
                  <option key={row.item.id} value={row.item.id}>
                    {row.item.name} ({row.quantityAvailable} available)
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Quantity</span>
              <input
                type="number"
                min={1}
                value={draft.quantityListed}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quantityListed: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Listing mode</span>
              <select
                value={draft.listingType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    listingType: event.target.value,
                    targetItemId: event.target.value === "wanted_item" ? current.targetItemId : "",
                    preferExactTarget:
                      event.target.value === "wanted_item" ? current.preferExactTarget : false,
                  }))
                }
              >
                <option value="have_item">Have Item</option>
                <option value="wanted_item">Wanted Item</option>
              </select>
            </label>
            <label className="field-stack">
              <span>Minimum tier</span>
              <select
                value={draft.minimumTargetTier}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    minimumTargetTier: event.target.value,
                  }))
                }
              >
                <option value="SSR">SSR</option>
                <option value="SR">SR</option>
                <option value="R">R</option>
                <option value="C">C</option>
              </select>
            </label>
            {draft.listingType === "wanted_item" ? (
              <>
                <label className="field-stack full">
                  <span>Target item</span>
                  <select
                    value={draft.targetItemId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        targetItemId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select a target item</option>
                    {allItemOptions
                      .filter((entry) => entry.id !== draft.itemId)
                      .map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field-stack checkbox-field full">
                  <input
                    type="checkbox"
                    checked={draft.preferExactTarget}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        preferExactTarget: event.target.checked,
                      }))
                    }
                  />
                  <span>Prefer exact target matches first</span>
                </label>
              </>
            ) : null}
            <label className="field-stack full">
              <span>Preferred collections</span>
              <input
                type="text"
                value={draft.preferredCollections}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    preferredCollections: event.target.value,
                  }))
                }
                placeholder="Basic Style Hello Kitty, Standard Style My Melody"
              />
            </label>
            <label className="field-stack full">
              <span>Notes</span>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <button
              className="button primary"
              type="submit"
              disabled={
                !createOptions.length ||
                submitting ||
                (draft.listingType === "wanted_item" && !draft.targetItemId)
              }
            >
              Create listing
            </button>
          </form>
          <ul className="market-list stacked">
            {myListings.map((listing) => {
              const item = itemIndex.get(listing.itemId);
              const desiredItem = listing.targetItemId ? itemIndex.get(listing.targetItemId) : null;
              const ruleLabels = formatTradeRules(listing.tradeRules);
              const isEditing = editingId === listing.id;
              return (
                <li key={listing.id} className="market-row tall">
                  {isEditing ? (
                    <form className="editor-stack full-width" onSubmit={handleUpdate}>
                      <label className="field-stack">
                        <span>Inventory item</span>
                        <select
                          value={editingDraft.itemId}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              itemId: event.target.value,
                              targetItemId: current.targetItemId === event.target.value ? "" : current.targetItemId,
                            }))
                          }
                        >
                          {inventoryRows.map((row) => (
                            <option key={row.item.id} value={row.item.id}>
                              {row.item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-stack">
                        <span>Quantity</span>
                        <input
                          type="number"
                          min={1}
                          value={editingDraft.quantityListed}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              quantityListed: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="field-stack">
                        <span>Status</span>
                        <select
                          value={editingDraft.status}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              status: event.target.value,
                            }))
                          }
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                        </select>
                      </label>
                      <label className="field-stack">
                        <span>Listing mode</span>
                        <select
                          value={editingDraft.listingType}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              listingType: event.target.value,
                              targetItemId: event.target.value === "wanted_item" ? current.targetItemId : "",
                              preferExactTarget:
                                event.target.value === "wanted_item" ? current.preferExactTarget : false,
                            }))
                          }
                        >
                          <option value="have_item">Have Item</option>
                          <option value="wanted_item">Wanted Item</option>
                        </select>
                      </label>
                      <label className="field-stack">
                        <span>Minimum tier</span>
                        <select
                          value={editingDraft.minimumTargetTier ?? "SR"}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              minimumTargetTier: event.target.value,
                            }))
                          }
                        >
                          <option value="SSR">SSR</option>
                          <option value="SR">SR</option>
                          <option value="R">R</option>
                          <option value="C">C</option>
                        </select>
                      </label>
                      {editingDraft.listingType === "wanted_item" ? (
                        <>
                          <label className="field-stack full">
                            <span>Target item</span>
                            <select
                              value={editingDraft.targetItemId}
                              onChange={(event) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  targetItemId: event.target.value,
                                }))
                              }
                              required
                            >
                              <option value="">Select a target item</option>
                              {allItemOptions
                                .filter((entry) => entry.id !== editingDraft.itemId)
                                .map((entry) => (
                                  <option key={entry.id} value={entry.id}>
                                    {entry.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="field-stack checkbox-field full">
                            <input
                              type="checkbox"
                              checked={editingDraft.preferExactTarget}
                              onChange={(event) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  preferExactTarget: event.target.checked,
                                }))
                              }
                            />
                            <span>Prefer exact target matches first</span>
                          </label>
                        </>
                      ) : null}
                      <label className="field-stack full">
                        <span>Preferred collections</span>
                        <input
                          type="text"
                          value={editingDraft.preferredCollections}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              preferredCollections: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="field-stack full">
                        <span>Notes</span>
                        <textarea
                          rows={3}
                          value={editingDraft.notes}
                          onChange={(event) =>
                            setEditingDraft((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="button-row">
                        <button className="button primary" type="submit" disabled={submitting}>
                          Save
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingDraft(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="market-main">
                        <ItemTone item={item} />
                        <div className="market-copy">
                          <strong>{item.name}</strong>
                          <span>{formatListingType(listing.listingType)}</span>
                          <small>
                            {desiredItem
                              ? `Seeks ${desiredItem.name} / floor ${listing.minimumTargetTier}`
                              : `Open to fitting offers / floor ${listing.minimumTargetTier}`}
                          </small>
                          <small>{listing.notes || "No extra listing note."}</small>
                          {ruleLabels.length ? (
                            <div className="listing-chip-row">
                              {ruleLabels.map((rule) => (
                                <StatusPill key={rule} tone="muted">
                                  {rule}
                                </StatusPill>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="listing-tray">
                        <StatusPill tone={toneForStatus(listing.status)}>{listing.status}</StatusPill>
                        <em>{listingIncomingCounts.get(listing.id) ?? 0} pending</em>
                        <div className="button-row compact">
                          <button
                            className="button tertiary"
                            type="button"
                            onClick={() => {
                              setEditingId(listing.id);
                              setEditingDraft({
                                itemId: listing.itemId,
                                targetItemId: listing.targetItemId ?? "",
                                quantityListed: listing.quantityListed,
                                listingType: listing.listingType,
                                minimumTargetTier: listing.minimumTargetTier ?? "SR",
                                preferredCollections: listing.preferredCollections.join(", "),
                                preferExactTarget: Boolean(listing.tradeRules?.preferExactTarget),
                                notes: listing.notes ?? "",
                                status: listing.status === "paused" ? "paused" : "active",
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => onCancelListing(listing.id)}
                          >
                            Cancel listing
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </SurfaceSection>
      </div>
    </div>
  );
}
function OffersView({
  incomingOffers,
  outgoingOffers,
  itemIndex,
  traderIndex,
  listingIndex,
  onIncomingDecision,
  onWithdraw,
}) {
  return (
    <div className="view-stack">
      <div className="content-grid two-up offers-grid">
        <SurfaceSection
          eyebrow="Incoming"
          title="Offers on your listings"
          description="Accept, reject, and move good trades into history."
        >
          <div className="offer-stack">
            {incomingOffers.map((offer) => {
              const buyer = traderIndex.get(offer.buyerId);
              const listing = listingIndex.get(offer.listingId);
              const targetItem = itemIndex.get(listing?.itemId);
              return (
                <article className="offer-card" key={offer.id}>
                  <div className="offer-head">
                    <div>
                      <strong>{buyer?.displayName ?? "Trader"}</strong>
                      <span>
                        for {targetItem?.name ?? "Listing"} / {formatDateTime(offer.createdAt)}
                      </span>
                    </div>
                    <StatusPill tone={toneForStatus(offer.fairnessLabel)}>
                      {offer.fairnessLabel}
                    </StatusPill>
                  </div>
                  <ul className="token-list">
                    {offer.offerItems.map((item) => (
                      <li key={`${offer.id}-${item.itemId}`}>
                        {itemIndex.get(item.itemId)?.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                  <p className="offer-note">{offer.buyerNote}</p>
                  {offer.status === "pending" ? (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => onIncomingDecision(offer.id, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => onIncomingDecision(offer.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <StatusPill tone={toneForStatus(offer.status)}>{offer.status}</StatusPill>
                  )}
                </article>
              );
            })}
          </div>
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Outgoing"
          title="Offers from your desk"
          description="Withdraw anything that no longer fits the board."
        >
          <div className="offer-stack">
            {outgoingOffers.map((offer) => {
              const seller = traderIndex.get(offer.sellerId);
              const listing = listingIndex.get(offer.listingId);
              const targetItem = itemIndex.get(listing?.itemId);
              return (
                <article className="offer-card" key={offer.id}>
                  <div className="offer-head">
                    <div>
                      <strong>{targetItem?.name ?? "Listing"}</strong>
                      <span>
                        with {seller?.displayName ?? "Trader"} / {formatDateTime(offer.createdAt)}
                      </span>
                    </div>
                    <StatusPill tone={toneForStatus(offer.status)}>{offer.status}</StatusPill>
                  </div>
                  <ul className="token-list">
                    {offer.offerItems.map((item) => (
                      <li key={`${offer.id}-${item.itemId}`}>
                        {itemIndex.get(item.itemId)?.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                  <p className="offer-note">{offer.buyerNote}</p>
                  {offer.status === "pending" ? (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => onWithdraw(offer.id)}
                    >
                      Withdraw
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </SurfaceSection>
      </div>
    </div>
  );
}
function TradesView({
  tradeHistory,
  itemIndex,
  traderIndex,
  currentTraderId,
  onConfirmTrade,
  onDisputeTrade,
}) {
  const [completionNotes, setCompletionNotes] = useState({});
  const [disputeReasons, setDisputeReasons] = useState({});

  const pendingTrades = tradeHistory.filter((trade) => trade.status === "pending_completion");
  const completedTrades = tradeHistory.filter((trade) => trade.status === "completed");
  const disputedTrades = tradeHistory.filter((trade) => trade.status === "disputed");

  function renderTradeCard(trade, showActions = false) {
    const counterparty =
      trade.sellerId === currentTraderId
        ? traderIndex.get(trade.buyerId)
        : traderIndex.get(trade.sellerId);
    const myConfirmed =
      trade.sellerId === currentTraderId ? Boolean(trade.sellerConfirmedAt) : Boolean(trade.buyerConfirmedAt);
    const counterpartyConfirmed =
      trade.sellerId === currentTraderId ? Boolean(trade.buyerConfirmedAt) : Boolean(trade.sellerConfirmedAt);

    return (
      <article className="trade-card" key={trade.id}>
        <div className="trade-head">
          <div>
            <strong>{counterparty?.displayName ?? "Trader"}</strong>
            <span>
              {trade.status === "completed"
                ? `Completed ${formatDateTime(trade.completedAt)}`
                : `Accepted ${formatDateTime(trade.createdAt)}`}
            </span>
          </div>
          <StatusPill tone={toneForStatus(trade.status)}>{trade.status}</StatusPill>
        </div>
        <ul className="token-list dense">
          {trade.tradeItems.map((item, index) => {
            const direction = item.toTraderId === currentTraderId ? "in" : "out";
            return (
              <li key={`${trade.id}-${item.itemId}-${index}`}>
                <span>{itemIndex.get(item.itemId)?.name}</span>
                <em>
                  {direction} x{item.quantity}
                </em>
              </li>
            );
          })}
        </ul>
        <div className="trade-progress-grid">
          <div className="trade-progress-tile">
            <span>You</span>
            <strong>{myConfirmed ? "Confirmed" : "Awaiting confirmation"}</strong>
          </div>
          <div className="trade-progress-tile">
            <span>{counterparty?.displayName ?? "Counterparty"}</span>
            <strong>{counterpartyConfirmed ? "Confirmed" : "Awaiting confirmation"}</strong>
          </div>
        </div>
        {trade.completionNote ? <p className="offer-note">{trade.completionNote}</p> : null}
        {trade.disputeReason ? <p className="catalog-state error">Dispute: {trade.disputeReason}</p> : null}
        {showActions ? (
          <div className="trade-action-stack">
            <label className="field-stack full">
              <span>Completion note</span>
              <textarea
                rows={2}
                value={completionNotes[trade.id] ?? ""}
                onChange={(event) =>
                  setCompletionNotes((current) => ({
                    ...current,
                    [trade.id]: event.target.value,
                  }))
                }
                placeholder="Optional note for the trade ledger"
              />
            </label>
            <div className="button-row">
              <button
                className="button primary"
                type="button"
                disabled={myConfirmed}
                onClick={() => onConfirmTrade(trade.id, completionNotes[trade.id] ?? "")}
              >
                {myConfirmed ? "You confirmed" : "Confirm completion"}
              </button>
            </div>
            <label className="field-stack full">
              <span>Dispute reason</span>
              <textarea
                rows={2}
                value={disputeReasons[trade.id] ?? ""}
                onChange={(event) =>
                  setDisputeReasons((current) => ({
                    ...current,
                    [trade.id]: event.target.value,
                  }))
                }
                placeholder="Explain what is missing or contested"
              />
            </label>
            <button
              className="button secondary"
              type="button"
              disabled={!(disputeReasons[trade.id] ?? "").trim()}
              onClick={() => onDisputeTrade(trade.id, disputeReasons[trade.id] ?? "")}
            >
              Open dispute
            </button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="view-stack">
      <SurfaceSection
        eyebrow="Pending"
        title="Awaiting completion"
        description="Accepted trades stay visible here until both traders confirm or one side disputes."
      >
        <div className="trade-stack">
          {pendingTrades.length ? pendingTrades.map((trade) => renderTradeCard(trade, true)) : <p className="empty-copy">No trades are waiting on completion right now.</p>}
        </div>
      </SurfaceSection>
      <SurfaceSection
        eyebrow="Completed"
        title="Completed ledger"
        description="Final movement is stored explicitly instead of inferred from offers."
      >
        <div className="trade-stack">
          {completedTrades.length ? completedTrades.map((trade) => renderTradeCard(trade)) : <p className="empty-copy">No completed trades yet.</p>}
        </div>
      </SurfaceSection>
      <SurfaceSection
        eyebrow="Disputed"
        title="Manual review queue"
        description="Disputed trades stay visible until an admin resolves them."
      >
        <div className="trade-stack">
          {disputedTrades.length ? disputedTrades.map((trade) => renderTradeCard(trade)) : <p className="empty-copy">No trades are currently disputed.</p>}
        </div>
      </SurfaceSection>
    </div>
  );
}
function AdminView({
  traderDirectory,
  items,
  adminSeedJobs,
  tradeOversightRows,
  tradeOversightSummary,
  tradeOversightEnabled,
  tradeOversightMessage,
  onAdminTradeAction,
}) {
  const [wikiCatalogRows, setWikiCatalogRows] = useState([]);
  const [wikiCatalogStatus, setWikiCatalogStatus] = useState("loading");
  const [wikiCatalogError, setWikiCatalogError] = useState("");
  const [wikiCatalogSource, setWikiCatalogSource] = useState("static");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sourceKindFilter, setSourceKindFilter] = useState("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let cancelled = false;

    setWikiCatalogStatus("loading");
    setWikiCatalogError("");

    import("./lib/wikiCatalogClient")
      .then(({ loadWikiCatalogWithSource }) => loadWikiCatalogWithSource())
      .then(({ rows, source }) => {
        if (cancelled) {
          return;
        }

        setWikiCatalogRows(rows);
        setWikiCatalogSource(source);
        setWikiCatalogStatus("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setWikiCatalogStatus("error");
        setWikiCatalogError(error.message || "Unable to load the wiki item catalog.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rarityOptions = useMemo(
    () =>
      Array.from(new Set(wikiCatalogRows.map((row) => row.wiki_rarity).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, "en")
      ),
    [wikiCatalogRows]
  );

  const sourceKindOptions = useMemo(
    () =>
      Array.from(new Set(wikiCatalogRows.map((row) => row.source_kind).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, "en")
      ),
    [wikiCatalogRows]
  );

  const catalogSummary = useMemo(() => {
    const sourcePages = new Set();

    wikiCatalogRows.forEach((row) => {
      if (row.source_page_title) {
        sourcePages.add(row.source_page_title);
      }
    });

    return {
      totalItems: wikiCatalogRows.length,
      sourcePages: sourcePages.size,
      mockItemsWithImages: items.filter((item) => item.imageUrl).length,
    };
  }, [items, wikiCatalogRows]);

  const filteredCatalogRows = useMemo(() => {
    const terms = normalizeCatalogSearch(deferredSearchQuery)
      .split(" ")
      .filter(Boolean);

    return wikiCatalogRows.filter((row) => {
      if (rarityFilter !== "all" && row.wiki_rarity !== rarityFilter) {
        return false;
      }

      if (sourceKindFilter !== "all" && row.source_kind !== sourceKindFilter) {
        return false;
      }

      if (!terms.length) {
        return true;
      }

      return terms.every((term) => row.search_text?.includes(term));
    });
  }, [deferredSearchQuery, rarityFilter, sourceKindFilter, wikiCatalogRows]);

  const visibleCatalogRows = useMemo(
    () => filteredCatalogRows.slice(0, WIKI_CATALOG_RESULT_LIMIT),
    [filteredCatalogRows]
  );
  const catalogSourceLabel = formatCatalogSource(wikiCatalogSource);

  return (
    <div className="view-stack">
      <div className="content-grid two-up">
        <SurfaceSection
          eyebrow="Trader Admin"
          title="Invite and moderation"
          description="Admin stays operational: traders, disputes, and seeding."
        >
          <div className="table-shell compact">
            <table>
              <thead>
                <tr>
                  <th>Trader</th>
                  <th>Status</th>
                  <th>Desk tag</th>
                </tr>
              </thead>
              <tbody>
                {traderDirectory.map((trader) => (
                  <tr key={trader.id}>
                    <td>{trader.displayName}</td>
                    <td>
                      <StatusPill tone={toneForStatus(trader.status)}>{trader.status}</StatusPill>
                    </td>
                    <td>{trader.deskTag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Item Master"
          title="Catalog sync"
          description="The mock desk, full wiki crawl, and Supabase staging seed now move together."
        >
          <div className="admin-metrics">
            <article className="admin-metric">
              <span>Mock catalog</span>
              <strong>{formatNumber(items.length)}</strong>
              <p>{catalogSummary.mockItemsWithImages} items already show live wiki media.</p>
            </article>
            <article className="admin-metric">
              <span>Wiki crawl</span>
              <strong>{formatNumber(catalogSummary.totalItems)}</strong>
              <p>Generated rows available for search and Supabase import.</p>
            </article>
            <article className="admin-metric">
              <span>Source pages</span>
              <strong>{formatNumber(catalogSummary.sourcePages)}</strong>
              <p>Happy Bag and item-page sources behind the raw master table.</p>
            </article>
          </div>
          <div className="seed-block">
            {adminSeedJobs.map((job) => (
              <div key={job.id} className="seed-row">
                <div>
                  <strong>{job.label}</strong>
                  <span>{job.scope}</span>
                </div>
                <StatusPill tone={toneForStatus(job.status)}>{job.status}</StatusPill>
              </div>
            ))}
          </div>
        </SurfaceSection>
      </div>
      <div className="content-grid two-up">
        <SurfaceSection
          eyebrow="Completion Oversight"
          title="Manual review state"
          description="Pending completion and disputes stay visible here until an admin closes the loop."
        >
          <div className="admin-metrics">
            <article className="admin-metric">
              <span>Pending completion</span>
              <strong>{formatNumber(tradeOversightSummary.pending)}</strong>
              <p>Accepted trades still waiting on final confirmation.</p>
            </article>
            <article className="admin-metric">
              <span>Disputed</span>
              <strong>{formatNumber(tradeOversightSummary.disputed)}</strong>
              <p>Trades that need a manual ruling before the ledger is trusted again.</p>
            </article>
            <article className="admin-metric">
              <span>Aging 24h+</span>
              <strong>{formatNumber(tradeOversightSummary.aging)}</strong>
              <p>Queues worth checking before trust starts slipping.</p>
            </article>
          </div>
          {!tradeOversightEnabled ? (
            <p className="catalog-state">{tradeOversightMessage}</p>
          ) : null}
        </SurfaceSection>
        <SurfaceSection
          eyebrow="Resolution Queue"
          title="Trades needing a call"
          description="Resolve disputes, close stalled completions, and keep the trust loop visible."
        >
          <div className="admin-queue">
            {tradeOversightRows.length ? (
              tradeOversightRows.map((row) => (
                <article key={row.id} className="admin-queue-card">
                  <div className="admin-queue-head">
                    <div>
                      <strong>{row.leadItem?.name ?? "Trade review"}</strong>
                      <span>
                        {row.seller?.displayName ?? "Seller"} to {row.buyer?.displayName ?? "Buyer"}
                      </span>
                    </div>
                    <div className="listing-chip-row">
                      <StatusPill tone={toneForStatus(row.status)}>{row.status.replaceAll("_", " ")}</StatusPill>
                      <StatusPill tone={row.severityTone}>{row.ageLabel}</StatusPill>
                    </div>
                  </div>
                  <p className="admin-queue-copy">{row.movementSummary}</p>
                  <p className="admin-queue-note">
                    {row.queueLabel} / {row.confirmationCount} of 2 confirmations logged
                  </p>
                  {row.disputeReason ? <p className="catalog-state error">Dispute: {row.disputeReason}</p> : null}
                  <div className="button-row start">
                    {row.status === "pending_completion" ? (
                      <button
                        className="button secondary"
                        type="button"
                        disabled={!tradeOversightEnabled}
                        onClick={() => onAdminTradeAction(row.id, "force_complete")}
                      >
                        Force Complete
                      </button>
                    ) : null}
                    {row.status === "disputed" ? (
                      <>
                        <button
                          className="button secondary"
                          type="button"
                          disabled={!tradeOversightEnabled}
                          onClick={() => onAdminTradeAction(row.id, "resolve_complete")}
                        >
                          Resolve Complete
                        </button>
                        <button
                          className="button tertiary"
                          type="button"
                          disabled={!tradeOversightEnabled}
                          onClick={() => onAdminTradeAction(row.id, "resolve_reversed")}
                        >
                          Mark Reversed
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-copy">No trades need admin review right now.</p>
            )}
          </div>
        </SurfaceSection>
      </div>
      <SurfaceSection
        eyebrow="Wiki Item Master"
        title="Search the full crawl"
        description="Loaded on demand from Supabase when env vars are present, with the generated JSON kept as the fallback so the admin item master still works offline."
      >
        <div className="catalog-toolbar">
          <label className="search-field">
            <span>Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search item name, type, rarity, or source page"
            />
          </label>
          <label className="filter-field">
            <span>Rarity</span>
            <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>
              <option value="all">All rarities</option>
              {rarityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Source</span>
            <select value={sourceKindFilter} onChange={(event) => setSourceKindFilter(event.target.value)}>
              <option value="all">All source kinds</option>
              {sourceKindOptions.map((option) => (
                <option key={option} value={option}>
                  {formatSourceKind(option)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {wikiCatalogStatus === "loading" ? (
          <p className="catalog-state">Loading the generated wiki item master...</p>
        ) : null}

        {wikiCatalogStatus === "error" ? (
          <p className="catalog-state error">{wikiCatalogError}</p>
        ) : null}

        {wikiCatalogStatus === "ready" ? (
          <>
            <div className="catalog-meta">
              <span>Source: {catalogSourceLabel}</span>
              <span>{formatNumber(filteredCatalogRows.length)} matches</span>
              <span>{formatNumber(catalogSummary.totalItems)} total items</span>
              <span>{formatNumber(catalogSummary.sourcePages)} source pages</span>
              {filteredCatalogRows.length > visibleCatalogRows.length ? (
                <span>Showing first {formatNumber(visibleCatalogRows.length)} rows</span>
              ) : null}
            </div>
            <div className="table-shell catalog-table">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Rarity</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCatalogRows.map((row) => (
                    <tr key={row.wiki_key}>
                      <td>
                        <div className="item-cell">
                          <ItemTone
                            item={{
                              name: row.page_title,
                              imageUrl: row.image_url,
                              imageAccent: "#ffbed4",
                            }}
                            compact
                          />
                          <div>
                            <strong>{row.page_title}</strong>
                            <span>{formatSourceKind(row.source_kind)}</span>
                            <div className="catalog-links">
                              {row.page_url ? (
                                <a className="inline-link" href={row.page_url} target="_blank" rel="noreferrer">
                                  Item page
                                </a>
                              ) : null}
                              {row.source_page_url ? (
                                <a className="inline-link" href={row.source_page_url} target="_blank" rel="noreferrer">
                                  Source page
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="catalog-type">{row.item_type ?? "-"}</td>
                      <td>
                        <StatusPill tone={toneForWikiRarity(row.wiki_rarity)}>
                          {row.wiki_rarity ?? "-"}
                        </StatusPill>
                      </td>
                      <td>
                        <div className="catalog-source">
                          <strong>{row.source_page_title ?? "Unknown source"}</strong>
                          <span>{row.source_collection_title ?? formatSourceKind(row.source_kind)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </SurfaceSection>
    </div>
  );
}

function OfferBuilder({
  listing,
  seller,
  targetItem,
  desiredItem,
  suggestedPlan,
  availableRows,
  selectedOfferItems,
  fairness,
  draftOffer,
  onAdjust,
  onLoadSuggestedBundle,
  onClose,
  onSend,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="offer-builder-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">{getListingEyebrow(listing.listingType)}</p>
            <h3 id="offer-builder-title">{targetItem.name}</h3>
            <p>
              {seller?.displayName ?? "Trader"} / {listing.notes}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close offer builder"
            onClick={onClose}
          >
            x
          </button>
        </header>

        <div className="content-grid modal-grid">
          <SurfaceSection
            eyebrow="Target"
            title="Trade context"
            description="Keep the listed item, target ask, and floor visible while you build."
          >
            <div className="target-box">
              <ItemTone item={targetItem} large />
              <div>
                <strong>{targetItem.name}</strong>
                <p>
                  They are offering {targetItem.name} / {describeItem(targetItem)} / {targetItem.demandLevel} demand
                </p>
                <small>
                  {listing.preferredCollections.join(", ") || "No collection preference"} / floor {listing.minimumTargetTier}
                </small>
                {desiredItem ? (
                  <div className="listing-focus">
                    <span>Desired target</span>
                    <strong>{desiredItem.name}</strong>
                  </div>
                ) : null}
                {isVariableValueItem(targetItem) ? (
                  <StatusPill tone="warm">Variable-value item</StatusPill>
                ) : null}
                {targetItem.sourcePageUrl ? (
                  <a
                    className="inline-link"
                    href={targetItem.sourcePageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open wiki source
                  </a>
                ) : null}
              </div>
            </div>
          </SurfaceSection>
          <SurfaceSection
            eyebrow="Your bundle"
            title="Selected items"
            description="This fairness label is only an estimate."
          >
            {suggestedPlan?.bundle.length ? (
              <div className="suggestion-callout">
                <div>
                  <strong>Smart suggestion</strong>
                  <p>{suggestedPlan.bundleSummary}</p>
                </div>
                <div className="listing-chip-row">
                  <StatusPill tone={suggestedPlan.readinessTone}>{suggestedPlan.readinessLabel}</StatusPill>
                  <button type="button" className="button tertiary" onClick={onLoadSuggestedBundle}>
                    Reload Suggestion
                  </button>
                </div>
              </div>
            ) : null}
            {selectedOfferItems.length ? (
              <ul className="token-list dense">
                {selectedOfferItems.map((entry) => (
                  <li key={entry.item.id}>
                    <span>{entry.item.name}</span>
                    <em>x{entry.quantity}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">Use the quantity steppers below to build the offer.</p>
            )}
            <div className={`fairness-band ${fairness.label}`} aria-live="polite">
              <strong>
                {fairness.label === "neutral" ? "No estimate yet" : fairness.label.toUpperCase()}
              </strong>
              <span>
                Your bundle {formatValuePoints(fairness.buyerValueTotal)} / their listing {formatValuePoints(fairness.sellerValueTotal)}
              </span>
              <p>{fairness.summary}</p>
              <div className="fairness-metrics">
                <div>
                  <span>Difference</span>
                  <strong>
                    {fairness.difference >= 0 ? "+" : ""}
                    {formatValuePoints(fairness.difference)}
                  </strong>
                </div>
                <div>
                  <span>Target match</span>
                  <strong>
                    {fairness.desiredTargetMatch === "matched"
                      ? "Included"
                      : fairness.desiredTargetMatch === "missing"
                        ? "Missing"
                        : "Not required"}
                  </strong>
                </div>
              </div>
            </div>
          </SurfaceSection>
        </div>

        <SurfaceSection
          eyebrow="Inventory"
          title="Offerable pieces"
          description="Only quantities available now can be added."
          className="picker-surface"
        >
          <div className="picker-grid">
            {availableRows.map((row) => {
              const selectedQuantity = draftOffer[row.item.id] ?? 0;
              return (
                <article className="picker-row" key={row.id}>
                  <ItemTone item={row.item} compact />
                  <div className="picker-copy">
                    <strong>{row.item.name}</strong>
                    <span>
                      {row.item.wikiRarity} / {row.quantityAvailable} available / {formatValuePoints(row.score)}
                    </span>
                  </div>
                  <div className="stepper" aria-label={`${row.item.name} quantity controls`}>
                    <button
                      type="button"
                      className="stepper-button"
                      onClick={() => onAdjust(row.item.id, -1, row.quantityAvailable)}
                      disabled={selectedQuantity === 0}
                    >
                      -
                    </button>
                    <output>{selectedQuantity}</output>
                    <button
                      type="button"
                      className="stepper-button"
                      onClick={() => onAdjust(row.item.id, 1, row.quantityAvailable)}
                      disabled={selectedQuantity >= row.quantityAvailable}
                    >
                      +
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </SurfaceSection>

        <footer className="modal-footer">
          <p>Fairness is a guide. The trader still makes the call.</p>
          <div className="button-row">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="button primary"
              onClick={onSend}
              disabled={selectedOfferItems.length === 0}
            >
              Send Offer
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
function App() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstallPrompt();
  const { hasUpdate, isReady, updateVersion, applyUpdate } = useServiceWorkerUpdate();
  const authEnabled = hasSupabaseAuthEnv();
  const [activeView, setActiveView] = useState(readViewFromHash);
  const [authReady, setAuthReady] = useState(() => !authEnabled);
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState("");
  const [installPending, setInstallPending] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState(0);
  const [currentTrader, setCurrentTrader] = useState(() => EMPTY_TRADER);
  const [workspaceItems, setWorkspaceItems] = useState(() => []);
  const [traderDirectory, setTraderDirectory] = useState(() => []);
  const [wishlistEntries, setWishlistEntries] = useState(() => []);
  const [reputationSnapshot, setReputationSnapshot] = useState(() => EMPTY_REPUTATION);
  const [collectionProgressState, setCollectionProgressState] = useState(() => []);
  const [workspaceSource, setWorkspaceSource] = useState("mock");
  const [workspaceWarning, setWorkspaceWarning] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [marketListings, setMarketListings] = useState(() => []);
  const [myListings, setMyListings] = useState(() => []);
  const [inventory, setInventory] = useState(() => []);
  const [incomingOffers, setIncomingOffers] = useState(() => []);
  const [outgoingOffers, setOutgoingOffers] = useState(() => []);
  const [tradeHistory, setTradeHistory] = useState(() => []);
  const [adminSeedJobsState, setAdminSeedJobsState] = useState(() => []);
  const [adminTradeQueue, setAdminTradeQueue] = useState(() => []);
  const [offerBuilderListingId, setOfferBuilderListingId] = useState(null);
  const [draftOffer, setDraftOffer] = useState({});
  const [liveMessage, setLiveMessage] = useState("");
  const [celebration, setCelebration] = useState(null);
  const [isCompactShell, setIsCompactShell] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 1180 : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pwaStatusLabel = isInstalled ? "Installed" : isReady ? "App ready" : "";
  const pwaStatusTone = isInstalled ? "good" : "accent";

  useEffect(() => {
    setDismissedUpdateVersion(0);
    setUpdatePending(false);
  }, [updateVersion]);

  function applyWorkspace(workspace) {
    setCurrentTrader(workspace.currentTrader);
    setWorkspaceItems(workspace.items);
    setTraderDirectory(workspace.traderDirectory);
    setWishlistEntries(workspace.wishlistEntries);
    setReputationSnapshot(workspace.reputationSnapshot);
    setMarketListings(workspace.marketListings);
    setMyListings(workspace.myListings);
    setInventory(workspace.inventory);
    setIncomingOffers(workspace.incomingOffers);
    setOutgoingOffers(workspace.outgoingOffers);
    setTradeHistory(workspace.tradeHistory);
    setCollectionProgressState(workspace.collectionProgress ?? []);
    setCelebration(null);

    if (!workspace.currentTrader?.isAdmin) {
      setAdminTradeQueue([]);
    }
  }

  function resetWorkspaceToEmpty() {
    applyWorkspace({
      currentTrader: EMPTY_TRADER,
      items: [],
      traderDirectory: [],
      wishlistEntries: [],
      reputationSnapshot: EMPTY_REPUTATION,
      marketListings: [],
      myListings: [],
      inventory: [],
      incomingOffers: [],
      outgoingOffers: [],
      tradeHistory: [],
      collectionProgress: [],
    });
    setAdminSeedJobsState([]);
    setAdminTradeQueue([]);
  }

  useEffect(() => {
    const handleHashChange = () => {
      setActiveView(readViewFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsCompactShell(window.innerWidth <= 1180);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isCompactShell) {
      setIsSidebarOpen(false);
    }
  }, [isCompactShell]);

  useEffect(() => {
    if (!isCompactShell || !isSidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCompactShell, isSidebarOpen]);

  useEffect(() => {
    if (!celebration) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCelebration(null);
    }, 5200);

    return () => window.clearTimeout(timeoutId);
  }, [celebration]);

  useEffect(() => {
    if (authEnabled) {
      return undefined;
    }

    let cancelled = false;

    async function loadMockWorkspace() {
      setWorkspaceReady(false);

      try {
        const { source, workspace, adminSeedJobs } = await loadMockWorkspaceBundle();

        if (cancelled) {
          return;
        }

        applyWorkspace(workspace);
        setAdminSeedJobsState(adminSeedJobs);
        setWorkspaceSource(source);
        setWorkspaceWarning("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        resetWorkspaceToEmpty();
        setWorkspaceSource("mock");
        setWorkspaceWarning(error.message || "Unable to load the demo workspace.");
      } finally {
        if (!cancelled) {
          setWorkspaceReady(true);
        }
      }
    }

    loadMockWorkspace();

    return () => {
      cancelled = true;
    };
  }, [authEnabled]);

  useEffect(() => {
    if (!authEnabled) {
      return;
    }

    let cancelled = false;

    getInitialAuthState()
      .then(({ session: initialSession }) => {
        if (cancelled) {
          return;
        }

        setSession(initialSession);
        setAuthReady(true);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setAuthError(error.message || "Unable to restore the Supabase session.");
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = subscribeToAuthChanges((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        resetWorkspaceToEmpty();
        setWorkspaceSource("mock");
        setWorkspaceReady(false);
        setWorkspaceWarning("");
      }

      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [authEnabled]);

  useEffect(() => {
    if (!authEnabled || !session) {
      setWorkspaceReady(!authEnabled);
      return;
    }

    let cancelled = false;
    async function loadWorkspace() {
      setWorkspaceReady(false);

      try {
        const { source, workspace } = await loadTraderWorkspaceWithSource();

        if (cancelled) {
          return;
        }

        applyWorkspace(workspace);
        setWorkspaceSource(source);
        setWorkspaceWarning("");
        setAdminSeedJobsState([]);

        if (workspace.currentTrader?.isAdmin) {
          try {
            const queue = await loadAdminTradeOversight();

            if (cancelled) {
              return;
            }

            setAdminTradeQueue(queue);
          } catch (error) {
            if (cancelled) {
              return;
            }

            setAdminTradeQueue([]);
            setWorkspaceWarning(error.message || "Unable to load the live admin moderation queue.");
          }
        }

        if (cancelled) {
          return;
        }

        setWorkspaceReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        try {
          const { source, workspace, adminSeedJobs } = await loadMockWorkspaceBundle();

          if (cancelled) {
            return;
          }

          applyWorkspace(workspace);
          setAdminSeedJobsState(adminSeedJobs);
          setWorkspaceSource(source);
          setWorkspaceWarning(error.message || "Unable to load the Supabase workspace.");
          setWorkspaceReady(true);
        } catch (mockError) {
          if (cancelled) {
            return;
          }

          resetWorkspaceToEmpty();
          setWorkspaceSource("mock");
          setWorkspaceWarning(
            mockError.message || error.message || "Unable to load the Supabase workspace."
          );
          setWorkspaceReady(true);
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [authEnabled, session]);

  const itemIndex = useMemo(() => new Map(workspaceItems.map((item) => [item.id, item])), [workspaceItems]);
  const traderIndex = useMemo(() => new Map(traderDirectory.map((trader) => [trader.id, trader])), [traderDirectory]);
  const listingIndex = useMemo(
    () => new Map([...marketListings, ...myListings].map((listing) => [listing.id, listing])),
    [marketListings, myListings]
  );

  const inventoryRows = useMemo(
    () =>
      inventory
        .map((entry) => {
          const item = itemIndex.get(entry.itemId);
          const quantityAvailable = Math.max(entry.quantityOwned - entry.quantityListed, 0);
          const score = getItemScore(item);
          const breakdown = getValueBreakdown(item);

          return {
            ...entry,
            item,
            quantityAvailable,
            score,
            breakdown,
            scoreTotal: score * Math.max(quantityAvailable, 1),
          };
        })
        .sort((left, right) => right.score - left.score),
    [inventory, itemIndex]
  );

  const duplicateRows = useMemo(
    () => inventoryRows.filter((row) => row.isTradeableDuplicate || row.quantityOwned > 1),
    [inventoryRows]
  );
  const collectionProgress = useMemo(
    () =>
      collectionProgressState.length
        ? collectionProgressState
        : getCollectionProgressFallback(workspaceItems, inventoryRows),
    [collectionProgressState, inventoryRows, workspaceItems]
  );
  const currentRankSummary = useMemo(
    () => derivePlatformRank(currentTrader, reputationSnapshot),
    [currentTrader, reputationSnapshot]
  );

  const offerableInventory = useMemo(
    () => inventoryRows.filter((row) => row.quantityAvailable > 0),
    [inventoryRows]
  );

  const activeMarketListings = useMemo(
    () => marketListings.filter((listing) => listing.status === "active"),
    [marketListings]
  );

  const listingPlans = useMemo(
    () =>
      activeMarketListings
        .map((listing) => {
          const targetItem = itemIndex.get(listing.itemId);

          if (!targetItem) {
            return null;
          }

          const seller = traderIndex.get(listing.traderId);
          const desiredItem = listing.targetItemId ? itemIndex.get(listing.targetItemId) : null;
          const wishlistEntry = wishlistEntries.find((entry) => entry.itemId === listing.itemId) ?? null;
          const suggestion = buildSuggestedBundle({
            listing,
            availableRows: offerableInventory,
            itemIndex,
          });

          let score = getItemScore(targetItem) / 4;
          const reasons = [];

          if (wishlistEntry) {
            score += getPriorityWeight(wishlistEntry.priority) * 140;
            reasons.push(`${wishlistEntry.priority} wishlist target`);
          }

          if (suggestion.exactTargetAvailable) {
            score += 150;
            reasons.push("you already hold their exact target");
          }

          if (suggestion.collectionOverlap > 0) {
            score += Math.min(suggestion.collectionOverlap * 22, 66);
          }

          if (suggestion.bundle.length) {
            score += 90;
          }

          if (suggestion.fairness.label === "fair") {
            score += 55;
          } else if (suggestion.fairness.label === "underpay") {
            score -= 18;
          } else if (suggestion.fairness.label === "overpay") {
            score += 28;
          }

          if (suggestion.fairness.desiredTargetMatch === "matched") {
            score += 40;
          }

          if (listing.listingType === "wanted_item" && suggestion.exactTargetAvailable) {
            score += 40;
          }

          const readinessLabel = !suggestion.bundle.length
            ? suggestion.exactTargetAvailable
              ? "Target held"
              : "Watch list"
            : suggestion.fairness.label === "fair" && suggestion.fairness.desiredTargetMatch !== "missing"
              ? "Ready now"
              : suggestion.fairness.label === "overpay"
                ? "Strong start"
                : "Needs support";
          const readinessTone = !suggestion.bundle.length
            ? suggestion.exactTargetAvailable
              ? "warm"
              : "muted"
            : suggestion.fairness.label === "fair" && suggestion.fairness.desiredTargetMatch !== "missing"
              ? "good"
              : suggestion.fairness.label === "overpay" || suggestion.exactTargetAvailable
                ? "accent"
                : "warm";

          return {
            listing,
            seller,
            targetItem,
            desiredItem,
            wishlistEntry,
            bundle: suggestion.bundle,
            draft: buildDraftFromBundle(suggestion.bundle),
            bundleSummary: summarizeBundle(suggestion.bundle),
            fairness: suggestion.fairness,
            readinessLabel,
            readinessTone,
            reason: reasons[0] ?? suggestion.reasons[0] ?? "Worth keeping on your board.",
            detail: suggestion.reasons.join(" / "),
            score,
          };
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score || right.fairness.buyerValueTotal - left.fairness.buyerValueTotal),
    [activeMarketListings, itemIndex, offerableInventory, traderIndex, wishlistEntries]
  );

  const listingPlanById = useMemo(
    () => new Map(listingPlans.map((plan) => [plan.listing.id, plan])),
    [listingPlans]
  );

  const smartOpportunityRows = useMemo(() => listingPlans.slice(0, 4), [listingPlans]);

  const wishlistRows = useMemo(
    () =>
      wishlistEntries.map((entry) => {
        const item = itemIndex.get(entry.itemId);
        const matches = activeMarketListings.filter((listing) => listing.itemId === entry.itemId).length;
        const requestedMatches = activeMarketListings.filter((listing) => listing.targetItemId === entry.itemId).length;
        const bestPlan =
          listingPlans.find(
            (plan) => plan.listing.itemId === entry.itemId || plan.listing.targetItemId === entry.itemId
          ) ?? null;

        return {
          ...entry,
          item,
          matches,
          requestedMatches,
          matchLabel: `${matches} live listing${matches === 1 ? "" : "s"}${
            requestedMatches ? ` / ${requestedMatches} trader ask${requestedMatches === 1 ? "" : "s"}` : ""
          }`,
          bestAction: bestPlan?.reason ?? "Watch the desk for new overlaps.",
        };
      }),
    [activeMarketListings, itemIndex, listingPlans, wishlistEntries]
  );
  const achievementBoard = useMemo(
    () =>
      deriveAchievementBoard({
        reputationSnapshot,
        tradeHistory,
        collectionProgress,
        duplicateRows,
        wishlistRows,
        inventoryRows,
        myListings,
      }),
    [
      collectionProgress,
      duplicateRows,
      inventoryRows,
      myListings,
      reputationSnapshot,
      tradeHistory,
      wishlistRows,
    ]
  );

  const adminOversightSourceTrades = useMemo(
    () => (workspaceSource === "supabase" && currentTrader?.isAdmin ? adminTradeQueue : tradeHistory),
    [adminTradeQueue, currentTrader?.isAdmin, tradeHistory, workspaceSource]
  );

  const adminOversightRows = useMemo(
    () =>
      adminOversightSourceTrades
        .filter((trade) => trade.status === "pending_completion" || trade.status === "disputed")
        .map((trade) => {
          const listing = listingIndex.get(trade.listingId);
          const leadItemId = listing?.itemId ?? trade.tradeItems[0]?.itemId;
          const leadItem = itemIndex.get(leadItemId);
          const seller = traderIndex.get(trade.sellerId);
          const buyer = traderIndex.get(trade.buyerId);
          const ageHours = Math.max(
            1,
            Math.round((Date.now() - new Date(trade.createdAt).getTime()) / 36e5)
          );
          const confirmationCount =
            Number(Boolean(trade.sellerConfirmedAt)) + Number(Boolean(trade.buyerConfirmedAt));

          return {
            ...trade,
            leadItem,
            seller,
            buyer,
            ageHours,
            ageLabel: formatAgeLabel(ageHours),
            confirmationCount,
            severityTone:
              trade.status === "disputed" ? "danger" : ageHours >= 24 ? "warm" : "muted",
            queueLabel:
              trade.status === "disputed"
                ? "Needs ruling"
                : confirmationCount === 2
                  ? "Ready to close"
                  : confirmationCount === 1
                    ? "Waiting on one side"
                    : "Waiting on both sides",
            movementSummary: trade.tradeItems
              .slice(0, 2)
              .map((item) => `${itemIndex.get(item.itemId)?.name ?? "Item"} x${item.quantity}`)
              .join(" + "),
          };
        })
        .sort(
          (left, right) =>
            (right.status === "disputed") - (left.status === "disputed") ||
            right.ageHours - left.ageHours
        ),
    [adminOversightSourceTrades, itemIndex, listingIndex, traderIndex]
  );

  const adminOversightSummary = useMemo(
    () => ({
      pending: adminOversightRows.filter((row) => row.status === "pending_completion").length,
      disputed: adminOversightRows.filter((row) => row.status === "disputed").length,
      aging: adminOversightRows.filter((row) => row.ageHours >= 24).length,
    }),
    [adminOversightRows]
  );

  const wishlistItemOptions = useMemo(
    () =>
      workspaceItems
        .filter(Boolean)
        .sort((left, right) => left.name.localeCompare(right.name, "en")),
    [workspaceItems]
  );

  const pendingIncomingCount = incomingOffers.filter((offer) => offer.status === "pending").length;
  const pendingOutgoingCount = outgoingOffers.filter((offer) => offer.status === "pending").length;
  const openMarketCount = activeMarketListings.length;
  const tradableUnits = duplicateRows.reduce((sum, row) => sum + row.quantityAvailable, 0);
  const inventoryUnits = inventoryRows.reduce((sum, row) => sum + row.quantityOwned, 0);

  const navigation = useMemo(() => {
    const countsById = {
      dashboard: openMarketCount,
      profile: null,
      inventory: inventoryRows.length,
      duplicates: duplicateRows.length,
      wishlist: wishlistRows.filter((row) => row.matches > 0).length,
      listings: openMarketCount + myListings.length,
      offers: pendingIncomingCount + pendingOutgoingCount,
      trades: tradeHistory.length,
      admin: adminSeedJobsState.length + adminOversightRows.length,
    };

    return NAV_ITEMS.map((item) => ({
      ...item,
      count: countsById[item.id] ?? null,
    }));
  }, [
    adminOversightRows.length,
    adminSeedJobsState.length,
    duplicateRows.length,
    inventoryRows.length,
    myListings.length,
    openMarketCount,
    pendingIncomingCount,
    pendingOutgoingCount,
    tradeHistory.length,
    wishlistRows,
  ]);

  const selectedListing = useMemo(
    () => marketListings.find((listing) => listing.id === offerBuilderListingId) ?? null,
    [marketListings, offerBuilderListingId]
  );

  const selectedListingPlan = useMemo(
    () => (selectedListing ? listingPlanById.get(selectedListing.id) ?? null : null),
    [listingPlanById, selectedListing]
  );

  const selectedOfferItems = useMemo(
    () =>
      Object.entries(draftOffer)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({
          item: itemIndex.get(itemId),
          quantity,
        })),
    [draftOffer, itemIndex]
  );

  const fairness = useMemo(() => {
    if (!selectedListing) {
      return {
        offerTotal: 0,
        targetTotal: 0,
        ratio: 0,
        label: "neutral",
        summary: "Pick a listing to start.",
      };
    }

    return evaluateOffer({
      targetItem: itemIndex.get(selectedListing.itemId),
      quantityListed: selectedListing.quantityListed,
      offeredItems: selectedOfferItems,
      desiredItemId: selectedListing.targetItemId ?? null,
    });
  }, [itemIndex, selectedListing, selectedOfferItems]);

  const listingIncomingCounts = useMemo(() => {
    const counts = new Map();

    incomingOffers.forEach((offer) => {
      if (offer.status !== "pending") {
        return;
      }

      counts.set(offer.listingId, (counts.get(offer.listingId) ?? 0) + 1);
    });

    return counts;
  }, [incomingOffers]);

  const stats = [
    {
      label: "Inventory Units",
      value: formatNumber(inventoryUnits),
      detail: `${inventoryRows.length} unique items on desk`,
    },
    {
      label: "Tradable Duplicates",
      value: formatNumber(tradableUnits),
      detail: `${duplicateRows.length} rows with surplus`,
    },
    {
      label: "Pending Queue",
      value: formatNumber(pendingIncomingCount + pendingOutgoingCount),
      detail: `${pendingIncomingCount} incoming / ${pendingOutgoingCount} outgoing`,
    },
    {
      label: "Trust Score",
      value: `${reputationSnapshot.reputationScore}`,
      detail: `${reputationSnapshot.responseRate}% response rate`,
    },
  ];

  const activeViewMeta = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0];

  function loadSuggestedBundle(listingId) {
    const plan = listingPlanById.get(listingId);

    if (!plan?.bundle.length) {
      return false;
    }

    setDraftOffer(plan.draft);
    return true;
  }

  function openOfferBuilder(listingId) {
    setOfferBuilderListingId(listingId);

    if (loadSuggestedBundle(listingId)) {
      setLiveMessage("Smart bundle loaded into the offer builder.");
      return;
    }

    setDraftOffer({});
  }

  function openBestOpportunity() {
    const listingId = smartOpportunityRows[0]?.listing.id ?? marketListings[0]?.id ?? null;

    if (!listingId) {
      return;
    }

    openOfferBuilder(listingId);
  }

  function closeOfferBuilder() {
    setOfferBuilderListingId(null);
    setDraftOffer({});
  }

  function handleDraftAdjust(itemId, delta, maxAvailable) {
    setDraftOffer((current) => {
      const nextQuantity = Math.max(Math.min((current[itemId] ?? 0) + delta, maxAvailable), 0);
      const nextDraft = { ...current };

      if (nextQuantity === 0) {
        delete nextDraft[itemId];
        return nextDraft;
      }

      nextDraft[itemId] = nextQuantity;
      return nextDraft;
    });
  }

  async function refreshSupabaseWorkspace(successMessage, nextHash) {
    const { workspace } = await loadTraderWorkspaceWithSource();

    applyWorkspace(workspace);
    setWorkspaceSource("supabase");
    setWorkspaceWarning("");

    if (workspace.currentTrader?.isAdmin) {
      try {
        const queue = await loadAdminTradeOversight();
        setAdminTradeQueue(queue);
      } catch (error) {
        setAdminTradeQueue([]);
        setWorkspaceWarning(error.message || "Unable to load the live admin moderation queue.");
      }
    } else {
      setAdminTradeQueue([]);
    }

    if (successMessage) {
      setLiveMessage(successMessage);
    }

    if (nextHash) {
      window.location.hash = nextHash;
    }
  }

  async function handleAuthSignIn(credentials) {
    setAuthError("");
    await signInWithPassword(credentials);
  }

  async function handleAuthSignUp(credentials) {
    setAuthError("");
    await signUpWithPassword(credentials);
  }

  async function handleSignOut() {
    try {
      await signOutSupabase();
    } catch (error) {
      setWorkspaceWarning(error.message || "Unable to sign out.");
    }
  }

  async function handleInstallApp() {
    setInstallPending(true);

    try {
      await promptInstall();
    } finally {
      setInstallPending(false);
    }
  }

  function handleApplyUpdate() {
    setUpdatePending(true);
    applyUpdate();
  }

  async function handleCreateWishlistEntry(payload) {
    if (workspaceSource === "supabase") {
      try {
        await upsertWishlistEntry(payload);
        await refreshSupabaseWorkspace("Wishlist updated.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to create the wishlist entry.");
      }

      return;
    }

    const nextEntry = {
      id: `wish-${Date.now()}`,
      traderId: currentTrader.id,
      itemId: payload.itemId,
      priority: payload.priority,
      desiredQuantity: payload.desiredQuantity,
      notes: payload.notes,
    };

    setWishlistEntries((current) => [nextEntry, ...current]);
    setLiveMessage("Wishlist updated.");
  }

  async function handleUpdateWishlistEntry(entryId, payload) {
    if (workspaceSource === "supabase") {
      try {
        await upsertWishlistEntry({
          entryId,
          itemId: wishlistEntries.find((entry) => entry.id === entryId)?.itemId,
          priority: payload.priority,
          desiredQuantity: payload.desiredQuantity,
          notes: payload.notes,
        });
        await refreshSupabaseWorkspace("Wishlist updated.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to update the wishlist entry.");
      }

      return;
    }

    setWishlistEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              priority: payload.priority,
              desiredQuantity: payload.desiredQuantity,
              notes: payload.notes,
            }
          : entry
      )
    );
    setLiveMessage("Wishlist updated.");
  }

  async function handleDeleteWishlistEntry(entryId) {
    if (workspaceSource === "supabase") {
      try {
        await deleteWishlistEntry(entryId);
        await refreshSupabaseWorkspace("Wishlist entry removed.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to remove the wishlist entry.");
      }

      return;
    }

    setWishlistEntries((current) => current.filter((entry) => entry.id !== entryId));
    setLiveMessage("Wishlist entry removed.");
  }

  async function handleSaveProfile(payload) {
    if (workspaceSource === "supabase") {
      try {
        await upsertTraderProfile(payload);
        await refreshSupabaseWorkspace("Desk profile updated.", "profile");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to save the desk profile.");
      }

      return;
    }

    const buddyLabel = getBuddyLabel(payload.buddyKey);

    setCurrentTrader((current) => ({
      ...current,
      displayName: payload.displayName,
      buddyKey: payload.buddyKey,
      buddyName: buddyLabel,
      prideFlagKey: payload.prideFlagKey ?? null,
      strawberryTitle: payload.strawberryTitle,
      profileCode: payload.profileCode,
      isProfileCodeVisible: payload.isProfileCodeVisible,
    }));
    setTraderDirectory((current) =>
      current.map((trader) =>
        trader.id === currentTrader.id
          ? {
              ...trader,
              displayName: payload.displayName,
              buddyKey: payload.buddyKey,
              buddyName: buddyLabel,
              prideFlagKey: payload.prideFlagKey ?? null,
              strawberryTitle: payload.strawberryTitle,
              profileCode: payload.isProfileCodeVisible ? payload.profileCode : "",
              isProfileCodeVisible: payload.isProfileCodeVisible,
            }
          : trader
      )
    );
    setLiveMessage("Desk profile updated.");
  }

  async function handleSetBirthday(payload) {
    if (workspaceSource === "supabase") {
      try {
        await setMyBirthday(payload);
        await refreshSupabaseWorkspace("Birthday identity saved.", "profile");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to save your birthday identity.");
      }

      return;
    }

    if (currentTrader.birthdayLocked) {
      setWorkspaceWarning("Birthday has already been set and is locked.");
      return;
    }

    const zodiacKey = getZodiacKey(payload.birthMonth, payload.birthDay);

    setCurrentTrader((current) => ({
      ...current,
      birthMonth: payload.birthMonth,
      birthDay: payload.birthDay,
      birthdayLocked: true,
      birthdaySetAt: new Date().toISOString(),
      zodiacKey,
    }));
    setLiveMessage("Birthday identity saved.");
  }

  async function handleCreateListing(payload) {
    if (workspaceSource === "supabase") {
      try {
        await upsertListing(payload);
        await refreshSupabaseWorkspace("Listing created.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to create the listing.");
      }

      return;
    }

    const nextListing = {
      id: `listing-${Date.now()}`,
      traderId: currentTrader.id,
      itemId: payload.itemId,
      targetItemId: payload.targetItemId ?? null,
      quantityListed: payload.quantityListed,
      listingType: payload.listingType,
      status: "active",
      minimumTargetTier: payload.minimumTargetTier,
      preferredCollections: payload.preferredCollections,
      tradeRules: payload.tradeRules ?? {},
      notes: payload.notes,
      expiresAt: null,
    };

    setMyListings((current) => [nextListing, ...current]);
    setInventory((current) =>
      current.map((entry) =>
        entry.itemId === payload.itemId
          ? {
              ...entry,
              quantityListed: entry.quantityListed + payload.quantityListed,
            }
          : entry
      )
    );
    setLiveMessage("Listing created.");
  }

  async function handleUpdateListing(listingId, payload) {
    if (workspaceSource === "supabase") {
      try {
        await upsertListing({
          listingId,
          ...payload,
        });
        await refreshSupabaseWorkspace("Listing updated.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to update the listing.");
      }

      return;
    }

    const previousListing = myListings.find((listing) => listing.id === listingId);

    if (!previousListing) {
      return;
    }

    setMyListings((current) =>
      current.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              itemId: payload.itemId,
              targetItemId: payload.targetItemId ?? null,
              quantityListed: payload.quantityListed,
              listingType: payload.listingType,
              status: payload.status,
              minimumTargetTier: payload.minimumTargetTier,
              preferredCollections: payload.preferredCollections,
              tradeRules: payload.tradeRules ?? {},
              notes: payload.notes,
            }
          : listing
      )
    );

    setInventory((current) => {
      let nextInventory = current.map((entry) =>
        entry.itemId === previousListing.itemId
          ? {
              ...entry,
              quantityListed: entry.quantityListed - previousListing.quantityListed,
            }
          : entry
      );

      nextInventory = nextInventory.map((entry) =>
        entry.itemId === payload.itemId
          ? {
              ...entry,
              quantityListed: entry.quantityListed + payload.quantityListed,
            }
          : entry
      );

      return nextInventory;
    });
    setLiveMessage("Listing updated.");
  }

  async function handleCancelListing(listingId) {
    if (workspaceSource === "supabase") {
      try {
        await cancelListing(listingId);
        await refreshSupabaseWorkspace("Listing cancelled.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to cancel the listing.");
      }

      return;
    }

    const listing = myListings.find((entry) => entry.id === listingId);

    if (!listing) {
      return;
    }

    setMyListings((current) =>
      current.map((entry) =>
        entry.id === listingId
          ? {
              ...entry,
              status: "cancelled",
            }
          : entry
      )
    );
    setInventory((current) =>
      current.map((entry) =>
        entry.itemId === listing.itemId
          ? {
              ...entry,
              quantityListed: Math.max(entry.quantityListed - listing.quantityListed, 0),
            }
          : entry
      )
    );
    setLiveMessage("Listing cancelled.");
  }

  async function handleSendOffer() {
    if (!selectedListing || selectedOfferItems.length === 0) {
      return;
    }

    const successMessage = `Offer sent to ${traderIndex.get(selectedListing.traderId)?.displayName ?? "trader"}.`;

    if (workspaceSource === "supabase") {
      try {
        await createOfferFromBundle({
          listingId: selectedListing.id,
          buyerNote: "Built from the desk surface.",
          fairnessLabel: fairness.label === "neutral" ? "underpay" : fairness.label,
          fairnessScore: Number(fairness.ratio.toFixed(2)),
          offerItems: selectedOfferItems.map((entry) => ({
            itemId: entry.item.id,
            quantity: entry.quantity,
            valueSnapshot: getItemScore(entry.item),
          })),
        });
        await refreshSupabaseWorkspace(successMessage, "offers");
        closeOfferBuilder();
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to send the Supabase offer.");
        setLiveMessage("Offer could not be sent from Supabase.");
      }

      return;
    }

    const nextOffer = {
      id: `offer-out-${Date.now()}`,
      listingId: selectedListing.id,
      sellerId: selectedListing.traderId,
      buyerId: currentTrader.id,
      status: "pending",
      fairnessLabel: fairness.label === "neutral" ? "underpay" : fairness.label,
      fairnessScore: Number(fairness.ratio.toFixed(2)),
      buyerNote: "Built from the desk surface.",
      sellerNote: "",
      createdAt: new Date().toISOString(),
      offerItems: selectedOfferItems.map((entry) => ({
        itemId: entry.item.id,
        quantity: entry.quantity,
        valueSnapshot: getItemScore(entry.item),
      })),
    };

    setOutgoingOffers((current) => [nextOffer, ...current]);
    setLiveMessage(successMessage);
    window.location.hash = "offers";
    closeOfferBuilder();
  }

  async function handleWithdrawOutgoing(offerId) {
    if (workspaceSource === "supabase") {
      try {
        await withdrawWorkspaceOffer(offerId);
        await refreshSupabaseWorkspace("Outgoing offer withdrawn.");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to withdraw the Supabase offer.");
        setLiveMessage("Outgoing offer could not be withdrawn.");
      }

      return;
    }

    setOutgoingOffers((current) =>
      current.map((offer) => (offer.id === offerId ? { ...offer, status: "withdrawn" } : offer))
    );
    setLiveMessage("Outgoing offer withdrawn.");
  }

  async function handleIncomingDecision(offerId, decision) {
    const targetOffer = incomingOffers.find((offer) => offer.id === offerId);

    if (!targetOffer) {
      return;
    }

    if (workspaceSource === "supabase") {
      try {
        if (decision === "reject") {
          await rejectIncomingWorkspaceOffer(offerId);
          await refreshSupabaseWorkspace("Incoming offer rejected.");
          return;
        }

        await acceptIncomingWorkspaceOffer(offerId);
        await refreshSupabaseWorkspace("Incoming offer accepted and moved into pending completion.", "trades");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to process the Supabase offer.");
        setLiveMessage("Offer decision could not be saved to Supabase.");
      }

      return;
    }

    if (decision === "reject") {
      setIncomingOffers((current) =>
        current.map((offer) => (offer.id === offerId ? { ...offer, status: "rejected" } : offer))
      );
      setLiveMessage("Incoming offer rejected.");
      return;
    }

    const listing = myListings.find((entry) => entry.id === targetOffer.listingId);

    if (!listing) {
      return;
    }

    const acceptedTrade = buildAcceptedTrade(targetOffer, listing);

    setIncomingOffers((current) =>
      current.map((offer) => {
        if (offer.listingId !== listing.id) {
          return offer;
        }

        if (offer.id === offerId) {
          return { ...offer, status: "accepted" };
        }

        if (offer.status === "pending") {
          return { ...offer, status: "cancelled" };
        }

        return offer;
      })
    );

    setMyListings((current) =>
      current.map((entry) => (entry.id === listing.id ? { ...entry, status: "completed" } : entry))
    );

    setInventory((current) => {
      let nextInventory = updateInventorySnapshot(
        current,
        currentTrader.id,
        listing.itemId,
        -listing.quantityListed,
        -listing.quantityListed
      );

      targetOffer.offerItems.forEach((offerItem) => {
        nextInventory = updateInventorySnapshot(
          nextInventory,
          currentTrader.id,
          offerItem.itemId,
          offerItem.quantity,
          0
        );
      });

      return nextInventory;
    });

    setTradeHistory((current) => [acceptedTrade, ...current]);
    setReputationSnapshot((current) => ({
      ...current,
      acceptedOffersCount: current.acceptedOffersCount + 1,
    }));
    setLiveMessage("Incoming offer accepted and moved into pending completion.");
    window.location.hash = "trades";
  }

  async function handleConfirmTrade(tradeId, completionNote) {
    const targetTrade = tradeHistory.find((trade) => trade.id === tradeId);

    if (!targetTrade) {
      return;
    }

    if (workspaceSource === "supabase") {
      const actorField = targetTrade.sellerId === currentTrader.id ? "sellerConfirmedAt" : "buyerConfirmedAt";
      const otherField = actorField === "sellerConfirmedAt" ? "buyerConfirmedAt" : "sellerConfirmedAt";
      const willComplete = Boolean(targetTrade[otherField]);

      try {
        await confirmTradeCompletion(tradeId, completionNote);
        await refreshSupabaseWorkspace("Trade confirmation saved.", "trades");
        if (willComplete) {
          setCelebration(buildTradeCelebration(targetTrade, currentTrader.id, traderIndex, itemIndex));
          setLiveMessage("Trade confirmed and moved into the completed ledger.");
        }
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to confirm the trade.");
        setLiveMessage("Trade confirmation could not be saved.");
      }

      return;
    }

    const actorField = targetTrade.sellerId === currentTrader.id ? "sellerConfirmedAt" : "buyerConfirmedAt";
    const otherField = actorField === "sellerConfirmedAt" ? "buyerConfirmedAt" : "sellerConfirmedAt";

    if (targetTrade[actorField]) {
      return;
    }

    const confirmedAt = new Date().toISOString();
    const willComplete = Boolean(targetTrade[otherField]);

    setTradeHistory((current) =>
      current.map((trade) =>
        trade.id === tradeId
          ? {
              ...trade,
              [actorField]: confirmedAt,
              completionNote: completionNote || trade.completionNote,
              status: willComplete ? "completed" : trade.status,
              completedAt: willComplete ? confirmedAt : trade.completedAt,
              resolvedAt: willComplete ? confirmedAt : trade.resolvedAt,
            }
          : trade
      )
    );

    if (willComplete) {
      setReputationSnapshot((current) => ({
        ...current,
        completedTradesCount: current.completedTradesCount + 1,
      }));
      setCelebration(buildTradeCelebration(targetTrade, currentTrader.id, traderIndex, itemIndex));
      setLiveMessage("Trade confirmed and moved into the completed ledger.");
      return;
    }

    setLiveMessage("Your completion confirmation was saved. Waiting on the other trader.");
  }

  async function handleDisputeTrade(tradeId, reason) {
    const targetTrade = tradeHistory.find((trade) => trade.id === tradeId);
    const trimmedReason = reason.trim();

    if (!targetTrade || !trimmedReason) {
      return;
    }

    if (workspaceSource === "supabase") {
      try {
        await disputeTrade(tradeId, trimmedReason);
        await refreshSupabaseWorkspace("Trade moved into dispute review.", "trades");
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to dispute the trade.");
        setLiveMessage("Trade dispute could not be saved.");
      }

      return;
    }

    setTradeHistory((current) =>
      current.map((trade) =>
        trade.id === tradeId
          ? {
              ...trade,
              status: "disputed",
              disputeReason: trimmedReason,
            }
          : trade
      )
    );
    setReputationSnapshot((current) => ({
      ...current,
      disputeCount: current.disputeCount + 1,
    }));
    setLiveMessage("Trade moved into dispute review.");
  }

  async function handleAdminTradeAction(tradeId, action) {
    const targetTrade = adminOversightSourceTrades.find((trade) => trade.id === tradeId);

    if (!targetTrade) {
      return;
    }

    if (workspaceSource === "supabase") {
      try {
        if (action === "force_complete" || action === "resolve_complete") {
          await adminMarkTradeCompleted(
            tradeId,
            action === "force_complete"
              ? "Admin completed the trade after manual completion review."
              : "Admin resolved the dispute in favor of completion."
          );
          await refreshSupabaseWorkspace("Admin closed the trade into the completed ledger.", "admin");
          return;
        }

        if (action === "resolve_reversed") {
          await adminMarkTradeReversed(tradeId, "Admin reversed the trade after dispute review.");
          await refreshSupabaseWorkspace("Admin marked the trade as reversed.", "admin");
        }
      } catch (error) {
        setWorkspaceWarning(error.message || "Unable to save the admin moderation action.");
        setLiveMessage("Admin moderation could not be saved.");
      }

      return;
    }

    const resolvedAt = new Date().toISOString();

    setTradeHistory((current) =>
      current.map((trade) => {
        if (trade.id !== tradeId) {
          return trade;
        }

        if (action === "force_complete" || action === "resolve_complete") {
          return {
            ...trade,
            status: "completed",
            sellerConfirmedAt: trade.sellerConfirmedAt ?? resolvedAt,
            buyerConfirmedAt: trade.buyerConfirmedAt ?? resolvedAt,
            completedAt: trade.completedAt ?? resolvedAt,
            resolvedAt,
            disputeReason: action === "resolve_complete" ? "" : trade.disputeReason,
            completionNote: appendResolutionNote(
              trade.completionNote,
              action === "force_complete"
                ? "Admin completed the trade after manual completion review."
                : "Admin resolved the dispute in favor of completion."
            ),
          };
        }

        if (action === "resolve_reversed") {
          return {
            ...trade,
            status: "reversed",
            resolvedAt,
            completionNote: appendResolutionNote(
              trade.completionNote,
              "Admin reversed the trade after dispute review."
            ),
          };
        }

        return trade;
      })
    );

    if (action === "force_complete" || action === "resolve_complete") {
      setReputationSnapshot((current) => ({
        ...current,
        completedTradesCount:
          targetTrade.status === "completed" ? current.completedTradesCount : current.completedTradesCount + 1,
      }));
      setLiveMessage("Admin closed the trade into the completed ledger.");
      return;
    }

    if (action === "resolve_reversed") {
      setReputationSnapshot((current) => ({
        ...current,
        cancelledTradesCount: current.cancelledTradesCount + 1,
      }));
      setLiveMessage("Admin marked the trade as reversed.");
    }
  }

  let viewBody = null;

  switch (activeView) {
    case "profile":
      viewBody = (
        <ProfileView
          currentTrader={currentTrader}
          rankSummary={currentRankSummary}
          inventoryRows={inventoryRows}
          collectionProgress={collectionProgress}
          reputationSnapshot={reputationSnapshot}
          onSaveProfile={handleSaveProfile}
          onSetBirthday={handleSetBirthday}
          achievementBoard={achievementBoard}
        />
      );
      break;
    case "inventory":
      viewBody = <InventoryView inventoryRows={inventoryRows} collectionProgress={collectionProgress} />;
      break;
    case "duplicates":
      viewBody = <DuplicatesView duplicateRows={duplicateRows} />;
      break;
    case "wishlist":
      viewBody = (
        <WishlistView
          wishlistRows={wishlistRows}
          itemOptions={wishlistItemOptions}
          onCreateWishlistEntry={handleCreateWishlistEntry}
          onUpdateWishlistEntry={handleUpdateWishlistEntry}
          onDeleteWishlistEntry={handleDeleteWishlistEntry}
        />
      );
      break;
    case "listings":
      viewBody = (
        <ListingsView
          marketListings={marketListings}
          myListings={myListings}
          inventoryRows={inventoryRows}
          itemIndex={itemIndex}
          traderIndex={traderIndex}
          openOfferBuilder={openOfferBuilder}
          listingIncomingCounts={listingIncomingCounts}
          onCreateListing={handleCreateListing}
          onUpdateListing={handleUpdateListing}
          onCancelListing={handleCancelListing}
        />
      );
      break;
    case "offers":
      viewBody = (
        <OffersView
          incomingOffers={incomingOffers}
          outgoingOffers={outgoingOffers}
          itemIndex={itemIndex}
          traderIndex={traderIndex}
          listingIndex={listingIndex}
          onIncomingDecision={handleIncomingDecision}
          onWithdraw={handleWithdrawOutgoing}
        />
      );
      break;
    case "trades":
      viewBody = (
        <TradesView
          tradeHistory={tradeHistory}
          itemIndex={itemIndex}
          traderIndex={traderIndex}
          currentTraderId={currentTrader.id}
          onConfirmTrade={handleConfirmTrade}
          onDisputeTrade={handleDisputeTrade}
        />
      );
      break;
    case "admin":
      viewBody = (
        <AdminView
          traderDirectory={traderDirectory}
          items={workspaceItems}
          adminSeedJobs={adminSeedJobsState}
          tradeOversightRows={adminOversightRows}
          tradeOversightSummary={adminOversightSummary}
          tradeOversightEnabled={Boolean(currentTrader?.isAdmin)}
          tradeOversightMessage={
            workspaceSource === "supabase"
              ? "Sign in with an admin-linked trader to moderate live trades."
              : "Admin moderation actions are only available from an admin desk."
          }
          onAdminTradeAction={handleAdminTradeAction}
        />
      );
      break;
    case "dashboard":
    default:
      viewBody = (
        <DashboardView
          stats={stats}
          duplicateRows={duplicateRows}
          smartOpportunityRows={smartOpportunityRows}
          incomingOffers={incomingOffers}
          openOfferBuilder={openOfferBuilder}
          traderIndex={traderIndex}
          wishlistRows={wishlistRows}
          workspaceSource={workspaceSource}
          currentTrader={currentTrader}
          rankSummary={currentRankSummary}
          achievementBoard={achievementBoard}
        />
      );
      break;
  }

  return (
    <>
      {!authEnabled && !workspaceReady ? <LoadingScreen label="Loading demo desk" /> : null}
      {authEnabled && !authReady ? <LoadingScreen label="Restoring session" /> : null}
      {authEnabled && authReady && !session ? (
        <AuthScreen
          authError={authError}
          onSignIn={handleAuthSignIn}
          onSignUp={handleAuthSignUp}
          canInstall={canInstall}
          installPending={installPending}
          onInstallApp={handleInstallApp}
          pwaStatusLabel={pwaStatusLabel}
          pwaStatusTone={pwaStatusTone}
        />
      ) : null}
      {authEnabled && authReady && session && !workspaceReady ? (
        <LoadingScreen label="Loading trader workspace" />
      ) : null}
      {authEnabled && authReady && session && workspaceReady && workspaceWarning && workspaceSource !== "supabase" ? (
        <div className="auth-shell">
          <section className="auth-surface">
            <p className="eyebrow">Trader link</p>
            <h2>We found your Supabase account, but not your trader profile.</h2>
            <p>{workspaceWarning}</p>
            <div className="button-row">
              <button className="button secondary" type="button" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {((!authEnabled && workspaceReady) ||
      (authReady && (!session ? false : workspaceReady && (workspaceSource === "supabase" || !workspaceWarning)))) ? (
      <>
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <div className={`app-shell ${isCompactShell ? "compact-shell" : ""}`.trim()}>
        <Sidebar
          navigation={navigation}
          activeView={activeView}
          pendingIncomingCount={pendingIncomingCount}
          currentTrader={currentTrader}
          rankSummary={currentRankSummary}
          isCompactShell={isCompactShell}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="main-shell">
          <TopBar
            activeViewMeta={activeViewMeta}
            pendingIncomingCount={pendingIncomingCount}
            onOpenBuilder={openBestOpportunity}
            onSignOut={authEnabled ? handleSignOut : null}
            workspaceSource={workspaceSource}
            isCompactShell={isCompactShell}
            onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
            canInstall={canInstall}
            installPending={installPending}
            onInstallApp={handleInstallApp}
            pwaStatusLabel={pwaStatusLabel}
            pwaStatusTone={pwaStatusTone}
          />
          {workspaceSource === "supabase" && liveMessage ? (
            <section className="live-message-banner" aria-label="Live activity update">
              <div>
                <p className="eyebrow">Live update</p>
                <strong>{liveMessage}</strong>
              </div>
              <button className="button tertiary" type="button" onClick={() => setLiveMessage("")}>
                Dismiss
              </button>
            </section>
          ) : null}
          {workspaceSource !== "supabase" ? (
            <LiveModeNotice
              authEnabled={authEnabled}
              session={session}
              workspaceSource={workspaceSource}
              workspaceWarning={workspaceWarning}
              currentTrader={currentTrader}
            />
          ) : null}
          {workspaceWarning ? <p className="catalog-state error">{workspaceWarning}</p> : null}
          <div className="workspace-frame">
            <main className="workspace-main" id="workspace-main">
              {viewBody}
            </main>
            <InspectorRail
              opportunityRows={smartOpportunityRows}
              reputationSnapshot={reputationSnapshot}
              pendingIncomingCount={pendingIncomingCount}
            />
          </div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <TradeCelebrationOverlay
        celebration={celebration}
        currentTrader={currentTrader}
        rankSummary={currentRankSummary}
        onDismiss={() => setCelebration(null)}
      />
      {selectedListing ? (
        <OfferBuilder
          listing={selectedListing}
          seller={traderIndex.get(selectedListing.traderId)}
          targetItem={itemIndex.get(selectedListing.itemId)}
          desiredItem={selectedListing.targetItemId ? itemIndex.get(selectedListing.targetItemId) : null}
          suggestedPlan={selectedListingPlan}
          availableRows={offerableInventory}
          selectedOfferItems={selectedOfferItems}
          fairness={fairness}
          draftOffer={draftOffer}
          onAdjust={handleDraftAdjust}
          onLoadSuggestedBundle={() => {
            if (loadSuggestedBundle(selectedListing.id)) {
              setLiveMessage("Smart bundle reloaded into the offer builder.");
            }
          }}
          onClose={closeOfferBuilder}
          onSend={handleSendOffer}
        />
      ) : null}
      {hasUpdate && updateVersion !== dismissedUpdateVersion ? (
        <UpdateBanner
          isUpdating={updatePending}
          onApplyUpdate={handleApplyUpdate}
          onDismiss={() => setDismissedUpdateVersion(updateVersion)}
        />
      ) : null}
      </>
      ) : null}
    </>
  );
}

export default App;





