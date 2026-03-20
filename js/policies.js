// ─────────────────────────────────────────────────────────────────────────────
// policies.js — Policies page: groups, policy rows, create/edit modal
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_CATS }                    from './config.js';
import { D, setCurAct, setCurActiv, setCurType,
         setEPolId, setEListId, setEListType,
         curAct, curActiv, curType, ePolId }  from './state.js';
import { $, esc, showAlert, openModal, closeModal } from './utils.js';
import { saveData }                    from './api.js';

const TC = { domain:'#818cf8', category:'#34d399', list:'#60a5fa', threat:'#f87171', reputation:'#fb923c' };

// ── Render ────────────────────────────────────────────────────────────────────

export function renderPols() {
  $('def-action').value = D.policySettings.defaultAction || 'allow';
  const c = $('pol-con');
  if (!D.policyGroups.length) { c.innerHTML = '<div class="loading">No groups — click New Group.</div>'; return; }

  c.innerHTML = D.policyGroups.map((g, gi) => {
    const ps = (g.policyIds || []).map(id => D.orderedPolicies.find(p => p.id === id)).filter(Boolean);
    return `
      <div class="pol-group">
        <div class="pol-group-hdr">
          <span style="color:#64748b;font-size:12px;font-weight:700">${gi + 1}.</span>
          <span class="pol-group-name">${esc(g.name)}</span>
          ${!g._isDefault ? `<button class="btn btn-sm btn-danger" onclick="window._delGrp('${g.id}')">Del</button>` : ''}
        </div>
        ${ps.map((pol, pi) => `
          <div class="pol-row">
            <div>
              <div class="pol-name">${gi + 1}.${pi + 1} ${esc(pol.name)}</div>
              ${pol.note ? `<div style="font-size:11px;color:#475569">${esc(pol.note)}</div>` : ''}
            </div>
            <span style="background:${TC[pol.type] || '#818cf8'}18;color:${TC[pol.type] || '#818cf8'};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${pol.type || 'domain'}</span>
            <span class="badge badge-${pol.action || 'block'}">${pol.action || 'block'}</span>
            <span class="badge badge-${pol.activity || 'browse'}">${pol.activity || 'browse'}</span>
            <button class="toggle ${pol.enabled !== false ? 'on' : ''}" onclick="window._togPol('${pol.id}')"></button>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-ghost" onclick="window._openPolModal('${pol.id}')">✏</button>
              <button class="btn btn-sm btn-danger" onclick="window._delPol('${pol.id}')">✕</button>
            </div>
          </div>`).join('')}
        ${ps.length === 0 ? `<div style="padding:12px 16px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,.04)">No policies — click + New Policy</div>` : ''}
      </div>`;
  }).join('');
}

// ── Group CRUD ────────────────────────────────────────────────────────────────

export function openGrpModal() {
  $('gm-name').value = '';
  openModal('grp-modal');
  setTimeout(() => $('gm-name').focus(), 100);
}

export function saveGrp() {
  const n = $('gm-name').value.trim();
  if (!n) return;
  D.policyGroups.push({ id: 'grp_' + Date.now(), name: n, policyIds: [] });
  closeModal('grp-modal');
  renderPols();
}

function delGrp(id) {
  if (!confirm('Delete group? Policies will be moved to Default.')) return;
  const dest = D.policyGroups.find(g => g.id !== id);
  D.policyGroups.find(g => g.id === id)?.policyIds?.forEach(pid => { if (dest) dest.policyIds.push(pid); });
  D.policyGroups = D.policyGroups.filter(g => g.id !== id);
  renderPols();
}

// ── Policy CRUD ───────────────────────────────────────────────────────────────

function togPol(id) {
  const p = D.orderedPolicies.find(p => p.id === id);
  if (p) p.enabled = p.enabled === false ? true : false;
  renderPols();
}

function delPol(id) {
  if (!confirm('Delete policy?')) return;
  D.orderedPolicies = D.orderedPolicies.filter(p => p.id !== id);
  D.policyGroups.forEach(g => { g.policyIds = (g.policyIds || []).filter(i => i !== id); });
  renderPols();
}

// ── Policy Modal ──────────────────────────────────────────────────────────────

export function openPolModal(id = null) {
  setEPolId(id);
  setCurAct('block'); setCurActiv('browse'); setCurType('domain');
  $('pm-title').textContent = id ? 'Edit Policy' : 'New Policy';
  $('pm-al').style.display = 'none';

  // Populate group select
  $('pm-grp').innerHTML = D.policyGroups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');

  // Populate file type list select
  $('pm-ftl').innerHTML = '<option value="">All file types</option>' +
    D.fileTypeLists.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');

  // Reset all fields
  ['pm-name', 'pm-doms', 'pm-note'].forEach(x => { const e = $(x); if (e) e.value = ''; });
  $('pm-cat-chips').innerHTML = '';
  $('pm-list-cbs').innerHTML = '';
  $('pm-sthr').value = 55;
  $('pm-en').className = 'toggle on';
  buildCatList();
  setType('domain'); setAct('block'); setActiv('browse');

  if (id) {
    const pol = D.orderedPolicies.find(p => p.id === id);
    if (!pol) return;
    $('pm-name').value = pol.name || '';
    $('pm-note').value = pol.note || '';
    if (pol.enabled === false) $('pm-en').className = 'toggle';
    const grpOf = D.policyGroups.find(g => g.policyIds?.includes(id));
    if (grpOf) $('pm-grp').value = grpOf.id;
    setType(pol.type || 'domain');
    setAct(pol.action || 'block');
    setActiv(pol.activity || 'browse');
    const c = pol.conditions || {};
    if (c.domains)     $('pm-doms').value = c.domains.join('\n');
    if (c.categories)  { c.categories.forEach(v => addCatChip(v)); buildCatList(); }
    if (c.listIds)     { buildListCbs(); c.listIds.forEach(lid => { const cb = $('pm-list-cbs').querySelector(`[value="${lid}"]`); if (cb) cb.checked = true; }); }
    if (c.scoreOp)     $('pm-sop').value = c.scoreOp;
    if (c.scoreThreshold != null) $('pm-sthr').value = c.scoreThreshold;
    if (pol.fileTypeListId) $('pm-ftl').value = pol.fileTypeListId;
  }
  openModal('pol-modal');
}

export function setType(t) {
  setCurType(t);
  document.querySelectorAll('.type-card').forEach(c => c.classList.toggle('sel', c.dataset.t === t));
  ['domain','category','list','threat','reputation'].forEach(x => $(('crit-' + x))?.classList.toggle('hid', x !== t));
  if (t === 'list') buildListCbs();
}

export function setAct(a) {
  setCurAct(a);
  document.querySelectorAll('.abtn[data-a]').forEach(b => {
    b.className = 'abtn' + (b.dataset.a === a ? ` sel-${a}` : '');
  });
}

export function setActiv(a) {
  setCurActiv(a);
  document.querySelectorAll('.abtn[data-v]').forEach(b => b.classList.toggle('sel-act', b.dataset.v === a));
  $('pm-ftrow')?.classList.toggle('hid', a === 'browse');
}

// ── Category chip selector ────────────────────────────────────────────────────

export function buildCatList() {
  const selected = new Set([...$('pm-cat-chips').querySelectorAll('[data-c]')].map(c => c.dataset.c));
  const all      = [...ALL_CATS, ...D.customCategories.map(c => c.name)];
  const q        = $('pm-cat-search')?.value.toLowerCase() || '';
  const filtered = q ? all.filter(c => c.includes(q)) : all;
  $('pm-cat-list').innerHTML = filtered.map(v => `
    <div class="cat-item${selected.has(v) ? ' selected' : ''}" onclick="window._toggleCat('${esc(v)}')">
      <input type="checkbox" ${selected.has(v) ? 'checked' : ''} onclick="event.stopPropagation();window._toggleCat('${esc(v)}')">
      <span>${esc(v)}</span>
    </div>`).join('');
}

export function toggleCat(v) {
  const chips    = $('pm-cat-chips');
  const existing = chips.querySelector(`[data-c="${CSS.escape(v)}"]`);
  if (existing) existing.remove(); else addCatChip(v);
  buildCatList();
}

function addCatChip(v) {
  if ($('pm-cat-chips').querySelector(`[data-c="${CSS.escape(v)}"]`)) return;
  const d = document.createElement('div');
  d.className = 'chip'; d.dataset.c = v;
  d.innerHTML = `${esc(v)} <button onclick="window._toggleCat('${esc(v)}')">✕</button>`;
  $('pm-cat-chips').appendChild(d);
}

function buildListCbs() {
  if (!D.urlLists.length) { $('pm-list-cbs').innerHTML = '<div style="color:#64748b;font-size:12px">No URL lists yet</div>'; return; }
  $('pm-list-cbs').innerHTML = D.urlLists.map(l =>
    `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer">
      <input type="checkbox" value="${l.id}" style="accent-color:#6366f1;width:14px;height:14px;margin:0">
      ${esc(l.name)} <span style="color:#475569">(${(l.domains || []).length})</span>
    </label>`
  ).join('');
}

// ── Save policy ───────────────────────────────────────────────────────────────

export function savePol() {
  const name = $('pm-name').value.trim();
  if (!name) { showAlert('pm-al', 'error', 'Policy name is required'); return; }
  const grpId = $('pm-grp').value;
  if (!grpId) { showAlert('pm-al', 'error', 'Select a group'); return; }

  const cats    = [...$('pm-cat-chips').querySelectorAll('[data-c]')].map(c => c.dataset.c);
  const listIds = [...$('pm-list-cbs').querySelectorAll('input:checked')].map(i => i.value);
  const doms    = $('pm-doms').value.split('\n').map(s => s.trim().toLowerCase().replace(/^www\./, '')).filter(Boolean);

  const conditions = {};
  if (curType === 'domain')     conditions.domains     = doms;
  if (curType === 'category')   conditions.categories  = cats;
  if (curType === 'list')       conditions.listIds     = listIds;
  if (curType === 'threat')     { conditions.scoreOp = $('pm-sop').value; conditions.scoreThreshold = parseInt($('pm-sthr').value); }
  if (curType === 'reputation') conditions.requireKnownMalicious = true;

  const pol = {
    name, type: curType, action: curAct, activity: curActiv, conditions,
    note: $('pm-note').value.trim(),
    enabled: $('pm-en').classList.contains('on'),
    fileTypeListId: $('pm-ftl').value || null,
  };

  if (ePolId) {
    const i = D.orderedPolicies.findIndex(p => p.id === ePolId);
    if (i >= 0) D.orderedPolicies[i] = { ...D.orderedPolicies[i], ...pol };
  } else {
    const id = 'pol_' + Date.now();
    pol.id = id;
    D.orderedPolicies.push(pol);
    const grp = D.policyGroups.find(g => g.id === grpId);
    if (grp) grp.policyIds.push(id);
  }
  closeModal('pol-modal');
  renderPols();
}

// ── Push all ──────────────────────────────────────────────────────────────────

export async function pushAll() {
  const btn = $('push-btn');
  btn.disabled = true; btn.textContent = 'Pushing...';
  try {
    D.policySettings.defaultAction = $('def-action').value;
    const ok = await saveData();
    showAlert('pol-al', ok ? 'success' : 'error',
      ok ? '✓ Pushed — all extension users will sync within 1 minute'
         : 'Push failed. Check Supabase RLS and GRANT permissions.');
  } catch (e) {
    showAlert('pol-al', 'error', 'Error: ' + e.message);
  }
  btn.disabled = false; btn.textContent = '☁ Push to Users';
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initPolicies() {
  $('btn-new-policy')?.addEventListener('click',   () => openPolModal());
  $('btn-new-group')?.addEventListener('click',    openGrpModal);
  $('push-btn')?.addEventListener('click',         pushAll);
  $('btn-save-grp')?.addEventListener('click',     saveGrp);
  $('btn-cancel-grp')?.addEventListener('click',   () => closeModal('grp-modal'));
  $('btn-save-pol')?.addEventListener('click',     savePol);
  $('btn-cancel-pol')?.addEventListener('click',   () => closeModal('pol-modal'));
  $('pm-cat-search')?.addEventListener('input',    buildCatList);
  document.querySelectorAll('.type-card').forEach(c => c.addEventListener('click', () => setType(c.dataset.t)));

  // Expose to onclick handlers in innerHTML (needed because innerHTML can't access module scope)
  window._togPol      = togPol;
  window._delPol      = delPol;
  window._delGrp      = delGrp;
  window._openPolModal= openPolModal;
  window._toggleCat   = toggleCat;
}
