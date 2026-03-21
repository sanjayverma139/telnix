// categories.js — Custom Categories (combine URL lists + predefined cats + exclusions)

import { ALL_CATS }                     from './config.js';
import { D, setECCId, eCCId }           from './state.js';
import { $, esc, showAlert, openModal, closeModal } from './utils.js';

export function renderCats() {
  const c = $('cat-con');
  const q = $('cat-search')?.value.toLowerCase() || '';
  let cats = D.customCategories || [];
  if (q) cats = cats.filter(x => x.name.toLowerCase().includes(q));

  // Update count
  const cnt = $('custom-cat-count');
  if (cnt) cnt.textContent = `${(D.customCategories||[]).length} total`;

  if (!cats.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching categories.' : 'No custom categories — click + New Category.'}</div>`;
    return;
  }

  c.innerHTML = cats.map(cat => {
    const urlListNames = (cat.urlListIds||[]).map(id => {
      const l = (D.urlLists||[]).find(x => x.id === id);
      return l ? `<span style="background:rgba(96,165,250,.1);color:#60a5fa;border-radius:4px;padding:1px 6px;font-size:10px">${esc(l.name)}</span>` : '';
    }).join(' ');
    const predCatTags = (cat.predefinedCategories||[]).map(c =>
      `<span style="background:rgba(167,139,250,.1);color:#a78bfa;border-radius:4px;padding:1px 6px;font-size:10px">${esc(c)}</span>`
    ).join(' ');
    const exCount = (cat.exclusionUrls||[]).length + (cat.exclusionListIds||[]).length;
    return `<div class="card">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">${esc(cat.name)}</div>
          ${cat.description ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px">${esc(cat.description)}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${urlListNames} ${predCatTags}
            ${(cat.domains||[]).length ? `<span style="background:rgba(16,185,129,.1);color:#10b981;border-radius:4px;padding:1px 6px;font-size:10px">${(cat.domains||[]).length} domains</span>` : ''}
            ${exCount ? `<span style="background:rgba(239,68,68,.08);color:#f87171;border-radius:4px;padding:1px 6px;font-size:10px">−${exCount} exclusions</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-ghost" onclick="window._openCCModal('${cat.id}')">✏ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="window._delCC('${cat.id}')">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function openCCModal(id = null) {
  setECCId(id);
  $('cc-modal-title').textContent = id ? '✏ Edit Custom Category' : '📁 New Custom Category';
  $('cc-al').style.display = 'none';

  if (id) {
    const cat = (D.customCategories||[]).find(c => c.id === id);
    if (!cat) return;
    $('cc-name').value = cat.name || '';
    $('cc-desc').value = cat.description || '';
    $('cc-domains').value = (cat.domains||[]).join('\n');
    $('cc-excl-urls').value = (cat.exclusionUrls||[]).join('\n');
    // Set predefined category checkboxes
    document.querySelectorAll('#cc-pred-cats input[type=checkbox]').forEach(cb => {
      cb.checked = (cat.predefinedCategories||[]).includes(cb.value);
    });
    // Set URL list checkboxes
    document.querySelectorAll('#cc-url-lists input[type=checkbox]').forEach(cb => {
      cb.checked = (cat.urlListIds||[]).includes(cb.value);
    });
    // Set exclusion list checkboxes
    document.querySelectorAll('#cc-excl-lists input[type=checkbox]').forEach(cb => {
      cb.checked = (cat.exclusionListIds||[]).includes(cb.value);
    });
  } else {
    $('cc-name').value = ''; $('cc-desc').value = '';
    $('cc-domains').value = ''; $('cc-excl-urls').value = '';
    document.querySelectorAll('#cc-pred-cats input, #cc-url-lists input, #cc-excl-lists input').forEach(cb => { cb.checked = false; });
  }

  // Rebuild URL list checkboxes dynamically
  buildCCUrlListOptions();
  openModal('cc-modal');
}

function buildCCUrlListOptions() {
  const lists = D.urlLists || [];
  const mkList = (containerId, selectedIds) => {
    const el = $(containerId); if (!el) return;
    if (!lists.length) { el.innerHTML = '<div style="color:#64748b;font-size:12px">No URL lists yet</div>'; return; }
    el.innerHTML = lists.map(l =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;padding:4px 0">
        <input type="checkbox" value="${l.id}" style="accent-color:#6366f1;margin:0">
        ${esc(l.name)} <span style="color:#475569">(${(l.domains||[]).length})</span>
      </label>`
    ).join('');
    if (selectedIds) {
      el.querySelectorAll('input').forEach(cb => { cb.checked = selectedIds.includes(cb.value); });
    }
  };
  mkList('cc-url-lists');
  mkList('cc-excl-lists');
}

export function saveCC() {
  const name = $('cc-name')?.value.trim();
  if (!name) { showAlert('cc-al', 'error', 'Name required'); return; }

  const predCats   = [...document.querySelectorAll('#cc-pred-cats input:checked')].map(c => c.value);
  const urlListIds = [...document.querySelectorAll('#cc-url-lists input:checked')].map(c => c.value);
  const exListIds  = [...document.querySelectorAll('#cc-excl-lists input:checked')].map(c => c.value);
  const domains    = ($('cc-domains')?.value||'').split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const exUrls     = ($('cc-excl-urls')?.value||'').split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);

  const obj = {
    name,
    description:          $('cc-desc')?.value.trim() || '',
    domains,
    predefinedCategories: predCats,
    urlListIds,
    exclusionListIds:     exListIds,
    exclusionUrls:        exUrls,
  };

  if (!D.customCategories) D.customCategories = [];
  if (eCCId) {
    const i = D.customCategories.findIndex(c => c.id === eCCId);
    if (i >= 0) D.customCategories[i] = { ...D.customCategories[i], ...obj };
  } else {
    D.customCategories.push({ id: 'cc_' + Date.now(), ...obj });
  }
  closeModal('cc-modal');
  renderCats();
}

function delCC(id) {
  if (!confirm('Delete this custom category?')) return;
  D.customCategories = (D.customCategories||[]).filter(c => c.id !== id);
  renderCats();
}

export function initCategories() {
  $('cat-search')?.addEventListener('input', renderCats);
  $('btn-new-cc')?.addEventListener('click', () => openCCModal());
  $('btn-save-cc')?.addEventListener('click', saveCC);
  $('btn-cancel-cc')?.addEventListener('click', () => closeModal('cc-modal'));

  // Populate predefined category checkboxes
  const predEl = $('cc-pred-cats');
  if (predEl) {
    predEl.innerHTML = ALL_CATS.map(c =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;padding:3px 0">
        <input type="checkbox" value="${c}" style="accent-color:#6366f1;margin:0"> ${c}
      </label>`
    ).join('');
  }

  window._openCCModal = openCCModal;
  window._delCC       = delCC;
}
