import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient, toSupabaseErrorMessage } from "../lib/supabaseClient";

const RARITY_COLORS = {
  SSR: { bg: "#ffe3f1", text: "#ff3b93", border: "#ffd6ec" },
  SR: { bg: "#fff7cc", text: "#8a6a00", border: "#ffe8a0" },
  R: { bg: "#e7fff4", text: "#2faf7f", border: "#c8f5dc" },
  C: { bg: "#ffeaf3", text: "#7a4a68", border: "#ffd6ec" },
  S: { bg: "#ffe3f1", text: "#ff3b93", border: "#ffd6ec" },
  N: { bg: "#ffeaf3", text: "#7a4a68", border: "#ffd6ec" },
};

function getItemRarity(item) {
  return item?.rarity ?? item?.tier ?? item?.wiki_rarity ?? "C";
}

export default function ItemActionModal({
  item,
  isOpen,
  onClose,
  trader,
  onActionComplete,
}) {
  const [quantity, setQuantity] = useState(1);
  const [loadingAction, setLoadingAction] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuantity(1);
    setLoadingAction("");
  }, [isOpen, item?.id]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const rarity = getItemRarity(item);
  const rarityColors = useMemo(
    () => RARITY_COLORS[rarity] ?? RARITY_COLORS.C,
    [rarity]
  );

  if (!isOpen || !item) {
    return null;
  }

  async function completeAction(message, actionType) {
    setToastMessage(message);
    await onActionComplete?.({
      type: actionType,
      itemId: item.id,
      quantity,
    });
    window.setTimeout(() => {
      onClose?.();
    }, 650);
  }

  async function handleAddToWishlist() {
    if (!trader?.id) {
      setToastMessage("Log in to save items.");
      return;
    }

    try {
      setLoadingAction("wishlist");
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("wishlist_entries").upsert(
        {
          trader_id: trader.id,
          item_id: item.id,
          priority: "medium",
          desired_quantity: quantity,
        },
        { onConflict: "trader_id,item_id" }
      );

      if (error) {
        throw error;
      }

      await completeAction("Wishlist updated.", "wishlist");
    } catch (error) {
      setToastMessage(toSupabaseErrorMessage(error, "Unable to update wishlist."));
    } finally {
      setLoadingAction("");
    }
  }

  async function handleAddToInventory() {
    if (!trader?.id) {
      setToastMessage("Log in to save items.");
      return;
    }

    try {
      setLoadingAction("inventory");
      const supabase = getSupabaseClient();
      const { data: existingRow, error: existingError } = await supabase
        .from("trader_inventory")
        .select("quantity_owned,quantity_listed")
        .eq("trader_id", trader.id)
        .eq("item_id", item.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      const nextQuantityOwned = (existingRow?.quantity_owned ?? 0) + quantity;
      const nextQuantityListed = existingRow?.quantity_listed ?? 0;
      const { error } = await supabase.from("trader_inventory").upsert(
        {
          trader_id: trader.id,
          item_id: item.id,
          quantity_owned: nextQuantityOwned,
          quantity_listed: nextQuantityListed,
          is_tradeable_duplicate: nextQuantityOwned - nextQuantityListed > 1,
        },
        { onConflict: "trader_id,item_id" }
      );

      if (error) {
        throw error;
      }

      await completeAction("Inventory updated.", "inventory");
    } catch (error) {
      setToastMessage(toSupabaseErrorMessage(error, "Unable to update inventory."));
    } finally {
      setLoadingAction("");
    }
  }

  return (
    <div
      className="item-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="item-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
        <div className="item-modal-drag-handle" />
        <button className="item-modal-close" type="button" onClick={() => onClose?.()} aria-label="Close item actions">
          x
        </button>

        <div className="item-modal-momo">
          <div className="momo-avatar-happy" aria-hidden="true">
            <img src="/momo-happy.png" alt="" className="momo-avatar-happy-img" />
          </div>
          <p className="momo-text">Add this item to your wishlist or save it to your desk inventory.</p>
        </div>

        <div className="item-modal-preview">
          <div
            className="item-modal-bubble"
            style={{
              backgroundColor: rarityColors.bg,
              borderColor: rarityColors.border,
            }}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="item-modal-img"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="item-modal-placeholder" aria-hidden="true">
                Gift
              </span>
            )}
          </div>
          <span
            className="item-modal-rarity"
            style={{
              backgroundColor: rarityColors.bg,
              color: rarityColors.text,
              borderColor: rarityColors.border,
            }}
          >
            {rarity}
          </span>
          <h2 className="item-modal-title" id="item-modal-title">
            {item.name}
          </h2>
          <p className="item-modal-sub">{item.character || "Sanrio"}</p>
          {item.collection_name ? (
            <p className="item-modal-collection">from {item.collection_name}</p>
          ) : null}
        </div>

        <div className="item-modal-quantity">
          <button
            className="qty-btn"
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="qty-value">{quantity}</span>
          <button
            className="qty-btn"
            type="button"
            onClick={() => setQuantity((current) => Math.min(99, current + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <div className="item-modal-actions">
          <button
            className="btn-wishlist"
            type="button"
            onClick={handleAddToWishlist}
            disabled={loadingAction === "wishlist" || loadingAction === "inventory"}
          >
            {loadingAction === "wishlist" ? "Saving..." : "Add to Wishlist"}
          </button>
          <button
            className="btn-inventory"
            type="button"
            onClick={handleAddToInventory}
            disabled={loadingAction === "wishlist" || loadingAction === "inventory"}
          >
            {loadingAction === "inventory" ? "Saving..." : "I Already Own This"}
          </button>
          {!trader?.id ? (
            <p className="item-modal-login-hint">Log in to save items to your collection.</p>
          ) : null}
        </div>
      </div>

      {toastMessage ? <div className="momo-toast">{toastMessage}</div> : null}
    </div>
  );
}
