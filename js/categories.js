// categories.js — Custom Categories with pending/apply + searchable dropdown

import { ALL_CATS }                     from './config.js';
import { D, setECCId, eCCId }           from './state.js';
import { $, esc, showAlert, openModal, closeModal, parseDomainLines } from './utils.js';
import { saveData }                     from './api.js';

// ── Pending helpers ───────────────────────────────────────────────────────────
function getPendingCount() { return (D.pendingCustomCategories || []).length; }

function updateCCPendingBar() {
  const bar = $('cc-pending-bar'), count = $('cc-pending-count'), n = getPendingCount();
  if (!bar) return;
  bar.style.display = n > 0 ? 'flex' : 'none';
  if (count) count.textContent = n + ' pending change' + (n > 1 ? 's' : '');
}

async function autosaveCC() { await saveData(); updateCCPendingBar(); }

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

async function applyAllCCPending() {
  const btn = $('btn-cc-apply');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }
  try {
    for (const item of (D.pendingCustomCategories||[])) {
      if (item.type === 'create_customcat')       D.customCategories.push({ ...item.catData });
      else if (item.type === 'edit_customcat')    { const i=D.customCategories.findIndex(c=>c.id===item.originalId); if(i>=0) D.customCategories[i]={...item.catData,id:item.originalId}; }
      else if (item.type === 'delete_customcat')  D.customCategories = D.customCategories.filter(c=>c.id!==item.originalId);
    }
    D.pendingCustomCategories = [];
    const ok = await saveData();
    showAlert('cc-alert', ok?'success':'error', ok?'✓ Custom categories applied — extension updates in 1 minute':'Push failed');
    updateCCPendingBar(); renderCats();
  } catch(e) { showAlert('cc-alert','error','Error: '+e.message); }
  if (btn) { btn.disabled=false; btn.textContent='▶ Apply'; }
}

async function discardAllCCPending() {
  if (!confirm('Discard all pending custom category changes?')) return;
  D.pendingCustomCategories = [];
  await autosaveCC(); renderCats();
  showAlert('cc-alert','success','Pending changes discarded.');
}

// ── Searchable checkbox dropdown ──────────────────────────────────────────────
function buildSearchableDropdown(containerId, allItems, selectedIds) {
  const el = $(containerId); if (!el) return null;
  el.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;margin-bottom:12px';

  const inputRow = document.createElement('div');
  inputRow.className = 'search-chip-input';
  inputRow.addEventListener('focus', ()=>inputRow.style.borderColor='rgba(99,102,241,.6)', true);

  const chipsWrap = document.createElement('div');
  chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;flex:1;align-items:center';

  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Search and select...';
  searchInput.className = 'search-chip-field';
  searchInput.style.cssText = 'background:transparent;border:none;outline:none;font-size:12px;min-width:80px;flex:1;margin:0';

  const dd = document.createElement('div');
  dd.className = 'search-chip-dd';
  dd.style.maxHeight = '200px';

  let selected = new Set(selectedIds || []);

  function renderChips() {
    chipsWrap.innerHTML = '';
    selected.forEach(id => {
      const item  = allItems.find(x => (x.id||x) === id);
      const label = item?.name || item?.label || id;
      const chip  = document.createElement('div');
      chip.className = 'search-chip';
      chip.innerHTML = `${esc(label)}<button style="background:none;border:none;color:#a5b4fc;cursor:pointer;font-size:11px;padding:0 0 0 2px;line-height:1">✕</button>`;
      chip.querySelector('button').addEventListener('click', e => {
        e.stopPropagation(); selected.delete(id); renderChips(); renderDd(searchInput.value);
      });
      chipsWrap.appendChild(chip);
    });
    chipsWrap.appendChild(searchInput);
  }

  function renderDd(q) {
    const filtered = allItems.filter(item => {
      const label = item?.name || item?.label || item || '';
      return !q || label.toLowerCase().includes(q.toLowerCase());
    });
    if (!filtered.length) { dd.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">No results</div>'; return; }
    dd.innerHTML = filtered.map(item => {
      const id    = item?.id || item;
      const label = item?.name || item?.label || item || id;
      const isSel = selected.has(id);
      return `<div data-id="${esc(String(id))}" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:12px;color:${isSel?'#a5b4fc':'#cbd5e1'};background:${isSel?'rgba(99,102,241,.1)':'transparent'}">
        <input type="checkbox" ${isSel?'checked':''} style="accent-color:#6366f1;margin:0;flex-shrink:0;width:14px;height:14px">
        <span>${esc(label)}</span>
      </div>`;
    }).join('');
    dd.querySelectorAll('[data-id]').forEach(row => {
      row.addEventListener('click', e => {
        e.stopPropagation();
        const id = row.dataset.id;
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        renderChips(); renderDd(searchInput.value);
      });
    });
  }

  searchInput.addEventListener('input',  () => renderDd(searchInput.value));
  searchInput.addEventListener('focus',  () => { renderDd(searchInput.value); dd.style.display='block'; inputRow.style.borderColor='rgba(99,102,241,.6)'; });
  inputRow.addEventListener('click',     () => searchInput.focus());

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) { dd.style.display='none'; inputRow.style.borderColor='rgba(99,102,241,.2)'; }
  }, true);

  renderChips(); renderDd('');
  inputRow.appendChild(chipsWrap);
  wrap.appendChild(inputRow);
  wrap.appendChild(dd);
  el.appendChild(wrap);

  return { getSelected: () => [...selected] };
}

// Dropdown instances
let _ddPredCats=null, _ddUrlLists=null, _ddExclLists=null, _editingPendingCCId=null;

// ── Render ────────────────────────────────────────────────────────────────────
export function renderCats() {
  updateCCPendingBar();
  const c = $('cat-con');
  const q = $('cat-search')?.value.toLowerCase() || '';
  const live    = (D.customCategories||[]).filter(x => q ? x.name.toLowerCase().includes(q) : true);
  const pending = (D.pendingCustomCategories||[]).filter(item => q ? (item.catData?.name||'').toLowerCase().includes(q) : true);

  const cnt = $('custom-cat-count');
  if (cnt) cnt.textContent = `${(D.customCategories||[]).length} live · ${(D.pendingCustomCategories||[]).length} pending`;

  if (!live.length && !pending.length) {
    c.innerHTML = `<div class="loading">${q?'No matching categories.':'No custom categories — click + New Category.'}</div>`;
    return;
  }

  const liveHtml = live.map(cat => {
    const hasPendingEdit = (D.pendingCustomCategories||[]).find(p=>p.type==='edit_customcat'&&p.originalId===cat.id);
    const chips = [
      ...(cat.predefinedCategories||[]).map(c=>`<span style="background:rgba(167,139,250,.1);color:#a78bfa;border-radius:4px;padding:1px 7px;font-size:10px">${esc(c)}</span>`),
      ...(cat.urlListIds||[]).map(id=>{ const l=(D.urlLists||[]).find(x=>x.id===id); return l?`<span style="background:rgba(96,165,250,.1);color:#60a5fa;border-radius:4px;padding:1px 7px;font-size:10px">📋 ${esc(l.name)}</span>`:''; }),
      (cat.domains||[]).length?`<span style="background:rgba(16,185,129,.1);color:#10b981;border-radius:4px;padding:1px 7px;font-size:10px">${(cat.domains||[]).length} domains</span>`:'',
      ((cat.exclusionUrls||[]).length+(cat.exclusionListIds||[]).length)?`<span style="background:rgba(239,68,68,.08);color:#f87171;border-radius:4px;padding:1px 7px;font-size:10px">−${(cat.exclusionUrls||[]).length+(cat.exclusionListIds||[]).length} excl.</span>`:'',
    ].filter(Boolean).join(' ');
    return `<div class="card" style="cursor:pointer;${hasPendingEdit?'opacity:0.55;':''}" onclick="window._openCCModal('${cat.id}')">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:13px;font-weight:700">${esc(cat.name)}</span>
            ${hasPendingEdit?'<span style="font-size:9px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:4px;padding:1px 6px">EDIT PENDING</span>':''}
          </div>
          ${cat.description?`<div style="font-size:11px;color:#64748b;margin-bottom:6px">${esc(cat.description)}</div>`:''}
          <div style="display:flex;flex-wrap:wrap;gap:4px">${chips}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${!hasPendingEdit?`<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window._openCCModal('${cat.id}')">✏ Edit</button>`:''}
          ${!hasPendingEdit?`<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();window._confirmDelCC('${cat.id}')">✕</button>`:''}
        </div>
      </div>
    </div>`;
  }).join('');

  const pendingHtml = pending.map(item => {
    const cat    = item.catData || {};
    const isEdit = item.type === 'edit_customcat';
    const isDel  = item.type === 'delete_customcat';
    const label  = isDel ? 'DELETE PENDING' : 'NOT APPLIED';
    const color  = isDel ? '#ef4444' : '#f59e0b';
    const border = isDel ? 'rgba(239,68,68,.4)' : 'rgba(245,158,11,.5)';
    const bg     = isDel ? 'rgba(239,68,68,.06)' : 'rgba(245,158,11,.03)';
    return `<div class="card" style="border:1px dashed ${border};background:${bg}">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700">${esc(cat.name||'—')}</span>
            <span style="font-size:9px;font-weight:800;color:${color};background:rgba(0,0,0,.2);border:1px solid ${color};border-radius:4px;padding:1px 6px">${label}</span>
            ${isEdit?'<span style="font-size:10px;color:#64748b">(replaces live on Apply)</span>':''}
          </div>
          ${cat.description?`<div style="font-size:11px;color:#64748b">${esc(cat.description)}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${!isDel?`<button class="btn btn-sm btn-ghost" onclick="window._editPendingCC('${item._pendingId}')">✏ Edit</button>`:''}
          <button class="btn btn-sm btn-danger" onclick="window._discardOneCC('${item._pendingId}')">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');

  c.innerHTML = liveHtml + pendingHtml;
}

// ── Styled delete confirm ─────────────────────────────────────────────────────
function confirmDelCC(id) {
  const cat = (D.customCategories||[]).find(c=>c.id===id); if(!cat) return;
  $('del-modal-name').textContent = cat.name;
  $('del-modal-type').textContent = 'custom category';
  $('btn-del-confirm').onclick = () => { closeModal('del-confirm-modal'); delCC(id); };
  $('btn-del-cancel').onclick  = () => closeModal('del-confirm-modal');
  openModal('del-confirm-modal');
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function openCCModal(id=null, pendingId=null) {
  setECCId(id);
  _editingPendingCCId = pendingId;
  $('cc-modal-title').textContent = pendingId ? '✏ Edit Pending Category' : id ? '✏ Edit Custom Category' : '📁 New Custom Category';
  $('cc-al').style.display = 'none';

  const cat = pendingId
    ? (D.pendingCustomCategories||[]).find(p=>p._pendingId===pendingId)?.catData
    : id ? (D.customCategories||[]).find(c=>c.id===id) : null;

  $('cc-name').value      = cat?.name || '';
  $('cc-desc').value      = cat?.description || '';
  $('cc-domains').value   = (cat?.domains||[]).join('\n');
  $('cc-excl-urls').value = (cat?.exclusionUrls||[]).join('\n');

  const predItems = ALL_CATS.map(c => ({ id: c, name: c }));
  const ulItems   = (D.urlLists||[]).map(l => ({ id: l.id, name: l.name }));

  _ddPredCats  = buildSearchableDropdown('cc-pred-cats-wrap',  predItems, cat?.predefinedCategories||[]);
  _ddUrlLists  = buildSearchableDropdown('cc-url-lists-wrap',  ulItems,   cat?.urlListIds||[]);
  _ddExclLists = buildSearchableDropdown('cc-excl-lists-wrap', ulItems,   cat?.exclusionListIds||[]);

  openModal('cc-modal');
}

export async function saveCC() {
  const name = $('cc-name')?.value.trim();
  if (!name) { showAlert('cc-al','error','Name required'); return; }
  const domainResult = parseDomainLines($('cc-domains')?.value||'');
  const exclusionResult = parseDomainLines($('cc-excl-urls')?.value||'');
  const invalidDomains = [...domainResult.invalid, ...exclusionResult.invalid];
  if (invalidDomains.length) {
    showAlert('cc-al','error',`Invalid domain entries: ${invalidDomains.slice(0,3).join(', ')}`);
    return;
  }

  const catData = {
    name,
    description:          $('cc-desc')?.value.trim()||'',
    domains:              domainResult.domains,
    predefinedCategories: _ddPredCats?.getSelected()  || [],
    urlListIds:           _ddUrlLists?.getSelected()  || [],
    exclusionListIds:     _ddExclLists?.getSelected() || [],
    exclusionUrls:        exclusionResult.domains,
  };

  if (_editingPendingCCId) {
    const idx = (D.pendingCustomCategories||[]).findIndex(p=>p._pendingId===_editingPendingCCId);
    if (idx>=0) { D.pendingCustomCategories[idx].catData={...D.pendingCustomCategories[idx].catData,...catData}; await autosaveCC(); }
  } else if (eCCId) {
    await stageCC({ _pendingId:'pending_edit_cc_'+eCCId, type:'edit_customcat', originalId:eCCId, catData:{...catData,id:eCCId} });
  } else {
    const id='cc_'+Date.now();
    await stageCC({ _pendingId:'pending_cc_'+id, type:'create_customcat', catData:{id,...catData} });
  }
  closeModal('cc-modal'); renderCats();
}

async function delCC(id) {
  const cat = (D.customCategories||[]).find(c=>c.id===id); if(!cat) return;
  await stageCC({ _pendingId:'pending_del_cc_'+id, type:'delete_customcat', originalId:id, catData:{...cat} });
  renderCats();
}

export function initCategories() {
  $('cat-search')?.addEventListener('input', renderCats);
  $('btn-new-cc')?.addEventListener('click', ()=>openCCModal());
  $('btn-save-cc')?.addEventListener('click', saveCC);
  $('btn-cancel-cc')?.addEventListener('click', ()=>closeModal('cc-modal'));
  $('btn-cc-apply')?.addEventListener('click', applyAllCCPending);
  $('btn-cc-discard')?.addEventListener('click', discardAllCCPending);

  window._openCCModal      = id => openCCModal(id);
  window._delCC            = delCC;
  window._confirmDelCC     = confirmDelCC;
  window._editPendingCC    = pendingId => openCCModal(null, pendingId);
  window._discardOneCC     = removeCCPending;
}
