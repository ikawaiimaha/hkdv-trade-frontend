// ============================================================
// HKDV Trader OS — app.js
// ============================================================

// ── Supabase client ──────────────────────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://ftrfdfldvklipzwoglxx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cmZkZmxkdmtsaXB6d29nbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDczMDUsImV4cCI6MjA5MjAyMzMwNX0.Tlwkb9NyUCHdjcoxneSfA0LSWPMKlRTotSSqvI0PgIY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Auth state ───────────────────────────────────────────────
let currentSession = null;
let currentTrader  = null;
let appStatus      = 'loading';

// ── Trader page state ──────────────────────────────────────
let activeOfferId                = null;  // current draft offer UUID
let activeOfferRecipientTraderId = null;
let activeOfferTargetListingId   = null;
let activeOfferItems             = [];
let sentOffersCache              = [];
let receivedOffersCache          = [];
let completedTradesCache         = [];

async function bootAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { setAppStatus('unauthenticated'); return; }
  currentSession = session;
  await resolveTraderStatus();
}

// Listen for auth changes (e.g. login/logout)
supabase.auth.onAuthStateChange(async (_event, session) => {
  currentSession = session;
  if (!session) { setAppStatus('unauthenticated'); }
  else { await resolveTraderStatus(); }
})

async function resolveTraderStatus() {
  const { data, error } = await supabase.rpc('get_my_application_status');
  if (error || !data) { setAppStatus('unauthenticated'); return; }
  switch (data.status) {
    case 'approved':  currentTrader = data; setAppStatus('approved');  break;
    case 'pending':   setAppStatus('pending');   break;
    case 'rejected':  setAppStatus('rejected');  break;
    default:          setAppStatus('unauthenticated');
  }
}

function setAppStatus(status) {
  appStatus = status;
  const appShell    = document.querySelector('.app-shell');
  const pendingScr  = document.getElementById('pending-screen');
  const rejectedScr = document.getElementById('rejected-screen');
  const joinBtn     = document.getElementById('nav-join-btn');
  const profileBtn  = document.getElementById('open-profile');
  const listBtn     = document.getElementById('nav-list-btn');
  const adminBtn    = document.getElementById('open-admin-queue');
  const traderNavLinks = document.querySelectorAll('.nav-links .trader-only');

  appShell.classList.remove('hidden');
  pendingScr.classList.add('hidden');
  rejectedScr.classList.add('hidden');

  const guestHero = document.getElementById('guest-hero');

  if (status === 'unauthenticated') {
    joinBtn.classList.remove('hidden');
    profileBtn.classList.add('hidden');
    listBtn.classList.add('hidden');
    adminBtn.classList.add('hidden');
    traderNavLinks.forEach(a => a.classList.add('hidden'));
    if (guestHero) guestHero.classList.remove('hidden');
    showPage('marketplace');
  } else if (status === 'pending') {
    appShell.classList.add('hidden');
    pendingScr.classList.remove('hidden');
  } else if (status === 'rejected') {
    appShell.classList.add('hidden');
    rejectedScr.classList.remove('hidden');
  } else if (status === 'approved') {
    joinBtn.classList.add('hidden');
    profileBtn.classList.remove('hidden');
    listBtn.classList.remove('hidden');
    traderNavLinks.forEach(a => a.classList.remove('hidden'));
    if (currentTrader && currentTrader.is_admin) adminBtn.classList.remove('hidden');
    if (guestHero) guestHero.classList.add('hidden');
    showPage('marketplace');
  }
}

// ── SPA Navigation ───────────────────────────────────────────
const pages    = document.querySelectorAll('.page-shell');
const navLinks = document.querySelectorAll('.nav-links a');

// ── DOM selectors — trader page containers ───────────────────
const inventoryGrid          = document.getElementById('inventory-grid');
const wishlistGrid           = document.getElementById('wishlist-grid');
const wishlistMatchesGrid    = document.getElementById('wishlist-matches-grid');
const myListingsGrid         = document.getElementById('my-listings-grid');

const dashboardRewardsCard      = document.getElementById('dashboard-rewards-card');
const dashboardListingsPreview  = document.getElementById('dashboard-my-listings-preview');
const dashboardWishlistMatches  = document.getElementById('dashboard-wishlist-matches');

const itemModalListings      = document.getElementById('item-modal-listings');
const offerInventoryChoices  = document.getElementById('offer-inventory-choices');
const offerMessage           = document.getElementById('offer-message');
const offerMessageEl         = offerMessage; // alias
const submitOfferBtn         = document.getElementById('submit-offer');

function showPage(id) {
  pages.forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.remove('hidden');
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.page === id));

  if (id === 'marketplace') { loadFeatured(); loadMarketplaceItems(); }
  if (id === 'dashboard') {
    loadDashboardItems();
    loadDashboardRewards();
    loadDashboardListingsPreview();
    loadWishlistMatchesPreview();
  }
  if (id === 'inventory') loadInventoryPage();
  if (id === 'wishlist')  loadWishlistPage();
  if (id === 'listings')  loadListingsPage();
  if (id === 'offers')    loadOffersPage();
}

navLinks.forEach(a => a.addEventListener('click', () => showPage(a.dataset.page)));

// Delegated handler for text-btn[data-page] shortcuts inside page content
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-page]:not(.nav-links a)');
  if (btn && btn.dataset.page) showPage(btn.dataset.page);
});

// ── Marketplace Items — public browsable grid ────────────────
let marketplaceOffset = 0;
const MARKET_PAGE = 24;
let marketplaceSearchTerm = '';

async function loadMarketplaceItems(reset = false) {
  const grid = document.getElementById('marketplace-item-grid');
  if (!grid) return;
  if (reset) { marketplaceOffset = 0; grid.innerHTML = ''; }

  grid.insertAdjacentHTML('beforeend', Array(MARKET_PAGE).fill('<div class="item-card skeleton-card" style="min-height:220px;"></div>').join(''));

  let query = supabase
    .from('items')
    .select('id, name, tier, wiki_rarity, collection_name, demand_level, image_url, wiki_page_url, projected_value, community_value')
    .range(marketplaceOffset, marketplaceOffset + MARKET_PAGE - 1)
    .order('name', { ascending: true });

  if (marketplaceSearchTerm) {
    query = query.or(`name.ilike.%${marketplaceSearchTerm}%,collection_name.ilike.%${marketplaceSearchTerm}%`);
  }

  const { data, error } = await query;

  // Remove skeletons
  grid.querySelectorAll('.skeleton-card').forEach(s => s.remove());

  if (error || !data || !data.length) {
    if (marketplaceOffset === 0) grid.innerHTML = '<p class="muted">No items found.</p>';
    document.getElementById('browse-load-more-btn').style.display = 'none';
    return;
  }

  data.forEach(item => renderItemCard(grid, item));
  marketplaceOffset += data.length;
  document.getElementById('browse-load-more-btn').style.display = data.length < MARKET_PAGE ? 'none' : '';
}

document.getElementById('browse-load-more-btn').addEventListener('click', () => loadMarketplaceItems());

let searchDebounce;
document.getElementById('browse-search').addEventListener('input', e => {
  clearTimeout(searchDebounce);
  marketplaceSearchTerm = e.target.value.trim();
  searchDebounce = setTimeout(() => loadMarketplaceItems(true), 300);
});

// ── Dashboard Items (trader view) ────────────────────────────
async function loadDashboardItems() {
  const grid = document.getElementById('dashboard-item-grid');
  if (!grid) return;
  grid.innerHTML = Array(6).fill('<div class="item-card skeleton-card" style="min-height:220px;"></div>').join('');
  const { data, error } = await supabase
    .from('items')
    .select('id, name, tier, wiki_rarity, collection_name, demand_level, image_url, wiki_page_url, projected_value, community_value')
    .limit(6);
  grid.innerHTML = '';
  if (error || !data || !data.length) { grid.innerHTML = '<p class="muted">Could not load items.</p>'; return; }
  data.forEach(item => renderItemCard(grid, item));
}

function renderInventoryCard(container, row) {
  const tierClass = (row.tier || '').toLowerCase().replace(/[^a-z]/g, '');
  const demandRaw = (row.demand_level || '').toLowerCase();
  const demandClass = demandRaw.includes('high') ? 'high' : demandRaw.includes('low') ? 'low' : 'medium';

  const card = document.createElement('article');
  card.className = 'item-card';
  card.innerHTML = `
    <div class="item-image">
      ${row.image_url
        ? `<img src="${row.image_url}" alt="${escHtml(row.item_name)}" class="item-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
        : `<span class="item-img-fallback">🎀</span>`}
    </div>
    <div class="item-content">
      <div class="item-top">
        <h3>${escHtml(row.item_name)}</h3>
        <span class="tier-badge ${tierClass}">${row.tier || ''}</span>
      </div>
      <div class="signal-row">
        <span class="chip demand ${demandClass}">${cap(row.demand_level)} Demand</span>
      </div>
      <div class="value-line">Owned: ${row.quantity ?? 0} · Available: ${row.available_quantity ?? 0}</div>
      <div class="queue-actions" style="margin-top:10px;">
        <button class="primary-btn small-btn" data-list-from-inventory="${row.inventory_id}">List</button>
        <button class="secondary-btn small-btn" data-remove-inventory="${row.inventory_id}">Remove</button>
      </div>
    </div>
  `;
  container.appendChild(card);
}

function renderWishlistCard(container, row) {
  const tierClass = (row.tier || '').toLowerCase().replace(/[^a-z]/g, '');

  const card = document.createElement('article');
  card.className = 'item-card';
  card.innerHTML = `
    <div class="item-image">
      ${row.image_url
        ? `<img src="${row.image_url}" alt="${escHtml(row.item_name)}" class="item-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
        : `<span class="item-img-fallback">🎀</span>`}
    </div>
    <div class="item-content">
      <div class="item-top">
        <h3>${escHtml(row.item_name)}</h3>
        <span class="tier-badge ${tierClass}">${row.tier || ''}</span>
      </div>
      <div class="value-line">Wanted: ${row.desired_quantity ?? 1} · Priority: ${row.priority ?? 3}</div>
      <div class="queue-actions" style="margin-top:10px;">
        <button class="secondary-btn small-btn" data-remove-wishlist="${row.item_id}">Remove</button>
      </div>
    </div>
  `;
  container.appendChild(card);
}

function renderListingCard(container, row) {
  const tierClass = (row.tier || '').toLowerCase().replace(/[^a-z]/g, '');

  const card = document.createElement('article');
  card.className = 'item-card';
  card.innerHTML = `
    <div class="item-image">
      ${row.image_url
        ? `<img src="${row.image_url}" alt="${escHtml(row.item_name)}" class="item-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
        : `<span class="item-img-fallback">🎀</span>`}
    </div>
    <div class="item-content">
      <div class="item-top">
        <h3>${escHtml(row.item_name)}</h3>
        <span class="tier-badge ${tierClass}">${row.tier || ''}</span>
      </div>
      <div class="value-line">Qty: ${row.quantity ?? 1} · ${escHtml(row.status || '')}</div>
      <div class="queue-actions" style="margin-top:10px;">
        <button class="secondary-btn small-btn" data-archive-listing="${row.listing_id}">Archive</button>
      </div>
    </div>
  `;
  container.appendChild(card);
}

function renderSentOffers(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="muted">No sent offers.</p>';
    return;
  }
  container.innerHTML = rows.map(r => `
    <div class="mini-card">
      <strong>${escHtml(r.target_item_name || 'Offer')}</strong>
      <div class="muted">${escHtml(r.status || '—')} · ${escHtml(r.fairness_band || '—')}</div>
    </div>
  `).join('');
}

function renderReceivedOffers(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="muted">No received offers.</p>';
    return;
  }
  container.innerHTML = rows.map(r => `
    <div class="mini-card">
      <strong>${escHtml(r.target_item_name || 'Offer')}</strong>
      <div class="muted">${escHtml(r.status || '—')} · ${escHtml(r.fairness_band || '—')}</div>
      <div class="queue-actions" style="margin-top:8px;">
        <button class="primary-btn small-btn" data-accept-offer="${r.id}">Accept</button>
        <button class="secondary-btn small-btn" data-decline-offer="${r.id}">Decline</button>
      </div>
    </div>
  `).join('');
}

function renderCompletedTrades(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="muted">No completed trades yet.</p>';
    return;
  }
  container.innerHTML = rows.map(r => `
    <div class="mini-card">
      <strong>${escHtml(r.target_item_name || 'Completed trade')}</strong>
      <div class="muted">${escHtml(r.fairness_band || '—')} · ${r.completed_at ? formatDate(r.completed_at) : '—'}</div>
    </div>
  `).join('');
}

function renderItemCard(container, item) {
  const tierClass   = (item.tier || '').toLowerCase().replace(/[^a-z]/g, '');
  const demandRaw   = (item.demand_level || '').toLowerCase();
  const demandClass = demandRaw.includes('high') ? 'high' : demandRaw.includes('low') ? 'low' : 'medium';
  const demandLabel = cap(item.demand_level || 'Unknown');
  const value       = item.community_value || item.projected_value || 0;

  const card = document.createElement('article');
  card.className = 'item-card';
  card.dataset.itemId    = item.id;
  card.dataset.name      = item.name || '';
  card.dataset.tier      = item.tier || '';
  card.dataset.rarity    = item.wiki_rarity || '';
  card.dataset.demand    = demandLabel;
  card.dataset.value     = value;
  card.dataset.collection= item.collection_name || '';
  card.dataset.image     = item.image_url || '';
  card.dataset.wiki      = item.wiki_page_url || '';

  card.innerHTML = `
    <div class="item-image clickable-thumb" title="Click for details">
      ${item.image_url
        ? `<img src="${item.image_url}" alt="${escHtml(item.name)}" class="item-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
        : `<span class="item-img-fallback">🎀</span>`}
    </div>
    <div class="item-content">
      <div class="item-top">
        <h3>${escHtml(item.name)}</h3>
        <span class="tier-badge ${tierClass}">${item.tier || ''}</span>
      </div>
      <div class="signal-row">
        ${item.collection_name ? `<span class="chip collection">${escHtml(item.collection_name)}</span>` : ''}
        <span class="chip demand ${demandClass}">${demandLabel} Demand</span>
      </div>
    </div>
  `;
  container.appendChild(card);
}

// ── Page loaders — stubbed, ready to wire ───────────────────
// ── Inventory page ───────────────────────────────────────────
let inventoryCache = []; // full list for client-side search filter

async function loadInventoryPage() {
  const grid = document.getElementById('inventory-grid');
  const countEl = document.getElementById('inventory-count');
  if (!grid || appStatus !== 'approved') return;

  grid.innerHTML = Array(6).fill('<div class="item-card skeleton-card" style="min-height:220px;"></div>').join('');

  const { data, error } = await supabase.rpc('get_my_inventory');
  grid.innerHTML = '';

  if (error) {
    grid.innerHTML = `<p class="muted">Could not load inventory: ${error.message}</p>`;
    return;
  }
  if (!data || !data.length) {
    grid.innerHTML = `<div class="page-empty"><p>🎀 Your inventory is empty.</p><button class="primary-btn" id="inv-empty-add">+ Add First Item</button></div>`;
    document.getElementById('inv-empty-add')?.addEventListener('click', openInventoryModal);
    return;
  }

  inventoryCache = data;
  if (countEl) countEl.textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`;
  renderInventoryGrid(data);
}

function renderInventoryGrid(items) {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach(item => {
    const tierClass  = (item.tier || '').toLowerCase().replace(/[^a-z]/g, '');
    const demandRaw  = (item.demand_level || '').toLowerCase();
    const demandClass = demandRaw.includes('high') ? 'high' : demandRaw.includes('low') ? 'low' : 'medium';

    const card = document.createElement('article');
    card.className = 'item-card inv-card';
    card.dataset.inventoryId = item.inventory_id;
    card.dataset.itemId      = item.item_id;
    card.dataset.name        = item.item_name || '';
    card.dataset.tier        = item.tier || '';
    card.dataset.demand      = cap(item.demand_level || '');
    card.dataset.image       = item.image_url || '';
    card.dataset.quantity    = item.quantity ?? 1;
    card.dataset.available   = item.available_quantity ?? item.quantity ?? 1;

    card.innerHTML = `
      <div class="item-image">
        ${item.image_url
          ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.item_name)}" class="item-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
          : `<span class="item-img-fallback">🎀</span>`}
      </div>
      <div class="item-content">
        <div class="item-top">
          <h3>${escHtml(item.item_name || '—')}</h3>
          <span class="tier-badge ${tierClass}">${item.tier || ''}</span>
        </div>
        <div class="signal-row">
          <span class="chip demand ${demandClass}">${cap(item.demand_level || 'Unknown')} Demand</span>
        </div>
        <div class="inv-qty-row">
          <span class="inv-qty-label">Qty: <strong>${item.quantity ?? 1}</strong></span>
          <span class="inv-avail-label">Avail: <strong>${item.available_quantity ?? item.quantity ?? 1}</strong></span>
        </div>
        ${item.notes ? `<p class="inv-notes">${escHtml(item.notes)}</p>` : ''}
        <div class="inv-actions">
          <button class="text-btn" data-inv-edit="${item.inventory_id}" data-qty="${item.quantity ?? 1}">Edit Qty</button>
          <button class="text-btn" data-inv-list="${item.inventory_id}">+ Listing</button>
          <button class="text-btn danger" data-inv-remove="${item.inventory_id}">Remove</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function saveInventoryItem(payload) {
  // payload: { p_item_id, p_quantity, p_notes }
  const { error } = await supabase.rpc('upsert_inventory_item', payload);
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function updateInventoryQuantity(inventoryId, quantity) {
  const { error } = await supabase.rpc('set_inventory_quantity', {
    p_inventory_id: inventoryId,
    p_quantity: quantity,
  });
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function deleteInventoryItem(inventoryId) {
  const { error } = await supabase.rpc('remove_inventory_item', {
    p_inventory_id: inventoryId,
  });
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

// ── Inventory modal wiring ────────────────────────────────────
const inventoryModal = document.getElementById('inventory-modal');

function openInventoryModal(prefill = null) {
  // prefill: { inventoryId, itemId, itemName, quantity, notes } for edit mode
  document.getElementById('inventory-modal-title').textContent = prefill ? 'Edit Quantity' : 'Add to Inventory';
  document.getElementById('inv-item-search').value      = prefill?.itemName || '';
  document.getElementById('inv-selected-item-id').value = prefill?.itemId   || '';
  document.getElementById('inv-quantity').value         = prefill?.quantity  || 1;
  document.getElementById('inv-notes').value            = prefill?.notes     || '';

  const preview = document.getElementById('inv-selected-preview');
  if (prefill?.itemName) {
    preview.textContent = prefill.itemName;
    preview.classList.remove('hidden');
    // lock search when editing
    document.getElementById('inv-item-search').disabled = !!prefill.inventoryId;
  } else {
    preview.classList.add('hidden');
    document.getElementById('inv-item-search').disabled = false;
  }

  inventoryModal.dataset.editId = prefill?.inventoryId || '';
  inventoryModal.classList.remove('hidden');
}

function closeInventoryModal() {
  inventoryModal.classList.add('hidden');
  document.getElementById('inv-item-search').value      = '';
  document.getElementById('inv-item-search').disabled   = false;
  document.getElementById('inv-selected-item-id').value = '';
  document.getElementById('inv-quantity').value         = 1;
  document.getElementById('inv-notes').value            = '';
  document.getElementById('inv-selected-preview').classList.add('hidden');
  document.getElementById('inv-item-results').classList.add('hidden');
  document.getElementById('inv-item-results').innerHTML = '';
  delete inventoryModal.dataset.editId;
}

document.getElementById('open-inventory-add').addEventListener('click', () => openInventoryModal());
document.getElementById('close-inventory-modal').addEventListener('click', closeInventoryModal);
document.getElementById('cancel-inventory-modal').addEventListener('click', closeInventoryModal);
inventoryModal.addEventListener('click', e => { if (e.target === inventoryModal) closeInventoryModal(); });

// Qty stepper
document.getElementById('inv-qty-dec').addEventListener('click', () => {
  const el = document.getElementById('inv-quantity');
  el.value = Math.max(1, (parseInt(el.value) || 1) - 1);
});
document.getElementById('inv-qty-inc').addEventListener('click', () => {
  const el = document.getElementById('inv-quantity');
  el.value = (parseInt(el.value) || 1) + 1;
});

// Item search inside modal
let invSearchDebounce;
document.getElementById('inv-item-search').addEventListener('input', e => {
  clearTimeout(invSearchDebounce);
  const term = e.target.value.trim();
  if (term.length < 2) {
    document.getElementById('inv-item-results').classList.add('hidden');
    return;
  }
  invSearchDebounce = setTimeout(async () => {
    const { data } = await supabase
      .from('items')
      .select('id, name, tier, image_url')
      .ilike('name', `%${term}%`)
      .limit(8);
    const resultsEl = document.getElementById('inv-item-results');
    if (!data || !data.length) { resultsEl.innerHTML = '<div class="inv-result-empty">No items found.</div>'; resultsEl.classList.remove('hidden'); return; }
    resultsEl.innerHTML = data.map(i =>
      `<div class="inv-result-row" data-id="${i.id}" data-name="${escHtml(i.name)}" data-tier="${i.tier || ''}">
         ${i.image_url ? `<img src="${escHtml(i.image_url)}" alt="" class="inv-result-thumb" onerror="this.style.display='none'" />` : '<span class="inv-result-thumb-empty">🎀</span>'}
         <span class="inv-result-name">${escHtml(i.name)}</span>
         <span class="tier-badge ${(i.tier || '').toLowerCase().replace(/[^a-z]/g,'')}">${i.tier || ''}</span>
       </div>`
    ).join('');
    resultsEl.classList.remove('hidden');
  }, 300);
});

document.getElementById('inv-item-results').addEventListener('click', e => {
  const row = e.target.closest('.inv-result-row');
  if (!row) return;
  document.getElementById('inv-selected-item-id').value = row.dataset.id;
  document.getElementById('inv-item-search').value      = row.dataset.name;
  const preview = document.getElementById('inv-selected-preview');
  preview.textContent = `${row.dataset.name} • ${row.dataset.tier}`;
  preview.classList.remove('hidden');
  document.getElementById('inv-item-results').classList.add('hidden');
});

// Save handler
document.getElementById('save-inventory-item').addEventListener('click', async () => {
  const itemId    = document.getElementById('inv-selected-item-id').value;
  const quantity  = parseInt(document.getElementById('inv-quantity').value) || 1;
  const notes     = document.getElementById('inv-notes').value.trim();
  const editId    = inventoryModal.dataset.editId;

  if (!itemId && !editId) { showToast('Please select an item first.'); return; }

  const btn = document.getElementById('save-inventory-item');
  btn.textContent = 'Saving…'; btn.disabled = true;

  let ok;
  if (editId) {
    ok = await updateInventoryQuantity(editId, quantity);
  } else {
    ok = await saveInventoryItem({ p_item_id: itemId, p_quantity: quantity, p_notes: notes || null });
  }

  btn.textContent = 'Save'; btn.disabled = false;
  if (!ok) return;
  closeInventoryModal();
  showToast(editId ? 'Quantity updated! 📦' : 'Item added to inventory! 🎀');
  loadInventoryPage();
});

// Delegated card actions
document.getElementById('inventory-grid')?.addEventListener('click', async e => {
  // Edit quantity
  const editBtn = e.target.closest('[data-inv-edit]');
  if (editBtn) {
    const card = editBtn.closest('[data-inventory-id]');
    openInventoryModal({
      inventoryId: card.dataset.inventoryId,
      itemId:      card.dataset.itemId,
      itemName:    card.dataset.name,
      quantity:    parseInt(card.dataset.quantity),
      notes:       '',
    });
    return;
  }

  // Remove
  const removeBtn = e.target.closest('[data-inv-remove]');
  if (removeBtn) {
    const invId = removeBtn.dataset.invRemove;
    removeBtn.textContent = '…'; removeBtn.disabled = true;
    const ok = await deleteInventoryItem(invId);
    if (ok) { showToast('Item removed.'); loadInventoryPage(); }
    else { removeBtn.textContent = 'Remove'; removeBtn.disabled = false; }
    return;
  }

  // Create listing
  const listBtn = e.target.closest('[data-inv-list]');
  if (listBtn) {
    const invId = listBtn.dataset.invList;
    listBtn.textContent = '…'; listBtn.disabled = true;
    const { error } = await supabase.rpc('create_listing_from_inventory', { p_inventory_id: invId });
    listBtn.textContent = '+ Listing'; listBtn.disabled = false;
    if (error) { showToast('Error: ' + error.message); return; }
    showToast('Listing created! 📋');
    loadDashboardListingsPreview();
  }
});

// Client-side search filter
let invSearchFilterDebounce;
document.getElementById('inventory-search')?.addEventListener('input', e => {
  clearTimeout(invSearchFilterDebounce);
  invSearchFilterDebounce = setTimeout(() => {
    const term = e.target.value.trim().toLowerCase();
    const filtered = term ? inventoryCache.filter(i => (i.item_name || '').toLowerCase().includes(term)) : inventoryCache;
    renderInventoryGrid(filtered);
    const countEl = document.getElementById('inventory-count');
    if (countEl) countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
  }, 200);
});

// ── Wishlist page ───────────────────────────────────────────
let wishlistCache = [];

async function loadWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  if (!grid || appStatus !== 'approved') return;

  // hide matches panel on reload
  document.getElementById('wl-matches-panel')?.classList.add('hidden');

  grid.innerHTML = Array(4).fill('<div class="wl-card skeleton-card" style="min-height:110px;"></div>').join('');

  const { data, error } = await supabase.rpc('get_my_wishlist');
  grid.innerHTML = '';

  if (error) {
    grid.innerHTML = `<p class="muted">Could not load wishlist: ${error.message}</p>`;
    return;
  }
  if (!data || !data.length) {
    grid.innerHTML = `<div class="page-empty"><p>💫 Your wishlist is empty.</p><button class="primary-btn" id="wl-empty-add">+ Add First Item</button></div>`;
    document.getElementById('wl-empty-add')?.addEventListener('click', openWishlistModal);
    return;
  }

  wishlistCache = data;
  renderWishlistGrid(data);
}

const PRIORITY_LABELS = { 1: '★ Must Have', 2: '★★ Want', 3: '★★★ Nice to Have' };

function renderWishlistGrid(items) {
  const grid = document.getElementById('wishlist-grid');
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach(item => {
    const tierClass   = (item.tier || '').toLowerCase().replace(/[^a-z]/g, '');
    const priorityNum = item.priority ?? 3;
    const priClass    = priorityNum === 1 ? 'pri-must' : priorityNum === 2 ? 'pri-want' : 'pri-nice';

    const card = document.createElement('div');
    card.className = 'wl-card';
    card.dataset.itemId   = item.item_id;
    card.dataset.itemName = item.item_name || '';
    card.dataset.priority = priorityNum;
    card.dataset.desiredQty = item.desired_quantity ?? 1;
    card.dataset.notes    = item.notes || '';

    card.innerHTML = `
      <div class="wl-card-thumb">
        ${item.image_url
          ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.item_name)}" loading="lazy" onerror="this.style.display='none'" />`
          : `<span class="item-img-fallback">💫</span>`}
      </div>
      <div class="wl-card-body">
        <div class="wl-card-top">
          <span class="wl-item-name">${escHtml(item.item_name || '—')}</span>
          <span class="tier-badge ${tierClass}">${item.tier || ''}</span>
        </div>
        <div class="wl-card-meta">
          <span class="wl-priority-chip ${priClass}">${PRIORITY_LABELS[priorityNum] || ''}</span>
          <span class="wl-qty-label">Want: <strong>${item.desired_quantity ?? 1}</strong></span>
        </div>
        ${item.notes ? `<p class="inv-notes">${escHtml(item.notes)}</p>` : ''}
        <div class="inv-actions">
          <button class="text-btn" data-wl-edit data-item-id="${item.item_id}">Edit</button>
          <button class="text-btn" data-wl-match data-item-id="${item.item_id}" data-item-name="${escHtml(item.item_name)}">Find Matches</button>
          <button class="text-btn danger" data-wl-remove data-item-id="${item.item_id}">Remove</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function saveWishlistItem(payload) {
  // payload: { p_item_id, p_desired_quantity, p_priority, p_notes }
  const { error } = await supabase.rpc('upsert_wishlist_item', payload);
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function deleteWishlistItem(itemId) {
  const { error } = await supabase.rpc('remove_wishlist_item', { p_item_id: itemId });
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function loadWishlistMatches(filterItemId = null, filterItemName = '') {
  const panel   = document.getElementById('wl-matches-panel');
  const grid    = document.getElementById('wishlist-matches-grid');
  const nameEl  = document.getElementById('wl-match-item-name');
  if (!panel || !grid) return;

  nameEl.textContent = filterItemName || 'All';
  grid.innerHTML = '<div class="dash-loading">Finding matches…</div>';
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const { data, error } = await supabase.rpc('get_matches_for_my_wishlist');

  if (error) { grid.innerHTML = `<p class="muted">Error: ${error.message}</p>`; return; }

  const results = filterItemId
    ? (data || []).filter(m => String(m.item_id) === String(filterItemId))
    : (data || []);

  if (!results.length) {
    grid.innerHTML = `<div class="dash-empty">No listings found for this item yet.</div>`;
    return;
  }

  grid.innerHTML = results.map(m => `
    <div class="match-row">
      <div class="match-item-info">
        <span class="match-item-name">${escHtml(m.item_name || '—')}</span>
        <span class="tier-badge ${(m.tier || '').toLowerCase().replace(/[^a-z]/g, '')}">${m.tier || ''}</span>
      </div>
      <div class="match-trader-info">
        <span class="match-trader">${escHtml(m.trader_name || '—')}</span>
        <span class="match-qty">Qty: ${m.quantity ?? 1}</span>
      </div>
      <div class="match-actions">
        <button class="primary-btn small-btn" data-open-offer="${m.listing_id}">Make Offer</button>
      </div>
    </div>
  `).join('');
}

// Delegated wishlist card actions
document.getElementById('wishlist-grid')?.addEventListener('click', async e => {
  // Edit
  const editBtn = e.target.closest('[data-wl-edit]');
  if (editBtn) {
    const itemId = editBtn.dataset.itemId;
    const cached = wishlistCache.find(w => String(w.item_id) === String(itemId));
    if (cached) openWishlistModal({
      itemId:         cached.item_id,
      itemName:       cached.item_name,
      priority:       cached.priority ?? 1,
      desiredQty:     cached.desired_quantity ?? 1,
      notes:          cached.notes || '',
    });
    return;
  }

  // Find matches
  const matchBtn = e.target.closest('[data-wl-match]');
  if (matchBtn) {
    await loadWishlistMatches(matchBtn.dataset.itemId, matchBtn.dataset.itemName);
    return;
  }

  // Remove
  const removeBtn = e.target.closest('[data-wl-remove]');
  if (removeBtn) {
    const itemId = removeBtn.dataset.itemId;
    removeBtn.textContent = '…'; removeBtn.disabled = true;
    const ok = await deleteWishlistItem(itemId);
    if (ok) { showToast('Removed from wishlist.'); loadWishlistPage(); }
    else { removeBtn.textContent = 'Remove'; removeBtn.disabled = false; }
  }
});

document.getElementById('close-wl-matches')?.addEventListener('click', () => {
  document.getElementById('wl-matches-panel').classList.add('hidden');
});

// ── Wishlist modal wiring ───────────────────────────────────
const wishlistModal = document.getElementById('wishlist-modal');

function openWishlistModal(prefill = null) {
  document.getElementById('wishlist-modal-title').textContent = prefill ? 'Edit Wishlist Item' : 'Add to Wishlist';
  document.getElementById('wl-item-search').value      = prefill?.itemName  || '';
  document.getElementById('wl-selected-item-id').value = prefill?.itemId    || '';
  document.getElementById('wl-desired-qty').value      = prefill?.desiredQty || 1;
  document.getElementById('wl-notes').value            = prefill?.notes      || '';
  document.getElementById('wl-priority').value         = prefill?.priority   || 1;

  // Priority buttons
  document.querySelectorAll('#wl-priority-row .priority-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === String(prefill?.priority || 1));
  });

  const preview = document.getElementById('wl-selected-preview');
  if (prefill?.itemName) {
    preview.textContent = prefill.itemName;
    preview.classList.remove('hidden');
    document.getElementById('wl-item-search').disabled = true;
  } else {
    preview.classList.add('hidden');
    document.getElementById('wl-item-search').disabled = false;
  }

  wishlistModal.dataset.editItemId = prefill?.itemId || '';
  wishlistModal.classList.remove('hidden');
}

function closeWishlistModal() {
  wishlistModal.classList.add('hidden');
  ['wl-item-search','wl-selected-item-id','wl-desired-qty','wl-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = el.type === 'number' ? 1 : ''; el.disabled = false; }
  });
  document.getElementById('wl-priority').value = 1;
  document.getElementById('wl-selected-preview').classList.add('hidden');
  document.getElementById('wl-item-results').classList.add('hidden');
  document.getElementById('wl-item-results').innerHTML = '';
  document.querySelectorAll('#wl-priority-row .priority-btn').forEach((btn, i) =>
    btn.classList.toggle('active', i === 0));
  delete wishlistModal.dataset.editItemId;
}

document.getElementById('open-wishlist-add').addEventListener('click', () => openWishlistModal());
document.getElementById('close-wishlist-modal').addEventListener('click', closeWishlistModal);
document.getElementById('cancel-wishlist-modal').addEventListener('click', closeWishlistModal);
wishlistModal.addEventListener('click', e => { if (e.target === wishlistModal) closeWishlistModal(); });

// Priority selector
document.getElementById('wl-priority-row').addEventListener('click', e => {
  const btn = e.target.closest('.priority-btn');
  if (!btn) return;
  document.querySelectorAll('#wl-priority-row .priority-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('wl-priority').value = btn.dataset.priority;
});

// Qty stepper
document.getElementById('wl-qty-dec').addEventListener('click', () => {
  const el = document.getElementById('wl-desired-qty');
  el.value = Math.max(1, (parseInt(el.value) || 1) - 1);
});
document.getElementById('wl-qty-inc').addEventListener('click', () => {
  const el = document.getElementById('wl-desired-qty');
  el.value = (parseInt(el.value) || 1) + 1;
});

// Item search
let wlSearchDebounce;
document.getElementById('wl-item-search').addEventListener('input', e => {
  clearTimeout(wlSearchDebounce);
  const term = e.target.value.trim();
  if (term.length < 2) { document.getElementById('wl-item-results').classList.add('hidden'); return; }
  wlSearchDebounce = setTimeout(async () => {
    const { data } = await supabase
      .from('items')
      .select('id, name, tier, image_url')
      .ilike('name', `%${term}%`)
      .limit(8);
    const resultsEl = document.getElementById('wl-item-results');
    if (!data || !data.length) {
      resultsEl.innerHTML = '<div class="inv-result-empty">No items found.</div>';
      resultsEl.classList.remove('hidden');
      return;
    }
    resultsEl.innerHTML = data.map(i =>
      `<div class="inv-result-row" data-id="${i.id}" data-name="${escHtml(i.name)}" data-tier="${i.tier || ''}">
         ${i.image_url ? `<img src="${escHtml(i.image_url)}" alt="" class="inv-result-thumb" onerror="this.style.display='none'" />` : '<span class="inv-result-thumb-empty">💫</span>'}
         <span class="inv-result-name">${escHtml(i.name)}</span>
         <span class="tier-badge ${(i.tier || '').toLowerCase().replace(/[^a-z]/g,'')}">${i.tier || ''}</span>
       </div>`
    ).join('');
    resultsEl.classList.remove('hidden');
  }, 300);
});

document.getElementById('wl-item-results').addEventListener('click', e => {
  const row = e.target.closest('.inv-result-row');
  if (!row) return;
  document.getElementById('wl-selected-item-id').value = row.dataset.id;
  document.getElementById('wl-item-search').value      = row.dataset.name;
  const preview = document.getElementById('wl-selected-preview');
  preview.textContent = `${row.dataset.name} • ${row.dataset.tier}`;
  preview.classList.remove('hidden');
  document.getElementById('wl-item-results').classList.add('hidden');
});

// Save
document.getElementById('save-wishlist-item').addEventListener('click', async () => {
  const itemId     = document.getElementById('wl-selected-item-id').value || wishlistModal.dataset.editItemId;
  const desiredQty = parseInt(document.getElementById('wl-desired-qty').value) || 1;
  const priority   = parseInt(document.getElementById('wl-priority').value)    || 1;
  const notes      = document.getElementById('wl-notes').value.trim();

  if (!itemId) { showToast('Please select an item first.'); return; }

  const btn = document.getElementById('save-wishlist-item');
  btn.textContent = 'Saving…'; btn.disabled = true;

  const ok = await saveWishlistItem({
    p_item_id:         itemId,
    p_desired_quantity: desiredQty,
    p_priority:        priority,
    p_notes:           notes || null,
  });

  btn.textContent = 'Save'; btn.disabled = false;
  if (!ok) return;
  closeWishlistModal();
  showToast('Wishlist updated! ⭐');
  loadWishlistPage();
  loadWishlistMatchesPreview(); // refresh dashboard preview too
});

// ── Listings page ───────────────────────────────────────────
let listingsCache  = [];
let listingsTab    = 'active'; // 'active' | 'archived'

async function loadListingsPage() {
  const grid = document.getElementById('my-listings-grid');
  if (!grid || appStatus !== 'approved') return;

  grid.innerHTML = '<div class="dash-loading">Loading listings…</div>';

  const { data, error } = await supabase.rpc('get_my_listings');

  if (error) {
    grid.innerHTML = `<p class="muted">Could not load listings: ${error.message}</p>`;
    return;
  }

  listingsCache = data || [];
  renderListingsGrid(listingsCache, listingsTab);
}

function renderListingsGrid(all, tab) {
  const grid = document.getElementById('my-listings-grid');
  if (!grid) return;

  const items = all.filter(l => (l.status || 'active') === tab);

  if (!items.length) {
    grid.innerHTML = `<div class="page-empty">
      <p>${tab === 'active' ? '📋 No active listings.' : '🗂️ No archived listings.'}</p>
      ${tab === 'active' ? '<p class="muted" style="font-size:.85rem">Go to Inventory and use “+ Listing” on an item.</p>' : ''}
    </div>`;
    return;
  }

  grid.innerHTML = '';
  items.forEach(l => {
    const statusClass = (l.status || 'active').toLowerCase();
    const tierClass   = (l.tier   || '').toLowerCase().replace(/[^a-z]/g, '');

    const row = document.createElement('div');
    row.className = 'listing-full-row';
    row.dataset.listingId  = l.id;
    row.dataset.availQty   = l.available_quantity ?? l.quantity ?? 1;
    row.dataset.quantity   = l.quantity ?? 1;
    row.dataset.note       = l.note || '';
    row.dataset.itemName   = l.item_name || '';
    row.dataset.imageUrl   = l.image_url || '';
    row.dataset.status     = l.status || 'active';

    row.innerHTML = `
      <div class="listing-row-thumb">
        ${l.image_url
          ? `<img src="${escHtml(l.image_url)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
          : `<span class="item-img-fallback">📋</span>`}
      </div>
      <div class="listing-full-info">
        <div class="listing-full-top">
          <span class="listing-row-name">${escHtml(l.item_name || '—')}</span>
          <span class="tier-badge ${tierClass}">${l.tier || ''}</span>
        </div>
        <div class="listing-full-meta">
          <span class="listing-row-meta">Listed: <strong>${l.quantity ?? 1}</strong></span>
          <span class="listing-row-meta">Available: <strong>${l.available_quantity ?? l.quantity ?? 1}</strong></span>
          ${l.note ? `<span class="listing-note">“${escHtml(l.note)}”</span>` : ''}
        </div>
      </div>
      <div class="listing-full-end">
        <span class="status-chip status-${statusClass}">${cap(statusClass)}</span>
        <div class="listing-row-actions">
          ${statusClass === 'active'
            ? `<button class="text-btn" data-listing-edit="${l.id}">Edit</button>
               <button class="text-btn danger" data-listing-archive="${l.id}">Archive</button>`
            : ''}
        </div>
      </div>
    `;
    grid.appendChild(row);
  });
}

// Tab switching
document.getElementById('page-listings')?.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (!tabBtn || !tabBtn.closest('.listings-tabs')) return;
  document.querySelectorAll('.listings-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === tabBtn));
  listingsTab = tabBtn.dataset.tab;
  renderListingsGrid(listingsCache, listingsTab);
});

// Delegated row actions
document.getElementById('my-listings-grid')?.addEventListener('click', async e => {
  // Edit
  const editBtn = e.target.closest('[data-listing-edit]');
  if (editBtn) {
    const row = editBtn.closest('[data-listing-id]');
    openListingModal({
      listingId: row.dataset.listingId,
      itemName:  row.dataset.itemName,
      imageUrl:  row.dataset.imageUrl,
      availQty:  parseInt(row.dataset.availQty),
      quantity:  parseInt(row.dataset.quantity),
      note:      row.dataset.note,
    });
    return;
  }

  // Archive
  const archiveBtn = e.target.closest('[data-listing-archive]');
  if (archiveBtn) {
    const listingId = archiveBtn.dataset.listingArchive;
    archiveBtn.textContent = '…'; archiveBtn.disabled = true;
    const ok = await archiveListing(listingId);
    if (ok) { showToast('Listing archived.'); loadListingsPage(); loadDashboardListingsPreview(); }
    else { archiveBtn.textContent = 'Archive'; archiveBtn.disabled = false; }
  }
});

async function createListingFromInventory(payload) {
  // payload: { p_inventory_id, p_quantity, p_note }
  const { error } = await supabase.rpc('create_listing_from_inventory', payload);
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function updateListing(payload) {
  // payload: { p_listing_id, p_quantity, p_note, p_status }
  const { error } = await supabase.rpc('update_listing', payload);
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function archiveListing(listingId) {
  const { error } = await supabase.rpc('archive_listing', { p_listing_id: listingId });
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

// ── Listing modal wiring ─────────────────────────────────────
const listingModal = document.getElementById('listing-modal');

function openListingModal({ listingId, itemName, imageUrl, availQty, quantity, note }) {
  document.getElementById('listing-modal-title').textContent = 'Edit Listing';
  document.getElementById('listing-modal-item-name').textContent = itemName || '—';
  document.getElementById('listing-modal-avail').textContent   = availQty ?? '—';
  document.getElementById('listing-qty').value  = quantity ?? 1;
  document.getElementById('listing-qty').max    = availQty ?? 9999;
  document.getElementById('listing-note').value = note || '';
  document.getElementById('listing-qty-hint').textContent =
    availQty ? `Max ${availQty} (your available inventory)` : '';

  const thumb = document.getElementById('listing-modal-thumb');
  thumb.innerHTML = imageUrl
    ? `<img src="${escHtml(imageUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />`
    : `<span class="item-img-fallback">📋</span>`;

  listingModal.dataset.listingId = listingId;
  listingModal.dataset.availQty  = availQty ?? 9999;
  listingModal.classList.remove('hidden');
}

function closeListingModal() {
  listingModal.classList.add('hidden');
  delete listingModal.dataset.listingId;
  delete listingModal.dataset.availQty;
  document.getElementById('listing-qty').value  = 1;
  document.getElementById('listing-note').value = '';
  document.getElementById('listing-qty-hint').textContent = '';
}

document.getElementById('close-listing-modal').addEventListener('click', closeListingModal);
document.getElementById('cancel-listing').addEventListener('click', closeListingModal);
listingModal.addEventListener('click', e => { if (e.target === listingModal) closeListingModal(); });

// Qty stepper
document.getElementById('listing-qty-dec').addEventListener('click', () => {
  const el = document.getElementById('listing-qty');
  el.value = Math.max(1, (parseInt(el.value) || 1) - 1);
});
document.getElementById('listing-qty-inc').addEventListener('click', () => {
  const el  = document.getElementById('listing-qty');
  const max = parseInt(listingModal.dataset.availQty) || 9999;
  el.value  = Math.min(max, (parseInt(el.value) || 1) + 1);
});

// Clamp on manual input
document.getElementById('listing-qty').addEventListener('change', () => {
  const el  = document.getElementById('listing-qty');
  const max = parseInt(listingModal.dataset.availQty) || 9999;
  el.value  = Math.min(max, Math.max(1, parseInt(el.value) || 1));
});

// Save
document.getElementById('save-listing').addEventListener('click', async () => {
  const listingId = listingModal.dataset.listingId;
  const qty       = parseInt(document.getElementById('listing-qty').value) || 1;
  const max       = parseInt(listingModal.dataset.availQty) || 9999;
  const note      = document.getElementById('listing-note').value.trim();

  if (qty > max) { showToast(`Quantity can't exceed available inventory (${max}).`); return; }

  const btn = document.getElementById('save-listing');
  btn.textContent = 'Saving…'; btn.disabled = true;

  const ok = await updateListing({
    p_listing_id: listingId,
    p_quantity:   qty,
    p_note:       note || null,
    p_status:     'active',
  });

  btn.textContent = 'Save Changes'; btn.disabled = false;
  if (!ok) return;
  closeListingModal();
  showToast('Listing updated! 📋');
  loadListingsPage();
  loadDashboardListingsPreview();
});

// Wire nav-list-btn to go to listings page for approved traders
document.getElementById('nav-list-btn')?.addEventListener('click', () => showPage('listings'));

// ── Offers Page ──────────────────────────────────────────────
let offersCache     = [];   // all offers for current trader
let offersActiveTab = 'incoming';

// ── Offer direction helpers (use is_incoming from get_my_offers) ─
function isCompletedOffer(row) {
  return String(row?.status || '').toLowerCase() === 'completed';
}

// is_incoming = true means the current trader is the seller (offer received)
function isReceivedOffer(row) {
  if (typeof row?.is_incoming === 'boolean') return row.is_incoming === true;
  if (row?.is_received === true) return true;
  if (row?.received === true) return true;
  if (row?.role === 'received' || row?.direction === 'received' || row?.bucket === 'received') return true;
  return false;
}

function isSentOffer(row) {
  if (typeof row?.is_incoming === 'boolean') return row.is_incoming === false;
  if (row?.is_sent === true) return true;
  if (row?.sent === true) return true;
  if (row?.role === 'sent' || row?.direction === 'sent' || row?.bucket === 'sent') return true;
  return false;
}

async function loadOffersPage() {
  if (appStatus !== 'approved') return;

  const grid   = document.getElementById('offers-grid');
  const tabBar = document.getElementById('offers-tabs');

  if (!grid) return;

  grid.innerHTML = '<div class="dash-loading">Loading offers…</div>';

  const { data, error } = await supabase.rpc('get_my_offers');

  if (error || !data) {
    const msg = error ? escHtml(error.message) : 'No data';
    grid.innerHTML = `<p class="muted">Error: ${msg}</p>`;
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  offersCache = rows;

  completedTradesCache = rows.filter(isCompletedOffer);
  receivedOffersCache  = rows.filter(r => !isCompletedOffer(r) && isReceivedOffer(r));
  sentOffersCache      = rows.filter(r => !isCompletedOffer(r) && !isReceivedOffer(r));

  renderOffersTab();

  if (tabBar && !tabBar.dataset.wired) {
    tabBar.dataset.wired = '1';
    tabBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-offers-tab]');
      if (!btn) return;
      offersActiveTab = btn.dataset.offersTab;
      tabBar.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderOffersTab();
    });
  }

  if (!grid.dataset.wired) {
    grid.dataset.wired = '1';
    grid.addEventListener('click', async e => {
      const viewBtn    = e.target.closest('[data-view-offer]');
      const acceptBtn  = e.target.closest('[data-accept-offer]');
      const declineBtn = e.target.closest('[data-decline-offer]');
      const cancelBtn  = e.target.closest('[data-cancel-offer]');

      if (viewBtn)    { openOfferDetailModal(viewBtn.dataset.viewOffer); return; }
      if (acceptBtn)  { await respondToOffer(acceptBtn.dataset.acceptOffer, 'accept'); return; }
      if (declineBtn) { await respondToOffer(declineBtn.dataset.declineOffer, 'decline'); return; }
      if (cancelBtn)  { await respondToOffer(cancelBtn.dataset.cancelOffer, 'cancel'); }
    });
  }
}

function renderOffersTab() {
  const grid = document.getElementById('offers-grid');
  if (!grid) return;

  const tab = offersActiveTab || 'incoming';

  const filtered = offersCache.filter(o => {
    const status = String(o.status || '').toLowerCase();
    if (tab === 'completed') return status === 'completed';
    if (tab === 'incoming')  return o.is_incoming && status !== 'completed';
    if (tab === 'outgoing')  return !o.is_incoming && status !== 'completed';
    return false;
  });

  if (!filtered.length) {
    const emptyText = {
      incoming:  '📭 No incoming offers yet.',
      outgoing:  '📤 You haven\'t made any offers yet.',
      completed: '✅ No completed trades yet.',
    }[tab] || 'Nothing here yet.';
    grid.innerHTML = `<div class="offers-empty">${emptyText}</div>`;
    return;
  }

  grid.innerHTML = filtered.map(o => {
    const status = String(o.status || '').toLowerCase();

    const thumb = o.listing_image_url
      ? `<img src="${escHtml(o.listing_image_url)}" alt="" class="listing-row-img" loading="lazy" />`
      : `<div class="listing-row-img listing-row-img-placeholder">🎀</div>`;

    const statusClass = {
      pending:   'status-active',
      accepted:  'status-accepted',
      declined:  'status-declined',
      cancelled: 'status-archived',
      completed: 'status-accepted',
    }[status] || 'status-active';

    const isPending   = status === 'pending';
    const isCompleted = status === 'completed';

    let actions = '';
    if (isPending && o.is_incoming) {
      actions = `
        <button class="action-btn confirm-btn" data-accept-offer="${o.id}">✓ Accept</button>
        <button class="action-btn danger-btn"  data-decline-offer="${o.id}">✕ Decline</button>`;
    } else if (isPending && !o.is_incoming) {
      actions = `<button class="action-btn danger-btn" data-cancel-offer="${o.id}">Cancel Offer</button>`;
    }

    let traderLabel = '';
    if (tab === 'incoming') {
      traderLabel = `From <strong>${escHtml(o.offerer_name || 'Trader')}</strong>`;
    } else if (tab === 'outgoing') {
      traderLabel = `To listing by <strong>${escHtml(o.listing_trader_name || 'Trader')}</strong>`;
    } else if (tab === 'completed') {
      traderLabel = o.is_incoming
        ? `Completed with <strong>${escHtml(o.offerer_name || 'Trader')}</strong>`
        : `Completed with <strong>${escHtml(o.listing_trader_name || 'Trader')}</strong>`;
    }

    const itemsPreview = (o.offer_items || []).map(i => escHtml(i.item_name)).slice(0, 3).join(', ');
    const extraCount   = (o.offer_items || []).length > 3 ? ` +${o.offer_items.length - 3} more` : '';

    return `
      <div class="listing-row" data-offer-id="${o.id}">
        ${thumb}
        <div class="listing-row-body">
          <div class="listing-row-name">${escHtml(o.listing_item_name || '—')}</div>
          <div class="listing-row-meta">${traderLabel} &middot; Qty ${o.quantity ?? '—'}</div>
          <div class="listing-row-meta offer-items-preview">${itemsPreview}${extraCount}</div>
          ${isCompleted && o.completed_at
            ? `<div class="listing-row-meta">Completed ${formatDate(o.completed_at)}</div>`
            : ''}
        </div>
        <div class="listing-row-right">
          <span class="listing-status-badge ${statusClass}">${cap(status)}</span>
          <div class="listing-row-actions">
            <button class="action-btn" data-view-offer="${o.id}">View</button>
            ${actions}
          </div>
        </div>
      </div>`;
  }).join('');
}

function openOfferDetailModal(offerId) {
  const o = offersCache.find(x => String(x.id) === String(offerId));
  if (!o) return;

  const modal = document.getElementById('offer-detail-modal');

  document.getElementById('offer-detail-title').textContent =
    o.is_incoming ? `Offer from ${o.offerer_name || 'Trader'}` : `Your Offer`;

  // Listing thumb
  const thumb = document.getElementById('offer-detail-listing-thumb');
  thumb.innerHTML = o.listing_image_url
    ? `<img src="${escHtml(o.listing_image_url)}" alt="" class="listing-row-img" loading="lazy" />`
    : `<div class="listing-row-img listing-row-img-placeholder">🎀</div>`;
  document.getElementById('offer-detail-listing-name').textContent = o.listing_item_name || '—';
  document.getElementById('offer-detail-listing-qty').textContent  = `Qty requested: ${o.quantity ?? '—'}`;

  // Offer items
  const itemsEl = document.getElementById('offer-detail-items');
  itemsEl.innerHTML = (o.offer_items || []).length
    ? (o.offer_items).map(i => `
        <div class="offer-detail-item">
          ${ i.image_url ? `<img src="${escHtml(i.image_url)}" alt="" class="offer-item-thumb" loading="lazy" />` : `<div class="offer-item-thumb offer-item-thumb-ph">🎀</div>` }
          <span>${escHtml(i.item_name)} &times;${i.quantity ?? 1}</span>
        </div>`).join('')
    : '<p class="muted">No items attached.</p>';

  // Note
  const noteWrap = document.getElementById('offer-detail-note-wrap');
  if (o.note) {
    noteWrap.style.display = '';
    document.getElementById('offer-detail-note').textContent = o.note;
  } else {
    noteWrap.style.display = 'none';
  }

  // Status
  const statusClass = {
    pending:  'status-active',
    accepted: 'status-accepted',
    declined: 'status-declined',
    cancelled:'status-archived',
    completed:'status-accepted',
  }[o.status] || 'status-active';
  const badge = document.getElementById('offer-detail-status');
  badge.textContent = cap(o.status);
  badge.className = `offer-status-badge ${statusClass}`;

  // Actions
  const actionsEl = document.getElementById('offer-detail-actions');
  const isPending = o.status === 'pending';
  if (isPending && o.is_incoming) {
    actionsEl.innerHTML = `
      <button class="secondary-btn" id="od-decline">Decline</button>
      <button class="primary-btn"   id="od-accept">Accept Offer</button>`;
    actionsEl.querySelector('#od-accept').onclick  = async () => { modal.classList.add('hidden'); await respondToOffer(o.id, 'accept'); };
    actionsEl.querySelector('#od-decline').onclick = async () => { modal.classList.add('hidden'); await respondToOffer(o.id, 'decline'); };
  } else if (isPending && !o.is_incoming) {
    actionsEl.innerHTML = `<button class="secondary-btn" id="od-cancel">Cancel Offer</button>`;
    actionsEl.querySelector('#od-cancel').onclick = async () => { modal.classList.add('hidden'); await respondToOffer(o.id, 'cancel'); };
  } else {
    actionsEl.innerHTML = `<button class="secondary-btn" id="od-close">Close</button>`;
    actionsEl.querySelector('#od-close').onclick = () => modal.classList.add('hidden');
  }

  modal.classList.remove('hidden');
}

async function respondToOffer(offerId, action) {
  if (action === 'accept')  await acceptOffer(offerId);
  if (action === 'decline') await declineOffer(offerId, null);
  if (action === 'cancel')  await cancelOffer(offerId);
}

// Wire offer-detail-modal close
const offerDetailModal = document.getElementById('offer-detail-modal');
document.getElementById('close-offer-detail').addEventListener('click', () => offerDetailModal.classList.add('hidden'));
offerDetailModal.addEventListener('click', e => { if (e.target === offerDetailModal) offerDetailModal.classList.add('hidden'); });

async function loadDashboardRewards() {
  const card = document.getElementById('dashboard-rewards-card');
  if (!card || appStatus !== 'approved') return;

  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const { data, error } = await supabase.rpc('get_my_monthly_rewards', { p_month: month });

  if (error || !data) {
    card.innerHTML = `<p class="muted">Could not load rewards. ${error ? error.message : ''}</p>`;
    return;
  }

  const drawDate  = data.draw_date  ? formatDate(data.draw_date)  : '—';
  const milestone = data.next_milestone ?? '—';
  const prize     = data.prize_label  || 'Monthly SSR Prize';

  card.innerHTML = `
    <div class="rewards-grid">
      <div class="rewards-stat">
        <span class="rewards-val" id="rewards-ticket-count">${data.ticket_count ?? 0}</span>
        <span class="rewards-key">🎟️ Tickets</span>
      </div>
      <div class="rewards-stat">
        <span class="rewards-val" id="rewards-stamp-count">${data.stamp_count ?? 0}</span>
        <span class="rewards-key">📮 Stamps</span>
      </div>
      <div class="rewards-stat">
        <span class="rewards-val" id="rewards-next-milestone">${milestone}</span>
        <span class="rewards-key">Next Milestone</span>
      </div>
    </div>
    <div class="rewards-footer">
      <span class="rewards-prize" id="rewards-prize-label">🏆 ${escHtml(prize)}</span>
      <span class="rewards-draw" id="rewards-draw-date">Draw: ${drawDate}</span>
    </div>
  `;
}

async function loadDashboardListingsPreview() {
  const container = document.getElementById('dashboard-my-listings-preview');
  if (!container || appStatus !== 'approved') return;

  const { data, error } = await supabase.rpc('get_my_listings');

  if (error) {
    container.innerHTML = `<p class="muted">Could not load listings. ${error.message}</p>`;
    return;
  }
  if (!data || !data.length) {
    container.innerHTML = `<div class="dash-empty">No active listings yet. <button class="text-btn" id="dash-create-listing-btn">Create one →</button></div>`;
    return;
  }

  const preview = data.slice(0, 6);
  container.innerHTML = preview.map(l => {
    const statusClass = (l.status || 'active').toLowerCase();
    return `
      <div class="listing-row-item" data-listing-id="${l.id}">
        <div class="listing-row-thumb">
          ${l.image_url
            ? `<img src="${escHtml(l.image_url)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
            : `<span class="item-img-fallback">🎀</span>`}
        </div>
        <div class="listing-row-info">
          <span class="listing-row-name">${escHtml(l.item_name || '—')}</span>
          <span class="listing-row-meta">Qty: ${l.quantity ?? 1}</span>
        </div>
        <div class="listing-row-end">
          <span class="status-chip status-${statusClass}">${cap(statusClass)}</span>
          <div class="listing-row-actions">
            <button class="text-btn" data-edit-listing="${l.id}">Edit</button>
            <button class="text-btn danger" data-archive-listing="${l.id}">Archive</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Quick-action handlers (archive only — edit is a future modal)
  container.addEventListener('click', async e => {
    const archiveBtn = e.target.closest('[data-archive-listing]');
    if (!archiveBtn) return;
    const listingId = archiveBtn.dataset.archiveListing;
    archiveBtn.textContent = '…'; archiveBtn.disabled = true;
    const { error } = await supabase
      .from('listings')
      .update({ status: 'archived' })
      .eq('id', listingId);
    if (error) { showToast('Error: ' + error.message); archiveBtn.textContent = 'Archive'; archiveBtn.disabled = false; return; }
    showToast('Listing archived.');
    loadDashboardListingsPreview();
  }, { once: true });
}

async function loadWishlistMatchesPreview() {
  const container = document.getElementById('dashboard-wishlist-matches');
  if (!container || appStatus !== 'approved') return;

  const { data, error } = await supabase.rpc('get_matches_for_my_wishlist');

  if (error) {
    container.innerHTML = `<p class="muted">Could not load matches. ${error.message}</p>`;
    return;
  }
  if (!data || !data.length) {
    container.innerHTML = `<div class="dash-empty">No matches yet — add items to your <button class="text-btn" data-page="wishlist">Wishlist</button>.</div>`;
    return;
  }

  container.innerHTML = data.slice(0, 6).map(m => `
    <div class="match-row">
      <div class="match-item-info">
        <span class="match-item-name">${escHtml(m.item_name || '—')}</span>
        <span class="match-item-tier tier-badge ${(m.tier || '').toLowerCase().replace(/[^a-z]/g, '')}">${m.tier || ''}</span>
      </div>
      <div class="match-trader-info">
        <span class="match-trader">${escHtml(m.trader_name || '—')}</span>
        <span class="match-qty">Qty: ${m.quantity ?? 1}</span>
      </div>
      <div class="match-actions">
        <button class="primary-btn small-btn" data-open-offer="${m.listing_id}">Make Offer</button>
      </div>
    </div>
  `).join('');
}

// ── Featured Bags — live from DB via RPC ─────────────────────
async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  // keep pre-rendered HTML as fallback; only replace once data arrives
  const { data, error } = await supabase.rpc('get_featured_items');
  if (error || !data || !data.length) return; // keep pre-rendered fallback

  grid.innerHTML = '';
  data.forEach(item => {
    const tierClass   = (item.item_tier || '').toLowerCase().replace(/[^a-z]/g, '');
    const demandClass = (item.demand || '').toLowerCase().includes('high') ? 'high'
                      : (item.demand || '').toLowerCase().includes('low')  ? 'low' : 'medium';

    const card = document.createElement('div');
    card.className = 'featured-card';
    card.innerHTML = `
      <div class="featured-card-image">
        ${item.image_url
          ? `<img src="${item.image_url}" alt="${escHtml(item.item_name)}" loading="lazy" onerror="this.style.display='none'" />`
          : `<span class="featured-img-placeholder">🎀</span>`}
      </div>
      <div class="featured-card-body">
        <div class="featured-card-top">
          <span class="tier-badge ${tierClass}">${item.item_tier}</span>
          <span class="chip demand ${demandClass}">${cap(item.demand)} Demand</span>
        </div>
        <h3 class="featured-card-name">${escHtml(item.item_name)}</h3>
        ${item.description ? `<p class="featured-card-desc">${escHtml(item.description)}</p>` : ''}
        <div class="featured-card-footer">
          <span class="featured-listings">${item.listing_count} listing${item.listing_count !== 1 ? 's' : ''}</span>
          <span class="featured-value">Value: ${item.value || 0}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── Auth Modal ───────────────────────────────────────────────
const authModal = document.getElementById('auth-modal');

document.getElementById('nav-join-btn').addEventListener('click', () => authModal.classList.remove('hidden'));
document.getElementById('close-auth-modal').addEventListener('click', () => authModal.classList.add('hidden'));
authModal.addEventListener('click', e => { if (e.target === authModal) authModal.classList.add('hidden'); });

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isSignup = tab.dataset.tab === 'signup';
    document.getElementById('auth-signup-form').classList.toggle('hidden', !isSignup);
    document.getElementById('auth-login-form').classList.toggle('hidden', isSignup);
    document.getElementById('auth-modal-title').textContent = isSignup ? 'Join HKDV' : 'Welcome Back';
  });
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const displayName = document.getElementById('su-display-name').value.trim();
  const email       = document.getElementById('su-email').value.trim();
  const password    = document.getElementById('su-password').value;
  const note        = document.getElementById('su-note').value.trim();
  const errBox      = document.getElementById('auth-error');
  errBox.classList.add('hidden');

  if (!displayName || !email || !password || !note) { showAuthError(errBox, 'Please fill in all fields.'); return; }
  if (password.length < 8) { showAuthError(errBox, 'Password must be at least 8 characters.'); return; }

  const btn = document.getElementById('btn-signup');
  btn.textContent = 'Submitting…'; btn.disabled = true;

  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName, application_note: note } }
  });

  btn.textContent = 'Apply for Access'; btn.disabled = false;
  if (error) { showAuthError(errBox, error.message); return; }

  authModal.classList.add('hidden');
  await resolveTraderStatus();
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('li-email').value.trim();
  const password = document.getElementById('li-password').value;
  const errBox   = document.getElementById('login-error');
  errBox.classList.add('hidden');

  const btn = document.getElementById('btn-login');
  btn.textContent = 'Logging in…'; btn.disabled = true;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  btn.textContent = 'Log In'; btn.disabled = false;

  if (error) { showAuthError(errBox, error.message); return; }
  currentSession = data.session;
  authModal.classList.add('hidden');
  await resolveTraderStatus();
});

function showAuthError(box, msg) { box.textContent = msg; box.classList.remove('hidden'); }

document.getElementById('pending-logout').addEventListener('click', async () => {
  await supabase.auth.signOut(); currentSession = null; currentTrader = null;
  setAppStatus('unauthenticated');
});
document.getElementById('rejected-logout').addEventListener('click', async () => {
  await supabase.auth.signOut(); currentSession = null; currentTrader = null;
  setAppStatus('unauthenticated');
});

// ── Admin Queue Panel ─────────────────────────────────────────
// ── Admin Panel ───────────────────────────────────────────────
const adminModal = document.getElementById('admin-modal');
let adminActiveTab = 'approvals';

document.getElementById('open-admin-queue').addEventListener('click', () => {
  adminModal.classList.remove('hidden');
  switchAdminTab('approvals');
});
document.getElementById('close-admin-modal').addEventListener('click', () => adminModal.classList.add('hidden'));
adminModal.addEventListener('click', e => { if (e.target === adminModal) adminModal.classList.add('hidden'); });

// Tab switcher
document.getElementById('admin-tabs').addEventListener('click', e => {
  const btn = e.target.closest('[data-admin-tab]');
  if (!btn) return;
  switchAdminTab(btn.dataset.adminTab);
});

function switchAdminTab(tab) {
  adminActiveTab = tab;
  document.querySelectorAll('#admin-tabs .tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.adminTab === tab)
  );
  document.querySelectorAll('.admin-tab-body').forEach(el =>
    el.classList.toggle('hidden', el.id !== 'admin-tab-' + tab)
  );
  if (tab === 'approvals') loadPendingQueue();
  if (tab === 'featured')  loadFeaturedAdmin();
  if (tab === 'disputes')  loadDisputesAdmin();
  if (tab === 'giveaway')  loadGiveawayAdmin();
}

// ── Tab: Approvals (unchanged) ─────────────────────────────
async function loadPendingQueue() {
  const list = document.getElementById('admin-queue-list');
  list.innerHTML = '<div class="queue-empty">Loading…</div>';
  const { data, error } = await supabase.rpc('get_pending_traders');
  if (error) { list.innerHTML = `<div class="queue-empty">Error: ${error.message}</div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="queue-empty">🎉 No pending applications.</div>'; return; }
  list.innerHTML = '';
  data.forEach(t => {
    const card = document.createElement('div');
    card.className = 'queue-card'; card.dataset.id = t.trader_id;
    card.innerHTML = `
      <div class="queue-card-top">
        <div>
          <div class="queue-name">${escHtml(t.display_name)}</div>
          <div class="queue-email">${escHtml(t.email)}</div>
          <div class="queue-date">Applied ${formatDate(t.applied_at)}</div>
        </div>
        <div class="queue-actions">
          <button class="approve-btn primary-btn small-btn" data-id="${t.trader_id}">Approve</button>
          <button class="reject-btn secondary-btn small-btn" data-id="${t.trader_id}">Reject</button>
        </div>
      </div>
      ${t.application_note
        ? `<div class="queue-note">“${escHtml(t.application_note)}”</div>`
        : '<div class="queue-note muted">No application note.</div>'}`;
    list.appendChild(card);
  });
}

document.getElementById('admin-queue-list').addEventListener('click', async e => {
  const approveBtn = e.target.closest('.approve-btn');
  const rejectBtn  = e.target.closest('.reject-btn');
  if (!approveBtn && !rejectBtn) return;
  const traderId = (approveBtn || rejectBtn).dataset.id;
  const rpcName  = approveBtn ? 'admin_approve_trader' : 'admin_reject_trader';
  const btn      = approveBtn || rejectBtn;
  btn.disabled = true; btn.textContent = '…';
  const { error } = await supabase.rpc(rpcName, { p_trader_id: traderId });
  if (error) { showToast(`Error: ${error.message}`); btn.disabled = false; btn.textContent = approveBtn ? 'Approve' : 'Reject'; return; }
  const card = document.querySelector(`.queue-card[data-id="${traderId}"]`);
  if (card) { card.classList.add('queue-card-done'); card.innerHTML = `<div class="queue-done-msg">${approveBtn ? '✅ Approved' : '❌ Rejected'}</div>`; setTimeout(() => card.remove(), 1800); }
  showToast(approveBtn ? 'Trader approved! 🎉' : 'Application rejected.');
});

// ── Tab: Featured Items ─────────────────────────────────
async function loadFeaturedAdmin() {
  const list = document.getElementById('admin-featured-list');
  list.innerHTML = '<div class="queue-empty">Loading…</div>';
  const { data, error } = await supabase.rpc('get_featured_items');
  if (error) { list.innerHTML = `<div class="queue-empty">Error: ${error.message}</div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="queue-empty">No featured items yet.</div>'; return; }
  list.innerHTML = data.map(f => `
    <div class="queue-card" style="gap:10px;">
      <div class="queue-card-top">
        <div style="display:flex;align-items:center;gap:10px;">
          ${ f.image_url ? `<img src="${escHtml(f.image_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;" />` : '' }
          <div>
            <div class="queue-name">${escHtml(f.name || f.item_id)}</div>
            <div class="queue-date">Order: ${f.display_order ?? '—'}</div>
          </div>
        </div>
        <div class="queue-actions">
          <button class="reject-btn secondary-btn small-btn" data-featured-remove data-item-id="${f.item_id}">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function saveFeaturedItem(itemId, displayOrder) {
  const { error } = await supabase.rpc('admin_upsert_featured_item', {
    p_item_id:      itemId,
    p_display_order: displayOrder,
    p_active:        true,
  });
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

// Featured form + search wiring
document.getElementById('add-featured-btn').addEventListener('click', () => {
  document.getElementById('admin-featured-form').classList.remove('hidden');
  document.getElementById('admin-featured-search').focus();
});
document.getElementById('cancel-featured-form').addEventListener('click', () =>
  document.getElementById('admin-featured-form').classList.add('hidden')
);
document.getElementById('save-featured-item').addEventListener('click', async () => {
  const itemId = document.getElementById('admin-featured-item-id').value;
  const order  = Number(document.getElementById('admin-featured-order').value) || 1;
  if (!itemId) { showToast('Select an item first.'); return; }
  const ok = await saveFeaturedItem(itemId, order);
  if (ok) {
    showToast('Featured item saved! ⭐');
    document.getElementById('admin-featured-form').classList.add('hidden');
    document.getElementById('admin-featured-item-id').value = '';
    document.getElementById('admin-featured-search').value  = '';
    await loadFeaturedAdmin();
    loadFeatured(); // refresh marketplace
  }
});

// Featured item search (reuse same debounce + supabase pattern as inventory)
let featuredSearchTimer;
document.getElementById('admin-featured-search').addEventListener('input', e => {
  clearTimeout(featuredSearchTimer);
  const q = e.target.value.trim();
  const results = document.getElementById('admin-featured-results');
  if (q.length < 2) { results.classList.add('hidden'); return; }
  featuredSearchTimer = setTimeout(async () => {
    const { data } = await supabase.from('items').select('id, name, tier').ilike('name', `%${q}%`).limit(8);
    if (!data || !data.length) { results.innerHTML = '<div class="inv-result-item">No results.</div>'; results.classList.remove('hidden'); return; }
    results.innerHTML = data.map(i =>
      `<div class="inv-result-item" data-id="${i.id}" data-name="${escHtml(i.name)}">${escHtml(i.name)} <span class="tier-badge ${i.tier?.toLowerCase()}">${i.tier}</span></div>`
    ).join('');
    results.classList.remove('hidden');
  }, 300);
});
document.getElementById('admin-featured-results').addEventListener('click', e => {
  const row = e.target.closest('.inv-result-item[data-id]');
  if (!row) return;
  document.getElementById('admin-featured-item-id').value = row.dataset.id;
  document.getElementById('admin-featured-search').value  = row.dataset.name;
  document.getElementById('admin-featured-results').classList.add('hidden');
});

// Remove featured
document.getElementById('admin-featured-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-featured-remove]');
  if (!btn) return;
  btn.disabled = true; btn.textContent = '…';
  const { error } = await supabase.rpc('admin_upsert_featured_item', {
    p_item_id: btn.dataset.itemId, p_display_order: 0, p_active: false,
  });
  if (error) { showToast('Error: ' + error.message); btn.disabled = false; btn.textContent = 'Remove'; return; }
  showToast('Removed from featured.');
  await loadFeaturedAdmin();
  loadFeatured();
});

// ── Tab: Disputes ───────────────────────────────────────
async function loadDisputesAdmin() {
  const list = document.getElementById('admin-disputes-list');
  list.innerHTML = '<div class="queue-empty">Loading…</div>';
  const { data, error } = await supabase.rpc('admin_get_disputes');
  if (error) { list.innerHTML = `<div class="queue-empty">Error: ${error.message}</div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="queue-empty">✅ No open disputes.</div>'; return; }
  list.innerHTML = data.map(d => `
    <div class="queue-card" data-dispute-id="${d.id}">
      <div class="queue-card-top">
        <div>
          <div class="queue-name">${escHtml(d.reporter_name || 'Trader')} vs ${escHtml(d.accused_name || 'Trader')}</div>
          <div class="queue-date">Trade: ${escHtml(d.item_name || '—')} · Opened ${formatDate(d.opened_at)}</div>
          ${ d.reason ? `<div class="queue-note">${escHtml(d.reason)}</div>` : '' }
        </div>
        <div class="queue-actions">
          <button class="approve-btn primary-btn small-btn" data-resolve-dispute="${d.id}" data-resolution="resolved">Resolve</button>
          <button class="reject-btn secondary-btn small-btn" data-resolve-dispute="${d.id}" data-resolution="dismissed">Dismiss</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function resolveDispute(disputeId, resolution, note) {
  const { error } = await supabase.rpc('admin_resolve_dispute', {
    p_dispute_id: disputeId,
    p_resolution: resolution,
    p_note:       note || null,
  });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast(`Dispute ${resolution}.`);
  await loadDisputesAdmin();
}

document.getElementById('admin-disputes-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-resolve-dispute]');
  if (!btn) return;
  btn.disabled = true; btn.textContent = '…';
  await resolveDispute(btn.dataset.resolveDispute, btn.dataset.resolution, null);
});

// ── Tab: Giveaway ───────────────────────────────────────
async function loadGiveawayAdmin() {
  const list = document.getElementById('admin-giveaway-list');
  list.innerHTML = '<div class="queue-empty">Loading…</div>';
  // Fetch recent giveaways from DB (month-keyed)
  const { data, error } = await supabase
    .from('monthly_giveaways')
    .select('id, month, prize_label, draw_date, winner_trader_id, status')
    .order('month', { ascending: false })
    .limit(12);
  if (error) { list.innerHTML = `<div class="queue-empty">Error: ${error.message}</div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="queue-empty">No giveaways yet.</div>'; return; }
  list.innerHTML = data.map(g => `
    <div class="queue-card" data-giveaway-id="${g.id}">
      <div class="queue-card-top">
        <div>
          <div class="queue-name">${escHtml(g.prize_label || 'Giveaway')}</div>
          <div class="queue-date">${escHtml(g.month)} · Draw: ${formatDate(g.draw_date)} · Status: ${escHtml(g.status || '—')}</div>
          ${ g.winner_trader_id ? `<div class="queue-note">Winner ID: ${g.winner_trader_id}</div>` : '' }
        </div>
        <div class="queue-actions">
          ${ g.status !== 'drawn' ? `<button class="approve-btn primary-btn small-btn" data-draw-giveaway="${g.id}">🎰 Draw</button>` : '<span class="muted">🎉 Drawn</span>' }
        </div>
      </div>
    </div>
  `).join('');
}

async function createMonthlyGiveaway(payload) {
  const { error } = await supabase.rpc('admin_create_monthly_giveaway', payload);
  if (error) { showToast('Error: ' + error.message); return false; }
  return true;
}

async function drawMonthlyGiveaway(giveawayId) {
  const { error } = await supabase.rpc('admin_draw_monthly_giveaway', { p_giveaway_id: giveawayId });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast('🎉 Winner drawn!');
  await loadGiveawayAdmin();
}

document.getElementById('create-giveaway-btn').addEventListener('click', () =>
  document.getElementById('admin-giveaway-form').classList.remove('hidden')
);
document.getElementById('cancel-giveaway-form').addEventListener('click', () =>
  document.getElementById('admin-giveaway-form').classList.add('hidden')
);
document.getElementById('save-giveaway').addEventListener('click', async () => {
  const label    = document.getElementById('giveaway-prize-label').value.trim();
  const month    = document.getElementById('giveaway-month').value;
  const drawDate = document.getElementById('giveaway-draw-date').value;
  if (!label || !month) { showToast('Prize label and month are required.'); return; }
  const ok = await createMonthlyGiveaway({ p_month: month, p_prize_label: label, p_draw_date: drawDate || null });
  if (ok) {
    showToast('Giveaway created! 🎉');
    document.getElementById('admin-giveaway-form').classList.add('hidden');
    await loadGiveawayAdmin();
  }
});

document.getElementById('admin-giveaway-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-draw-giveaway]');
  if (!btn) return;
  btn.disabled = true; btn.textContent = '…';
  await drawMonthlyGiveaway(btn.dataset.drawGiveaway);
});

// ── Item Detail Modal ────────────────────────────────────────
const itemModal       = document.getElementById('item-modal');
const itemModalName   = document.getElementById('item-modal-name');
const itemModalImage  = document.getElementById('item-modal-image');
const itemModalTier   = document.getElementById('item-modal-tier');
const itemModalRarity = document.getElementById('item-modal-rarity');
const itemModalDemand = document.getElementById('item-modal-demand');
const itemModalColl   = document.getElementById('item-modal-collection');
const itemModalValue  = document.getElementById('item-modal-value');
const itemModalBadges = document.getElementById('item-modal-badges');
const itemModalWiki   = document.getElementById('item-modal-wiki-link');
const itemModalOffer  = document.getElementById('item-modal-offer-btn');
let activeItemData    = null;

function openItemDetail(card) {
  const d = card.dataset;
  activeItemData = d;
  itemModalName.textContent   = d.name || '—';
  itemModalTier.textContent   = d.tier || '—';
  itemModalRarity.textContent = d.rarity || '—';
  itemModalDemand.textContent = d.demand ? d.demand + ' Demand' : '—';
  itemModalColl.textContent   = d.collection || '—';
  itemModalValue.textContent  = d.value ? `${d.value} pts` : '—';

  itemModalImage.innerHTML = d.image
    ? `<img src="${d.image}" alt="${escHtml(d.name)}" class="item-detail-img" onerror="this.outerHTML='<span class=item-image-placeholder>🎀</span>'" />`
    : `<span class="item-image-placeholder">🎀</span>`;

  const tierClass = (d.tier || '').toLowerCase().replace(/[^a-z]/g, '');
  const demClass  = (d.demand || '').toLowerCase().includes('high') ? 'high'
                  : (d.demand || '').toLowerCase().includes('low')  ? 'low' : 'medium';
  itemModalBadges.innerHTML = `
    <span class="tier-badge ${tierClass}">${d.tier || ''}</span>
    <span class="chip demand ${demClass}">${d.demand || ''} Demand</span>
    ${d.collection ? `<span class="chip collection">${escHtml(d.collection)}</span>` : ''}
  `;

  if (d.wiki) { itemModalWiki.href = d.wiki; itemModalWiki.style.display = 'block'; }
  else          { itemModalWiki.style.display = 'none'; }

  // Reset listings section then load
  const listingsEl = document.getElementById('item-modal-listings');
  if (listingsEl) listingsEl.innerHTML = '<div class="item-listings-loading">Loading listings…</div>';
  itemModalOffer.style.display = 'flex'; // restore in case previous item hid it
  if (d.itemId) loadItemListings(d.itemId);

  itemModal.classList.remove('hidden');
}

async function loadItemListings(itemId) {
  const el = document.getElementById('item-modal-listings');
  if (!el) return;

  const { data, error } = await supabase.rpc('get_listing_matches_for_item', { p_item_id: itemId });

  if (error) { el.innerHTML = `<p class="item-listings-empty">Could not load listings.</p>`; return; }
  if (!data || !data.length) { el.innerHTML = `<p class="item-listings-empty">No active listings for this item.</p>`; return; }

  // Hide the generic footer Make Offer btn — use per-row buttons instead
  itemModalOffer.style.display = 'none';

  const itemName = activeItemData?.name || 'Item';
  el.innerHTML = data.map(l => `
    <div class="item-listing-row">
      <div class="item-listing-trader">${escHtml(l.trader_name || 'Trader')}</div>
      <div class="item-listing-meta">
        <span>Qty: <strong>${l.quantity ?? '—'}</strong></span>
        ${ l.note ? `<span class="item-listing-note">· ${escHtml(l.note)}</span>` : '' }
      </div>
      <button class="action-btn" data-open-offer="${escHtml(String(l.listing_id))}" data-listing-label="${escHtml(itemName + ' (×' + (l.quantity ?? 1) + ') by ' + (l.trader_name || 'Trader'))}">Make Offer</button>
    </div>
  `).join('');
}

document.getElementById('close-item-modal').addEventListener('click', () => itemModal.classList.add('hidden'));
itemModal.addEventListener('click', e => { if (e.target === itemModal) itemModal.classList.add('hidden'); });
// "Make Offer" in item modal — only fires if a specific listing was clicked via item-modal-listings;
// otherwise this button is hidden (see loadItemListings: hide button when no listings)
itemModalOffer.addEventListener('click', () => {
  itemModal.classList.add('hidden');
  // If a listing row was targeted via data-active-listing-id on the button, use it
  const listingId = itemModalOffer.dataset.listingId || null;
  const label     = activeItemData ? (activeItemData.name || 'Item') : 'Item';
  if (listingId) openOfferModal(listingId, null, label);
});

document.addEventListener('click', e => {
  const thumb = e.target.closest('.clickable-thumb');
  if (thumb) { const card = thumb.closest('[data-item-id]'); if (card) openItemDetail(card); }
});

// ── Offer Modal (DB-backed draft) ────────────────────────────────
const offerModal  = document.getElementById('offer-modal');
const offerTarget = document.getElementById('offer-target');
const offerBox    = document.getElementById('offer-items');
const fairnessBox = document.getElementById('fairness');

let offerInventoryCache  = [];    // inventory rows fetched for this offer session
let offerItemsSelected   = {};    // inventoryId -> { offerItemId, itemName, quantity, value }

// Called from item-modal "Make Offer" btn OR from data-open-offer buttons in item-modal-listings
async function openOfferModal(listingId, recipientTraderId, listingLabel) {
  if (appStatus !== 'approved') { showToast('You need to be an approved trader to make offers.'); return; }

  // Reset UI immediately
  offerTarget.textContent   = listingLabel || '—';
  offerBox.innerHTML        = 'Select items below';
  offerBox.classList.add('empty');
  fairnessBox.textContent   = 'No items selected';
  fairnessBox.className     = 'fairness neutral';
  document.getElementById('offer-message').value = '';
  document.getElementById('submit-offer').disabled = true;
  document.getElementById('offer-inventory-choices').innerHTML = '<div class="item-listings-loading">Creating draft…</div>';

  offerItemsSelected = {};
  activeOfferId = null;

  offerModal.dataset.listingId   = listingId   || '';
  offerModal.dataset.recipientId = recipientTraderId || '';
  offerModal.classList.remove('hidden');

  // Create draft in DB
  const draft = await createOfferDraft(recipientTraderId, listingId);
  if (!draft) { offerModal.classList.add('hidden'); return; }
  activeOfferId = draft.offer_id;
  offerModal.dataset.offerId = activeOfferId;

  // Load trader inventory into picker
  await renderOfferInventoryPicker();
}

async function createOfferDraft(recipientTraderId, targetListingId) {
  const { data, error } = await supabase.rpc('create_offer_draft', {
    p_recipient_trader_id: recipientTraderId,
    p_target_listing_id:   targetListingId,
  });
  if (error) { showToast('Could not start offer: ' + error.message); return null; }
  return data; // { offer_id }
}

async function renderOfferInventoryPicker() {
  const grid = document.getElementById('offer-inventory-choices');
  // Re-use inventoryCache if already loaded, else fetch
  if (!inventoryCache.length) {
    const { data } = await supabase.rpc('get_my_inventory');
    inventoryCache = data || [];
  }
  offerInventoryCache = inventoryCache.filter(i => (i.available_quantity || 0) > 0);

  if (!offerInventoryCache.length) {
    grid.innerHTML = '<p class="item-listings-empty">No available items in inventory.</p>';
    return;
  }

  grid.innerHTML = offerInventoryCache.map(i => {
    const img = i.image_url
      ? `<img src="${escHtml(i.image_url)}" alt="" class="offer-inv-img" loading="lazy" onerror="this.outerHTML='<div class=offer-inv-img-ph>🎀</div>'" />`
      : `<div class="offer-inv-img offer-inv-img-ph">🎀</div>`;
    return `
    <div class="offer-inv-item" data-inv-id="${i.inventory_id}" data-item-name="${escHtml(i.item_name)}" data-avail="${i.available_quantity}" data-value="${i.projected_value || 0}">
      ${img}
      <div class="offer-inv-name">${escHtml(i.item_name)}</div>
      <div class="offer-inv-avail">Avail: ${i.available_quantity}</div>
      <div class="offer-inv-qty-row hidden">
        <button class="qty-btn offer-qty-dec">−</button>
        <input class="qty-input offer-qty-val" type="number" min="1" max="${i.available_quantity}" value="1" />
        <button class="qty-btn offer-qty-inc">+</button>
        <button class="action-btn confirm-btn offer-add-btn">Add</button>
        <button class="action-btn danger-btn offer-remove-btn hidden">Remove</button>
      </div>
    </div>`;
  }).join('');

  // Delegated events on grid (only wire once)
  if (!grid.dataset.wired) {
    grid.dataset.wired = '1';
    grid.addEventListener('click', async e => {
      const card    = e.target.closest('.offer-inv-item');
      if (!card) return;
      const invId   = card.dataset.invId;
      const avail   = Number(card.dataset.avail);
      const qtyRow  = card.querySelector('.offer-inv-qty-row');
      const qtyIn   = card.querySelector('.offer-qty-val');
      const addBtn  = card.querySelector('.offer-add-btn');
      const remBtn  = card.querySelector('.offer-remove-btn');
      const decBtn  = card.querySelector('.offer-qty-dec');
      const incBtn  = card.querySelector('.offer-qty-inc');

      // Toggle qty row open on card click (not on buttons)
      if (e.target === card || e.target.classList.contains('offer-inv-img') || e.target.classList.contains('offer-inv-name') || e.target.classList.contains('offer-inv-avail') || e.target.classList.contains('offer-inv-img-ph')) {
        qtyRow.classList.toggle('hidden');
        return;
      }

      if (e.target === decBtn) { qtyIn.value = Math.max(1, Number(qtyIn.value) - 1); return; }
      if (e.target === incBtn) { qtyIn.value = Math.min(avail, Number(qtyIn.value) + 1); return; }

      if (e.target === addBtn) {
        const qty = Math.min(avail, Math.max(1, Number(qtyIn.value)));
        await addInventoryItemToOffer(invId, qty, card);
        return;
      }
      if (e.target === remBtn) {
        await removeInventoryItemFromOffer(invId, card);
        return;
      }
    });
  }
}

async function addInventoryItemToOffer(inventoryId, quantity, card) {
  if (!activeOfferId) return;
  // If already added, remove first
  if (offerItemsSelected[inventoryId]) await removeInventoryItemFromOffer(inventoryId, card, true);

  const { data, error } = await supabase.rpc('add_offer_item', {
    p_offer_id:    activeOfferId,
    p_inventory_id: inventoryId,
    p_quantity:     quantity,
  });
  if (error) { showToast('Could not add item: ' + error.message); return; }

  const inv = offerInventoryCache.find(i => String(i.inventory_id) === String(inventoryId));
  offerItemsSelected[inventoryId] = {
    offerItemId: data.offer_item_id,
    itemName:    inv?.item_name || 'Item',
    quantity,
    value:       Number(inv?.projected_value || 0),
  };

  // Mark card as selected
  if (card) {
    card.classList.add('selected');
    card.querySelector('.offer-add-btn').textContent   = 'Update';
    card.querySelector('.offer-remove-btn').classList.remove('hidden');
  }

  updateOfferSummary();
  await refreshOfferFairness();
}

async function removeInventoryItemFromOffer(inventoryId, card, silent = false) {
  const sel = offerItemsSelected[inventoryId];
  if (!sel) return;

  const { error } = await supabase.rpc('remove_offer_item', { p_offer_item_id: sel.offerItemId });
  if (error && !silent) { showToast('Could not remove item: ' + error.message); return; }

  delete offerItemsSelected[inventoryId];
  if (card) {
    card.classList.remove('selected');
    card.querySelector('.offer-add-btn').textContent = 'Add';
    card.querySelector('.offer-remove-btn').classList.add('hidden');
  }

  updateOfferSummary();
  if (!silent) await refreshOfferFairness();
}

function updateOfferSummary() {
  const items = Object.values(offerItemsSelected);
  if (!items.length) {
    offerBox.innerHTML = 'Select items below';
    offerBox.classList.add('empty');
    document.getElementById('submit-offer').disabled = true;
    return;
  }
  offerBox.classList.remove('empty');
  offerBox.innerHTML = items.map(i =>
    `<span class="chip collection">${escHtml(i.itemName)} ×${i.quantity}</span>`
  ).join('');
  document.getElementById('submit-offer').disabled = false;
}

async function refreshOfferFairness() {
  if (!activeOfferId) return;
  const { data, error } = await supabase.rpc('evaluate_offer_fairness', { p_offer_id: activeOfferId });
  if (error || !data) return;
  // data: { band: 'under'|'fair'|'over', offer_value, listing_value }
  const band  = data.band  || 'neutral';
  const oVal  = data.offer_value   ?? '?';
  const lVal  = data.listing_value ?? '?';
  const labels = { under: `Underpay (${oVal} vs ${lVal})`, fair: `Fair (${oVal} vs ${lVal})`, over: `Overpay (${oVal} vs ${lVal})` };
  fairnessBox.textContent = labels[band] || 'Unknown';
  fairnessBox.className   = 'fairness ' + band;
}

async function submitOffer() {
  if (!activeOfferId) return;
  const msg = document.getElementById('offer-message').value.trim();
  if (msg) await supabase.rpc('set_offer_message', { p_offer_id: activeOfferId, p_message: msg });
  const { error } = await supabase.rpc('submit_offer', { p_offer_id: activeOfferId });
  if (error) { showToast('Error sending offer: ' + error.message); return; }
  showToast('Offer sent! 🎉');
  offerModal.classList.add('hidden');
  resetOffer();
}

async function cancelOffer(offerId) {
  const { error } = await supabase.rpc('cancel_offer', { p_offer_id: offerId });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast('Offer cancelled.');
  await loadOffersPage();
}

async function acceptOffer(offerId) {
  const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast('Offer accepted 🎉');
  await loadOffersPage();
}

async function declineOffer(offerId, reason) {
  const { error } = await supabase.rpc('decline_offer', { p_offer_id: offerId, p_reason: reason || null });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast('Offer declined.');
  await loadOffersPage();
}

async function completeTrade(offerId) {
  const { error } = await supabase.rpc('mark_trade_completed', { p_offer_id: offerId });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast('Trade marked complete ✅');
  await loadOffersPage();
}

function resetOffer() {
  activeOfferId      = null;
  offerItemsSelected = {};
  offerInventoryCache = [];
  offerBox.innerHTML = 'Select items below'; offerBox.classList.add('empty');
  fairnessBox.textContent = 'No items selected'; fairnessBox.className = 'fairness neutral';
  document.getElementById('offer-message').value = '';
  document.getElementById('submit-offer').disabled = true;
  const grid = document.getElementById('offer-inventory-choices');
  if (grid) { grid.innerHTML = ''; delete grid.dataset.wired; }
}

// data-open-offer handler: listingId is the value
document.addEventListener('click', async e => {
  const openBtn = e.target.closest('[data-open-offer]');
  if (!openBtn) return;
  const listingId = openBtn.dataset.openOffer;
  if (!listingId) return;
  // Close item modal if open
  document.getElementById('item-modal').classList.add('hidden');
  // We need recipient trader id and label — fetch from listingsCache or offersCache
  // Fall back: open with listing id only; recipient resolved server-side in RPC
  await openOfferModal(listingId, null, openBtn.dataset.listingLabel || 'Listing #' + listingId);
});

document.getElementById('close-offer').addEventListener('click', () => { offerModal.classList.add('hidden'); resetOffer(); });
document.getElementById('cancel-offer').addEventListener('click', () => { offerModal.classList.add('hidden'); resetOffer(); });
document.getElementById('submit-offer').addEventListener('click', submitOffer);
offerModal.addEventListener('click', e => { if (e.target === offerModal) { offerModal.classList.add('hidden'); resetOffer(); } });

// ── Profile Modal ────────────────────────────────────────────
const profileModal = document.getElementById('profile-modal');
document.getElementById('open-profile').addEventListener('click', async () => {
  profileModal.classList.remove('hidden');
  await prefillProfileModal();
});

async function prefillProfileModal() {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error || !data) return; // silently skip — form stays blank
  document.getElementById('pf-display-name').value = data.display_name || '';
  document.getElementById('pf-bio').value          = data.bio          || '';
  document.getElementById('pf-buddy').value        = data.buddy        || '';
  document.getElementById('pf-title').value        = data.title        || '';
  const s = data.socials || {};
  document.getElementById('pf-discord').value   = s.discord   || '';
  document.getElementById('pf-twitter').value   = s.twitter   || '';
  document.getElementById('pf-instagram').value = s.instagram || '';
  document.getElementById('pf-youtube').value   = s.youtube   || '';
  document.getElementById('pf-tiktok').value    = s.tiktok    || '';
}
document.getElementById('close-profile-modal').addEventListener('click', () => profileModal.classList.add('hidden'));
document.getElementById('cancel-profile').addEventListener('click', () => profileModal.classList.add('hidden'));
profileModal.addEventListener('click', e => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

document.getElementById('save-profile').addEventListener('click', async () => {
  const profile = {
    display_name: document.getElementById('pf-display-name').value.trim() || null,
    bio:          document.getElementById('pf-bio').value.trim()          || null,
    buddy:        document.getElementById('pf-buddy').value.trim()        || null,
    title:        document.getElementById('pf-title').value.trim()        || null,
    p_socials: {
      discord:   document.getElementById('pf-discord').value.trim()   || null,
      twitter:   document.getElementById('pf-twitter').value.trim()   || null,
      instagram: document.getElementById('pf-instagram').value.trim() || null,
      youtube:   document.getElementById('pf-youtube').value.trim()   || null,
      tiktok:    document.getElementById('pf-tiktok').value.trim()    || null,
    },
  };
  const { error } = await supabase.rpc('upsert_my_trader_profile', profile);
  if (error) { showToast('Error saving profile: ' + error.message); return; }
  profileModal.classList.add('hidden');
  showToast('Profile saved! 🌸');
});

// ── PayPal Support Widget ─────────────────────────────────────
const supportFab   = document.getElementById('support-fab');
const supportPopup = document.getElementById('support-popup');
supportFab.addEventListener('click', () => supportPopup.classList.toggle('hidden'));
document.getElementById('close-support').addEventListener('click', e => { e.stopPropagation(); supportPopup.classList.add('hidden'); });

// ── Helpers ───────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('hkdv-toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'hkdv-toast'; toast.className = 'hkdv-toast'; document.body.appendChild(toast); }
  toast.textContent = msg; toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}
function cap(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }); }

// ── Trader action handlers ────────────────────────────────────
document.addEventListener('click', async e => {
  const removeInventoryBtn = e.target.closest('[data-remove-inventory]');
  if (removeInventoryBtn) {
    const inventoryId = removeInventoryBtn.dataset.removeInventory;
    const { error } = await supabase.rpc('remove_inventory_item', {
      p_inventory_id: inventoryId
    });
    if (error) {
      showToast('Error removing inventory: ' + error.message);
    } else {
      showToast('Inventory item removed');
      await loadInventoryPage();
    }
    return;
  }

  const listFromInventoryBtn = e.target.closest('[data-list-from-inventory]');
  if (listFromInventoryBtn) {
    const inventoryId = listFromInventoryBtn.dataset.listFromInventory;
    const { error } = await supabase.rpc('create_listing_from_inventory', {
      p_inventory_id: inventoryId,
      p_quantity: 1,
      p_note: null
    });
    if (error) {
      showToast('Error creating listing: ' + error.message);
    } else {
      showToast('Listing created');
      await loadInventoryPage();
      await loadListingsPage();
    }
    return;
  }

  const removeWishlistBtn = e.target.closest('[data-remove-wishlist]');
  if (removeWishlistBtn) {
    const itemId = removeWishlistBtn.dataset.removeWishlist;
    const { error } = await supabase.rpc('remove_wishlist_item', {
      p_item_id: itemId
    });
    if (error) {
      showToast('Error removing wishlist item: ' + error.message);
    } else {
      showToast('Wishlist item removed');
      await loadWishlistPage();
    }
    return;
  }

  const archiveListingBtn = e.target.closest('[data-archive-listing]');
  if (archiveListingBtn && !archiveListingBtn.closest('#my-listings-grid')) {
    // scoped handler on #my-listings-grid already covers that page;
    // this fallback handles archive buttons rendered by renderListingCard elsewhere
    const listingId = archiveListingBtn.dataset.archiveListing;
    const { error } = await supabase.rpc('archive_listing', {
      p_listing_id: listingId
    });
    if (error) {
      showToast('Error archiving listing: ' + error.message);
    } else {
      showToast('Listing archived');
      await loadListingsPage();
    }
    return;
  }

  const acceptOfferBtn = e.target.closest('[data-accept-offer]');
  if (acceptOfferBtn && !acceptOfferBtn.closest('#offers-grid')) {
    // scoped handler on #offers-grid already covers the offers page;
    // this fallback handles accept buttons rendered by renderReceivedOffers elsewhere
    const offerId = acceptOfferBtn.dataset.acceptOffer;
    const { error } = await supabase.rpc('accept_offer', {
      p_offer_id: offerId
    });
    if (error) {
      showToast('Error accepting offer: ' + error.message);
    } else {
      showToast('Offer accepted');
      await loadOffersPage();
    }
    return;
  }

  const declineOfferBtn = e.target.closest('[data-decline-offer]');
  if (declineOfferBtn && !declineOfferBtn.closest('#offers-grid')) {
    // same scoping — fallback only
    const offerId = declineOfferBtn.dataset.declineOffer;
    const { error } = await supabase.rpc('decline_offer', {
      p_offer_id: offerId,
      p_reason: 'Declined by trader'
    });
    if (error) {
      showToast('Error declining offer: ' + error.message);
    } else {
      showToast('Offer declined');
      await loadOffersPage();
    }
    return;
  }
});

// ── Boot ──────────────────────────────────────────────────────
bootAuth();
