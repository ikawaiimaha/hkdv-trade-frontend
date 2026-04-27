import { useCallback, useEffect, useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "../lib/supabaseClient";

function mapStickerRow(row) {
  return {
    id: row.id,
    type: row.sticker_type,
    item_id: row.item_id ?? null,
    decor_key: row.decor_key ?? null,
    x: Number(row.x_coordinate ?? 0),
    y: Number(row.y_coordinate ?? 0),
    rotation: Number(row.rotation ?? 0),
    scale: Number(row.scale ?? 1),
    imageUrl: row.items?.image_url ?? null,
    name: row.items?.name ?? null,
  };
}

export function useDreamBoard(traderId) {
  const [board, setBoard] = useState(null);
  const [savedStickers, setSavedStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadBoard = useCallback(async () => {
    if (!traderId || !hasSupabaseClientEnv()) {
      setBoard(null);
      setSavedStickers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      let { data: existingBoard, error: boardError } = await supabase
        .from("dream_boards")
        .select("*")
        .eq("trader_id", traderId)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (boardError) {
        throw boardError;
      }

      if (!existingBoard) {
        const { data: nextBoard, error: insertError } = await supabase
          .from("dream_boards")
          .insert({
            trader_id: traderId,
            title: "My Dream Board",
            theme_bg: "default-pink-grid",
            layout_type: "freeform",
            status: "draft",
          })
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }

        existingBoard = nextBoard;
      }

      setBoard(existingBoard);

      const { data: stickerRows, error: stickerError } = await supabase
        .from("dream_board_stickers")
        .select("id,sticker_type,item_id,decor_key,x_coordinate,y_coordinate,rotation,scale,z_index,items:item_id(name,image_url)")
        .eq("board_id", existingBoard.id)
        .order("z_index", { ascending: true });

      if (stickerError) {
        throw stickerError;
      }

      setSavedStickers((stickerRows ?? []).map(mapStickerRow));
      setError("");
    } catch (nextError) {
      setBoard(null);
      setSavedStickers([]);
      setError(toSupabaseErrorMessage(nextError, "Unable to load Dream Board."));
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  const saveLayout = useCallback(
    async (placedStickers) => {
      if (!board?.id || !hasSupabaseClientEnv()) {
        return false;
      }

      try {
        setSaving(true);
        const supabase = getSupabaseClient();

        const { error: clearError } = await supabase
          .from("dream_board_stickers")
          .delete()
          .eq("board_id", board.id);

        if (clearError) {
          throw clearError;
        }

        if (!placedStickers.length) {
          setSavedStickers([]);
          setError("");
          return true;
        }

        const rows = placedStickers.map((sticker, index) => ({
          board_id: board.id,
          sticker_type: sticker.type ?? (sticker.item_id ? "catalog_item" : "decor"),
          item_id: sticker.item_id ?? null,
          decor_key: sticker.decor_key ?? null,
          x_coordinate: sticker.x ?? 0,
          y_coordinate: sticker.y ?? 0,
          rotation: sticker.rotation ?? 0,
          scale: sticker.scale ?? 1,
          z_index: index,
        }));

        const { error: insertError } = await supabase
          .from("dream_board_stickers")
          .insert(rows);

        if (insertError) {
          throw insertError;
        }

        setSavedStickers(placedStickers);
        setError("");
        return true;
      } catch (nextError) {
        setError(toSupabaseErrorMessage(nextError, "Unable to save Dream Board."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [board?.id]
  );

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  return {
    board,
    savedStickers,
    loading,
    saving,
    error,
    loadBoard,
    saveLayout,
  };
}
