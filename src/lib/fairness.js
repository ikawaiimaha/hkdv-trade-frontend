export const RARITY_COMMON_UNITS = {
  S: 4,
  R: 2,
  N: 1,
};

export const SOURCE_MULTIPLIER = {
  regular_happy_bag: 1,
  event: 1,
  attendance: 1,
  standard: 1.5,
  basic_style: 2,
  sweet_collection: 2,
  lucky_bag: 2,
  hour_48: 2,
  day_3: 2,
  hour_24: 3,
  hour_24_sweet_collection: 4,
};

export const TIME_MULTIPLIER = {
  launch_2021: 4.5,
  late_2021: 4,
  early_2022: 3,
  late_2022: 2,
  early_2023: 1,
  late_2023: 1,
  early_2024: 1,
  late_2024: 1,
  year_2025_plus: 0.9,
};

export const DEMAND_MULTIPLIER = {
  high: 1.35,
  medium: 1.15,
  low: 1,
};

export function getProjectedValue(item) {
  if (!item) {
    return 0;
  }

  const rarityUnits = RARITY_COMMON_UNITS[item.wikiRarity] ?? 0;
  const sourceMultiplier = SOURCE_MULTIPLIER[item.sourceType] ?? 1;
  const timeMultiplier = TIME_MULTIPLIER[item.releaseWindow] ?? 1;

  return rarityUnits * sourceMultiplier * timeMultiplier;
}

export function getCommunityValue(item) {
  if (!item) {
    return 0;
  }

  return getProjectedValue(item) * (DEMAND_MULTIPLIER[item.demandLevel] ?? 1);
}

export function getItemScore(item) {
  return Math.round(getCommunityValue(item) * 10);
}

export function getValueBreakdown(item) {
  if (!item) {
    return {
      rarityUnits: 0,
      sourceMultiplier: 0,
      timeMultiplier: 0,
      demandMultiplier: 0,
      projectedValue: 0,
      communityValue: 0,
    };
  }

  const rarityUnits = RARITY_COMMON_UNITS[item.wikiRarity] ?? 0;
  const sourceMultiplier = SOURCE_MULTIPLIER[item.sourceType] ?? 1;
  const timeMultiplier = TIME_MULTIPLIER[item.releaseWindow] ?? 1;
  const demandMultiplier = DEMAND_MULTIPLIER[item.demandLevel] ?? 1;
  const projectedValue = rarityUnits * sourceMultiplier * timeMultiplier;
  const communityValue = projectedValue * demandMultiplier;

  return {
    rarityUnits,
    sourceMultiplier,
    timeMultiplier,
    demandMultiplier,
    projectedValue,
    communityValue,
  };
}

export function evaluateOffer({ targetItem, quantityListed, offeredItems, desiredItemId = null }) {
  const targetTotal = getItemScore(targetItem) * quantityListed;
  const offerTotal = offeredItems.reduce(
    (sum, entry) => sum + getItemScore(entry.item) * entry.quantity,
    0
  );
  const difference = offerTotal - targetTotal;
  const desiredTargetQuantity = desiredItemId
    ? offeredItems.reduce(
        (sum, entry) => sum + (entry.item?.id === desiredItemId ? entry.quantity : 0),
        0
      )
    : 0;
  const desiredTargetMatch = !desiredItemId
    ? "not_applicable"
    : desiredTargetQuantity > 0
      ? "matched"
      : "missing";

  if (!targetTotal || !offerTotal) {
    return {
      sellerValueTotal: targetTotal,
      buyerValueTotal: offerTotal,
      offerTotal,
      targetTotal,
      difference,
      ratio: targetTotal ? offerTotal / targetTotal : 0,
      label: "neutral",
      summary: "Add items to compare the community-value estimate.",
      desiredTargetQuantity,
      desiredTargetMatch,
    };
  }

  const ratio = offerTotal / targetTotal;

  if (ratio < 0.85) {
    return {
      sellerValueTotal: targetTotal,
      buyerValueTotal: offerTotal,
      offerTotal,
      targetTotal,
      difference,
      ratio,
      label: "underpay",
      summary: "This bundle lands below the current wiki-guided value band.",
      desiredTargetQuantity,
      desiredTargetMatch,
    };
  }

  if (ratio > 1.15) {
    return {
      sellerValueTotal: targetTotal,
      buyerValueTotal: offerTotal,
      offerTotal,
      targetTotal,
      difference,
      ratio,
      label: "overpay",
      summary: "This bundle clears the current wiki-guided value band.",
      desiredTargetQuantity,
      desiredTargetMatch,
    };
  }

  return {
    sellerValueTotal: targetTotal,
    buyerValueTotal: offerTotal,
    offerTotal,
    targetTotal,
    difference,
    ratio,
    label: "fair",
    summary: "This bundle sits inside the current community-value band.",
    desiredTargetQuantity,
    desiredTargetMatch,
  };
}
