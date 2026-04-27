import DreamBoardCanvas from "../components/DreamBoardCanvas";
import OwnedStickerPool from "../components/OwnedStickerPool";
import { useDreamBoard } from "../hooks/useDreamBoard";
import { useTraderInventory } from "../hooks/useTraderInventory";

export default function DreamBoardSection({ trader }) {
  const traderId = trader?.id ?? null;
  const { board, savedStickers, loading: boardLoading, saving, error: boardError, saveLayout } = useDreamBoard(traderId);
  const { inventory, loading: inventoryLoading, error: inventoryError } = useTraderInventory(traderId);

  const hydratedStickers = savedStickers.map((sticker) => {
    const inventoryItem = inventory.find((entry) => entry.itemId === sticker.item_id);

    return {
      ...sticker,
      imageUrl: inventoryItem?.imageUrl ?? sticker.imageUrl ?? null,
      name: inventoryItem?.name ?? sticker.name ?? "",
    };
  });

  return (
    <section className="db-section">
      <div className="db-header">
        <h2 className="db-title">Dream Board</h2>
        <p className="db-subtitle">Arrange your favorite items into a sticker-book collage</p>
      </div>

      {!traderId ? (
        <div className="db-guest">
          <p>Log in to build your Dream Board.</p>
        </div>
      ) : null}

      {traderId && boardLoading ? (
        <div className="db-create">
          <p>Loading your Dream Board...</p>
        </div>
      ) : null}

      {traderId && !boardLoading && (boardError || inventoryError) ? (
        <div className="db-error">
          <p>{boardError || inventoryError}</p>
        </div>
      ) : null}

      {traderId && !boardLoading && !boardError && board ? (
        <div className="db-workspace">
          <OwnedStickerPool inventory={inventory} loading={inventoryLoading} />
          <DreamBoardCanvas
            initialStickers={hydratedStickers}
            onSave={saveLayout}
            saving={saving}
          />
        </div>
      ) : null}
    </section>
  );
}
