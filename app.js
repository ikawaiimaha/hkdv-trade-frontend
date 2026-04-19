// ============================================================
// HKDV Trader OS — app.js
// Features: SPA nav, item detail modal, offer modal,
//           profile + socials modal, PayPal support widget,
//           featured bags section
// ============================================================

// ── SPA Navigation ──────────────────────────────────────────
const pages = document.querySelectorAll('.page-shell');
const navLinks = document.querySelectorAll('.nav-links a');

function showPage(id) {
  pages.forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.remove('hidden');
  navLinks.forEach(a => {
    a.classList.toggle('active', a.dataset.page === id);
  });
  if (id === 'dashboard') loadFeatured();
}

navLinks.forEach(a => {
  a.addEventListener('click', () => showPage(a.dataset.page));
});

// ── Featured Bags ────────────────────────────────────────────
// In production: call supabase.rpc('get_featured_items')
// Here: placeholder data matching the RPC shape
const DEMO_FEATURED = [
  { item_name: 'HK Starlight Lamp',  item_tier: 'SSR', wiki_rarity: 'Super Super Rare', demand: 'high',   value: 220, description: 'The rarest lamp in Dream Village — everyone wants one!', listing_count: 14, image_url: '' },
  { item_name: 'Melody Plush Pouch', item_tier: 'SR',  wiki_rarity: 'Super Rare',       demand: 'high',   value: 95,  description: 'Consistently the most-traded item this season.',    listing_count: 11, image_url: '' },
  { item_name: 'Cinnamoroll Chair',  item_tier: 'SR',  wiki_rarity: 'Super Rare',       demand: 'medium', value: 72,  description: null,                                               listing_count: 8,  image_url: '' },
];

function renderFeatured(items) {
  const grid = document.getElementById('featured-grid');
  grid.innerHTML = '';
  items.forEach(item => {
    const tierClass = (item.item_tier || '').toLowerCase();
    const demandClass = (item.demand || '').toLowerCase();
    const card = document.createElement('div');
    card.className = 'featured-card';
    card.innerHTML = `
      <div class="featured-card-image">
        ${item.image_url
          ? `<img src="${item.image_url}" alt="${item.item_name}" />`
          : `<span class="featured-img-placeholder">🎀</span>`}
      </div>
      <div class="featured-card-body">
        <div class="featured-card-top">
          <span class="tier-badge ${tierClass}">${item.item_tier}</span>
          <span class="chip demand ${demandClass}">${cap(item.demand)} Demand</span>
        </div>
        <h3 class="featured-card-name">${item.item_name}</h3>
        ${item.description ? `<p class="featured-card-desc">${item.description}</p>` : ''}
        <div class="featured-card-footer">
          <span class="featured-listings">${item.listing_count} listing${item.listing_count !== 1 ? 's' : ''}</span>
          <span class="featured-value">Value: ${item.value}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function loadFeatured() {
  // TODO: replace with: supabase.rpc('get_featured_items').then(({ data }) => renderFeatured(data))
  renderFeatured(DEMO_FEATURED);
}

// ── Item Detail Modal ────────────────────────────────────────
const itemModal        = document.getElementById('item-modal');
const itemModalName    = document.getElementById('item-modal-name');
const itemModalImage   = document.getElementById('item-modal-image');
const itemModalTier    = document.getElementById('item-modal-tier');
const itemModalRarity  = document.getElementById('item-modal-rarity');
const itemModalDemand  = document.getElementById('item-modal-demand');
const itemModalColl    = document.getElementById('item-modal-collection');
const itemModalValue   = document.getElementById('item-modal-value');
const itemModalBadges  = document.getElementById('item-modal-badges');
const itemModalWiki    = document.getElementById('item-modal-wiki-link');
const itemModalOffer   = document.getElementById('item-modal-offer-btn');
let   activeItemData   = null;

function openItemDetail(card) {
  const d = card.dataset;
  activeItemData = d;

  itemModalName.textContent  = d.name || '—';
  itemModalTier.textContent  = d.tier || '—';
  itemModalRarity.textContent= d.rarity || '—';
  itemModalDemand.textContent= d.demand ? d.demand + ' Demand' : '—';
  itemModalColl.textContent  = d.collection || '—';
  itemModalValue.textContent = d.value ? `${d.value} pts` : '—';

  // image
  itemModalImage.innerHTML = d.image
    ? `<img src="${d.image}" alt="${d.name}" class="item-detail-img" />`
    : `<span class="item-image-placeholder">🎀</span>`;

  // badges
  const tierClass = (d.tier || '').toLowerCase();
  const demClass  = (d.demand || '').toLowerCase();
  itemModalBadges.innerHTML = `
    <span class="tier-badge ${tierClass}">${d.tier || ''}</span>
    <span class="chip demand ${demClass}">${d.demand || ''} Demand</span>
    ${d.collection ? `<span class="chip collection">${d.collection}</span>` : ''}
  `;

  // wiki link
  if (d.wiki) {
    itemModalWiki.href = d.wiki;
    itemModalWiki.style.display = 'block';
  } else {
    itemModalWiki.style.display = 'none';
  }

  itemModal.classList.remove('hidden');
}

document.getElementById('close-item-modal').addEventListener('click', () => {
  itemModal.classList.add('hidden');
});

itemModal.addEventListener('click', e => {
  if (e.target === itemModal) itemModal.classList.add('hidden');
});

// "Make Offer" from detail modal → hand off to offer modal
itemModalOffer.addEventListener('click', () => {
  itemModal.classList.add('hidden');
  if (activeItemData) openOfferModal(activeItemData);
});

// Delegate click on .clickable-thumb → open item detail
document.addEventListener('click', e => {
  const thumb = e.target.closest('.clickable-thumb');
  if (thumb) {
    const card = thumb.closest('[data-item-id]');
    if (card) openItemDetail(card);
  }
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
  offerTarget.textContent = itemData.name
    ? `${itemData.name} (${itemData.tier} • ${itemData.collection || ''})`
    : '—';
  offerTargetVal = Number(itemData.value) || 80;
  resetOffer();
  offerModal.classList.remove('hidden');
}

document.addEventListener('click', e => {
  const openBtn = e.target.closest('[data-open-offer]');
  if (openBtn) {
    const card = document.querySelector(`[data-item-id="${openBtn.dataset.openOffer}"]`);
    if (card) openOfferModal(card.dataset);
  }
});

document.getElementById('close-offer').addEventListener('click', () => {
  offerModal.classList.add('hidden');
  resetOffer();
});
document.getElementById('cancel-offer').addEventListener('click', () => {
  offerModal.classList.add('hidden');
  resetOffer();
});
offerModal.addEventListener('click', e => {
  if (e.target === offerModal) { offerModal.classList.add('hidden'); resetOffer(); }
});

// selectable items inside offer modal
document.addEventListener('click', e => {
  const item = e.target.closest('.selectable');
  if (!item || offerModal.classList.contains('hidden')) return;

  const value = Number(item.dataset.value);
  const name  = item.dataset.name;

  if (item.classList.contains('selected')) {
    item.classList.remove('selected');
    offerSelected = offerSelected.filter(i => i.name !== name);
    offerTotal -= value;
  } else {
    item.classList.add('selected');
    offerSelected.push({ name, value });
    offerTotal += value;
  }
  updateOfferUI();
});

function updateOfferUI() {
  if (!offerSelected.length) {
    offerBox.innerHTML = 'Click items below';
    offerBox.classList.add('empty');
  } else {
    offerBox.classList.remove('empty');
    offerBox.innerHTML =
      offerSelected.map(i => `<span class="chip collection">${i.name}</span>`).join('') +
      `<div class="value-line">Total Value: ${offerTotal}</div>`;
  }

  let label = 'No offer yet', cls = 'neutral';
  if (offerTotal > 0) {
    if      (offerTotal < offerTargetVal * 0.8)  { label = `Underpay (${offerTotal} vs ${offerTargetVal})`;  cls = 'under'; }
    else if (offerTotal > offerTargetVal * 1.2)  { label = `Overpay (${offerTotal} vs ${offerTargetVal})`;   cls = 'over';  }
    else                                          { label = `Fair (${offerTotal} vs ${offerTargetVal})`;      cls = 'fair';  }
  }
  fairnessBox.textContent = label;
  fairnessBox.className   = 'fairness ' + cls;
}

function resetOffer() {
  offerTotal    = 0;
  offerSelected = [];
  document.querySelectorAll('.selectable').forEach(i => i.classList.remove('selected'));
  offerBox.innerHTML = 'Click items below';
  offerBox.classList.add('empty');
  fairnessBox.textContent = 'No offer yet';
  fairnessBox.className   = 'fairness neutral';
}

// ── Profile Modal ────────────────────────────────────────────
const profileModal = document.getElementById('profile-modal');

document.getElementById('open-profile').addEventListener('click', () => {
  profileModal.classList.remove('hidden');
});
document.getElementById('close-profile-modal').addEventListener('click', () => {
  profileModal.classList.add('hidden');
});
document.getElementById('cancel-profile').addEventListener('click', () => {
  profileModal.classList.add('hidden');
});
profileModal.addEventListener('click', e => {
  if (e.target === profileModal) profileModal.classList.add('hidden');
});

document.getElementById('save-profile').addEventListener('click', () => {
  const profile = {
    display_name: document.getElementById('pf-display-name').value.trim() || null,
    bio:          document.getElementById('pf-bio').value.trim()          || null,
    buddy:        document.getElementById('pf-buddy').value.trim()        || null,
    title:        document.getElementById('pf-title').value.trim()        || null,
    socials: {
      discord:   document.getElementById('pf-discord').value.trim()   || null,
      twitter:   document.getElementById('pf-twitter').value.trim()   || null,
      instagram: document.getElementById('pf-instagram').value.trim() || null,
      youtube:   document.getElementById('pf-youtube').value.trim()   || null,
      tiktok:    document.getElementById('pf-tiktok').value.trim()    || null,
    },
  };
  // TODO: supabase.rpc('upsert_my_trader_profile', profile)
  console.log('[profile] saving', profile);
  profileModal.classList.add('hidden');
  showToast('Profile saved! 🌸');
});

// ── PayPal Support Widget ─────────────────────────────────────
const supportFab   = document.getElementById('support-fab');
const supportPopup = document.getElementById('support-popup');

supportFab.addEventListener('click', () => {
  supportPopup.classList.toggle('hidden');
});
document.getElementById('close-support').addEventListener('click', e => {
  e.stopPropagation();
  supportPopup.classList.add('hidden');
});

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('hkdv-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hkdv-toast';
    toast.className = 'hkdv-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// ── Helpers ───────────────────────────────────────────────────
function cap(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── Boot ──────────────────────────────────────────────────────
showPage('dashboard');
