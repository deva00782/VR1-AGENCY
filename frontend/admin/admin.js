/**
 * VR1 Admin Dashboard — admin.js
 * All dashboard logic lives here; the HTML has no inline scripts.
 * Served at /admin/admin.js via express.static('/admin').
 */

'use strict';

let currentInquiryId = null;
let currentProjectId = null;
let currentBlogId    = null;
let currentTeamId    = null;

let inquiriesData    = [];
let projectsData     = [];
let teamData         = [];
let blogData         = [];

// ============================================================
// Helpers
// ============================================================

/** Read the non-httpOnly CSRF cookie value. */
function getCsrf() {
  const m = document.cookie.match(/(?:^|;\s*)vr1_csrf=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Fetch wrapper: attaches CSRF header, redirects to login on 401. */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const method  = (opts.method || 'GET').toUpperCase();
  if (!['GET','HEAD','OPTIONS'].includes(method)) {
    const csrf = getCsrf();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  const res = await fetch(path, { ...opts, headers, credentials: 'include' });
  if (res.status === 401) { showLogin(); return null; }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day:'numeric', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

/** HTML-escape a value for safe inline rendering. */
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Slugify text for friendly URLs */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Auto generate slug from title input in Blog form */
function handleTitleSlug() {
  const title = document.getElementById('bg-title').value;
  const slugInput = document.getElementById('bg-slug');
  if (!slugInput.dataset.manual) {
    slugInput.value = slugify(title);
  }
}

/** Preview image URL inside drawer */
async function uploadImage(inputElem, urlInputId) {
  if (!inputElem.files || !inputElem.files[0]) return;
  const file = inputElem.files[0];
  const formData = new FormData();
  formData.append('image', file);

  const originalText = inputElem.parentElement.childNodes[0].textContent;
  inputElem.parentElement.childNodes[0].textContent = 'Uploading...';

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-CSRF-Token': getCsrf() },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    
    const urlInput = document.getElementById(urlInputId);
    urlInput.value = data.url;
    // Trigger preview
    previewImage(urlInputId, urlInputId + '-prev');
  } catch (err) {
    alert(err.message);
  } finally {
    inputElem.parentElement.childNodes[0].textContent = 'Browse...';
    inputElem.value = ''; // Reset file input
  }
}

function previewImage(inputId, previewId) {
  const url = document.getElementById(inputId).value.trim();
  const box = document.getElementById(previewId);
  if (!box) return;
  if (!url) {
    box.innerHTML = '<span>No image preview</span>';
    return;
  }
  const img = new Image();
  img.onload = () => {
    box.innerHTML = `<img src="${esc(url)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">`;
  };
  img.onerror = () => {
    box.innerHTML = '<span style="color:var(--red)">Invalid image URL</span>';
  };
  img.src = url;
}

// ============================================================
// Auth
// ============================================================

async function init() {
  try {
    const me = await api('/api/auth/me');
    if (!me) return; // 401 already handled
    document.getElementById('topbar-name').textContent = me.name;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    loadInquiries();
    loadProjects();
    loadTeam();
    loadBlog();
  } catch { showLogin(); }
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  btn.textContent = 'Signing in…'; btn.disabled = true; err.style.display = 'none';
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    document.getElementById('l-email').value,
        password: document.getElementById('l-pass').value,
      }),
    });
    if (!data) return;
    document.getElementById('topbar-name').textContent = data.name;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    loadInquiries(); loadProjects(); loadTeam(); loadBlog();
  } catch (ex) {
    err.textContent = ex.message || 'Invalid credentials.';
    err.style.display = 'block';
  } finally {
    btn.textContent = 'Sign in'; btn.disabled = false;
  }
}

async function doLogout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  showLogin();
}

// ============================================================
// Tabs
// ============================================================

function showTab(name, btn) {
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('pane-' + name).classList.add('active');
  btn.classList.add('active');
}

// ============================================================
// Inquiries
// ============================================================

async function loadInquiries() {
  try {
    inquiriesData = await api('/api/inquiries') || [];
    const newCount = inquiriesData.filter(i => i.status === 'NEW').length;
    const badge = document.getElementById('new-badge');
    badge.textContent = newCount;
    badge.style.display = newCount ? 'inline' : 'none';

    const tbody = document.getElementById('inquiries-body');
    if (!inquiriesData.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>No inquiries yet.</p><small>They'll appear here when someone submits your contact form.</small></div></td></tr>`;
      return;
    }
    tbody.innerHTML = inquiriesData.map(i => `
      <tr>
        <td><strong>${esc(i.name)}</strong></td>
        <td style="color:var(--muted)">${esc(i.email)}</td>
        <td style="color:var(--muted)">${esc(i.business || '—')}</td>
        <td style="color:var(--muted)">${esc(i.project_type || '—')}</td>
        <td style="color:var(--muted)">${esc(i.budget || '—')}</td>
        <td><span class="status-badge s-${i.status}">${i.status}</span></td>
        <td style="color:var(--muted);font-size:12px">${fmtDate(i.created_at)}</td>
        <td><button class="btn-sm" onclick="openInquiry(${i.id})">View</button></td>
      </tr>
    `).join('');
  } catch (ex) { toast(ex.message, 'error'); }
}

async function openInquiry(id) {
  try {
    const i = await api(`/api/inquiries/${id}`);
    if (!i) return;
    currentInquiryId = id;
    document.getElementById('drawer-name').textContent    = i.name;
    document.getElementById('drawer-email').textContent   = i.email;
    document.getElementById('drawer-business').textContent= i.business || '—';
    document.getElementById('drawer-type').textContent    = i.project_type || '—';
    document.getElementById('drawer-budget').textContent  = i.budget || '—';
    document.getElementById('drawer-date').textContent    = fmtDate(i.created_at);
    document.getElementById('drawer-msg').textContent     = i.message;
    document.getElementById('drawer-status').value        = i.status;
    document.getElementById('drawer-notes').value         = i.notes || '';
    document.getElementById('inquiry-drawer').classList.add('open');
  } catch (ex) { toast(ex.message, 'error'); }
}

async function updateInquiryStatus() {
  if (!currentInquiryId) return;
  try {
    await api(`/api/inquiries/${currentInquiryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: document.getElementById('drawer-status').value }),
    });
    toast('Status updated.');
    loadInquiries();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function saveInquiryNotes() {
  if (!currentInquiryId) return;
  try {
    await api(`/api/inquiries/${currentInquiryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: document.getElementById('drawer-notes').value }),
    });
    toast('Notes saved.');
  } catch (ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Projects
// ============================================================

async function loadProjects() {
  try {
    projectsData = await api('/api/projects/admin') || [];
    const tbody = document.getElementById('projects-body');
    if (!projectsData.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No projects yet.</p><small>Add your first project using the button above.</small></div></td></tr>`;
      return;
    }
    tbody.innerHTML = projectsData.map(p => `
      <tr>
        <td><strong>${esc(p.title)}</strong></td>
        <td style="color:var(--muted)">${esc(p.category || '—')}</td>
        <td>${(p.technologies || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</td>
        <td>${p.featured ? '<span class="status-badge s-NEW">Yes</span>' : '<span style="color:var(--muted)">No</span>'}</td>
        <td>${p.published
          ? '<span class="status-badge s-ACTIVE">Published</span>'
          : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">Draft</span>'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openProjectForm(${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deleteProject(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (ex) { toast(ex.message, 'error'); }
}

function openProjectForm(id) {
  currentProjectId = id || null;
  const p = id ? projectsData.find(x => x.id === id) : null;
  document.getElementById('proj-drawer-title').textContent = p ? 'Edit Project' : 'Add Project';
  document.getElementById('pf-title').value       = p?.title        || '';
  document.getElementById('pf-desc').value        = p?.description  || '';
  document.getElementById('pf-cat').value         = p?.category     || '';
  document.getElementById('pf-tech').value        = (p?.technologies || []).join(', ');
  document.getElementById('pf-img').value         = p?.image_url    || '';
  document.getElementById('pf-live').value        = p?.live_url     || '';
  document.getElementById('pf-gh').value          = p?.github_url   || '';
  document.getElementById('pf-case-study').value  = p?.case_study_url || '';
  document.getElementById('pf-sort').value        = p?.sort_order   ?? 0;
  document.getElementById('pf-featured').checked  = !!p?.featured;
  document.getElementById('pf-published').checked = p ? !!p.published : true;
  previewImage('pf-img', 'pf-img-prev');
  document.getElementById('project-drawer').classList.add('open');
}

async function saveProject() {
  const tech = document.getElementById('pf-tech').value
    .split(',').map(t => t.trim()).filter(Boolean);
  const body = {
    title:         document.getElementById('pf-title').value,
    description:   document.getElementById('pf-desc').value || null,
    category:      document.getElementById('pf-cat').value  || null,
    technologies:  tech,
    image_url:     document.getElementById('pf-img').value        || null,
    live_url:      document.getElementById('pf-live').value       || null,
    github_url:    document.getElementById('pf-gh').value         || null,
    case_study_url:document.getElementById('pf-case-study').value || null,
    sort_order:    parseInt(document.getElementById('pf-sort').value, 10) || 0,
    featured:      document.getElementById('pf-featured').checked,
    published:     document.getElementById('pf-published').checked,
  };
  try {
    if (currentProjectId) {
      await api(`/api/projects/${currentProjectId}`, { method:'PUT', body: JSON.stringify(body) });
      toast('Project updated.');
    } else {
      await api('/api/projects', { method:'POST', body: JSON.stringify(body) });
      toast('Project created.');
    }
    closeDrawer('project-drawer');
    loadProjects();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function deleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  try {
    await api(`/api/projects/${id}`, { method:'DELETE' });
    toast('Project deleted.');
    loadProjects();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Team — full CRUD (Add, Edit, Delete)
// ============================================================

async function loadTeam() {
  try {
    teamData = await api('/api/team') || [];
    const container = document.getElementById('team-cards');
    if (!teamData.length) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No team members found.</p><small>Click <strong>+ Add Team Member</strong> above to add one.</small></div>`;
      return;
    }
    container.innerHTML = teamData.map(m => `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--raised);border:1px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">
              ${m.photo_url ? `<img src="${esc(m.photo_url)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover">` : esc(m.name.slice(0,2).toUpperCase())}
            </div>
            <div>
              <div style="font-size:16px;font-weight:700">${esc(m.name)}</div>
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--green);text-transform:uppercase">${esc(m.role)}</div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:14px;line-clamp:3;overflow:hidden">${esc(m.bio || 'No bio set.')}</div>
          <div style="margin-bottom:14px">${(m.skills || []).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn-sm" onclick="openTeamForm(${m.id})">Edit Profile</button>
          <button class="btn-sm btn-danger" onclick="deleteTeamMember(${m.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (ex) { toast(ex.message, 'error'); }
}

function openTeamForm(id) {
  currentTeamId = id || null;
  const m = id ? teamData.find(x => x.id === id) : null;
  document.getElementById('tm-id').value          = m?.id          || '';
  document.getElementById('tm-name').value        = m?.name        || '';
  document.getElementById('tm-role').value        = m?.role        || '';
  document.getElementById('tm-bio').value         = m?.bio         || '';
  document.getElementById('tm-skills').value      = (m?.skills || []).join(', ');
  document.getElementById('tm-photo').value       = m?.photo_url   || '';
  document.getElementById('tm-github').value      = m?.github_url  || '';
  document.getElementById('tm-resume').value      = m?.resume_url  || '';
  document.getElementById('tm-linkedin').value    = m?.linkedin_url || '';
  document.getElementById('tm-portfolio').value   = m?.portfolio_url|| '';
  document.getElementById('tm-twitter').value     = m?.twitter_url || '';
  document.getElementById('tm-order').value       = m?.member_order ?? 0;
  previewImage('tm-photo', 'tm-photo-prev');
  document.getElementById('team-drawer').classList.add('open');
}

async function saveTeamMember() {
  const id     = document.getElementById('tm-id').value;
  const skills = document.getElementById('tm-skills').value
    .split(',').map(s => s.trim()).filter(Boolean);

  const nullIfEmpty = id => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : v;
  };

  const body = {
    name:          document.getElementById('tm-name').value.trim(),
    role:          document.getElementById('tm-role').value.trim(),
    bio:           nullIfEmpty('tm-bio'),
    skills,
    photo_url:     nullIfEmpty('tm-photo'),
    github_url:    nullIfEmpty('tm-github'),
    resume_url:    nullIfEmpty('tm-resume'),
    linkedin_url:  nullIfEmpty('tm-linkedin'),
    portfolio_url: nullIfEmpty('tm-portfolio'),
    twitter_url:   nullIfEmpty('tm-twitter'),
    member_order:  parseInt(document.getElementById('tm-order').value, 10) || 0,
  };

  try {
    if (id) {
      await api(`/api/team/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Profile updated.');
    } else {
      await api('/api/team', { method: 'POST', body: JSON.stringify(body) });
      toast('Team member added.');
    }
    closeDrawer('team-drawer');
    loadTeam();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function deleteTeamMember(id) {
  if (!confirm('Remove this team member? This cannot be undone.')) return;
  try {
    await api(`/api/team/${id}`, { method: 'DELETE' });
    toast('Team member removed.');
    loadTeam();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Studio Updates / Blog — full CRUD & friendly features
// ============================================================

async function loadBlog() {
  try {
    blogData = await api('/api/blog/admin') || [];
    const tbody = document.getElementById('blog-body');
    if (!blogData.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No updates yet.</p><small>Click <strong>+ Add Update</strong> above to publish your first update.</small></div></td></tr>`;
      return;
    }
    tbody.innerHTML = blogData.map(b => `
      <tr>
        <td style="width:60px">
          <div style="width:44px;height:44px;border-radius:6px;background:var(--raised);border:1px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:10px">
            ${b.cover_url ? `<img src="${esc(b.cover_url)}" style="width:100%;height:100%;object-fit:cover">` : 'NO COVER'}
          </div>
        </td>
        <td>
          <strong>${esc(b.title)}</strong>
          <div style="font-size:11px;color:var(--muted)">/${esc(b.slug)}</div>
        </td>
        <td style="color:var(--muted);max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.excerpt || '—')}</td>
        <td>${b.published
          ? '<span class="status-badge s-ACTIVE">Published</span>'
          : '<span class="status-badge" style="background:rgba(239,68,68,.12);color:#EF4444">Draft</span>'}</td>
        <td style="color:var(--muted);font-size:12px">${fmtDate(b.published_at || b.created_at)}</td>
        <td style="display:flex;gap:8px">
          <button class="btn-sm" onclick="openBlogForm(${b.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deleteBlog(${b.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (ex) { toast(ex.message, 'error'); }
}

function openBlogForm(id) {
  currentBlogId = id || null;
  const b = id ? blogData.find(x => x.id === id) : null;
  document.getElementById('blog-drawer-title').textContent = b ? 'Edit Studio Update' : 'Add Studio Update';
  document.getElementById('bg-id').value         = b?.id        || '';
  document.getElementById('bg-title').value      = b?.title     || '';
  const slugInput = document.getElementById('bg-slug');
  slugInput.value = b?.slug || '';
  delete slugInput.dataset.manual;
  slugInput.oninput = () => { slugInput.dataset.manual = 'true'; };
  document.getElementById('bg-excerpt').value    = b?.excerpt   || '';
  document.getElementById('bg-content').value    = b?.content   || '';
  document.getElementById('bg-cover').value      = b?.cover_url || '';
  document.getElementById('bg-published').checked= b ? !!b.published : true;
  previewImage('bg-cover', 'bg-cover-prev');
  document.getElementById('blog-drawer').classList.add('open');
}

async function saveBlog() {
  const title = document.getElementById('bg-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return; }

  const body = {
    title,
    slug:        document.getElementById('bg-slug').value.trim() || slugify(title),
    excerpt:     document.getElementById('bg-excerpt').value.trim() || null,
    content:     document.getElementById('bg-content').value.trim() || null,
    cover_url:   document.getElementById('bg-cover').value.trim() || null,
    published:   document.getElementById('bg-published').checked,
  };

  try {
    if (currentBlogId) {
      await api(`/api/blog/${currentBlogId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Update saved.');
    } else {
      await api('/api/blog', { method: 'POST', body: JSON.stringify(body) });
      toast('Update created.');
    }
    closeDrawer('blog-drawer');
    loadBlog();
  } catch (ex) { toast(ex.message, 'error'); }
}

async function deleteBlog(id) {
  if (!confirm('Delete this update? This cannot be undone.')) return;
  try {
    await api(`/api/blog/${id}`, { method: 'DELETE' });
    toast('Update deleted.');
    loadBlog();
  } catch (ex) { toast(ex.message, 'error'); }
}

// ============================================================
// Drawers
// ============================================================

function closeDrawer(drawerId, e) {
  if (e && e.target !== document.getElementById(drawerId)) return;
  document.getElementById(drawerId).classList.remove('open');
}

// ============================================================
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', init);
