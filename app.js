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

async function bootAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { setAppStatus('unauthenticated'); return; }
  currentSession = session;
  await resolveTraderStatus();
}

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

  appShell.classList.remove('hidden');
  pendingScr.classList.add('hidden');
  rejectedScr.classList.add('hidden');

  if (status === 'unauthenticated') {
    joinBtn.classList.remove('hidden');
    profileBtn.classList.add('hidden');
    listBtn.classList.add('hidden');
    adminBtn.classList.add('hidden');
    showPage('dashboard');
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
    if (currentTrader && currentTrader.is_admin) adminBtn.classList.remove('hidden');
    showPage('dashboard');
  }
}

// ── SPA Navigation ───────────────────────────────────────────
const pages    = document.querySelectorAll('.page-shell');
const navLinks = document.querySelectorAll('.nav-links a');

function showPage(id) {
  pages.forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.remove('hidden');
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.page === id));
  if (id === 'dashboard') { loadFeatured(); loadDashboardItems(); }
}

navLinks.forEach(a => a.addEventListener('click', () => showPage(a.dataset.page)));

// ── Dashboard Items — live from DB ───────────────────────────
async function loadDashboardItems() {
  const grid = document.getElementById('dashboard-item-grid');
  if (!grid) return;

  // Show skeletons while loading
  grid.innerHTML = Array(6).fill('<div class="item-card skeleton-card" style="min-height:260px;"></div>').join('');

  const { data, error } = await supabase
    .from('items')
    .select('id, name, tier, wiki_rarity, collection_name, demand_level, image_url, wiki_page_url, projected_value, community_value')
    .limit(6);

  if (error || !data || !data.length) {
    grid.innerHTML = '<p class="muted">Could not load items.</p>';
    return;
  }

  grid.innerHTML = '';
  data.forEach(item => renderItemCard(grid, item));
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
const adminModal = document.getElementById('admin-modal');

document.getElementById('open-admin-queue').addEventListener('click', async () => {
  adminModal.classList.remove('hidden'); await loadPendingQueue();
});
document.getElementById('close-admin-modal').addEventListener('click', () => adminModal.classList.add('hidden'));
adminModal.addEventListener('click', e => { if (e.target === adminModal) adminModal.classList.add('hidden'); });

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
        ? `<div class="queue-note">"${escHtml(t.application_note)}"</div>`
        : '<div class="queue-note muted">No application note provided.</div>'}
    `;
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

  itemModal.classList.remove('hidden');
}

document.getElementById('close-item-modal').addEventListener('click', () => itemModal.classList.add('hidden'));
itemModal.addEventListener('click', e => { if (e.target === itemModal) itemModal.classList.add('hidden'); });
itemModalOffer.addEventListener('click', () => { itemModal.classList.add('hidden'); if (activeItemData) openOfferModal(activeItemData); });

document.addEventListener('click', e => {
  const thumb = e.target.closest('.clickable-thumb');
  if (thumb) { const card = thumb.closest('[data-item-id]'); if (card) openItemDetail(card); }
});

// ── Offer Modal ──────────────────────────────────────────────
const offerModal   = document.getElementById('offer-modal');
const offerTarget  = document.getElementById('offer-target');
const offerBox     = document.getElementById('offer-items');
const fairnessBox  = document.getElementById('fairness');
let offerTotal     = 0;
let offerSelected  = [];
let offerTargetVal = 80;

function openOfferModal(itemData) {
  offerTarget.textContent = itemData.name ? `${itemData.name} (${itemData.tier} • ${itemData.collection || ''})` : '—';
  offerTargetVal = Number(itemData.value) || 80;
  resetOffer(); offerModal.classList.remove('hidden');
}

document.addEventListener('click', e => {
  const openBtn = e.target.closest('[data-open-offer]');
  if (openBtn) { const card = document.querySelector(`[data-item-id="${openBtn.dataset.openOffer}"]`); if (card) openOfferModal(card.dataset); }
});

document.getElementById('close-offer').addEventListener('click', () => { offerModal.classList.add('hidden'); resetOffer(); });
document.getElementById('cancel-offer').addEventListener('click', () => { offerModal.classList.add('hidden'); resetOffer(); });
offerModal.addEventListener('click', e => { if (e.target === offerModal) { offerModal.classList.add('hidden'); resetOffer(); } });

document.addEventListener('click', e => {
  const item = e.target.closest('.selectable');
  if (!item || offerModal.classList.contains('hidden')) return;
  const value = Number(item.dataset.value), name = item.dataset.name;
  if (item.classList.contains('selected')) { item.classList.remove('selected'); offerSelected = offerSelected.filter(i => i.name !== name); offerTotal -= value; }
  else { item.classList.add('selected'); offerSelected.push({ name, value }); offerTotal += value; }
  updateOfferUI();
});

function updateOfferUI() {
  if (!offerSelected.length) { offerBox.innerHTML = 'Click items below'; offerBox.classList.add('empty'); }
  else { offerBox.classList.remove('empty'); offerBox.innerHTML = offerSelected.map(i => `<span class="chip collection">${i.name}</span>`).join('') + `<div class="value-line">Total Value: ${offerTotal}</div>`; }
  let label = 'No offer yet', cls = 'neutral';
  if (offerTotal > 0) {
    if      (offerTotal < offerTargetVal * 0.8) { label = `Underpay (${offerTotal} vs ${offerTargetVal})`; cls = 'under'; }
    else if (offerTotal > offerTargetVal * 1.2) { label = `Overpay (${offerTotal} vs ${offerTargetVal})`;  cls = 'over'; }
    else                                         { label = `Fair (${offerTotal} vs ${offerTargetVal})`;     cls = 'fair'; }
  }
  fairnessBox.textContent = label; fairnessBox.className = 'fairness ' + cls;
}

function resetOffer() {
  offerTotal = 0; offerSelected = [];
  document.querySelectorAll('.selectable').forEach(i => i.classList.remove('selected'));
  offerBox.innerHTML = 'Click items below'; offerBox.classList.add('empty');
  fairnessBox.textContent = 'No offer yet'; fairnessBox.className = 'fairness neutral';
}

// ── Profile Modal ────────────────────────────────────────────
const profileModal = document.getElementById('profile-modal');
document.getElementById('open-profile').addEventListener('click', () => profileModal.classList.remove('hidden'));
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

// ── Boot ──────────────────────────────────────────────────────
bootAuth();
