import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const inputPath = path.join(projectRoot, "data", "wiki", "hkdv-item-images.json");
const publicOutputPath = path.join(projectRoot, "public", "wiki", "hkdv-item-catalog.json");
const seedOutputPath = path.join(projectRoot, "supabase", "generated", "wiki-item-catalog.seed.sql");

function normalizeKey(value) {
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

function repairMojibake(value) {
  if (!value || typeof value !== "string") {
    return value ?? null;
  }

  if (!/[ÃÂâïð]/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");

    if (!repaired || repaired.includes("\uFFFD")) {
      return value;
    }

    return repaired;
  } catch {
    return value;
  }
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const repaired = repairMojibake(String(value));
  const trimmed = repaired.trim();

  return trimmed || null;
}

function normalizeRarity(value) {
  if (!value) {
    return null;
  }

  return String(value).trim().toUpperCase();
}

function inferItemTier(wikiRarity) {
  switch (normalizeRarity(wikiRarity)) {
    case "S":
    case "SSR":
      return "SSR";
    case "R":
    case "SR":
      return "SR";
    case "N":
      return "R";
    case "C":
      return "C";
    default:
      return null;
  }
}

function inferSourceType(sourcePageTitle = "", sourceKind = "") {
  const value = `${sourcePageTitle} ${sourceKind}`.toLowerCase();

  if (value.includes("basic style")) {
    return "basic_style";
  }

  if (value.includes("standard style")) {
    return "standard";
  }

  if (value.includes("48 hour") || value.includes("48-hour") || value.includes("pop-up")) {
    return "hour_48";
  }

  if (value.includes("24 hour") || value.includes("24-hour")) {
    return "hour_24";
  }

  if (value.includes("3 day") || value.includes("3-day")) {
    return "day_3";
  }

  if (value.includes("sweet collection")) {
    return "sweet_collection";
  }

  if (value.includes("lucky bag")) {
    return "lucky_bag";
  }

  if (value.includes("attendance")) {
    return "attendance";
  }

  if (value.includes("birthday") || value.includes("event") || value.includes("selection")) {
    return "event";
  }

  return "regular_happy_bag";
}

function toInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sqlValue(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function chunk(array, size) {
  const chunks = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

const rawText = (await fs.readFile(inputPath, "utf8")).replace(/^\uFEFF/, "");
const rawRows = JSON.parse(rawText);

const catalogRows = rawRows
  .map((row, index) => {
    const pageTitle = cleanText(row.page_title) ?? "";
    const wikiKey = normalizeKey(pageTitle) || `wiki-item-${index + 1}`;
    const sourcePageTitle = cleanText(row.source_page_title);
    const sourceCollectionTitle = cleanText(row.source_collection_title) || sourcePageTitle;

    const normalizedRow = {
      wiki_key: wikiKey,
      page_title: pageTitle,
      page_slug: cleanText(row.page_slug),
      page_url: cleanText(row.page_url),
      item_type: cleanText(row.type),
      wiki_rarity: normalizeRarity(row.rarity),
      file_title: cleanText(row.file_title),
      image_url: cleanText(row.image_url),
      thumbnail_url: cleanText(row.thumbnail_url) ?? cleanText(row.image_url),
      thumbnail_width: toInteger(row.thumbnail_width),
      thumbnail_height: toInteger(row.thumbnail_height),
      original_image_url: cleanText(row.original_image_url) ?? cleanText(row.image_url),
      description_url: cleanText(row.description_url),
      description_short_url: cleanText(row.description_short_url),
      source_kind: cleanText(row.source_kind) ?? "item_page",
      source_page_title: sourcePageTitle,
      source_page_url: cleanText(row.source_page_url),
      source_collection_title: sourceCollectionTitle,
      source_collection_url: cleanText(row.source_collection_url) ?? cleanText(row.source_page_url),
      search_text: normalizeKey(
        [
          pageTitle,
          cleanText(row.type),
          normalizeRarity(row.rarity),
          sourcePageTitle,
          sourceCollectionTitle,
          cleanText(row.source_kind),
        ]
          .filter(Boolean)
          .join(" ")
      ),
      inferred_item_tier: inferItemTier(row.rarity),
      inferred_source_type: inferSourceType(sourcePageTitle, cleanText(row.source_kind)),
    };

    return normalizedRow;
  })
  .sort((left, right) => left.page_title.localeCompare(right.page_title, "en"));

const publicRows = catalogRows.map((row) => ({
  wiki_key: row.wiki_key,
  page_title: row.page_title,
  item_type: row.item_type,
  wiki_rarity: row.wiki_rarity,
  image_url: row.image_url,
  page_url: row.page_url,
  source_kind: row.source_kind,
  source_page_title: row.source_page_title,
  source_page_url: row.source_page_url,
  source_collection_title: row.source_collection_title,
  search_text: row.search_text,
}));

const sqlColumns = [
  "wiki_key",
  "page_title",
  "page_slug",
  "page_url",
  "item_type",
  "wiki_rarity",
  "file_title",
  "image_url",
  "thumbnail_url",
  "thumbnail_width",
  "thumbnail_height",
  "original_image_url",
  "description_url",
  "description_short_url",
  "source_kind",
  "source_page_title",
  "source_page_url",
  "source_collection_title",
  "source_collection_url",
  "search_text",
  "inferred_item_tier",
  "inferred_source_type",
];

const updateColumns = sqlColumns.filter((column) => column !== "wiki_key");

const sqlStatements = [
  "-- Generated from data/wiki/hkdv-item-images.json by scripts/build-wiki-derived-assets.mjs",
  "-- Rebuild with: npm run build:wiki-derived",
  "",
];

for (const rowsChunk of chunk(catalogRows, 250)) {
  const valuesSql = rowsChunk
    .map((row) => `  (${sqlColumns.map((column) => sqlValue(row[column])).join(", ")})`)
    .join(",\n");

  sqlStatements.push(
    `insert into public.wiki_item_catalog (${sqlColumns.join(", ")})`,
    "values",
    `${valuesSql}`,
    "on conflict (wiki_key) do update set",
    updateColumns.map((column) => `  ${column} = excluded.${column}`).join(",\n") + ",\n  updated_at = timezone('utc', now());",
    ""
  );
}

await fs.mkdir(path.dirname(publicOutputPath), { recursive: true });
await fs.mkdir(path.dirname(seedOutputPath), { recursive: true });

await fs.writeFile(publicOutputPath, JSON.stringify(publicRows), "utf8");
await fs.writeFile(seedOutputPath, `${sqlStatements.join("\n")}\n`, "utf8");

console.log(`Derived public catalog: ${publicOutputPath}`);
console.log(`Derived Supabase seed: ${seedOutputPath}`);
console.log(`Rows: ${catalogRows.length}`);
