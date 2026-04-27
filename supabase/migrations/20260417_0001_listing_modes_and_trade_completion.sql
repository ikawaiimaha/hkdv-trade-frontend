-- Align listing modes and trade completion workflow for the HKDV trader OS.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type'
      AND e.enumlabel = 'open_offers'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type'
      AND e.enumlabel = 'have_item'
  ) THEN
    ALTER TYPE public.listing_type RENAME VALUE 'open_offers' TO 'have_item';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type'
      AND e.enumlabel = 'wishlist_priority'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type'
      AND e.enumlabel = 'wanted_item'
  ) THEN
    ALTER TYPE public.listing_type RENAME VALUE 'wishlist_priority' TO 'wanted_item';
  END IF;
END
$$;

ALTER TYPE public.trade_status ADD VALUE IF NOT EXISTS 'pending_completion';
ALTER TYPE public.trade_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.listings
  ALTER COLUMN listing_type SET DEFAULT 'have_item';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS target_item_id uuid REFERENCES public.items(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS trade_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_trade_rules_object'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_trade_rules_object
      CHECK (jsonb_typeof(trade_rules_json) = 'object');
  END IF;
END
$$;

ALTER TABLE public.trades
  ALTER COLUMN status SET DEFAULT 'pending_completion';

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS seller_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS completion_note text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

UPDATE public.trades
SET status = 'pending_completion'
WHERE status = 'completed'
  AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_target_item ON public.listings(target_item_id);
CREATE INDEX IF NOT EXISTS idx_listings_trade_rules ON public.listings USING gin(trade_rules_json);

COMMENT ON COLUMN public.listings.target_item_id IS 'Optional exact item focus for wanted-item listings and preference-aware matching.';
COMMENT ON COLUMN public.listings.trade_rules_json IS 'Structured seller rules like exact target preference or wall-for-wall matching.';
