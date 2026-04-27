import wikiItemImages from "../data/mock-item-media.json";

function normalizeWikiKey(value) {
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

const wikiImageIndex = new Map();

wikiItemImages.forEach((entry) => {
  const key = normalizeWikiKey(entry.page_title);

  if (!key || wikiImageIndex.has(key)) {
    return;
  }

  wikiImageIndex.set(key, entry);
});

export function findWikiImageEntry(name) {
  return wikiImageIndex.get(normalizeWikiKey(name)) ?? null;
}

export function mergeItemWithWikiMedia(item) {
  const match = findWikiImageEntry(item.name);

  if (!match) {
    return item;
  }

  return {
    ...item,
    imageUrl: match.image_url ?? item.imageUrl,
    wikiPageUrl: item.wikiPageUrl ?? match.page_url ?? null,
    sourcePageUrl: item.sourcePageUrl ?? match.source_page_url ?? match.page_url ?? null,
    wikiImageSourceKind: match.source_kind ?? null,
    wikiImageSourcePageTitle: match.source_page_title ?? null,
  };
}
