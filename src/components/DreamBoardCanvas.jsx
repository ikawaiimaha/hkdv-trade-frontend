import { useEffect, useRef, useState } from "react";
import "../styles/dream-board-canvas.css";
import { useToast } from "./ToastProvider";

function getPlacedStickerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `placed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function DreamBoardCanvas({
  initialStickers = [],
  onSave,
  saving = false,
}) {
  const canvasRef = useRef(null);
  const [placedStickers, setPlacedStickers] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    setPlacedStickers(Array.isArray(initialStickers) ? initialStickers : []);
  }, [initialStickers]);

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event) {
    event.preventDefault();

    const stickerData = event.dataTransfer.getData("application/json");
    if (!stickerData || !canvasRef.current) {
      return;
    }

    let parsedSticker;
    try {
      parsedSticker = JSON.parse(stickerData);
    } catch {
      return;
    }

    const imageUrl = parsedSticker?.imageUrl ?? parsedSticker?.image_url ?? null;

    if (!imageUrl) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newSticker = {
      ...parsedSticker,
      id: getPlacedStickerId(),
      type:
        parsedSticker.type ??
        parsedSticker.sticker_type ??
        (parsedSticker.item_id ? "catalog_item" : "decor"),
      item_id: parsedSticker.item_id ?? null,
      decor_key: parsedSticker.decor_key ?? null,
      imageUrl,
      x,
      y,
      rotation: Math.floor(Math.random() * 20) - 10,
      scale: 1,
    };

    setPlacedStickers((current) => [...current, newSticker]);
  }

  function removeSticker(idToRemove) {
    setPlacedStickers((current) =>
      current.filter((sticker) => sticker.id !== idToRemove)
    );
  }

  async function handleSave() {
    if (!onSave) {
      showToast("Dream Board save flow is ready for wiring.", "info");
      return;
    }

    const success = await onSave(placedStickers);

    if (success === false) {
      showToast("Unable to save Dream Board right now.", "error");
      return;
    }

    showToast("Dream Board saved.", "success");
  }

  return (
    <div className="dream-board-container">
      <div
        className="dream-board-canvas default-pink-grid"
        ref={canvasRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!placedStickers.length ? (
          <div className="empty-canvas-prompt">
            <span className="prompt-icon">+</span>
            <p>Drag items and stickers here to build your Dream Board.</p>
          </div>
        ) : null}

        {placedStickers.map((sticker) => (
          <div
            key={sticker.id}
            className="placed-sticker"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
            }}
          >
            <img src={sticker.imageUrl} alt="Dream board sticker" draggable="false" />
            <button
              type="button"
              className="remove-sticker-btn"
              onClick={() => removeSticker(sticker.id)}
              aria-label="Remove sticker"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div className="board-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setPlacedStickers([])}
        >
          Clear Board
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Layout"}
        </button>
      </div>
    </div>
  );
}
