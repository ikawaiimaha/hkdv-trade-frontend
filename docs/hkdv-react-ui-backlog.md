# HKDV Trader OS React UI Backlog

This backlog is prioritized against the current React app in `src/App.jsx` and the current Supabase client and RPC layer.

## P0: Next build-worthy work

### 1. Split listings into `Have` and `Wanted`

Goal:

- make listing intent obvious
- remove the vague `wishlist priority` wording

UI work:

- replace the current listing type copy with `Have Item` and `Wanted Item`
- add a `target item` picker for wanted listings
- show rules and target expectations directly on listing cards

Primary files:

- `src/App.jsx`
- `src/styles.css`
- `src/lib/traderWorkspaceClient.js`

Definition of done:

- traders can create both listing modes
- wanted listings render cleanly in market and personal views
- offer builder shows the correct listing intent

### 2. Add pending completion trade flow

Goal:

- stop treating accepted offers as instantly completed

UI work:

- add a `Pending Completion` state to the trades view
- show confirm-completion actions for buyer and seller
- add dispute action and reason capture
- keep completed and disputed trades visibly separated

Primary files:

- `src/App.jsx`
- `src/lib/traderWorkspaceClient.js`

Definition of done:

- accepted offers move into a pending completion section
- each side can confirm
- dispute flow exists with a required reason

### 3. Improve fairness panel explainability

Goal:

- make the offer builder feel trustworthy without implying certainty

UI work:

- separate value totals for each side
- show wishlist fit signal alongside fairness label
- show variable-value caveat badges on relevant items
- add short explanatory copy near the fairness banner

Primary files:

- `src/App.jsx`
- `src/lib/fairness.js`
- `src/data/mockData.js`

Definition of done:

- users can see why an offer is under, fair, or over
- variable-value items are visually flagged
- fairness is always labeled as an estimate

### 4. Admin invite flow

Goal:

- move trader onboarding out of manual database steps

UI work:

- add an invite form in the Admin view
- show invite status for traders
- show seeded demo trader emails more clearly

Primary files:

- `src/App.jsx`
- `src/lib/traderWorkspaceClient.js` or a new admin client

Definition of done:

- admin can create an invite from the UI
- invited and active states are visible

## P1: Strong product upgrades

### 5. Notification center

Goal:

- replace passive polling behavior with an explicit activity inbox

UI work:

- add unread count in top bar or sidebar
- add a compact inbox panel
- include offer received, trade pending completion, and wishlist match events

Primary files:

- `src/App.jsx`
- `src/styles.css`
- new notifications client helper

### 6. Better variable-value item presentation

Goal:

- make walls, SSRs, buyer shop items, and other edge cases understandable

UI work:

- add value range badges
- add item tags such as `Wall`, `Buyer Shop`, `Variable`
- display seller preference notes on listing detail and offer builder

### 7. Admin wiki-to-item promotion UI

Goal:

- stop relying on SQL-only promotion workflows

UI work:

- add selection controls to the Admin wiki item master
- show promotion preview and result counts
- add filters for unmapped or variable-value items

Primary files:

- `src/App.jsx`
- `src/lib/wikiCatalogClient.js`

## P2: Quality and polish

### 8. Dashboard personalization

Goal:

- make the dashboard more operational for active traders

UI work:

- highlight pending completion trades
- show top wishlist matches
- surface stale incoming offers and listing performance

### 9. Saved filters and search memory

Goal:

- help heavy traders move faster through large catalogs

UI work:

- preserve admin search filters
- preserve listing filters and sort order
- remember the last active offer tab

### 10. Reputation detail page

Goal:

- make trust readable beyond one snapshot number

UI work:

- show completed, rejected, cancelled, disputed
- show recent trade outcomes
- explain how score is derived

## Explicitly not in backlog

These ideas should stay out unless product direction changes:

- in-platform chat
- payments or coins
- public anonymous marketplace
- social feed features
- auto-accept trading
- escrow and insurance systems

## Recommended implementation sequence

1. Listing mode split
2. Pending completion trades
3. Fairness explainability
4. Admin invite flow
5. Notifications
6. Wiki promotion UI

