/**
 * Pricing Page Data Fetching and Rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  loadPricingData();
});

// Helper for escaping HTML
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function loadPricingData() {
  try {
    const res = await fetch('/api/pricing');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    
    const { settings, plans, addons, maintenance, factors, faqs } = data;

    renderSettings(settings);
    renderPlans(plans);
    renderAddons(addons);
    renderMaintenance(maintenance);
    renderFactors(factors);
    renderFaqs(faqs);
    
    // Trigger ScrollTrigger refresh since DOM changed significantly
    if (window.ScrollTrigger) {
      setTimeout(() => ScrollTrigger.refresh(), 100);
    }
    
    // Attach IntersectionObserver to newly generated .reveal elements
    if (typeof observer !== 'undefined') {
      document.querySelectorAll('.pricing-plans-section .reveal, .pricing-addons .reveal, .pricing-factors .reveal, .pricing-faqs .reveal').forEach(el => {
        observer.observe(el);
      });
    }
  } catch (err) {
    console.error('Failed to load pricing data:', err);
  }
}

function renderSettings(s) {
  if (!s) return;
  if (s.hero_title) document.getElementById('hero-title').textContent = s.hero_title;
  if (s.hero_subtitle) document.getElementById('hero-subtitle').textContent = s.hero_subtitle;
  if (s.bottom_cta_title) document.getElementById('bottom-cta-title').textContent = s.bottom_cta_title;
  if (s.bottom_cta_text) document.getElementById('bottom-cta-text').textContent = s.bottom_cta_text;
  
  const ctaBtn = document.getElementById('bottom-cta-btn');
  if (s.bottom_cta_link) {
    ctaBtn.href = (s.bottom_cta_link === '/contact.html' ? '/#contact' : s.bottom_cta_link);
  }
}

function renderPlans(plans) {
  const container = document.getElementById('plans-container');
  if (!plans || !plans.length) {
    container.innerHTML = '<div style="text-align:center; width:100%; color:var(--muted)">No pricing plans available at the moment.</div>';
    return;
  }
  
  container.innerHTML = plans.map((p, i) => `
    <div class="pricing-card ${p.is_popular ? 'popular' : ''} reveal reveal-delay-${(i % 3) + 1}">
      ${p.is_popular ? '<div class="popular-badge">Most Popular</div>' : ''}
      <h3 class="plan-name">${esc(p.name)}</h3>
      <div class="plan-price">${esc(p.price)}</div>
      ${p.price_suffix ? `<div class="plan-suffix">${esc(p.price_suffix)}</div>` : ''}
      <p class="plan-desc" style="margin-top: 16px;">${esc(p.description || '')}</p>
      
      <ul class="plan-features">
        ${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}
      </ul>
      
      <a href="/#contact" class="btn-${p.is_popular ? 'primary' : 'secondary'}" style="text-align:center; width: 100%;">Get Started</a>
    </div>
  `).join('');
}

function renderAddons(addons) {
  const container = document.getElementById('addons-container');
  if (!addons || !addons.length) {
    container.innerHTML = '<div style="color:var(--muted)">No add-ons available.</div>';
    return;
  }
  
  container.innerHTML = addons.map(a => `
    <div class="addon-item">
      <div class="addon-info">
        <h4>${esc(a.name)}</h4>
        ${a.description ? `<p>${esc(a.description)}</p>` : ''}
      </div>
      <div class="addon-price">${esc(a.price)}</div>
    </div>
  `).join('');
}

function renderMaintenance(maintenance) {
  const container = document.getElementById('maintenance-container');
  if (!maintenance || !maintenance.length) {
    container.innerHTML = '<div style="text-align:center; width:100%; color:var(--muted)">No maintenance plans available.</div>';
    return;
  }
  
  container.innerHTML = maintenance.map((p, i) => `
    <div class="pricing-card ${p.is_popular ? 'popular' : ''} reveal reveal-delay-${(i % 3) + 1}">
      ${p.is_popular ? '<div class="popular-badge">Most Popular</div>' : ''}
      <h3 class="plan-name">${esc(p.name)}</h3>
      <div class="plan-price" style="font-size: 36px;">${esc(p.price)}</div>
      ${p.billing_period ? `<div class="plan-suffix">${esc(p.billing_period)}</div>` : ''}
      <p class="plan-desc" style="margin-top: 16px; min-height: 24px;">${esc(p.description || '')}</p>
      
      <ul class="plan-features">
        ${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}
      </ul>
      
      <a href="${p.cta_link ? (esc(p.cta_link) === '/contact.html' || esc(p.cta_link) === '/#contact' ? '/#contact' : esc(p.cta_link)) : '/#contact'}" class="btn-${p.is_popular ? 'primary' : 'secondary'}" style="text-align:center; width: 100%;">${p.cta_text ? esc(p.cta_text) : 'Select Plan'}</a>
    </div>
  `).join('');
}

function renderFactors(factors) {
  const container = document.getElementById('factors-container');
  if (!factors || !factors.length) {
    container.parentElement.parentElement.style.display = 'none';
    return;
  }
  
  container.innerHTML = factors.map(f => `
    <div class="factor-item">
      <div class="factor-icon"><i class="${esc(f.icon || 'fa-solid fa-check')}"></i></div>
      <h4>${esc(f.title)}</h4>
      <p>${esc(f.description || '')}</p>
    </div>
  `).join('');
}

function renderFaqs(faqs) {
  const container = document.getElementById('faqs-container');
  if (!faqs || !faqs.length) {
    container.parentElement.parentElement.style.display = 'none';
    return;
  }
  
  container.innerHTML = faqs.map(f => `
    <div class="faq-item">
      <div class="faq-question">${esc(f.question)}</div>
      <div class="faq-answer">${esc(f.answer)}</div>
    </div>
  `).join('');
}
