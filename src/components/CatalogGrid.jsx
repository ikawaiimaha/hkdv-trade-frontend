import { useState } from "react";
import ItemActionModal from "./ItemActionModal";

const RARITY_BG = {
  SSR: "#ffe3f1",
  SR: "#fff7cc",
  R: "#e7fff4",
  C: "#ffeaf3",
  S: "#ffe3f1",
  N: "#ffeaf3",
};

const RARITY_TEXT = {
  SSR: "#ff3b93",
  SR: "#8a6a00",
  R: "#2faf7f",
  C: "#7a4a68",
  S: "#ff3b93",
  N: "#7a4a68",
};

function getItemRarity(item) {
  return item?.rarity ?? item?.tier ?? item?.wiki_rarity ?? "C";
}

export default function CatalogGrid({ items, trader, onActionComplete }) {
  const [selectedItem, setSelectedItem] = useState(null);

  if (!items?.length) {
    return (
      <div className="catalog-empty">
        <p>The catalog is empty. Time to add some cute things.</p>
      </div>
    );
  }

  return (
    <>
      <div className="catalog-grid">
        {items.map((item) => {
          const rarity = getItemRarity(item);
          const background = RARITY_BG[rarity] ?? RARITY_BG.C;
          const text = RARITY_TEXT[rarity] ?? RARITY_TEXT.C;

          return (
            <button
              key={item.id}
              type="button"
              className="catalog-card"
              onClick={() => setSelectedItem(item)}
            >
              <div className="catalog-card-img-wrap" style={{ backgroundColor: background }}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="catalog-card-img"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="catalog-card-placeholder" aria-hidden="true">
                    Gift
                  </span>
                )}
                <span
                  className="catalog-card-rarity"
                  style={{ backgroundColor: background, color: text }}
                >
                  {rarity}
                </span>
              </div>
              <h3 className="catalog-card-title">{item.name}</h3>
              <p className="catalog-card-sub">{item.character || "Sanrio"}</p>
            </button>
          );
        })}
      </div>

      <ItemActionModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        trader={trader}
        onActionComplete={onActionComplete}
      />
    </>
  );
}
