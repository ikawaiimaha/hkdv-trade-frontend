export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      traders: { Row: { id: string; username: string; email: string | null; auth_user_id: string | null; is_admin: boolean; display_name: string; passcode_hash: string; status: 'invited' | 'pending' | 'active' | 'suspended' | 'banned'; avatar_url: string | null; created_at: string; updated_at: string; buddy_name: string | null; strawberry_rank: number; profile_code: string | null; is_profile_code_visible: boolean; strawberry_title: string; socials: Json; is_approved: boolean; application_note: string | null; rejected_at: string | null; approved_at: string | null; selected_title_id: string | null; selected_charm_ids: string[]; charm_visibility: boolean; bio: string | null; buddy_id: string | null; birthday_month: number | null; birthday_day: number | null; zodiac_sign: string | null; show_zodiac: boolean; show_identity_charm: boolean; identity_label: string | null; pronouns_label: string | null; show_pronouns_charm: boolean; avatar_pending_review: boolean; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      items: { Row: { id: string; item_code: string; name: string; tier: 'N' | 'R' | 'SR' | 'SSR'; wiki_rarity: 'N' | 'R' | 'SR' | 'SSR'; collection_name: string; category: string; source_type: string; release_window: string; demand_level: 'low' | 'medium' | 'high' | 'very_high'; demand_score: number; image_url: string | null; source_page_url: string | null; wiki_page_url: string | null; projected_value: number; community_value: number; value_notes: string | null; is_event_item: boolean; is_limited: boolean; notes: string | null; created_at: string; updated_at: string; character: string | null; wishlist_count: number; item_type_id: string | null; source_type_id: string | null; collection_id: string | null; wiki_slug: string | null; rarity: string | null; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      collections: { Row: { id: string; name: string; image_url: string | null; released_at: string; description: string | null; created_at: string; character: string | null; source_type: string | null; sort_order: number; slug: string | null; source_type_id: string | null; is_limited: boolean; is_active: boolean; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      listings: { Row: { id: string; trader_id: string; item_id: string; target_item_id: string | null; quantity_listed: number; listing_type: 'have_item' | 'want_item'; status: 'active' | 'paused' | 'completed' | 'cancelled' | 'expired'; minimum_target_tier: string | null; preferred_collections_json: Json; trade_rules_json: Json; notes: string | null; created_at: string; updated_at: string; expires_at: string | null; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      offers: { Row: { id: string; listing_id: string; seller_id: string; buyer_id: string; status: 'pending' | 'accepted' | 'rejected' | 'cancelled'; fairness_label: 'under' | 'fair' | 'over'; fairness_score: number; buyer_note: string | null; seller_note: string | null; created_at: string; updated_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      trades: { Row: { id: string; listing_id: string; accepted_offer_id: string; seller_id: string; buyer_id: string; status: 'pending_completion' | 'completed' | 'disputed' | 'cancelled'; seller_confirmed_at: string | null; buyer_confirmed_at: string | null; completed_at: string | null; dispute_reason: string | null; completion_note: string | null; resolved_at: string | null; created_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      wishlist_entries: { Row: { id: string; trader_id: string; item_id: string; priority: 'low' | 'medium' | 'high'; desired_quantity: number; notes: string | null; created_at: string; updated_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      trader_inventory: { Row: { id: string; trader_id: string; item_id: string; quantity_owned: number; quantity_listed: number; is_tradeable_duplicate: boolean; source_note: string | null; created_at: string; updated_at: string; quantity_available: number; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      events: { Row: { id: string; title: string; event_type: 'happy_bag' | 'campaign' | 'birthday' | 'anniversary' | 'seasonal' | 'other'; start_date: string; end_date: string | null; description: string | null; image_url: string | null; source_url: string | null; collection_name: string | null; is_published: boolean; created_by: string | null; created_at: string; updated_at: string; related_character: string | null; demand_boost_multiplier: number; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      disputes: { Row: { id: string; trade_id: string | null; reporter_id: string; accused_id: string; item_name: string | null; reason: string; status: 'open' | 'resolved' | 'dismissed'; resolution: string | null; resolution_note: string | null; resolved_by: string | null; opened_at: string; resolved_at: string | null; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      notifications: { Row: { id: string; trader_id: string; type: string; item_id: string | null; listing_id: string | null; priority: 'low' | 'medium' | 'high'; title: string; body: string | null; is_read: boolean; created_at: string; offer_id: string | null; seller_trader_id: string | null; match_score: number | null; fairness_score: number | null; action_payload: Json; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      badges: { Row: { id: string; key: string; layer: 'rank' | 'frame' | 'achievement' | 'seasonal'; label: string; description: string | null; image_url: string | null; unlock_rule: Json; created_at: string; sort_order: number; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      trader_badges: { Row: { id: string; trader_id: string; badge_id: string; unlocked_at: string; is_equipped: boolean; slot: number | null; equipped_at: string | null; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      charms: { Row: { id: string; key: string; category: string; label: string; emoji: string | null; is_active: boolean; sort_order: number; created_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      titles: { Row: { id: string; label: string; category: string; rarity_style: string | null; is_active: boolean; sort_order: number; created_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      reputation_snapshots: { Row: { id: string; trader_id: string; completed_trades_count: number; accepted_offers_count: number; rejected_offers_count: number; cancelled_trades_count: number; dispute_count: number; reputation_score: number; updated_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      monthly_rewards: { Row: { id: string; trader_id: string; month: string; ticket_count: number; stamp_count: number; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
      monthly_giveaways: { Row: { id: string; month: string; prize_label: string; draw_date: string | null; status: 'open' | 'drawn' | 'cancelled'; winner_trader_id: string | null; created_at: string; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Trader = TableRow<'traders'>;
export type Item = TableRow<'items'>;
export type Collection = TableRow<'collections'>;
export type Listing = TableRow<'listings'>;
export type Offer = TableRow<'offers'>;
export type Trade = TableRow<'trades'>;
export type WishlistEntry = TableRow<'wishlist_entries'>;
export type InventoryItem = TableRow<'trader_inventory'>;
export type Event = TableRow<'events'>;
export type Dispute = TableRow<'disputes'>;
export type Notification = TableRow<'notifications'>;
export type Badge = TableRow<'badges'>;
export type Charm = TableRow<'charms'>;
export type Title = TableRow<'titles'>;
export type ReputationSnapshot = TableRow<'reputation_snapshots'>;
export type MonthlyReward = TableRow<'monthly_rewards'>;
