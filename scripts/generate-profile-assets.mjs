import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const publicAssetsDir = path.join(projectRoot, "public", "assets");
const thumbnailsDir = path.join(publicAssetsDir, "thumbnails");
const manifestPath = path.join(publicAssetsDir, "profile-assets.json");
const reviewSheetPath = path.join(publicAssetsDir, "profile-art-sheet.html");
const exportSizes = [512, 256, 128, 64, 32];

const badges = [
  {
    id: "charm_trader",
    file: "rank_charm_trader",
    label: "Charm Trader",
    gradient: ["#ffe6f0", "#ff9dc4"],
    inner: ["#fff7fb", "#ffd9ea"],
    ring: ["#ffffff", "#ffd9eb"],
    icon: ["#ff72ac", "#ffc9df"],
  },
  {
    id: "treasure_keeper",
    file: "rank_treasure_keeper",
    label: "Treasure Keeper",
    gradient: ["#e8dcff", "#b79ced"],
    inner: ["#faf7ff", "#ded1ff"],
    ring: ["#ffffff", "#d9cbff"],
    icon: ["#8f72e7", "#d8cbff"],
  },
  {
    id: "dream_collector",
    file: "rank_dream_collector",
    label: "Dream Collector",
    gradient: ["#e7fbff", "#8fd3ff"],
    inner: ["#fbfeff", "#d4f3ff"],
    ring: ["#ffffff", "#c2f1ff"],
    icon: ["#5caaf5", "#dff8ff"],
  },
  {
    id: "legendary",
    file: "rank_legendary",
    label: "Legendary",
    gradient: ["#fff4d7", "#e7c86e"],
    inner: ["#fffdf7", "#f8ecd0"],
    ring: ["#ffffff", "#f9ebc1"],
    icon: ["#c79632", "#fff0c2"],
  },
];

const frames = [
  {
    id: "treasure_gem_ring",
    file: "frame_treasure_gem_ring",
    label: "Treasure Gem Ring",
    gradient: ["#efe5ff", "#b79ced"],
    accent: "#8f72e7",
    soft: "#e5dcff",
  },
  {
    id: "dream_glow_ring",
    file: "frame_dream_glow_ring",
    label: "Dream Glow Ring",
    gradient: ["#e7fbff", "#8fd3ff"],
    accent: "#59b0f8",
    soft: "#dff6ff",
  },
  {
    id: "legendary_ornate_aura",
    file: "frame_legendary_ornate_aura",
    label: "Legendary Ornate Aura",
    gradient: ["#fff6dc", "#e7c86e"],
    accent: "#c79632",
    soft: "#fff0c2",
  },
];

const avatarBases = [
  {
    id: "cat",
    file: "avatar_base_cat",
    label: "Cat Buddy",
    shell: ["#fffdfd", "#ffe7f0"],
    cloth: ["#ffd8e8", "#ffb3cf"],
    accent: "#ff7ab2",
  },
  {
    id: "puppy",
    file: "avatar_base_puppy",
    label: "Puppy Buddy",
    shell: ["#fffefe", "#eefbff"],
    cloth: ["#d8ecff", "#b4d8ff"],
    accent: "#88c8ff",
  },
  {
    id: "hooded",
    file: "avatar_base_hooded",
    label: "Hooded Buddy",
    shell: ["#fffafc", "#ffe8f3"],
    cloth: ["#f0d8ff", "#ddbaff"],
    accent: "#c89be8",
  },
];

const avatarTiers = [
  {
    id: "charm",
    label: "Charm Trader",
    directory: "charm",
    cloth: ["#ffd9e8", "#ffb4cf"],
    shellGlow: ["#fffefe", "#fff4f8"],
    accent: "#ff78ae",
    soft: "#fff0f6",
    sparkle: "#ffd5e5",
  },
  {
    id: "treasure",
    label: "Treasure Keeper",
    directory: "treasure",
    cloth: ["#ede3ff", "#b79ced"],
    shellGlow: ["#fffefe", "#f5f1ff"],
    accent: "#8f72e7",
    soft: "#e7ddff",
    sparkle: "#cab7ff",
  },
  {
    id: "dream",
    label: "Dream Collector",
    directory: "dream",
    cloth: ["#dff5ff", "#8fd3ff"],
    shellGlow: ["#ffffff", "#f1fcff"],
    accent: "#5caaf5",
    soft: "#dcf7ff",
    sparkle: "#bdefff",
  },
  {
    id: "legendary",
    label: "Legendary",
    directory: "legendary",
    cloth: ["#fff2d1", "#e7c86e"],
    shellGlow: ["#ffffff", "#fff9ec"],
    accent: "#c79632",
    soft: "#fff0c2",
    sparkle: "#f6dda0",
  },
];

function svgWrap(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
${content}
</svg>`;
}

function badgeIcon(id, primary, secondary) {
  if (id === "charm_trader") {
    return `
<ellipse cx="188" cy="232" rx="74" ry="54" fill="${primary}"/>
<ellipse cx="324" cy="232" rx="74" ry="54" fill="${primary}"/>
<circle cx="256" cy="238" r="34" fill="${secondary}"/>
<path d="M228 206 170 168" stroke="${secondary}" stroke-linecap="round" stroke-width="18"/>
<path d="M284 206 342 168" stroke="${secondary}" stroke-linecap="round" stroke-width="18"/>
<path d="M216 304c20-28 60-28 80 0l16 76h-112l16-76Z" fill="${primary}"/>
<circle cx="352" cy="170" r="16" fill="${secondary}"/>
<path d="m352 140 7 14 15 2-11 11 3 15-14-8-14 8 3-15-11-11 15-2 7-14Z" fill="#fff6fb"/>
`;
  }

  if (id === "treasure_keeper") {
    return `
<path d="m256 142 82 74-82 84-82-84 82-74Z" fill="${primary}"/>
<path d="M256 164 312 216 256 272 200 216l56-52Z" fill="${secondary}"/>
<path d="M256 146v126" stroke="#ffffff" stroke-width="14"/>
<path d="M176 334c0-24 20-44 44-44h22v32h-22c-7 0-12 5-12 12s5 12 12 12h24v30h-24c-24 0-44-20-44-42Z" fill="${primary}"/>
<rect x="244" y="330" width="86" height="22" rx="11" fill="${primary}"/>
<circle cx="338" cy="341" r="18" fill="${secondary}"/>
<circle cx="338" cy="341" r="8" fill="#ffffff"/>
<circle cx="334" cy="170" r="14" fill="${secondary}"/>
`;
  }

  if (id === "dream_collector") {
    return `
<path d="M218 166c-39 10-66 45-66 86 0 49 40 88 88 88 35 0 66-21 80-52-17 12-38 19-60 19-56 0-100-49-90-105 3-14 8-27 15-36 9-12 21-21 33-28Z" fill="${primary}"/>
<path d="m330 162 13 26 28 4-20 19 5 28-26-14-25 14 5-28-20-19 28-4 12-26Z" fill="${secondary}"/>
<path d="m356 260 8 16 18 3-13 12 3 18-16-9-15 9 3-18-13-12 18-3 7-16Z" fill="${secondary}"/>
<path d="m178 288 8 16 18 3-13 12 3 18-16-9-15 9 3-18-13-12 18-3 7-16Z" fill="${secondary}"/>
<path d="m246 228 8 16 18 3-13 12 3 18-16-9-15 9 3-18-13-12 18-3 7-16Z" fill="#ffffff"/>
`;
  }

  return `
<path d="m164 304 18-116 72 58 74-58 18 116H164Z" fill="${primary}"/>
<path d="m188 212 42-60 28 38 26-38 40 60-22 12-18-26-28 42-30-42-18 26-20-12Z" fill="${secondary}"/>
<circle cx="256" cy="280" r="24" fill="${secondary}"/>
<path d="m256 238 8 16 18 3-13 12 3 18-16-9-15 9 3-18-13-12 18-3 7-16Z" fill="#fff9e9"/>
`;
}

function buildBadgeSvg(definition) {
  const [start, end] = definition.gradient;
  const [innerStart, innerEnd] = definition.inner;
  const [ringStart, ringEnd] = definition.ring;
  const [iconPrimary, iconSecondary] = definition.icon;

  return svgWrap(`
<defs>
  <linearGradient id="${definition.id}-bg" x1="96" y1="72" x2="424" y2="440" gradientUnits="userSpaceOnUse">
    <stop stop-color="${start}"/>
    <stop offset="1" stop-color="${end}"/>
  </linearGradient>
  <linearGradient id="${definition.id}-inner" x1="144" y1="120" x2="372" y2="390" gradientUnits="userSpaceOnUse">
    <stop stop-color="${innerStart}"/>
    <stop offset="1" stop-color="${innerEnd}"/>
  </linearGradient>
  <linearGradient id="${definition.id}-ring" x1="112" y1="80" x2="400" y2="432" gradientUnits="userSpaceOnUse">
    <stop stop-color="${ringStart}"/>
    <stop offset="1" stop-color="${ringEnd}"/>
  </linearGradient>
  <filter id="${definition.id}-shadow" x="90" y="100" width="332" height="316" color-interpolation-filters="sRGB">
    <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(80, 40, 60, 0.18)"/>
  </filter>
</defs>
<circle cx="256" cy="256" r="222" fill="url(#${definition.id}-bg)"/>
<circle cx="256" cy="256" r="204" stroke="url(#${definition.id}-ring)" stroke-width="22"/>
<circle cx="256" cy="256" r="160" fill="url(#${definition.id}-inner)"/>
<path d="M118 146c48-72 136-102 216-84 34 8 66 22 94 44-52-14-104-16-154-7-56 10-108 34-156 70Z" fill="rgba(255,255,255,0.46)"/>
<g filter="url(#${definition.id}-shadow)">
  ${badgeIcon(definition.id, iconPrimary, iconSecondary)}
</g>
`);
}

function buildTreasureFrame(definition) {
  return svgWrap(`
<circle cx="256" cy="256" r="220" stroke="${definition.accent}" stroke-width="18"/>
<circle cx="256" cy="256" r="194" stroke="${definition.soft}" stroke-width="8"/>
<path d="m256 30 36 40-36 42-36-42 36-40Z" fill="${definition.accent}"/>
<path d="m256 80 18-20 18 20-18 20-18-20Z" fill="#ffffff"/>
<path d="m256 482 36-40-36-42-36 42 36 40Z" fill="${definition.accent}"/>
<path d="m256 432 18 20 18-20-18-20-18 20Z" fill="#ffffff"/>
<path d="m30 256 40-36 42 36-42 36-40-36Z" fill="${definition.accent}"/>
<path d="m80 256-20-18 20-18 20 18-20 18Z" fill="#ffffff"/>
<path d="m482 256-40-36-42 36 42 36 40-36Z" fill="${definition.accent}"/>
<path d="m432 256 20-18-20-18-20 18 20 18Z" fill="#ffffff"/>
`);
}

function buildDreamFrame(definition) {
  return svgWrap(`
<circle cx="256" cy="256" r="214" stroke="${definition.accent}" stroke-width="16"/>
<circle cx="256" cy="256" r="194" stroke="${definition.soft}" stroke-width="10" stroke-dasharray="8 18"/>
<path d="m256 26 10 20 22 3-16 16 4 22-20-11-20 11 4-22-16-16 22-3 10-20Z" fill="${definition.accent}"/>
<path d="m102 112 8 16 18 2-13 12 3 18-16-8-16 8 4-18-14-12 18-2 8-16Z" fill="${definition.accent}"/>
<path d="m410 112 8 16 18 2-13 12 3 18-16-8-16 8 4-18-14-12 18-2 8-16Z" fill="${definition.accent}"/>
<path d="m86 352 8 16 18 2-13 12 3 18-16-8-16 8 4-18-14-12 18-2 8-16Z" fill="${definition.accent}"/>
<path d="m426 352 8 16 18 2-13 12 3 18-16-8-16 8 4-18-14-12 18-2 8-16Z" fill="${definition.accent}"/>
`);
}

function buildLegendaryFrame(definition) {
  return svgWrap(`
<circle cx="256" cy="256" r="216" stroke="${definition.accent}" stroke-width="18"/>
<circle cx="256" cy="256" r="194" stroke="${definition.soft}" stroke-width="8"/>
<path d="m164 102 34-46 32 30 26-38 28 38 34-30 30 46-18 12-18-24-30 34-26-36-26 36-30-34-18 24-18-12Z" fill="${definition.accent}"/>
<path d="M122 172c-34 36-52 84-52 134 0 56 22 110 62 150l18-14c-36-36-56-84-56-136 0-44 16-86 46-118l-18-16Z" fill="${definition.soft}"/>
<path d="M390 172c34 36 52 84 52 134 0 56-22 110-62 150l-18-14c36-36 56-84 56-136 0-44-16-86-46-118l18-16Z" fill="${definition.soft}"/>
<path d="m256 420 10 20 22 3-16 16 4 22-20-11-20 11 4-22-16-16 22-3 10-20Z" fill="${definition.accent}"/>
`);
}

function buildFrameSvg(definition) {
  if (definition.id === "treasure_gem_ring") {
    return buildTreasureFrame(definition);
  }

  if (definition.id === "dream_glow_ring") {
    return buildDreamFrame(definition);
  }

  return buildLegendaryFrame(definition);
}

function star(cx, cy, outer, fill, opacity = 1) {
  const inner = outer * 0.42;
  const points = [];

  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push(`${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return `<path d="${points.join(" ")}Z" fill="${fill}" opacity="${opacity}"/>`;
}

function bow(cx, cy, color, center = "#fff7fb") {
  return `
<ellipse cx="${cx - 26}" cy="${cy}" rx="24" ry="18" fill="${color}"/>
<ellipse cx="${cx + 26}" cy="${cy}" rx="24" ry="18" fill="${color}"/>
<circle cx="${cx}" cy="${cy}" r="14" fill="${center}"/>
<path d="M${cx - 6} ${cy + 10} ${cx - 20} ${cy + 34}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
<path d="M${cx + 6} ${cy + 10} ${cx + 20} ${cy + 34}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
`;
}

function pouch(cx, cy, body, detail) {
  return `
<path d="M${cx - 26} ${cy}c0-26 18-46 38-46s38 20 38 46v32h-76v-32Z" fill="${body}"/>
<path d="M${cx - 18} ${cy - 10}c0-12 10-22 18-22s18 10 18 22" stroke="${detail}" stroke-width="8" stroke-linecap="round"/>
<circle cx="${cx}" cy="${cy + 12}" r="10" fill="${detail}"/>
`;
}

function gem(cx, cy, body, shine = "#ffffff") {
  return `
<path d="M${cx} ${cy - 28} ${cx + 26} ${cy - 4} ${cx} ${cy + 24} ${cx - 26} ${cy - 4}Z" fill="${body}"/>
<path d="M${cx} ${cy - 12} ${cx + 10} ${cy - 2} ${cx} ${cy + 10} ${cx - 10} ${cy - 2}Z" fill="${shine}" opacity="0.9"/>
`;
}

function keyCharm(cx, cy, color) {
  return `
<circle cx="${cx}" cy="${cy}" r="14" stroke="${color}" stroke-width="8"/>
<path d="M${cx + 8} ${cy + 8} ${cx + 44} ${cy + 44}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
<path d="M${cx + 34} ${cy + 34}h22" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
<path d="M${cx + 42} ${cy + 42}v16" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
`;
}

function crown(cx, cy, color, shine = "#fff7e0") {
  return `
<path d="M${cx - 54} ${cy + 24} ${cx - 34} ${cy - 6} ${cx - 8} ${cy + 10} ${cx + 12} ${cy - 24} ${cx + 34} ${cy + 10} ${cx + 60} ${cy - 8} ${cx + 76} ${cy + 24}Z" fill="${color}"/>
<rect x="${cx - 56}" y="${cy + 20}" width="136" height="20" rx="10" fill="${shine}"/>
<circle cx="${cx - 32}" cy="${cy + 8}" r="8" fill="${shine}"/>
<circle cx="${cx + 12}" cy="${cy - 10}" r="10" fill="${shine}"/>
<circle cx="${cx + 52}" cy="${cy + 8}" r="8" fill="${shine}"/>
`;
}

function avatarFace(base, shellFill, clothFill, accent) {
  if (base.id === "cat") {
    return `
<polygon points="188,106 218,58 238,120" fill="${shellFill}"/>
<polygon points="324,106 294,58 274,120" fill="${shellFill}"/>
<circle cx="256" cy="184" r="104" fill="${shellFill}"/>
<rect x="184" y="288" width="144" height="112" rx="50" fill="${clothFill}"/>
<ellipse cx="222" cy="184" rx="10" ry="14" fill="#3f3a4a"/>
<ellipse cx="290" cy="184" rx="10" ry="14" fill="#3f3a4a"/>
<circle cx="208" cy="218" r="12" fill="#ffdce6"/>
<circle cx="304" cy="218" r="12" fill="#ffdce6"/>
<circle cx="256" cy="214" r="10" fill="#ffcfdd"/>
<line x1="174" y1="190" x2="204" y2="190" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
<line x1="308" y1="190" x2="338" y2="190" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
`;
  }

  if (base.id === "puppy") {
    return `
<ellipse cx="170" cy="206" rx="42" ry="104" fill="#eef8ff"/>
<ellipse cx="342" cy="206" rx="42" ry="104" fill="#eef8ff"/>
<circle cx="256" cy="188" r="102" fill="${shellFill}"/>
<rect x="180" y="292" width="152" height="108" rx="50" fill="${clothFill}"/>
<ellipse cx="224" cy="188" rx="10" ry="14" fill="#404354"/>
<ellipse cx="288" cy="188" rx="10" ry="14" fill="#404354"/>
<ellipse cx="256" cy="222" rx="18" ry="12" fill="#ffd5dd"/>
<circle cx="206" cy="220" r="12" fill="#ffe2ea"/>
<circle cx="306" cy="220" r="12" fill="#ffe2ea"/>
<circle cx="182" cy="146" r="10" fill="${accent}"/>
<circle cx="330" cy="150" r="10" fill="${accent}"/>
`;
  }

  return `
<ellipse cx="256" cy="180" rx="118" ry="132" fill="${clothFill}"/>
<circle cx="256" cy="196" r="86" fill="${shellFill}"/>
<rect x="174" y="300" width="164" height="100" rx="48" fill="#f6eefc"/>
<ellipse cx="220" cy="196" rx="10" ry="14" fill="#453d56"/>
<ellipse cx="292" cy="196" rx="10" ry="14" fill="#453d56"/>
<path d="M244 228c6 6 10 8 12 8s6-2 12-8" stroke="#ffcbdc" stroke-width="10" stroke-linecap="round"/>
<circle cx="182" cy="120" r="14" fill="${accent}"/>
<circle cx="330" cy="120" r="14" fill="${accent}"/>
`;
}

function avatarTierDecorations(base, tier) {
  if (tier.id === "charm") {
    return `
<ellipse cx="${base.id === "cat" ? 276 : 248}" cy="108" rx="24" ry="18" fill="${tier.accent}"/>
<ellipse cx="${base.id === "cat" ? 328 : 300}" cy="108" rx="24" ry="18" fill="${tier.accent}"/>
<circle cx="${base.id === "cat" ? 302 : 274}" cy="108" r="14" fill="#fff7fb"/>
<circle cx="148" cy="132" r="9" fill="${tier.sparkle}" opacity="0.92"/>
<circle cx="366" cy="170" r="8" fill="${tier.sparkle}" opacity="0.92"/>
<rect x="304" y="338" width="64" height="48" rx="22" fill="${tier.soft}"/>
<circle cx="336" cy="362" r="9" fill="${tier.accent}"/>
`;
  }

  if (tier.id === "treasure") {
    return `
<rect x="188" y="306" width="136" height="12" rx="6" fill="${tier.soft}"/>
<polygon points="256,294 280,320 256,346 232,320" fill="${tier.accent}"/>
<circle cx="${base.id === "hooded" ? 328 : 348}" cy="268" r="14" fill="none" stroke="${tier.accent}" stroke-width="8"/>
<rect x="${base.id === "hooded" ? 338 : 358}" y="264" width="34" height="8" rx="4" fill="${tier.accent}"/>
<circle cx="166" cy="122" r="8" fill="#ffffff" opacity="0.9"/>
<circle cx="354" cy="132" r="8" fill="#ffffff" opacity="0.9"/>
`;
  }

  if (tier.id === "dream") {
    return `
<circle cx="164" cy="124" r="10" fill="#ffffff" opacity="0.95"/>
<circle cx="350" cy="150" r="9" fill="#ffffff" opacity="0.95"/>
<circle cx="120" cy="276" r="7" fill="${tier.sparkle}" opacity="0.95"/>
<circle cx="392" cy="282" r="7" fill="${tier.sparkle}" opacity="0.95"/>
<circle cx="314" cy="336" r="7" fill="#ffffff" opacity="0.92"/>
<rect x="304" y="338" width="64" height="48" rx="22" fill="#ffffff" opacity="0.82"/>
<circle cx="336" cy="362" r="9" fill="${tier.accent}"/>
`;
  }

  return `
<polygon points="136,106 164,68 196,104 224,58 256,104 288,68 320,106 348,58 376,104 392,130 136,130" fill="${tier.accent}"/>
<rect x="136" y="126" width="256" height="20" rx="10" fill="#fff7e0"/>
<circle cx="160" cy="116" r="8" fill="#fff6dc" opacity="0.95"/>
<circle cx="354" cy="118" r="8" fill="#fff6dc" opacity="0.95"/>
<polygon points="256,304 280,330 256,356 232,330" fill="${tier.accent}"/>
`;
}

function buildAvatarSvg(base, tier = null) {
  const [shellStart, shellEnd] = tier?.shellGlow ?? base.shell;
  const [clothStart, clothEnd] = tier?.cloth ?? base.cloth;
  const accent = tier?.accent ?? base.accent;
  const glowColor = tier?.soft ?? "#ffffff";

  return svgWrap(`
${tier ? `<circle cx="256" cy="224" r="164" fill="${glowColor}" opacity="0.28"/>` : ""}
<circle cx="256" cy="236" r="152" fill="#ffffff" opacity="0.42"/>
${avatarFace(base, shellStart, clothStart, accent)}
${tier ? avatarTierDecorations(base, tier) : ""}
`);
}

function buildReviewSheet(manifest) {
  const badgeCards = badges
    .map(
      (badge) => `
      <article class="card">
        <img src="${manifest.badges[badge.id].png}" alt="${badge.label}" width="128" height="128" />
        <strong>${badge.label}</strong>
        <div class="thumb-row">
          <img src="${manifest.badges[badge.id].thumbnails["32"]}" alt="" width="32" height="32" />
          <img src="${manifest.badges[badge.id].thumbnails["64"]}" alt="" width="64" height="64" />
        </div>
      </article>
    `
    )
    .join("");

  const frameCards = frames
    .map(
      (frame) => `
      <article class="card">
        <img src="${manifest.frames[frame.id].png}" alt="${frame.label}" width="128" height="128" />
        <strong>${frame.label}</strong>
        <div class="thumb-row">
          <img src="${manifest.frames[frame.id].thumbnails["32"]}" alt="" width="32" height="32" />
          <img src="${manifest.frames[frame.id].thumbnails["64"]}" alt="" width="64" height="64" />
        </div>
      </article>
    `
    )
    .join("");

  const avatarCards = avatarTiers
    .map(
      (tier) => `
      <section class="tier-block">
        <h3>${tier.label}</h3>
        <div class="grid">
          ${avatarBases
            .map(
              (base) => `
              <article class="card">
                <img src="${manifest.avatars.variants[tier.id][base.id].png}" alt="${tier.label} ${base.label}" width="128" height="128" />
                <strong>${tier.label} ${base.label}</strong>
                <div class="thumb-row">
                  <img src="${manifest.avatars.variants[tier.id][base.id].thumbnails["32"]}" alt="" width="32" height="32" />
                  <img src="${manifest.avatars.variants[tier.id][base.id].thumbnails["64"]}" alt="" width="64" height="64" />
                </div>
              </article>
            `
            )
            .join("")}
        </div>
      </section>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Profile Art Sheet</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", sans-serif;
        background: #fff9fb;
        color: #3c2f3c;
      }

      body {
        margin: 0;
        padding: 32px;
        background:
          radial-gradient(circle at top left, rgba(255, 219, 233, 0.72), transparent 22%),
          linear-gradient(180deg, #fff9fb, #fff4f8);
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      header,
      section {
        margin-bottom: 28px;
      }

      .eyebrow {
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #a36885;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-top: 14px;
      }

      .card {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 18px 36px rgba(128, 89, 108, 0.08);
      }

      .card > img {
        justify-self: center;
      }

      .thumb-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .tier-block + .tier-block {
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <header>
      <p class="eyebrow">Asset QA</p>
      <h1>Profile Art Sheet</h1>
      <p>Includes 32px thumbnails for the small-UI readability pass.</p>
    </header>
    <section>
      <p class="eyebrow">Rank Badges</p>
      <div class="grid">${badgeCards}</div>
    </section>
    <section>
      <p class="eyebrow">Frames</p>
      <div class="grid">${frameCards}</div>
    </section>
    <section>
      <p class="eyebrow">Buddy Variants</p>
      ${avatarCards}
    </section>
  </body>
</html>`;
}

async function ensureDirectories() {
  const directories = [
    path.join(publicAssetsDir, "badges", "rank"),
    path.join(publicAssetsDir, "frames"),
    path.join(publicAssetsDir, "avatars", "base"),
    ...avatarTiers.map((tier) => path.join(publicAssetsDir, "avatars", "buddy_variants", tier.directory)),
    ...exportSizes.slice(1).map((size) => path.join(thumbnailsDir, `badges_${size}`)),
    ...exportSizes.slice(1).map((size) => path.join(thumbnailsDir, `frames_${size}`)),
    ...exportSizes.slice(1).map((size) => path.join(thumbnailsDir, `avatars_${size}`)),
  ];

  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
}

async function writeSvgAndPng(baseDirectory, fileName, svg, thumbnailFamily = null) {
  const svgPath = path.join(baseDirectory, `${fileName}.svg`);
  const pngPath = path.join(baseDirectory, `${fileName}.png`);

  await writeFile(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg)).resize(512, 512).png({ compressionLevel: 9 }).toFile(pngPath);

  if (!thumbnailFamily) {
    return;
  }

  await Promise.all(
    exportSizes
      .filter((size) => size !== 512)
      .map((size) =>
        sharp(Buffer.from(svg))
          .resize(size, size)
          .png({ compressionLevel: 9 })
          .toFile(path.join(thumbnailsDir, `${thumbnailFamily}_${size}`, `${fileName}.png`))
      )
  );
}

function thumbnailMap(family, fileName) {
  return Object.fromEntries(
    exportSizes.slice(1).map((size) => [size, `/assets/thumbnails/${family}_${size}/${fileName}.png`])
  );
}

async function main() {
  await ensureDirectories();

  for (const badge of badges) {
    await writeSvgAndPng(
      path.join(publicAssetsDir, "badges", "rank"),
      badge.file,
      buildBadgeSvg(badge),
      "badges"
    );
  }

  for (const frame of frames) {
    await writeSvgAndPng(
      path.join(publicAssetsDir, "frames"),
      frame.file,
      buildFrameSvg(frame),
      "frames"
    );
  }

  for (const base of avatarBases) {
    await writeSvgAndPng(
      path.join(publicAssetsDir, "avatars", "base"),
      base.file,
      buildAvatarSvg(base),
      "avatars"
    );

    for (const tier of avatarTiers) {
      const fileName = `avatar_${tier.id}_${base.id}`;
      await writeSvgAndPng(
        path.join(publicAssetsDir, "avatars", "buddy_variants", tier.directory),
        fileName,
        buildAvatarSvg(base, tier),
        "avatars"
      );
    }
  }

  const manifest = {
    badges: Object.fromEntries(
      badges.map((badge) => [
        badge.id,
        {
          label: badge.label,
          svg: `/assets/badges/rank/${badge.file}.svg`,
          png: `/assets/badges/rank/${badge.file}.png`,
          thumbnails: thumbnailMap("badges", badge.file),
        },
      ])
    ),
    frames: Object.fromEntries(
      frames.map((frame) => [
        frame.id,
        {
          label: frame.label,
          svg: `/assets/frames/${frame.file}.svg`,
          png: `/assets/frames/${frame.file}.png`,
          thumbnails: thumbnailMap("frames", frame.file),
        },
      ])
    ),
    avatars: {
      base: Object.fromEntries(
        avatarBases.map((base) => [
          base.id,
          {
            label: base.label,
            svg: `/assets/avatars/base/${base.file}.svg`,
            png: `/assets/avatars/base/${base.file}.png`,
            thumbnails: thumbnailMap("avatars", base.file),
          },
        ])
      ),
      variants: Object.fromEntries(
        avatarTiers.map((tier) => [
          tier.id,
          Object.fromEntries(
            avatarBases.map((base) => {
              const fileName = `avatar_${tier.id}_${base.id}`;

              return [
                base.id,
                {
                  label: `${tier.label} ${base.label}`,
                  svg: `/assets/avatars/buddy_variants/${tier.directory}/${fileName}.svg`,
                  png: `/assets/avatars/buddy_variants/${tier.directory}/${fileName}.png`,
                  thumbnails: thumbnailMap("avatars", fileName),
                },
              ];
            })
          ),
        ])
      ),
    },
    review: {
      sheet: "/assets/profile-art-sheet.html",
    },
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(reviewSheetPath, buildReviewSheet(manifest), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
