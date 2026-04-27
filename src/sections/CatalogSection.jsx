import { useMemo } from "react";
import CatalogGrid from "../components/CatalogGrid";
import { useCatalog } from "../hooks/useCatalog";

const FEATURED_COLLECTIONS = [
  "Strawberry Milk Cafe",
  "Kuromi Midnight Sleepover",
  "Cinnamoroll Cloud Cafe",
];

export default function CatalogSection({ trader, onActionComplete }) {
  const { collections, items, loading, error, refetch } = useCatalog();

  const featuredCollections = useMemo(
    () =>
      FEATURED_COLLECTIONS.map((name) => ({
        name,
        collection: collections.find((entry) => entry.name === name) ?? null,
        items: items.filter((entry) => entry.collection_name === name),
      })).filter((entry) => entry.collection || entry.items.length),
    [collections, items]
  );

  async function handleActionComplete(payload) {
    await Promise.all([refetch(), onActionComplete?.(payload)]);
  }

  return (
    <section className="catalog-section">
      <div className="catalog-header">
        <p className="catalog-kicker">Live Catalog</p>
        <h2 className="catalog-title">Featured Collections</h2>
        <p className="catalog-subtitle">
          Three HKDV-style collections can surface here from Supabase, with tap-to-save inventory and wishlist actions.
        </p>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <div className="catalog-spinner" />
          <p>Loading the catalog...</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="catalog-error">
          <p>{error}</p>
          <button className="catalog-retry" type="button" onClick={refetch}>
            Try Again
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="catalog-collection-stack">
          {featuredCollections.map((entry) => (
            <section key={entry.name} className="catalog-collection-block">
              <div className="catalog-collection-header">
                <h3 className="catalog-collection-name">{entry.name}</h3>
                <p className="catalog-collection-copy">
                  {entry.collection?.description?.trim() || `${entry.items.length} collectible items ready to browse.`}
                </p>
              </div>
              <CatalogGrid
                items={entry.items}
                trader={trader}
                onActionComplete={handleActionComplete}
              />
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}
