function rarityBg(rarity) {
  const map = { SSR: "#ffe3f1", SR: "#fff7cc", R: "#e7fff4", S: "#ffe3f1", N: "#ffeaf3", C: "#ffeaf3" };
  return map[rarity] ?? "#ffeaf3";
}

export default function OwnedStickerPool({ inventory, loading }) {
  function handleDragStart(event, item) {
    const payload = JSON.stringify({
      type: "catalog_item",
      item_id: item.itemId,
      image_url: item.imageUrl,
      name: item.name,
    });
    event.dataTransfer.setData("application/json", payload);
    event.dataTransfer.effectAllowed = "copy";
  }

  if (loading) {
    return (
      <div className="osp-panel">
        <p className="osp-loading">Loading your collection...</p>
      </div>
    );
  }

  if (!inventory?.length) {
    return (
      <div className="osp-panel">
        <h3 className="osp-title">Your Stickers</h3>
        <p className="osp-empty">
          Your sticker pool is empty. Add items to inventory first, then drag them onto the board.
        </p>
      </div>
    );
  }

  return (
    <div className="osp-panel">
      <h3 className="osp-title">Your Stickers ({inventory.length})</h3>
      <p className="osp-hint">Drag items onto the board</p>
      <div className="osp-grid">
        {inventory.map((item) => (
          <div
            key={item.inventoryId}
            className="osp-sticker"
            draggable
            onDragStart={(event) => handleDragStart(event, item)}
            title={`${item.name} x${item.quantityTotal}`}
          >
            <div className="osp-sticker-bubble" style={{ backgroundColor: rarityBg(item.rarity) }}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="osp-sticker-img" draggable="false" />
              ) : (
                <span className="osp-sticker-emoji">+</span>
              )}
            </div>
            <span className="osp-sticker-name">{item.name}</span>
            <span className="osp-sticker-qty">x{item.quantityTotal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
