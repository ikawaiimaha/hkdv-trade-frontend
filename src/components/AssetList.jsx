import { useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "../lib/supabaseClient";
import { useToast } from "./ToastProvider";

const RARITY_COLORS = {
  SSR: { bg: "#ffe3f1", text: "#ff3b93" },
  SR: { bg: "#fff7cc", text: "#8a6a00" },
  R: { bg: "#e7fff4", text: "#2faf7f" },
  S: { bg: "#ffe3f1", text: "#ff3b93" },
  N: { bg: "#ffeaf3", text: "#7a4a68" },
  C: { bg: "#ffeaf3", text: "#7a4a68" },
};

export default function AssetList({ inventory, wishlist, traderId, onRefresh }) {
  const [tab, setTab] = useState("inventory");
  const [deletingId, setDeletingId] = useState(null);
  const { showToast } = useToast();

  async function handleRemoveInventory(id) {
    if (!traderId || !hasSupabaseClientEnv()) {
      return;
    }

    try {
      setDeletingId(id);
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("trader_inventory").delete().eq("id", id);

      if (error) {
        throw error;
      }

      showToast("Removed from inventory.", "success");
      onRefresh?.();
    } catch (error) {
      showToast(toSupabaseErrorMessage(error, "Failed to remove inventory item."), "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRemoveWishlist(id) {
    if (!traderId || !hasSupabaseClientEnv()) {
      return;
    }

    try {
      setDeletingId(id);
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("wishlist_entries").delete().eq("id", id);

      if (error) {
        throw error;
      }

      showToast("Removed from wishlist.", "success");
      onRefresh?.();
    } catch (error) {
      showToast(toSupabaseErrorMessage(error, "Failed to remove wishlist item."), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const data = tab === "inventory" ? inventory : wishlist;
  const emptyMessage =
    tab === "inventory"
      ? "Your inventory is empty. Tap items in the catalog to add them."
      : "Your wishlist is empty. Tap items in the catalog to add them.";

  return (
    <div className="asset-list">
      <div className="asset-tabs">
        <button
          type="button"
          className={`asset-tab ${tab === "inventory" ? "active" : ""}`.trim()}
          onClick={() => setTab("inventory")}
        >
          I Own These ({inventory.length})
        </button>
        <button
          type="button"
          className={`asset-tab ${tab === "wishlist" ? "active" : ""}`.trim()}
          onClick={() => setTab("wishlist")}
        >
          My Wishlist ({wishlist.length})
        </button>
      </div>

      {!data.length ? (
        <div className="asset-empty">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="asset-rows">
          {data.map((item) => {
            const colors = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.C;
            const isDeleting = deletingId === item.id;

            return (
              <div key={`${item.type}-${item.id}`} className="asset-row">
                <div className="asset-bubble" style={{ backgroundColor: colors.bg }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="asset-img" draggable="false" />
                  ) : (
                    <span className="asset-emoji">+</span>
                  )}
                </div>
                <div className="asset-info">
                  <h4 className="asset-name">{item.name}</h4>
                  <div className="asset-meta">
                    <span
                      className="asset-rarity"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {item.rarity}
                    </span>
                    {item.type === "inventory" ? (
                      <span className="asset-qty">
                        x{item.quantity} {item.isTradeable ? "(tradable)" : ""}
                      </span>
                    ) : (
                      <span className="asset-priority">Want x{item.desiredQuantity}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="asset-remove"
                  onClick={() =>
                    item.type === "inventory"
                      ? handleRemoveInventory(item.id)
                      : handleRemoveWishlist(item.id)
                  }
                  disabled={isDeleting}
                  title="Remove"
                >
                  {isDeleting ? "..." : "x"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
