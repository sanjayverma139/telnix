// ─────────────────────────────────────────────────────────────────────────────
// categories.js — Custom Categories page
// ─────────────────────────────────────────────────────────────────────────────

import { D, setECatId, eCatId }             from './state.js';
import { $, esc, showAlert, openModal, closeModal } from './utils.js';

export function renderCats() {
  const c = $('cat-con');
  const q = $('cat-search')?.value.toLowerCase() || '';
  let cats = D.customCategories;
  if (q) cats = cats.filter(x => x.name.toLowerCase().includes(q));

  if (!cats.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching categories.' : 'No custom categories — click + New Category.'}</div>`;
    return;
  }

  c.innerHTML = cats.map(cat => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${esc(cat.name)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${(cat.domains || []).length} domains</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="window._openCatModal('${cat.id}')">✏ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="window._delCat('${cat.id}')">✕</button>
      </div>
      ${(cat.domains || []).length ? `
        <div style="font-size:11px;color:#475569;font-family:monospace;margin-top:10px">
          ${(cat.domains || []).slice(0, 5).join(' · ')}
          ${(cat.domains || []).length > 5 ? ` +${(cat.domains || []).length - 5} more` : ''}
        </div>` : ''}
    </div>`).join('');
}

export function openCatModal(id = null) {
  setECatId(id);
  $('cm-title').textContent = id ? '✏ Edit Category' : '📁 New Category';
  $('cm-al').style.display = 'none';
  if (id) {
    const cat = D.customCategories.find(c => c.id === id);
    if (!cat) return;
    $('cm-name').value = cat.name;
    $('cm-doms').value = (cat.domains || []).join('\n');
  } else {
    $('cm-name').value = ''; $('cm-doms').value = '';
  }
  openModal('cat-modal');
}

export function saveCat() {
  const name = $('cm-name').value.trim();
  if (!name) { showAlert('cm-al', 'error', 'Name required'); return; }
  const doms = $('cm-doms').value.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
  const obj  = { name, domains: doms };
  if (eCatId) {
    const i = D.customCategories.findIndex(c => c.id === eCatId);
    if (i >= 0) D.customCategories[i] = { ...D.customCategories[i], ...obj };
  } else {
    D.customCategories.push({ id: 'cc_' + Date.now(), ...obj });
  }
  closeModal('cat-modal');
  renderCats();
}

function delCat(id) {
  if (!confirm('Delete this category?')) return;
  D.customCategories = D.customCategories.filter(c => c.id !== id);
  renderCats();
}

export function initCategories() {
  $('cat-search')?.addEventListener('input',    renderCats);
  $('btn-new-cat')?.addEventListener('click',   () => openCatModal());
  $('btn-save-cat')?.addEventListener('click',  saveCat);
  $('btn-cancel-cat')?.addEventListener('click',() => closeModal('cat-modal'));
  window._openCatModal = openCatModal;
  window._delCat       = delCat;
}
