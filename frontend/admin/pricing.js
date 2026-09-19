'use strict';

let pricingData = { plans: [], addons: [], maintenance: [], factors: [], faqs: [] };
let currentPricingId = null;

// ============================================================
// UI Navigation
// ============================================================
function showPricingTab(tabName) {
  document.querySelectorAll('.pricing-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#pane-pricing .btn-sm').forEach(btn => {
    btn.classList.remove('active');
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
  });
  document.getElementById(`pricing-tab-${tabName}`).style.display = 'block';
  const activeBtn = document.getElementById(`btn-tab-${tabName}`);
  if(activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.borderColor = 'var(--green)';
    activeBtn.style.color = 'var(--green)';
  }
}

// ============================================================
// Load All Data
// ============================================================
async function loadPricing() {
  await Promise.all([
    loadPricingSettings(),
    loadPricingPlans(),
    loadPricingAddons(),
    loadMaintenancePlans(),
    loadPricingFactors(),
    loadPricingFaqs()
  ]);
}

// ============================================================
// Settings
// ============================================================
async function loadPricingSettings() {
  try {
    const s = await api('/api/pricing/settings');
    if (!s) return;
    document.getElementById('ps-hero-title').value = s.hero_title || '';
    document.getElementById('ps-hero-subtitle').value = s.hero_subtitle || '';
    document.getElementById('ps-cta-text').value = s.cta_text || '';
    document.getElementById('ps-cta-link').value = s.cta_link || '';
    document.getElementById('ps-bottom-title').value = s.bottom_cta_title || '';
    document.getElementById('ps-bottom-text').value = s.bottom_cta_text || '';
    document.getElementById('ps-bottom-link').value = s.bottom_cta_link || '';
  } catch (ex) { toast(ex.message, 'error'); }
}

async function savePricingSettings() {
  const body = {
    hero_title: document.getElementById('ps-hero-title').value,
    hero_subtitle: document.getElementById('ps-hero-subtitle').value,
    cta_text: document.getElementById('ps-cta-text').value,
    cta_link: document.getElementById('ps-cta-link').value,
    bottom_cta_title: document.getElementById('ps-bottom-title').value,
    bottom_cta_text: document.getElementById('ps-bottom-text').value,
    bottom_cta_link: document.getElementById('ps-bottom-link').value,
  };
  try {
    await api('/api/pricing/settings', { method: 'PUT', body: JSON.stringify(body) });
    toast('Settings saved.');
  } catch (ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Delete Helper
// ============================================================
async function deletePricingItem(type, id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  const endpointMap = {
    plan: 'plans',
    addon: 'addons',
    maintenance: 'maintenance',
    factor: 'factors',
    faq: 'faqs'
  };
  try {
    await api(`/api/pricing/${endpointMap[type]}/${id}`, { method: 'DELETE' });
    toast('Item deleted.');
    if (type === 'plan') loadPricingPlans();
    else if (type === 'addon') loadPricingAddons();
    else if (type === 'maintenance') loadMaintenancePlans();
    else if (type === 'factor') loadPricingFactors();
    else if (type === 'faq') loadPricingFaqs();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Form Open Helper
// ============================================================
function openPricingForm(type, id = null) {
  currentPricingId = id;
  
  if (type === 'plan') {
    const p = id ? pricingData.plans.find(x => x.id === id) : null;
    document.getElementById('pp-drawer-title').textContent = p ? 'Edit Plan' : 'Add Plan';
    document.getElementById('pp-name').value = p?.name || '';
    document.getElementById('pp-price').value = p?.price || '';
    document.getElementById('pp-suffix').value = p?.price_suffix || '';
    document.getElementById('pp-desc').value = p?.description || '';
    document.getElementById('pp-features').value = p ? (p.features || []).join('\n') : '';
    document.getElementById('pp-sort').value = p?.sort_order ?? 0;
    document.getElementById('pp-popular').checked = !!p?.is_popular;
    document.getElementById('pp-active').checked = p ? !!p.is_active : true;
    document.getElementById('pricing-plan-drawer').classList.add('open');
  } 
  else if (type === 'addon') {
    const p = id ? pricingData.addons.find(x => x.id === id) : null;
    document.getElementById('pa-drawer-title').textContent = p ? 'Edit Add-on' : 'Add Add-on';
    document.getElementById('pa-name').value = p?.name || '';
    document.getElementById('pa-price').value = p?.price || '';
    document.getElementById('pa-desc').value = p?.description || '';
    document.getElementById('pa-sort').value = p?.sort_order ?? 0;
    document.getElementById('pa-active').checked = p ? !!p.is_active : true;
    document.getElementById('pricing-addon-drawer').classList.add('open');
  }
  else if (type === 'maintenance') {
    const p = id ? pricingData.maintenance.find(x => x.id === id) : null;
    document.getElementById('mp-drawer-title').textContent = p ? 'Edit Maintenance Plan' : 'Add Plan';
    document.getElementById('mp-name').value = p?.name || '';
    document.getElementById('mp-price').value = p?.price || '';
    document.getElementById('mp-period').value = p?.billing_period || '';
    document.getElementById('mp-desc').value = p?.description || '';
    document.getElementById('mp-features').value = p ? (p.features || []).join('\n') : '';
    document.getElementById('mp-cta-text').value = p?.cta_text || '';
    document.getElementById('mp-cta-link').value = p?.cta_link || '';
    document.getElementById('mp-popular').checked = !!p?.is_popular;
    document.getElementById('mp-sort').value = p?.sort_order ?? 0;
    document.getElementById('mp-active').checked = p ? !!p.is_active : true;
    document.getElementById('maintenance-plan-drawer').classList.add('open');
  }
  else if (type === 'factor') {
    const p = id ? pricingData.factors.find(x => x.id === id) : null;
    document.getElementById('pfactor-drawer-title').textContent = p ? 'Edit Factor' : 'Add Factor';
    document.getElementById('pfactor-title').value = p?.title || '';
    document.getElementById('pfactor-desc').value = p?.description || '';
    document.getElementById('pfactor-icon').value = p?.icon || '';
    document.getElementById('pfactor-sort').value = p?.sort_order ?? 0;
    document.getElementById('pfactor-active').checked = p ? !!p.is_active : true;
    document.getElementById('pricing-factor-drawer').classList.add('open');
  }
  else if (type === 'faq') {
    const p = id ? pricingData.faqs.find(x => x.id === id) : null;
    document.getElementById('pfaq-drawer-title').textContent = p ? 'Edit FAQ' : 'Add FAQ';
    document.getElementById('pfaq-question').value = p?.question || '';
    document.getElementById('pfaq-answer').value = p?.answer || '';
    document.getElementById('pfaq-sort').value = p?.sort_order ?? 0;
    document.getElementById('pfaq-active').checked = p ? !!p.is_active : true;
    document.getElementById('pricing-faq-drawer').classList.add('open');
  }
}

// ============================================================
// Plans
// ============================================================
async function loadPricingPlans() {
  try {
    pricingData.plans = await api('/api/pricing/plans/admin') || [];
    const tbody = document.getElementById('pricing-plans-body');
    if (!pricingData.plans.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No plans yet.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = pricingData.plans.map(p => `
      <tr>
        <td><strong>${esc(p.name)}</strong></td>
        <td>${esc(p.price)}${p.price_suffix ? `<small style="color:var(--muted)"> ${esc(p.price_suffix)}</small>` : ''}</td>
        <td>${p.is_popular ? '<span class="status-badge s-ACTIVE">Yes</span>' : '<span style="color:var(--muted)">No</span>'}</td>
        <td>${p.sort_order}</td>
        <td>${p.is_active ? '<span class="status-badge s-NEW">Yes</span>' : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">No</span>'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openPricingForm('plan', ${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deletePricingItem('plan', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch(ex) { toast(ex.message, 'error'); }
}

async function savePricingPlan() {
  const features = document.getElementById('pp-features').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  const body = {
    name: document.getElementById('pp-name').value,
    price: document.getElementById('pp-price').value,
    price_suffix: document.getElementById('pp-suffix').value || null,
    description: document.getElementById('pp-desc').value || null,
    features,
    sort_order: parseInt(document.getElementById('pp-sort').value, 10) || 0,
    is_popular: document.getElementById('pp-popular').checked,
    is_active: document.getElementById('pp-active').checked,
  };
  try {
    if (currentPricingId) {
      await api(`/api/pricing/plans/${currentPricingId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Plan updated.');
    } else {
      await api('/api/pricing/plans', { method: 'POST', body: JSON.stringify(body) });
      toast('Plan created.');
    }
    closeDrawer('pricing-plan-drawer');
    loadPricingPlans();
  } catch(ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Add-ons
// ============================================================
async function loadPricingAddons() {
  try {
    pricingData.addons = await api('/api/pricing/addons/admin') || [];
    const tbody = document.getElementById('pricing-addons-body');
    if (!pricingData.addons.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No add-ons yet.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = pricingData.addons.map(p => `
      <tr>
        <td><strong>${esc(p.name)}</strong><br><small style="color:var(--muted)">${esc(p.description || '')}</small></td>
        <td>${esc(p.price)}</td>
        <td>${p.sort_order}</td>
        <td>${p.is_active ? '<span class="status-badge s-NEW">Yes</span>' : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">No</span>'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openPricingForm('addon', ${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deletePricingItem('addon', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch(ex) { toast(ex.message, 'error'); }
}

async function savePricingAddon() {
  const body = {
    name: document.getElementById('pa-name').value,
    price: document.getElementById('pa-price').value,
    description: document.getElementById('pa-desc').value || null,
    sort_order: parseInt(document.getElementById('pa-sort').value, 10) || 0,
    is_active: document.getElementById('pa-active').checked,
  };
  try {
    if (currentPricingId) {
      await api(`/api/pricing/addons/${currentPricingId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Add-on updated.');
    } else {
      await api('/api/pricing/addons', { method: 'POST', body: JSON.stringify(body) });
      toast('Add-on created.');
    }
    closeDrawer('pricing-addon-drawer');
    loadPricingAddons();
  } catch(ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Maintenance
// ============================================================
async function loadMaintenancePlans() {
  try {
    pricingData.maintenance = await api('/api/pricing/maintenance/admin') || [];
    const tbody = document.getElementById('pricing-maintenance-body');
    if (!pricingData.maintenance.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No maintenance plans yet.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = pricingData.maintenance.map(p => `
      <tr>
        <td><strong>${esc(p.name)}</strong></td>
        <td>${esc(p.price)}</td>
        <td style="color:var(--muted)">${esc(p.billing_period || '—')}</td>
        <td>${p.is_popular ? '<span class="status-badge s-ACTIVE">Yes</span>' : '<span style="color:var(--muted)">No</span>'}</td>
        <td>${p.sort_order}</td>
        <td>${p.is_active ? '<span class="status-badge s-NEW">Yes</span>' : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">No</span>'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openPricingForm('maintenance', ${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deletePricingItem('maintenance', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch(ex) { toast(ex.message, 'error'); }
}

async function saveMaintenancePlan() {
  const features = document.getElementById('mp-features').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  const body = {
    name: document.getElementById('mp-name').value,
    price: document.getElementById('mp-price').value,
    billing_period: document.getElementById('mp-period').value || null,
    description: document.getElementById('mp-desc').value || null,
    features,
    cta_text: document.getElementById('mp-cta-text').value || null,
    cta_link: document.getElementById('mp-cta-link').value || null,
    is_popular: document.getElementById('mp-popular').checked,
    sort_order: parseInt(document.getElementById('mp-sort').value, 10) || 0,
    is_active: document.getElementById('mp-active').checked,
  };
  try {
    if (currentPricingId) {
      await api(`/api/pricing/maintenance/${currentPricingId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Plan updated.');
    } else {
      await api('/api/pricing/maintenance', { method: 'POST', body: JSON.stringify(body) });
      toast('Plan created.');
    }
    closeDrawer('maintenance-plan-drawer');
    loadMaintenancePlans();
  } catch(ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Factors
// ============================================================
async function loadPricingFactors() {
  try {
    pricingData.factors = await api('/api/pricing/factors/admin') || [];
    const tbody = document.getElementById('pricing-factors-body');
    if (!pricingData.factors.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No factors yet.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = pricingData.factors.map(p => `
      <tr>
        <td><strong>${esc(p.title)}</strong><br><small style="color:var(--muted)">${esc(p.description || '')}</small></td>
        <td>${esc(p.icon)}</td>
        <td>${p.sort_order}</td>
        <td>${p.is_active ? '<span class="status-badge s-NEW">Yes</span>' : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">No</span>'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openPricingForm('factor', ${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deletePricingItem('factor', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch(ex) { toast(ex.message, 'error'); }
}

async function savePricingFactor() {
  const body = {
    title: document.getElementById('pfactor-title').value,
    description: document.getElementById('pfactor-desc').value || null,
    icon: document.getElementById('pfactor-icon').value || null,
    sort_order: parseInt(document.getElementById('pfactor-sort').value, 10) || 0,
    is_active: document.getElementById('pfactor-active').checked,
  };
  try {
    if (currentPricingId) {
      await api(`/api/pricing/factors/${currentPricingId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Factor updated.');
    } else {
      await api('/api/pricing/factors', { method: 'POST', body: JSON.stringify(body) });
      toast('Factor created.');
    }
    closeDrawer('pricing-factor-drawer');
    loadPricingFactors();
  } catch(ex) { toast(ex.message, 'error'); }
}

// ============================================================
// FAQs
// ============================================================
async function loadPricingFaqs() {
  try {
    pricingData.faqs = await api('/api/pricing/faqs/admin') || [];
    const tbody = document.getElementById('pricing-faqs-body');
    if (!pricingData.faqs.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>No FAQs yet.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = pricingData.faqs.map(p => `
      <tr>
        <td><strong>${esc(p.question)}</strong><br><small style="color:var(--muted)">${esc(p.answer || '')}</small></td>
        <td>${p.sort_order}</td>
        <td>${p.is_active ? '<span class="status-badge s-NEW">Yes</span>' : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">No</span>'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openPricingForm('faq', ${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deletePricingItem('faq', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch(ex) { toast(ex.message, 'error'); }
}

async function savePricingFaq() {
  const body = {
    question: document.getElementById('pfaq-question').value,
    answer: document.getElementById('pfaq-answer').value,
    sort_order: parseInt(document.getElementById('pfaq-sort').value, 10) || 0,
    is_active: document.getElementById('pfaq-active').checked,
  };
  try {
    if (currentPricingId) {
      await api(`/api/pricing/faqs/${currentPricingId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('FAQ updated.');
    } else {
      await api('/api/pricing/faqs', { method: 'POST', body: JSON.stringify(body) });
      toast('FAQ created.');
    }
    closeDrawer('pricing-faq-drawer');
    loadPricingFaqs();
  } catch(ex) { toast(ex.message, 'error'); }
}
