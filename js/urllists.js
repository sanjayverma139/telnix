// urllists.js — URL Lists with pending/apply system (mirrors policies.js pattern)

import { D, setEListType, setEListId, eListType, eListId } from './state.js';
import { $, esc, showAlert, openModal, closeModal }         from './utils.js';
import { saveData }                                         from './api.js';

// ── Pending helpers ───────────────────────────────────────────────────────────
function getPendingCount() { return (D.pendingUrlLists || []).length; }

function updateULPendingBar() {
  const bar   = $('ul-pending-bar');
  const count = $('ul-pending-count');
  const n     = getPendingCount();
  if (!bar) return;
  bar.style.display = n > 0 ? 'flex' : 'none';
  if (count) count.textContent = n + ' pending change' + (n > 1 ? 's' : '');
}

async function autosave() {
  await saveData();
  updateULPendingBar();
}

async function stageUL(item) {
  D.pendingUrlLists = D.pendingUrlLists || [];
  D.pendingUrlLists = D.pendingUrlLists.filter(p => p._pendingId !== item._pendingId);
  D.pendingUrlLists.push(item);
  await autosave();
}

async function removeULPending(pendingId) {
  D.pendingUrlLists = (D.pendingUrlLists || []).filter(p => p._pendingId !== pendingId);
  await autosave();
  renderUL();
}

// ── Apply all pending URL list changes ────────────────────────────────────────
async function applyAllULPending() {
  const btn = $('btn-ul-apply');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }
  try {
    const pending = D.pendingUrlLists || [];
    if (!pending.length) return;

    for (const item of pending) {
      if (item.type === 'create_urllist') {
        D.urlLists.push({ ...item.listData });
      } else if (item.type === 'edit_urllist') {
        const idx = D.urlLists.findIndex(l => l.id === item.originalId);
        if (idx >= 0) {
          // Replace live version with edited version
          D.urlLists[idx] = { ...item.listData, id: item.originalId };
        }
      } else if (item.type === 'delete_urllist') {
        D.urlLists = D.urlLists.filter(l => l.id !== item.originalId);
      }
    }

    D.pendingUrlLists = [];
    const ok = await saveData();
    showAlert('ul-alert', ok ? 'success' : 'error',
      ok ? '✓ URL lists applied and synced — extension updates in 1 minute'
         : 'Push failed — check Supabase permissions');
    updateULPendingBar();
    renderUL();
  } catch (e) {
    showAlert('ul-alert', 'error', 'Error: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = '▶ Apply'; }
}

async function discardAllULPending() {
  if (!confirm('Discard all pending URL list changes?')) return;
  D.pendingUrlLists = [];
  await autosave();
  renderUL();
  showAlert('ul-alert', 'success', 'Pending URL list changes discarded.');
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderUL() {
  updateULPendingBar();
  const c = $('ul-con');
  const q = $('ul-search')?.value.toLowerCase() || '';
  const live    = (D.urlLists || []).filter(l => q ? l.name.toLowerCase().includes(q) : true);
  const pending = (D.pendingUrlLists || []).filter(item => {
    const name = item.listData?.name || '';
    return q ? name.toLowerCase().includes(q) : true;
  });

  const cnt = $('ul-count');
  if (cnt) cnt.textContent = `${(D.urlLists||[]).length} live · ${(D.pendingUrlLists||[]).length} pending`;

  if (!live.length && !pending.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching lists.' : 'No URL lists yet — click + New URL List.'}</div>`;
    return;
  }

  // Live cards
  const liveHtml = live.map(l => {
    const hasPendingEdit = (D.pendingUrlLists||[]).find(p => p.type === 'edit_urllist' && p.originalId === l.id);
    return `<div class="card" style="${hasPendingEdit ? 'opacity:0.55;' : ''}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:13px;font-weight:700">${esc(l.name)}</span>
            ${hasPendingEdit ? '<span style="font-size:9px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:4px;padding:1px 6px">EDIT PENDING</span>' : ''}
          </div>
          ${l.description ? `<div style="font-size:11px;color:#64748b">${esc(l.description)}</div>` : ''}
        </div>
        <span style="background:rgba(96,165,250,.12);color:#60a5fa;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700">${(l.domains||[]).length} domains</span>
        ${!hasPendingEdit ? `<button class="btn btn-sm btn-ghost" onclick="window._openListModal('url','${l.id}')">✏ Edit</button>` : ''}
        ${!hasPendingEdit ? `<button class="btn btn-sm btn-danger" onclick="window._delList('url','${l.id}')">✕</button>` : ''}
      </div>
      <div style="font-size:11px;color:#475569;font-family:monospace;line-height:1.8">
        ${(l.domains||[]).slice(0,5).join(' · ')}
        ${(l.domains||[]).length > 5 ? ` <span style="color:#374151">+${(l.domains||[]).length-5} more</span>` : ''}
      </div>
    </div>`;
  }).join('');

  // Pending ghost cards
  const pendingHtml = pending.map(item => {
    const l   = item.listData || {};
    const isEdit = item.type === 'edit_urllist';
    const isDel  = item.type === 'delete_urllist';
    const label  = isDel ? 'DELETE PENDING' : 'NOT APPLIED';
    const color  = isDel ? '#ef4444' : '#f59e0b';
    const bg     = isDel ? 'rgba(239,68,68,.06)' : 'rgba(245,158,11,.03)';
    const border = isDel ? 'rgba(239,68,68,.4)' : 'rgba(245,158,11,.5)';
    return `<div class="card" style="border:1px dashed ${border};background:${bg}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:13px;font-weight:700">${esc(l.name || '—')}</span>
            <span style="font-size:9px;font-weight:800;color:${color};background:rgba(0,0,0,.2);border:1px solid ${color};border-radius:4px;padding:1px 6px">${label}</span>
            ${isEdit ? '<span style="font-size:10px;color:#64748b">(replaces live version on Apply)</span>' : ''}
          </div>
          ${l.description ? `<div style="font-size:11px;color:#64748b">${esc(l.description)}</div>` : ''}
        </div>
        <span style="background:rgba(96,165,250,.12);color:#60a5fa;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700">${(l.domains||[]).length} domains</span>
        ${!isDel ? `<button class="btn btn-sm btn-ghost" onclick="window._editPendingUL('${item._pendingId}')">✏ Edit</button>` : ''}
        <button class="btn btn-sm btn-danger" onclick="window._discardOneUL('${item._pendingId}')">✕</button>
      </div>
      ${!isDel ? `<div style="font-size:11px;color:#475569;font-family:monospace;line-height:1.8">
        ${(l.domains||[]).slice(0,5).join(' · ')}
        ${(l.domains||[]).length > 5 ? ` <span style="color:#374151">+${(l.domains||[]).length-5} more</span>` : ''}
      </div>` : ''}
    </div>`;
  }).join('');

  c.innerHTML = liveHtml + pendingHtml;
}

// ── List Modal ────────────────────────────────────────────────────────────────
let _editingPendingULId = null;

export function openListModal(type, id = null) {
  setEListType(type); setEListId(id);
  _editingPendingULId = null;
  const ft = type === 'ft';
  $('lm-title').textContent = id
    ? (ft ? '✏ Edit File Type List' : '✏ Edit URL List')
    : (ft ? '📝 New File Type List' : '📋 New URL List');
  $('lm-lbl').textContent     = ft ? 'Extensions (one per line, e.g. .exe)' : 'Domains (one per line)';
  $('lm-con').placeholder     = ft ? '.exe\n.msi\n.bat' : 'facebook.com\ntwitter.com';
  $('lm-al').style.display    = 'none';

  if (id) {
    const lists = ft ? D.fileTypeLists : D.urlLists;
    const l = lists.find(x => x.id === id);
    if (!l) return;
    $('lm-name').value = l.name;
    $('lm-desc').value = l.description || '';
    $('lm-con').value  = ft ? (l.extensions||[]).join('\n') : (l.domains||[]).join('\n');
  } else {
    $('lm-name').value = ''; $('lm-desc').value = ''; $('lm-con').value = '';
  }
  openModal('list-modal');
}

function openPendingListModal(pendingId) {
  _editingPendingULId = pendingId;
  const item = (D.pendingUrlLists||[]).find(p => p._pendingId === pendingId);
  if (!item) return;
  const l = item.listData || {};
  $('lm-title').textContent = '✏ Edit Pending URL List';
  $('lm-lbl').textContent   = 'Domains (one per line)';
  $('lm-con').placeholder   = 'facebook.com\ntwitter.com';
  $('lm-al').style.display  = 'none';
  $('lm-name').value = l.name || '';
  $('lm-desc').value = l.description || '';
  $('lm-con').value  = (l.domains||[]).join('\n');
  setEListType('url'); setEListId(null);
  openModal('list-modal');
}

export async function saveList() {
  const name = $('lm-name')?.value.trim();
  if (!name) { showAlert('lm-al', 'error', 'Name required'); return; }
  const ft    = eListType === 'ft';
  const items = ($('lm-con')?.value||'').split('\n').map(l => l.trim()).filter(Boolean);

  // File type lists — save immediately (no pending system)
  if (ft) {
    const obj = { name, description: $('lm-desc')?.value.trim()||'', extensions: items };
    if (eListId) {
      const i = D.fileTypeLists.findIndex(l => l.id === eListId);
      if (i >= 0) D.fileTypeLists[i] = { ...D.fileTypeLists[i], ...obj };
    } else {
      D.fileTypeLists.push({ id: 'ftl_'+Date.now(), ...obj });
    }
    closeModal('list-modal');
    await saveData();
    import('./filetypes.js').then(m => m.renderFT());
    return;
  }

  // URL lists — stage as pending
  const listData = {
    name,
    description: $('lm-desc')?.value.trim() || '',
    domains: items,
  };

  if (_editingPendingULId) {
    // Editing an existing pending item
    const idx = (D.pendingUrlLists||[]).findIndex(p => p._pendingId === _editingPendingULId);
    if (idx >= 0) {
      D.pendingUrlLists[idx].listData = { ...D.pendingUrlLists[idx].listData, ...listData };
      await autosave();
    }
  } else if (eListId) {
    // Editing a LIVE list → stage as edit (original stays live until Apply)
    await stageUL({
      _pendingId: 'pending_edit_ul_' + eListId,
      type:       'edit_urllist',
      originalId: eListId,
      listData:   { ...listData, id: eListId },
    });
  } else {
    // Brand new list → stage as create
    const id = 'ul_' + Date.now();
    await stageUL({
      _pendingId: 'pending_ul_' + id,
      type:       'create_urllist',
      listData:   { id, ...listData },
    });
  }

  closeModal('list-modal');
  renderUL();
}

async function delList(type, id) {
  if (type === 'ft') {
    if (!confirm('Delete this file type list?')) return;
    D.fileTypeLists = D.fileTypeLists.filter(l => l.id !== id);
    await saveData();
    import('./filetypes.js').then(m => m.renderFT());
    return;
  }
  const l = (D.urlLists||[]).find(x => x.id === id);
  if (!l) return;
  if (!confirm(`Delete URL list "${l.name}"?\nPolicies referencing this list will stop matching.`)) return;
  await stageUL({
    _pendingId: 'pending_del_ul_' + id,
    type:       'delete_urllist',
    originalId: id,
    listData:   { ...l },
  });
  renderUL();
}

export function initUrlLists() {
  $('ul-search')?.addEventListener('input', renderUL);
  $('btn-new-urllist')?.addEventListener('click', () => openListModal('url'));
  $('btn-save-list')?.addEventListener('click', saveList);
  $('btn-cancel-list')?.addEventListener('click', () => closeModal('list-modal'));
  $('btn-ul-apply')?.addEventListener('click', applyAllULPending);
  $('btn-ul-discard')?.addEventListener('click', discardAllULPending);

  window._openListModal   = openListModal;
  window._delList         = delList;
  window._editPendingUL   = openPendingListModal;
  window._discardOneUL    = removeULPending;
}
