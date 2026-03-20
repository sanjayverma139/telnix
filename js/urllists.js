// ─────────────────────────────────────────────────────────────────────────────
// urllists.js — URL Lists page
// ─────────────────────────────────────────────────────────────────────────────

import { D, setEListType, setEListId, eListType, eListId } from './state.js';
import { $, esc, showAlert, openModal, closeModal }         from './utils.js';

export function renderUL() {
  const c = $('ul-con');
  const q = $('ul-search')?.value.toLowerCase() || '';
  let lists = D.urlLists;
  if (q) lists = lists.filter(l => l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));

  if (!lists.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching lists.' : 'No URL lists yet — click + New URL List.'}</div>`;
    return;
  }

  c.innerHTML = lists.map(l => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${esc(l.name)}</div>
          ${l.description ? `<div style="font-size:11px;color:#64748b">${esc(l.description)}</div>` : ''}
        </div>
        <span style="background:rgba(96,165,250,.12);color:#60a5fa;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700">${(l.domains || []).length} domains</span>
        <button class="btn btn-sm btn-ghost" onclick="window._openListModal('url','${l.id}')">✏ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="window._delList('url','${l.id}')">✕</button>
      </div>
      <div style="font-size:11px;color:#475569;font-family:monospace;line-height:1.8">
        ${(l.domains || []).slice(0, 5).join(' · ')}
        ${(l.domains || []).length > 5 ? ` <span style="color:#374151">+${(l.domains || []).length - 5} more</span>` : ''}
      </div>
    </div>`).join('');
}

export function openListModal(type, id = null) {
  setEListType(type); setEListId(id);
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
    $('lm-con').value  = ft ? (l.extensions || []).join('\n') : (l.domains || []).join('\n');
  } else {
    $('lm-name').value = ''; $('lm-desc').value = ''; $('lm-con').value = '';
  }
  openModal('list-modal');
}

export function saveList() {
  const name = $('lm-name').value.trim();
  if (!name) { showAlert('lm-al', 'error', 'Name required'); return; }
  const ft    = eListType === 'ft';
  const items = $('lm-con').value.split('\n').map(l => l.trim()).filter(Boolean);
  const obj   = { name, description: $('lm-desc').value.trim(), ...(ft ? { extensions: items } : { domains: items }) };
  const lists = ft ? D.fileTypeLists : D.urlLists;
  if (eListId) {
    const i = lists.findIndex(l => l.id === eListId);
    if (i >= 0) lists[i] = { ...lists[i], ...obj };
  } else {
    lists.push({ id: (ft ? 'ftl_' : 'ul_') + Date.now(), ...obj });
  }
  closeModal('list-modal');
  ft ? import('./filetypes.js').then(m => m.renderFT()) : renderUL();
}

function delList(type, id) {
  if (!confirm('Delete this list?')) return;
  if (type === 'ft') D.fileTypeLists = D.fileTypeLists.filter(l => l.id !== id);
  else               D.urlLists      = D.urlLists.filter(l => l.id !== id);
  type === 'ft' ? import('./filetypes.js').then(m => m.renderFT()) : renderUL();
}

export function initUrlLists() {
  $('ul-search')?.addEventListener('input', renderUL);
  $('btn-new-urllist')?.addEventListener('click',    () => openListModal('url'));
  $('btn-save-list')?.addEventListener('click',      saveList);
  $('btn-cancel-list')?.addEventListener('click',    () => closeModal('list-modal'));
  window._openListModal = openListModal;
  window._delList       = delList;
}
