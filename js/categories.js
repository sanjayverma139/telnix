// categories.js — Custom Categories with pending/apply system

import { ALL_CATS }                     from './config.js';
import { D, setECCId, eCCId }           from './state.js';
import { $, esc, showAlert, openModal, closeModal } from './utils.js';
import { saveData }                     from './api.js';

// ── Pending helpers ───────────────────────────────────────────────────────────
function getPendingCount() { return (D.pendingCustomCategories || []).length; }

function updateCCPendingBar() {
  const bar   = $('cc-pending-bar');
  const count = $('cc-pending-count');
  const n     = getPendingCount();
  if (!bar) return;
  bar.style.display = n > 0 ? 'flex' : 'none';
  if (count) count.textContent = n + ' pending change' + (n > 1 ? 's' : '');
}

async function autosaveCC() {
  await saveData();
  updateCCPendingBar();
}

async function stageCC(item) {
  D.pendingCustomCategories = D.pendingCustomCategories || [];
  D.pendingCustomCategories = D.pendingCustomCategories.filter(p => p._pendingId !== item._pendingId);
  D.pendingCustomCategories.push(item);
  await autosaveCC();
}

async function removeCCPending(pendingId) {
  D.pendingCustomCategories = (D.pendingCustomCategories||[]).filter(p => p._pendingId !== pendingId);
  await autosaveCC();
  renderCats();
}

// ── Apply all pending ─────────────────────────────────────────────────────────
async function applyAllCCPending() {
  const btn = $('btn-cc-apply');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }
  try {
    const pending = D.pendingCustomCategories || [];
    if (!pending.length) return;

    for (const item of pending) {
      if (item.type === 'create_customcat') {
        D.customCategories.push({ ...item.catData });
      } else if (item.type === 'edit_customcat') {
        const idx = D.customCategories.findIndex(c => c.id === item.originalId);
        if (idx >= 0) D.customCategories[idx] = { ...item.catData, id: item.originalId };
      } else if (item.type === 'delete_customcat') {
        D.customCategories = D.customCategories.filter(c => c.id !== item.originalId);
      }
    }

    D.pendingCustomCategories = [];
    const ok = await saveData();
    showAlert('cc-alert', ok ? 'success' : 'error',
      ok ? '✓ Custom categories applied — extension updates in 1 minute'
         : 'Push failed — check Supabase permissions');
    updateCCPendingBar();
    renderCats();
  } catch (e) {
    showAlert('cc-alert', 'error', 'Error: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = '▶ Apply'; }
}

async function discardAllCCPending() {
  if (!confirm('Discard all pending custom category changes?')) return;
  D.pendingCustomCategories = [];
  await autosaveCC();
  renderCats();
  showAlert('cc-alert', 'success', 'Pending changes discarded.');
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderCats() {
  updateCCPendingBar();
  const c = $('cat-con');
  const q = $('cat-search')?.value.toLowerCase() || '';
  const live    = (D.customCategories||[]).filter(x => q ? x.name.toLowerCase().includes(q) : true);
  const pending = (D.pendingCustomCategories||[]).filter(item => {
    const name = item.catData?.name || '';
    return q ? name.toLowerCase().includes(q) : true;
  });

  const cnt = $('custom-cat-count');
  if (cnt) cnt.textContent = `${(D.customCategories||[]).length} live · ${(D.pendingCustomCategories||[]).length} pending`;

  if (!live.length && !pending.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching categories.' : 'No custom categories — click + New Category.'}</div>`;
    return;
  }

  // Live cards
  const liveHtml = live.map(cat => {
    const hasPendingEdit = (D.pendingCustomCategories||[]).find(p => p.type === 'edit_customcat' && p.originalId === cat.id);
    const urlListNames   = (cat.urlListIds||[]).map(id => {
      const l = (D.urlLists||[]).find(x => x.id === id);
      return l ? `<span style="background:rgba(96,165,250,.1);color:#60a5fa;border-radius:4px;padding:1px 6px;font-size:10px">${esc(l.name)}</span>` : '';
    }).join(' ');
    const predCatTags = (cat.predefinedCategories||[]).map(c =>
      `<span style="background:rgba(167,139,250,.1);color:#a78bfa;border-radius:4px;padding:1px 6px;font-size:10px">${esc(c)}</span>`
    ).join(' ');
    const exCount = (cat.exclusionUrls||[]).length + (cat.exclusionListIds||[]).length;

    return `<div class="card" style="${hasPendingEdit ? 'opacity:0.55;' : ''}">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700">${esc(cat.name)}</span>
            ${hasPendingEdit ? '<span style="font-size:9px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:4px;padding:1px 6px">EDIT PENDING</span>' : ''}
          </div>
          ${cat.description ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px">${esc(cat.description)}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${urlListNames} ${predCatTags}
            ${(cat.domains||[]).length ? `<span style="background:rgba(16,185,129,.1);color:#10b981;border-radius:4px;padding:1px 6px;font-size:10px">${(cat.domains||[]).length} domains</span>` : ''}
            ${exCount ? `<span style="background:rgba(239,68,68,.08);color:#f87171;border-radius:4px;padding:1px 6px;font-size:10px">−${exCount} exclusions</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${!hasPendingEdit ? `<button class="btn btn-sm btn-ghost" onclick="window._openCCModal('${cat.id}')">✏ Edit</button>` : ''}
          ${!hasPendingEdit ? `<button class="btn btn-sm btn-danger" onclick="window._delCC('${cat.id}')">✕</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  // Pending ghost cards
  const pendingHtml = (D.pendingCustomCategories||[])
    .filter(item => q ? (item.catData?.name||'').toLowerCase().includes(q) : true)
    .map(item => {
      const cat    = item.catData || {};
      const isEdit = item.type === 'edit_customcat';
      const isDel  = item.type === 'delete_customcat';
      const label  = isDel ? 'DELETE PENDING' : 'NOT APPLIED';
      const color  = isDel ? '#ef4444' : '#f59e0b';
      const bg     = isDel ? 'rgba(239,68,68,.06)' : 'rgba(245,158,11,.03)';
      const border = isDel ? 'rgba(239,68,68,.4)' : 'rgba(245,158,11,.5)';
      const urlListNames = (cat.urlListIds||[]).map(id => {
        const l = (D.urlLists||[]).find(x => x.id === id);
        return l ? `<span style="background:rgba(96,165,250,.1);color:#60a5fa;border-radius:4px;padding:1px 6px;font-size:10px">${esc(l.name)}</span>` : '';
      }).join(' ');
      const predCatTags = (cat.predefinedCategories||[]).map(c =>
        `<span style="background:rgba(167,139,250,.1);color:#a78bfa;border-radius:4px;padding:1px 6px;font-size:10px">${esc(c)}</span>`
      ).join(' ');

      return `<div class="card" style="border:1px dashed ${border};background:${bg}">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:13px;font-weight:700">${esc(cat.name||'—')}</span>
              <span style="font-size:9px;font-weight:800;color:${color};background:rgba(0,0,0,.2);border:1px solid ${color};border-radius:4px;padding:1px 6px">${label}</span>
              ${isEdit ? '<span style="font-size:10px;color:#64748b">(replaces live version on Apply)</span>' : ''}
            </div>
            ${cat.description ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px">${esc(cat.description)}</div>` : ''}
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${urlListNames} ${predCatTags}
              ${(cat.domains||[]).length ? `<span style="background:rgba(16,185,129,.1);color:#10b981;border-radius:4px;padding:1px 6px;font-size:10px">${(cat.domains||[]).length} domains</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${!isDel ? `<button class="btn btn-sm btn-ghost" onclick="window._editPendingCC('${item._pendingId}')">✏ Edit</button>` : ''}
            <button class="btn btn-sm btn-danger" onclick="window._discardOneCC('${item._pendingId}')">✕</button>
          </div>
        </div>
      </div>`;
    }).join('');

  c.innerHTML = liveHtml + pendingHtml;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
let _editingPendingCCId = null;

export function openCCModal(id = null, pendingId = null) {
  setECCId(id);
  _editingPendingCCId = pendingId;
  $('cc-modal-title').textContent = pendingId ? '✏ Edit Pending Category' : id ? '✏ Edit Custom Category' : '📁 New Custom Category';
  $('cc-al').style.display = 'none';

  const cat = pendingId
    ? (D.pendingCustomCategories||[]).find(p => p._pendingId === pendingId)?.catData
    : id ? (D.customCategories||[]).find(c => c.id === id) : null;

  if (cat) {
    $('cc-name').value = cat.name || '';
    $('cc-desc').value = cat.description || '';
    $('cc-domains').value = (cat.domains||[]).join('\n');
    $('cc-excl-urls').value = (cat.exclusionUrls||[]).join('\n');
    document.querySelectorAll('#cc-pred-cats input[type=checkbox]').forEach(cb => {
      cb.checked = (cat.predefinedCategories||[]).includes(cb.value);
    });
  } else {
    $('cc-name').value = ''; $('cc-desc').value = '';
    $('cc-domains').value = ''; $('cc-excl-urls').value = '';
    document.querySelectorAll('#cc-pred-cats input, #cc-url-lists input, #cc-excl-lists input').forEach(cb => { cb.checked = false; });
  }

  buildCCUrlListOptions(cat);
  openModal('cc-modal');
}

function buildCCUrlListOptions(cat) {
  const lists = D.urlLists || [];
  const mk = (containerId, selectedIds) => {
    const el = $(containerId); if (!el) return;
    if (!lists.length) { el.innerHTML = '<div style="color:#64748b;font-size:12px">No URL lists yet</div>'; return; }
    el.innerHTML = lists.map(l =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;padding:4px 0">
        <input type="checkbox" value="${l.id}" style="accent-color:#6366f1;margin:0"
          ${(selectedIds||[]).includes(l.id) ? 'checked' : ''}>
        ${esc(l.name)} <span style="color:#475569">(${(l.domains||[]).length})</span>
      </label>`
    ).join('');
  };
  mk('cc-url-lists',  cat?.urlListIds       || []);
  mk('cc-excl-lists', cat?.exclusionListIds || []);
}

export async function saveCC() {
  const name = $('cc-name')?.value.trim();
  if (!name) { showAlert('cc-al', 'error', 'Name required'); return; }

  const predCats   = [...document.querySelectorAll('#cc-pred-cats input:checked')].map(c => c.value);
  const urlListIds = [...document.querySelectorAll('#cc-url-lists input:checked')].map(c => c.value);
  const exListIds  = [...document.querySelectorAll('#cc-excl-lists input:checked')].map(c => c.value);
  const domains    = ($('cc-domains')?.value||'').split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const exUrls     = ($('cc-excl-urls')?.value||'').split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);

  const catData = {
    name,
    description:          $('cc-desc')?.value.trim() || '',
    domains,
    predefinedCategories: predCats,
    urlListIds,
    exclusionListIds:     exListIds,
    exclusionUrls:        exUrls,
  };

  if (_editingPendingCCId) {
    // Editing existing pending
    const idx = (D.pendingCustomCategories||[]).findIndex(p => p._pendingId === _editingPendingCCId);
    if (idx >= 0) {
      D.pendingCustomCategories[idx].catData = { ...D.pendingCustomCategories[idx].catData, ...catData };
      await autosaveCC();
    }
  } else if (eCCId) {
    // Editing live category → stage as edit
    await stageCC({
      _pendingId: 'pending_edit_cc_' + eCCId,
      type:       'edit_customcat',
      originalId: eCCId,
      catData:    { ...catData, id: eCCId },
    });
  } else {
    // New category → stage as create
    const id = 'cc_' + Date.now();
    await stageCC({
      _pendingId: 'pending_cc_' + id,
      type:       'create_customcat',
      catData:    { id, ...catData },
    });
  }

  closeModal('cc-modal');
  renderCats();
}

async function delCC(id) {
  const cat = (D.customCategories||[]).find(c => c.id === id);
  if (!cat) return;
  if (!confirm(`Delete category "${cat.name}"?\nPolicies using this category will stop matching.`)) return;
  await stageCC({
    _pendingId: 'pending_del_cc_' + id,
    type:       'delete_customcat',
    originalId: id,
    catData:    { ...cat },
  });
  renderCats();
}

export function initCategories() {
  $('cat-search')?.addEventListener('input', renderCats);
  $('btn-new-cc')?.addEventListener('click', () => openCCModal());
  $('btn-save-cc')?.addEventListener('click', saveCC);
  $('btn-cancel-cc')?.addEventListener('click', () => closeModal('cc-modal'));
  $('btn-cc-apply')?.addEventListener('click', applyAllCCPending);
  $('btn-cc-discard')?.addEventListener('click', discardAllCCPending);

  // Populate predefined category checkboxes
  const predEl = $('cc-pred-cats');
  if (predEl) {
    predEl.innerHTML = ALL_CATS.map(c =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;padding:3px 0">
        <input type="checkbox" value="${c}" style="accent-color:#6366f1;margin:0"> ${c}
      </label>`
    ).join('');
  }

  window._openCCModal      = id => openCCModal(id);
  window._delCC            = delCC;
  window._editPendingCC    = pendingId => openCCModal(null, pendingId);
  window._discardOneCC     = removeCCPending;
}
