# HKDV Trader OS Product Spec

## Product statement

HKDV Trader OS is a structured trading workspace for invited Hello Kitty Dream Village traders. It is not a public marketplace, not a chat feed, and not a cash economy. The product helps trusted traders discover matches, understand likely value, send structured item-for-item offers, and complete trades with visible reputation and history.

## Product principles

- Trust over speed
- Structured offers over free-form feed chaos
- Fairness guidance over false certainty
- Reputation and history over anonymous volume
- Admin-controlled onboarding over public signup

## Primary users

### Trader

Uses the platform to:

- manage inventory
- mark duplicates as tradeable
- maintain a wishlist
- publish have listings and wanted listings
- build structured offers from owned inventory
- evaluate likely fairness before sending
- track incoming and outgoing offers
- confirm completed trades
- build reputation over time

### Admin

Uses the platform to:

- invite traders
- seed or promote item master data
- seed trader inventory
- resolve disputes manually
- moderate listings and offers when needed

## Core product loops

### Loop 1: Have item, want offers

1. Trader marks an owned item as tradeable.
2. Trader creates a `have` listing.
3. Other traders build offers from real inventory.
4. Platform shows fairness estimate, wishlist fit, and trust context.
5. Seller accepts or rejects.
6. Accepted trade moves to completion tracking.

### Loop 2: Want item, seeking matches

1. Trader creates a `wanted` listing.
2. Trader describes target item or collection and what they can trade.
3. Matching traders respond with structured offers.
4. Platform again shows fairness estimate, wishlist fit, and trust context.
5. Accepted trade moves to completion tracking.

### Loop 3: Completion and trust

1. Accepted offer creates a trade record in `pending_completion`.
2. Both sides confirm completion after the in-game exchange is done.
3. Completed trade updates history and reputation.
4. Disputed trade is held for admin review.

## Supported trade modes

### Have listing

Purpose:

- "I have this item and I am open to offers."

Required fields:

- item
- quantity
- listing status
- target tier or collection preferences

Optional fields:

- notes
- rules such as `wall_for_wall` or `wishlist_only`

### Wanted listing

Purpose:

- "I want this item and I am looking for someone who has it."

Required fields:

- target item or collection
- desired quantity
- what I can offer

Optional fields:

- preferred trade rules
- notes

## Fairness model

The fairness model is a guide, not a verdict.

The platform should show three distinct signals:

1. `Fairness estimate`
   Shows whether an offer is likely under, fair, or over based on item value heuristics.
2. `Wishlist relevance`
   Shows how well the offer matches the receiver's stated demand.
3. `Trust context`
   Shows reputation and completion reliability for the counterparty.

The system must avoid presenting value as objective truth. Variable items such as SSRs, walls, buyer shop items, and special community edge cases should support ranges and notes.

## Variable-value items

The platform should support:

- value ranges instead of one fixed number
- seller preference notes
- trade tags such as `wall_for_wall`, `owner_values_high`, or `wishlist_priority`
- community guidance for edge cases

The buyer should not override platform value logic ad hoc during offer creation. If custom interpretation is needed, it should be visible as seller preference or item notes.

## Trust and safety

The platform should include:

- visible trade history
- reputation snapshot
- completion confirmations from both parties
- manual dispute handling
- listing and offer moderation when necessary

The platform should not include:

- in-platform chat
- payments
- escrow
- automated insurance
- anonymous public posting

## MVP scope

### Trader-facing

- Supabase-authenticated login
- dashboard
- inventory
- duplicates
- wishlist
- have listings
- wanted listings
- offer builder
- fairness estimate
- incoming and outgoing offers
- accept and reject
- pending completion confirmation
- trade history
- reputation

### Admin-facing

- invite trader
- seed trader inventory
- promote wiki catalog items into item master
- seed and edit item master data
- dispute management

## Out of scope for MVP

- public marketplace
- chat or DMs
- payment or coin economy
- social feed
- auctions
- automatic wiki syncing in production
- mobile app

## Success criteria

- traders can publish and respond to structured offers without leaving the platform
- accepted trades move into a clear completion workflow
- fairness is understandable but not over-promised
- high-value items and variable-value items are handled transparently
- admins can invite, seed, and resolve disputes without ad hoc database work

