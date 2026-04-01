// urllists.js — URL Lists with pending/apply system + styled delete modal

import { D, setEListType, setEListId, eListType, eListId } from './state.js';
import { $, esc, showAlert, openModal, closeModal, parseDomainLines } from './utils.js';
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

// ── Apply ─────────────────────────────────────────────────────────────────────
async function applyAllULPending() {
  const btn = $('btn-ul-apply');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }
  try {
    for (const item of (D.pendingUrlLists || [])) {
      if (item.type === 'create_urllist') {
        D.urlLists.push({ ...item.listData });
      } else if (item.type === 'edit_urllist') {
        const idx = D.urlLists.findIndex(l => l.id === item.originalId);
        if (idx >= 0) D.urlLists[idx] = { ...item.listData, id: item.originalId };
      } else if (item.type === 'delete_urllist') {
        D.urlLists = D.urlLists.filter(l => l.id !== item.originalId);
      }
    }
    D.pendingUrlLists = [];
    const ok = await saveData();
    showAlert('ul-alert', ok ? 'success' : 'error',
      ok ? '✓ URL lists applied — extension updates in 1 minute' : 'Push failed — check Supabase permissions');
    updateULPendingBar();
    renderUL();
  } catch (e) { showAlert('ul-alert', 'error', 'Error: ' + e.message); }
  if (btn) { btn.disabled = false; btn.textContent = '▶ Apply'; }
}

async function discardAllULPending() {
  if (!confirm('Discard all pending URL list changes?')) return;
  D.pendingUrlLists = [];
  await autosave();
  renderUL();
  showAlert('ul-alert', 'success', 'Pending changes discarded.');
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderUL() {
  updateULPendingBar();
  const c = $('ul-con');
  const q = $('ul-search')?.value.toLowerCase() || '';
  const live    = (D.urlLists || []).filter(l => q ? l.name.toLowerCase().includes(q) : true);
  const pending = (D.pendingUrlLists || []).filter(item => q ? (item.listData?.name||'').toLowerCase().includes(q) : true);

  const cnt = $('ul-count');
  if (cnt) cnt.textContent = `${(D.urlLists||[]).length} live · ${(D.pendingUrlLists||[]).length} pending`;

  if (!live.length && !pending.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching lists.' : 'No URL lists yet — click + New URL List.'}</div>`;
    return;
  }

  // Live cards — click anywhere to open edit, no domain preview shown
  const liveHtml = live.map(l => {
    const hasPendingEdit = (D.pendingUrlLists||[]).find(p => p.type === 'edit_urllist' && p.originalId === l.id);
    return `<div class="card" style="display:flex;align-items:center;gap:14px;cursor:pointer;${hasPendingEdit?'opacity:0.55;':''}" onclick="window._openListModal('url','${l.id}')">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;font-weight:700">${esc(l.name)}</span>
          ${hasPendingEdit ? '<span style="font-size:9px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:4px;padding:1px 6px">EDIT PENDING</span>' : ''}
        </div>
        ${l.description ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(l.description)}</div>` : ''}
      </div>
      <span style="background:rgba(96,165,250,.12);color:#60a5fa;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700;flex-shrink:0">${(l.domains||[]).length} domains</span>
      ${!hasPendingEdit ? `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window._openListModal('url','${l.id}')">✏ Edit</button>` : ''}
      ${!hasPendingEdit ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();window._confirmDelList('url','${l.id}')">✕</button>` : ''}
    </div>`;
  }).join('');

  // Ghost pending cards
  const pendingHtml = pending.map(item => {
    const l      = item.listData || {};
    const isEdit = item.type === 'edit_urllist';
    const isDel  = item.type === 'delete_urllist';
    const label  = isDel ? 'DELETE PENDING' : 'NOT APPLIED';
    const color  = isDel ? '#ef4444' : '#f59e0b';
    const bg     = isDel ? 'rgba(239,68,68,.06)' : 'rgba(245,158,11,.03)';
    const border = isDel ? 'rgba(239,68,68,.4)' : 'rgba(245,158,11,.5)';
    return `<div class="card" style="display:flex;align-items:center;gap:14px;border:1px dashed ${border};background:${bg}">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;font-weight:700">${esc(l.name||'—')}</span>
          <span style="font-size:9px;font-weight:800;color:${color};background:rgba(0,0,0,.2);border:1px solid ${color};border-radius:4px;padding:1px 6px">${label}</span>
          ${isEdit ? '<span style="font-size:10px;color:#64748b">(replaces live on Apply)</span>' : ''}
        </div>
        ${l.description ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(l.description)}</div>` : ''}
      </div>
      <span style="background:rgba(96,165,250,.12);color:#60a5fa;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700;flex-shrink:0">${(l.domains||[]).length} domains</span>
      ${!isDel ? `<button class="btn btn-sm btn-ghost" onclick="window._editPendingUL('${item._pendingId}')">✏ Edit</button>` : ''}
      <button class="btn btn-sm btn-danger" onclick="window._discardOneUL('${item._pendingId}')">✕</button>
    </div>`;
  }).join('');

  c.innerHTML = liveHtml + pendingHtml;
}

// ── Styled delete confirm modal ────────────────────────────────────────────────
function confirmDelList(type, id) {
  const lists = type === 'ft' ? D.fileTypeLists : D.urlLists;
  const l     = (lists||[]).find(x => x.id === id);
  if (!l) return;
  $('del-modal-name').textContent = l.name;
  $('del-modal-type').textContent = type === 'ft' ? 'file type list' : 'URL list';
  $('btn-del-confirm').onclick = () => { closeModal('del-confirm-modal'); delList(type, id); };
  $('btn-del-cancel').onclick  = () => closeModal('del-confirm-modal');
  openModal('del-confirm-modal');
}

// ── List Modal ────────────────────────────────────────────────────────────────
let _editingPendingULId = null;

export function openListModal(type, id = null) {
  setEListType(type); setEListId(id);
  _editingPendingULId = null;
  const ft = type === 'ft';
  $('lm-title').textContent   = id ? (ft ? '✏ Edit File Type List' : '✏ Edit URL List') : (ft ? '📝 New File Type List' : '📋 New URL List');
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

  const parsed = parseDomainLines(items.join('\n'));
  if (parsed.invalid.length) {
    showAlert('lm-al', 'error', `Invalid domain entries: ${parsed.invalid.slice(0, 3).join(', ')}`);
    return;
  }
  if (!parsed.domains.length) {
    showAlert('lm-al', 'error', 'Add at least one valid domain.');
    return;
  }

  const listData = { name, description: $('lm-desc')?.value.trim()||'', domains: parsed.domains };

  if (_editingPendingULId) {
    const idx = (D.pendingUrlLists||[]).findIndex(p => p._pendingId === _editingPendingULId);
    if (idx >= 0) { D.pendingUrlLists[idx].listData = { ...D.pendingUrlLists[idx].listData, ...listData }; await autosave(); }
  } else if (eListId) {
    await stageUL({ _pendingId:'pending_edit_ul_'+eListId, type:'edit_urllist', originalId:eListId, listData:{ ...listData, id:eListId } });
  } else {
    const id = 'ul_'+Date.now();
    await stageUL({ _pendingId:'pending_ul_'+id, type:'create_urllist', listData:{ id, ...listData } });
  }

  closeModal('list-modal');
  renderUL();
}

async function delList(type, id) {
  if (type === 'ft') {
    D.fileTypeLists = D.fileTypeLists.filter(l => l.id !== id);
    await saveData();
    import('./filetypes.js').then(m => m.renderFT());
    return;
  }
  const l = (D.urlLists||[]).find(x => x.id === id);
  await stageUL({ _pendingId:'pending_del_ul_'+id, type:'delete_urllist', originalId:id, listData:{ ...l } });
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
  window._confirmDelList  = confirmDelList;
  window._editPendingUL   = openPendingListModal;
  window._discardOneUL    = removeULPending;
}
