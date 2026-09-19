    // =====================
    // CURSOR
    // =====================
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    const dot = document.getElementById('cursorDot');
    const label = document.getElementById('cursorLabel');
    let mx = 0, my = 0, rx = 0, ry = 0;

    if (window.matchMedia('(pointer: fine)').matches) {
      document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      });
      (function animate() {
        rx += (mx - rx) * 0.1;
        ry += (my - ry) * 0.1;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        label.style.left = rx + 'px'; label.style.top = ry + 'px';
        requestAnimationFrame(animate);
      })();
      document.querySelectorAll('a, button, [data-hover]').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
      });
      document.querySelectorAll('[data-project]').forEach(el => {
        el.addEventListener('mouseenter', () => { document.body.classList.add('cursor-project'); label.textContent = 'VIEW'; });
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-project'));
      });
    }

    // =====================
    // NAV SCROLL
    // =====================
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });

    // =====================
    // MOBILE MENU
    // =====================
    function toggleMobile() {
      const h = document.getElementById('hamburger');
      const m = document.getElementById('mobileMenu');
      h.classList.toggle('open');
      m.classList.toggle('open');
    }
    function closeMobile() {
      document.getElementById('hamburger').classList.remove('open');
      document.getElementById('mobileMenu').classList.remove('open');
    }

    // =====================
    // SCROLL REVEAL
    // =====================
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // WE ARE ONE animation now handled by vr1-system.js (WebGL + GSAP)
    
    // =====================
    // PROJECT TYPE SELECTOR
    // =====================
    function selectType(btn) {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    // =====================
    // FORM SUBMIT — wired to POST /api/inquiries
    // =====================
    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function handleSubmit(e) {
      e.preventDefault();
      const btn = e.target.querySelector('.form-submit');
      const origHTML = btn ? btn.innerHTML : null;
      if (btn) { btn.innerHTML = 'Sending...'; btn.disabled = true; }

      const nameInput = e.target.querySelector('input[type="text"]');
      const emailInput = e.target.querySelector('input[type="email"]');
      const bizInputs = e.target.querySelectorAll('input[type="text"]');
      const activeType = document.querySelector('.type-btn.active');
      const budgetSel = e.target.querySelector('select');
      const msgArea = e.target.querySelector('textarea');

      const payload = {
        name: nameInput ? nameInput.value : '',
        email: emailInput ? emailInput.value : '',
        business: bizInputs[1] ? bizInputs[1].value : '',
        project_type: activeType ? activeType.textContent.trim() : '',
        budget: budgetSel ? budgetSel.value : '',
        message: msgArea ? msgArea.value : '',
      };

      // Remove stale error
      const oldErr = document.getElementById('form-error-msg');
      if (oldErr) oldErr.remove();

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Something went wrong. Please try again.');
        }
        // Success
        const wrap = document.getElementById('contactFormWrap');
        if (wrap) wrap.style.display = 'none';
        const s = document.getElementById('formSuccess');
        if (s) { s.style.display = 'flex'; s.style.flexDirection = 'column'; s.style.alignItems = 'center'; }
      } catch (err) {
        if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
        const errEl = document.createElement('p');
        errEl.id = 'form-error-msg';
        errEl.style.cssText = 'color:#EF4444;font-size:13px;margin-top:10px;text-align:center';
        errEl.textContent = err.message;
        if (btn && btn.parentNode) btn.parentNode.insertBefore(errEl, btn.nextSibling);
        else e.target.appendChild(errEl);
      }
    }

    // =====================
    // API: Load published projects
    // =====================
    async function loadProjects() {
      const grid = document.querySelector('.work-grid');
      if (!grid) return;
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) return; // keep placeholder
        const projects = await res.json();
        if (!projects || !projects.length) return; // keep placeholder

        const ICONS = ['\uD83C\uDF10', '\u2726', '\uD83D\uDED2', '\uD83D\uDCBB', '\uD83C\uDFA8', '\uD83D\uDCC8'];
        const BGS = [
          'linear-gradient(135deg,#0f1a0f,#1a2e1a)',
          'linear-gradient(135deg,#0a0f1a,#101a2e)',
          'linear-gradient(135deg,#1a0a0a,#2e1010)',
          'linear-gradient(135deg,#1a1a0a,#2e2e10)',
        ];
        const DELAYS = ['reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'];

        grid.innerHTML = projects.map((p, i) => {
          const techs = (p.technologies || []).map(t => '<span class="tech-tag">' + esc(t) + '</span>').join('');
          const cats = p.category ? '<span class="cat-badge">' + esc(p.category) + '</span>' : '';
          const icon = ICONS[i % ICONS.length];
          const bg = BGS[i % BGS.length];
          const imgContent = p.image_url
            ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.title) + '" style="width:100%;height:100%;object-fit:cover">'
            : icon;
          const liveLink = p.live_url
            ? '<a href="' + esc(p.live_url) + '" class="proj-link primary-link" target="_blank" rel="noopener">View Project &#8594;</a>'
            : '';
          const ghLink = p.github_url
            ? '<a href="' + esc(p.github_url) + '" class="proj-link" target="_blank" rel="noopener">GitHub</a>'
            : '';
          const links = (liveLink + ghLink) || '<a href="#contact" class="proj-link primary-link">Start a Project &#8594;</a>';
          return [
            '<div class="project-card reveal ' + DELAYS[i % 3] + '" data-project>',
            '  <div class="project-img">',
            '    <div class="project-img-inner" style="background:' + bg + '">' + imgContent + '</div>',
            '  </div>',
            '  <div class="project-info">',
            '    <div class="project-cats">' + cats + '</div>',
            '    <h3>' + esc(p.title) + '</h3>',
            '    <p class="project-desc">' + esc(p.description || '') + '</p>',
            '    <div class="project-tech">' + techs + '</div>',
            '    <div class="project-links">' + links + '</div>',
            '  </div>',
            '</div>',
          ].join('\n');
        }).join('\n');

        // Re-attach reveal observer and hover effects to newly rendered cards
        if (typeof observer !== 'undefined') {
          grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }
        const labelEl = document.querySelector('.cursor-label');
        grid.querySelectorAll('[data-project]').forEach(el => {
          el.addEventListener('mouseenter', () => { document.body.classList.add('cursor-project'); if (labelEl) labelEl.textContent = 'VIEW'; });
          el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-project'));
        });
      } catch (_) {
        // Keep placeholder silently on any error
      }
    }

    // =====================
    // API: Load team members
    // =====================
    async function loadTeam() {
      const grid = document.querySelector('.team-grid');
      if (!grid) return;
      try {
        const res = await fetch('/api/team');
        if (!res.ok) return;
        const members = await res.json();
        if (!members || !members.length) return;

        const DELAYS = ['reveal-delay-1', 'reveal-delay-2'];
        const GH_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/></svg>';
        const DOC_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        const LI_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>';
        const GLOBE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

        grid.innerHTML = members.map((m, i) => {
          const skills = (m.skills || []).map(s => '<span class="skill-tag">' + esc(s) + '</span>').join('');
          const initials = (m.name || 'M' + (i + 1)).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const avatar = m.photo_url
            ? '<img src="' + esc(m.photo_url) + '" alt="' + esc(m.name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
            : initials;
          const links = [
            m.github_url ? '<a href="' + esc(m.github_url) + '" class="team-link" target="_blank" rel="noopener">' + GH_ICON + ' GitHub</a>' : '',
            m.portfolio_url ? '<a href="' + esc(m.portfolio_url) + '" class="team-link" target="_blank" rel="noopener">' + GLOBE_ICON + ' Portfolio</a>' : '',
            m.resume_url ? '<a href="' + esc(m.resume_url) + '" class="team-link" target="_blank" rel="noopener">' + DOC_ICON + ' Resume</a>' : '',
            m.linkedin_url ? '<a href="' + esc(m.linkedin_url) + '" class="team-link" target="_blank" rel="noopener">' + LI_ICON + ' LinkedIn</a>' : '',
          ].filter(Boolean).join('');
          return [
            '<div class="team-card reveal ' + DELAYS[i % 2] + '">',
            '  <div class="team-avatar-wrap">' + avatar + '</div>',
            '  <div class="team-name">' + esc(m.name || '[NAME]') + '</div>',
            '  <div class="team-role">' + esc(m.role || '') + '</div>',
            '  <p class="team-bio">' + esc(m.bio || 'Profile coming soon.') + '</p>',
            '  <div class="team-skills">' + skills + '</div>',
            links ? '  <div class="team-links">' + links + '</div>' : '',
            '</div>',
          ].join('\n');
        }).join('\n');

        if (typeof observer !== 'undefined') {
          grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }
      } catch (_) {
        // Keep placeholder silently
      }
    }

    // =====================
    // API: Load studio updates
    // =====================
    async function loadBlog() {
      const grid = document.getElementById('updates-grid');
      if (!grid) return;
      try {
        const res = await fetch('/api/blog');
        if (!res.ok) return;
        const posts = await res.json();
        if (!posts || !posts.length) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px"><p>No updates published yet. Check back soon!</p></div>';
          return;
        }

        const DELAYS = ['reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'];
        grid.innerHTML = posts.map((b, i) => {
          const cover = b.cover_url
            ? '<img src="' + esc(b.cover_url) + '" alt="' + esc(b.title) + '" style="width:100%;height:100%;object-fit:cover">'
            : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#0f1a0f,#1a2e1a);display:flex;align-items:center;justify-content:center;font-size:24px">\u2726</div>';
          const dateStr = b.published_at ? new Date(b.published_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
          return [
            '<div class="update-card reveal ' + DELAYS[i % 3] + '" style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column">',
            '  <div style="height:180px;position:relative;overflow:hidden">' + cover + '</div>',
            '  <div style="padding:24px;display:flex;flex-direction:column;flex:1">',
            '    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--green);text-transform:uppercase;margin-bottom:8px">' + esc(dateStr || 'STUDIO UPDATE') + '</div>',
            '    <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;line-height:1.3;color:var(--text)">' + esc(b.title) + '</h3>',
            '    <p style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.6;flex:1">' + esc(b.excerpt || b.content || '') + '</p>',
            '  </div>',
            '</div>',
          ].join('\n');
        }).join('\n');

        if (typeof observer !== 'undefined') {
          grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }
      } catch (_) {}
    }

    // Bootstrap API data after DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
      loadProjects();
      loadTeam();
      loadBlog();
    });

    // =====================
    // SERVICE CARD TILT
    // =====================
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateZ(4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });