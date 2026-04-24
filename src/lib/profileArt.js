const ASSET_ROOT = "/assets";
const BASE_AVATAR_PREFIX = `${ASSET_ROOT}/avatars/base/`;
const VARIANT_AVATAR_PREFIX = `${ASSET_ROOT}/avatars/buddy_variants/`;

export const BUDDY_META = {
  my_melody: {
    label: "My Melody",
    imageUrl: `${ASSET_ROOT}/buddies/my_melody.png`,
    archetype: "hooded",
  },
  hello_kitty: {
    label: "Hello Kitty",
    imageUrl: `${ASSET_ROOT}/buddies/hello_kitty.png`,
    archetype: "cat",
  },
  pompompurin: {
    label: "Pompompurin",
    imageUrl: `${ASSET_ROOT}/buddies/pompompurin.png`,
    archetype: "puppy",
  },
  kuromi: {
    label: "Kuromi",
    imageUrl: `${ASSET_ROOT}/buddies/kuromi.png`,
    archetype: "hooded",
  },
  kerokerokeroppi: {
    label: "Kerokerokeroppi",
    imageUrl: `${ASSET_ROOT}/buddies/kerokerokeroppi.png`,
    archetype: "puppy",
  },
  tuxedosam: {
    label: "Tuxedosam",
    imageUrl: `${ASSET_ROOT}/buddies/tuxedosam.png`,
    archetype: "puppy",
  },
  pochacco: {
    label: "Pochacco",
    imageUrl: `${ASSET_ROOT}/buddies/pochacco.png`,
    archetype: "puppy",
  },
  badtz_maru: {
    label: "Badtz-Maru",
    imageUrl: `${ASSET_ROOT}/buddies/badtz_maru.png`,
    archetype: "cat",
  },
  kiki_lala: {
    label: "Kiki & Lala",
    imageUrl: `${ASSET_ROOT}/buddies/kiki_lala.png`,
    archetype: "hooded",
  },
  gudetama: {
    label: "Gudetama",
    imageUrl: `${ASSET_ROOT}/buddies/gudetama.png`,
    archetype: "cat",
  },
  cinnamoroll: {
    label: "Cinnamoroll",
    imageUrl: `${ASSET_ROOT}/buddies/cinnamoroll.png`,
    archetype: "puppy",
  },
  wish_me_mell: {
    label: "Wish me mell",
    imageUrl: `${ASSET_ROOT}/buddies/wish_me_mell.png`,
    archetype: "hooded",
  },
  cogimyun: {
    label: "Cogimyun",
    imageUrl: `${ASSET_ROOT}/buddies/cogimyun.png`,
    archetype: "hooded",
  },
  hangyodon: {
    label: "Hangyodon",
    imageUrl: `${ASSET_ROOT}/buddies/hangyodon.png`,
    archetype: "puppy",
  },
  ahirunopekkle: {
    label: "Ahirunopekkle",
    imageUrl: `${ASSET_ROOT}/buddies/ahirunopekkle.png`,
    archetype: "puppy",
  },
};

const LEGACY_BUDDY_NAME_TO_KEY = Object.fromEntries(
  Object.entries(BUDDY_META).map(([key, meta]) => [meta.label, key])
);

export const BUDDY_KEYS = Object.keys(BUDDY_META);

export const PRIDE_FLAG_META = {
  rainbow: {
    label: "Rainbow / LGBTQ+",
    stripes: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"],
  },
  progress_pride: {
    label: "Progress Pride",
    stripes: ["#000000", "#613915", "#74d7ee", "#f5a9b8", "#ffffff", "#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"],
  },
  lesbian: {
    label: "Lesbian",
    stripes: ["#d52d00", "#ef7627", "#ff9a56", "#ffffff", "#d162a4", "#b55690", "#a30262"],
  },
  gay: {
    label: "Gay",
    stripes: ["#078d70", "#26ceaa", "#98e8c1", "#ffffff", "#7bade2", "#5049cb", "#3d1a78"],
  },
  bisexual: {
    label: "Bisexual",
    stripes: ["#d60270", "#d60270", "#9b4f96", "#0038a8", "#0038a8"],
  },
  pansexual: {
    label: "Pansexual",
    stripes: ["#ff1b8d", "#ffd900", "#1bb3ff"],
  },
  asexual: {
    label: "Asexual",
    stripes: ["#000000", "#a3a3a3", "#ffffff", "#800080"],
  },
  aromantic: {
    label: "Aromantic",
    stripes: ["#3da542", "#a7d379", "#ffffff", "#a9a9a9", "#000000"],
  },
  demisexual: {
    label: "Demisexual",
    stripes: ["#000000", "#ffffff", "#6e0170", "#d2d2d2"],
  },
  queer: {
    label: "Queer",
    stripes: ["#000000", "#9ad9ea", "#ffffff", "#f6a2c6", "#b36fe3"],
  },
  questioning: {
    label: "Questioning",
    stripes: ["#000000", "#5bcffa", "#f5abb9", "#ffffff", "#f5abb9", "#5bcffa", "#000000"],
  },
  transgender: {
    label: "Transgender",
    stripes: ["#5bcffa", "#f5abb9", "#ffffff", "#f5abb9", "#5bcffa"],
  },
  nonbinary: {
    label: "Nonbinary",
    stripes: ["#fff430", "#ffffff", "#9c59d1", "#2d2d2d"],
  },
  genderfluid: {
    label: "Genderfluid",
    stripes: ["#ff75a2", "#ffffff", "#be18d6", "#000000", "#333ebd"],
  },
  agender: {
    label: "Agender",
    stripes: ["#000000", "#bcc4c7", "#ffffff", "#b8f483", "#ffffff", "#bcc4c7", "#000000"],
  },
  intersex: {
    label: "Intersex",
    stripes: ["#ffd800", "#ffd800", "#7902aa", "#ffd800", "#ffd800"],
  },
};

export const PRIDE_FLAG_KEYS = Object.keys(PRIDE_FLAG_META);

const BIRTH_MONTH_LABELS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const ZODIAC_META = {
  zodiac_aries: {
    label: "Aries",
    stamp: "ARI",
    tone: "accent",
  },
  zodiac_taurus: {
    label: "Taurus",
    stamp: "TAU",
    tone: "good",
  },
  zodiac_gemini: {
    label: "Gemini",
    stamp: "GEM",
    tone: "warm",
  },
  zodiac_cancer: {
    label: "Cancer",
    stamp: "CAN",
    tone: "good",
  },
  zodiac_leo: {
    label: "Leo",
    stamp: "LEO",
    tone: "warm",
  },
  zodiac_virgo: {
    label: "Virgo",
    stamp: "VIR",
    tone: "muted",
  },
  zodiac_libra: {
    label: "Libra",
    stamp: "LIB",
    tone: "accent",
  },
  zodiac_scorpio: {
    label: "Scorpio",
    stamp: "SCO",
    tone: "accent",
  },
  zodiac_sagittarius: {
    label: "Sagittarius",
    stamp: "SAG",
    tone: "warm",
  },
  zodiac_capricorn: {
    label: "Capricorn",
    stamp: "CAP",
    tone: "muted",
  },
  zodiac_aquarius: {
    label: "Aquarius",
    stamp: "AQU",
    tone: "good",
  },
  zodiac_pisces: {
    label: "Pisces",
    stamp: "PIS",
    tone: "accent",
  },
};

export const RANK_VISUALS = {
  charm_trader: {
    badgeImageUrl: `${ASSET_ROOT}/badges/rank/rank_charm_trader.png`,
    frameImageUrl: null,
  },
  treasure_keeper: {
    badgeImageUrl: `${ASSET_ROOT}/badges/rank/rank_treasure_keeper.png`,
    frameImageUrl: `${ASSET_ROOT}/frames/frame_treasure_gem_ring.png`,
  },
  dream_collector: {
    badgeImageUrl: `${ASSET_ROOT}/badges/rank/rank_dream_collector.png`,
    frameImageUrl: `${ASSET_ROOT}/frames/frame_dream_glow_ring.png`,
  },
  legendary: {
    badgeImageUrl: `${ASSET_ROOT}/badges/rank/rank_legendary.png`,
    frameImageUrl: `${ASSET_ROOT}/frames/frame_legendary_ornate_aura.png`,
  },
};

const RANK_TO_AVATAR_VARIANT = {
  charm_trader: "charm",
  treasure_keeper: "treasure",
  dream_collector: "dream",
  legendary: "legendary",
};

export function normalizeBuddyKey(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return BUDDY_META[normalized] ? normalized : null;
}

export function buddyKeyFromLegacyName(name) {
  if (typeof name !== "string") {
    return null;
  }

  return LEGACY_BUDDY_NAME_TO_KEY[name.trim()] ?? null;
}

export function resolveBuddyKey(value) {
  return normalizeBuddyKey(value) ?? buddyKeyFromLegacyName(value);
}

export function getBuddyMeta(value) {
  const buddyKey = resolveBuddyKey(value);
  return buddyKey ? { key: buddyKey, ...BUDDY_META[buddyKey] } : null;
}

export function getBuddyLabel(value) {
  return getBuddyMeta(value)?.label ?? "";
}

export function getBuddyImageUrl(value) {
  return getBuddyMeta(value)?.imageUrl ?? null;
}

export function normalizePrideFlagKey(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return PRIDE_FLAG_META[normalized] ? normalized : null;
}

export function getPrideFlagMeta(value) {
  const prideFlagKey = normalizePrideFlagKey(value);
  return prideFlagKey ? { key: prideFlagKey, ...PRIDE_FLAG_META[prideFlagKey] } : null;
}

export function getPrideFlagGradient(value) {
  const stripes = getPrideFlagMeta(value)?.stripes;

  if (!stripes?.length) {
    return null;
  }

  return `linear-gradient(180deg, ${stripes
    .map((color, index) => {
      const start = ((index / stripes.length) * 100).toFixed(2);
      const end = (((index + 1) / stripes.length) * 100).toFixed(2);
      return `${color} ${start}% ${end}%`;
    })
    .join(", ")})`;
}

export function getRankVisual(rankId) {
  return RANK_VISUALS[rankId] ?? RANK_VISUALS.charm_trader;
}

export function normalizeZodiacKey(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return ZODIAC_META[normalized] ? normalized : null;
}

export function getBirthDayLimit(month) {
  switch (Number(month)) {
    case 2:
      return 29;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    default:
      return 31;
  }
}

export function getZodiacKey(month, day) {
  const birthMonth = Number(month);
  const birthDay = Number(day);

  if (!Number.isInteger(birthMonth) || !Number.isInteger(birthDay)) {
    return null;
  }

  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > getBirthDayLimit(birthMonth)) {
    return null;
  }

  if ((birthMonth === 12 && birthDay >= 22) || (birthMonth === 1 && birthDay <= 19)) {
    return "zodiac_capricorn";
  }

  if ((birthMonth === 1 && birthDay >= 20) || (birthMonth === 2 && birthDay <= 18)) {
    return "zodiac_aquarius";
  }

  if ((birthMonth === 2 && birthDay >= 19) || (birthMonth === 3 && birthDay <= 20)) {
    return "zodiac_pisces";
  }

  if ((birthMonth === 3 && birthDay >= 21) || (birthMonth === 4 && birthDay <= 19)) {
    return "zodiac_aries";
  }

  if ((birthMonth === 4 && birthDay >= 20) || (birthMonth === 5 && birthDay <= 20)) {
    return "zodiac_taurus";
  }

  if ((birthMonth === 5 && birthDay >= 21) || (birthMonth === 6 && birthDay <= 20)) {
    return "zodiac_gemini";
  }

  if ((birthMonth === 6 && birthDay >= 21) || (birthMonth === 7 && birthDay <= 22)) {
    return "zodiac_cancer";
  }

  if ((birthMonth === 7 && birthDay >= 23) || (birthMonth === 8 && birthDay <= 22)) {
    return "zodiac_leo";
  }

  if ((birthMonth === 8 && birthDay >= 23) || (birthMonth === 9 && birthDay <= 22)) {
    return "zodiac_virgo";
  }

  if ((birthMonth === 9 && birthDay >= 23) || (birthMonth === 10 && birthDay <= 22)) {
    return "zodiac_libra";
  }

  if ((birthMonth === 10 && birthDay >= 23) || (birthMonth === 11 && birthDay <= 21)) {
    return "zodiac_scorpio";
  }

  return "zodiac_sagittarius";
}

export function getZodiacMeta(value) {
  const zodiacKey = normalizeZodiacKey(value);
  return zodiacKey ? { key: zodiacKey, ...ZODIAC_META[zodiacKey] } : null;
}

export function formatBirthdayLabel(month, day) {
  const birthMonth = Number(month);
  const birthDay = Number(day);

  if (
    !Number.isInteger(birthMonth) ||
    !Number.isInteger(birthDay) ||
    birthMonth < 1 ||
    birthMonth > 12 ||
    birthDay < 1 ||
    birthDay > getBirthDayLimit(birthMonth)
  ) {
    return "";
  }

  return `${BIRTH_MONTH_LABELS[birthMonth]} ${birthDay}`;
}

export function getBuddyArchetype(value) {
  return getBuddyMeta(value)?.archetype ?? "hooded";
}

export function getDefaultAvatarUrlForBuddy(value) {
  return `${BASE_AVATAR_PREFIX}avatar_base_${getBuddyArchetype(value)}.png`;
}

export function getBuddyAvatarUrl(value, rankId = "charm_trader") {
  const archetype = getBuddyArchetype(value);
  const variant = RANK_TO_AVATAR_VARIANT[rankId] ?? "charm";
  return `${VARIANT_AVATAR_PREFIX}${variant}/avatar_${variant}_${archetype}.png`;
}

export function getResolvedAvatarUrl(existingAvatarUrl, buddyValue, rankId) {
  if (
    existingAvatarUrl &&
    !existingAvatarUrl.startsWith(BASE_AVATAR_PREFIX) &&
    !existingAvatarUrl.startsWith(VARIANT_AVATAR_PREFIX)
  ) {
    return existingAvatarUrl;
  }

  if (!resolveBuddyKey(buddyValue) && existingAvatarUrl) {
    return existingAvatarUrl;
  }

  return getBuddyAvatarUrl(buddyValue, rankId);
}
