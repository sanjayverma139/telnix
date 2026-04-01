// usergroups.js — User Groups page (create groups, manage members)

import { $, esc, showAlert, openModal, closeModal } from './utils.js';
import { sbf, fetchKnownUserEmails }                 from './api.js';
import { ORG }                                       from './config.js';
import { D }                                         from './state.js';

let _groups    = [];  // [{id, name, members:[email,...]}]
let _editingId = null;

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function loadGroups() {
  try {
    const r = await sbf(`/rest/v1/user_groups?org_id=eq.${ORG}&order=name.asc`);
    if (!r.ok) { console.warn('[UserGroups] load failed:', r.status); return []; }
    _groups = await r.json();
    return _groups;
  } catch(e) { console.error('[UserGroups]', e); return []; }
}

async function saveGroup(name, members) {
  if (_editingId) {
    const r = await sbf(`/rest/v1/user_groups?id=eq.${_editingId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, members }),
    });
    return r.ok;
  } else {
    const r = await sbf('/rest/v1/user_groups', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ org_id: ORG, name, members }),
    });
    return r.ok;
  }
}

async function deleteGroup(id) {
  const r = await sbf(`/rest/v1/user_groups?id=eq.${id}`, { method: 'DELETE' });
  return r.ok;
}

// ── Render ────────────────────────────────────────────────────────────────────
export async function loadUserGroups() {
  $('ug-con').innerHTML = '<div class="loading">Loading...</div>';
  await loadGroups();
  renderGroups();
}

function renderGroups() {
  const c  = $('ug-con');
  const q  = $('ug-search')?.value.toLowerCase() || '';
  const gs = q ? _groups.filter(g => g.name.toLowerCase().includes(q)) : _groups;

  const cnt = $('ug-count');
  if (cnt) cnt.textContent = `${_groups.length} group${_groups.length !== 1 ? 's' : ''}`;

  if (!gs.length) {
    c.innerHTML = `<div class="loading">${q ? 'No matching groups.' : 'No user groups yet — click + New Group.'}</div>`;
    return;
  }

  c.innerHTML = gs.map(g => {
    const members = g.members || [];
    const preview = members.slice(0, 3).map(e =>
      `<span style="background:rgba(99,102,241,.1);color:#a5b4fc;border-radius:4px;padding:1px 7px;font-size:11px">${esc(e)}</span>`
    ).join(' ');
    return `<div class="card" style="cursor:pointer" onclick="window._openGroupModal('${g.id}')">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700">👥 ${esc(g.name)}</span>
            <span style="background:rgba(99,102,241,.1);color:#a5b4fc;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700">${members.length} member${members.length!==1?'s':''}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${preview}
            ${members.length > 3 ? `<span style="font-size:11px;color:#475569">+${members.length - 3} more</span>` : ''}
            ${members.length === 0 ? '<span style="font-size:11px;color:#374151">No members yet</span>' : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window._openGroupModal('${g.id}')">✏ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();window._deleteGroup('${g.id}','${esc(g.name)}')">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Group Modal ───────────────────────────────────────────────────────────────
let _memberEmails = new Set();

export function openGroupModal(id = null) {
  _editingId  = id;
  _memberEmails = new Set();
  const g = id ? _groups.find(x => x.id === id) : null;

  $('ug-modal-title').textContent = id ? `✏ Edit Group` : '👥 New Group';
  $('ug-group-name').value        = g?.name || '';
  $('ug-al').style.display        = 'none';

  // Restore existing members
  if (g?.members) g.members.forEach(e => _memberEmails.add(e));

  renderMemberChips();
  buildMemberDropdown();
  openModal('ug-modal');
  setTimeout(() => $('ug-group-name').focus(), 100);
}

function renderMemberChips() {
  const wrap = $('ug-member-chips'); if (!wrap) return;
  wrap.innerHTML = '';
  _memberEmails.forEach(email => {
    const chip = document.createElement('div');
    chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.3)';
    chip.innerHTML = `${esc(email)}<button style="background:none;border:none;color:#a5b4fc;cursor:pointer;font-size:11px;padding:0 0 0 4px">✕</button>`;
    chip.querySelector('button').onclick = () => { _memberEmails.delete(email); renderMemberChips(); buildMemberDropdown(); };
    wrap.appendChild(chip);
  });
}

async function buildMemberDropdown() {
  const emails = await fetchKnownUserEmails().catch(() => []);

  const dd  = $('ug-member-dd'); if (!dd) return;
  const q   = $('ug-member-search')?.value.toLowerCase() || '';
  const filtered = q ? emails.filter(e => e.toLowerCase().includes(q)) : emails;

  dd.innerHTML = filtered.length
    ? filtered.map(email => {
        const isSel = _memberEmails.has(email);
        const itemColor = document.body.classList.contains('light-theme') ? (isSel ? '#2f3fbd' : '#334155') : (isSel ? '#a5b4fc' : '#cbd5e1');
        const itemBg = document.body.classList.contains('light-theme') ? (isSel ? 'rgba(79,70,229,.08)' : 'transparent') : (isSel ? 'rgba(99,102,241,.1)' : 'transparent');
        return `<div data-email="${esc(email)}" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:12px;color:${itemColor};background:${itemBg}">
          <input type="checkbox" ${isSel?'checked':''} style="accent-color:#6366f1;margin:0;width:14px;height:14px;flex-shrink:0">
          <span>${esc(email)}</span>
        </div>`;
      }).join('')
    : `<div style="padding:12px 14px;font-size:12px;color:#475569">
        ${emails.length === 0 ? 'No users in activity logs yet' : 'No matches'}
        <div style="margin-top:6px;font-size:11px;color:#374151">Type an email above and press Enter to add manually</div>
      </div>`;

  dd.querySelectorAll('[data-email]').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      const email = row.dataset.email;
      if (_memberEmails.has(email)) _memberEmails.delete(email);
      else _memberEmails.add(email);
      renderMemberChips(); buildMemberDropdown();
    });
  });
}

async function saveGroupModal() {
  const name = $('ug-group-name')?.value.trim();
  if (!name) { showAlert('ug-al', 'error', 'Group name required'); return; }

  const btn = $('btn-ug-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const ok = await saveGroup(name, [..._memberEmails]);
  if (ok) {
    closeModal('ug-modal');
    await loadGroups();
    renderGroups();
    showAlert('ug-list-alert', 'success', `✓ Group "${name}" saved`);
  } else {
    showAlert('ug-al', 'error', 'Save failed — check Supabase permissions');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Save Group'; }
}

async function confirmDeleteGroup(id, name) {
  $('ug-del-name').textContent = name;
  $('btn-ug-del-confirm').onclick = async () => {
    closeModal('ug-del-modal');
    const ok = await deleteGroup(id);
    if (ok) { await loadGroups(); renderGroups(); }
    else showAlert('ug-list-alert', 'error', 'Delete failed');
  };
  $('btn-ug-del-cancel').onclick = () => closeModal('ug-del-modal');
  openModal('ug-del-modal');
}

// ── Expose to policy modal ────────────────────────────────────────────────────
export function getGroups() { return _groups; }

export function initUserGroups() {
  $('ug-search')?.addEventListener('input', renderGroups);
  $('btn-new-ug')?.addEventListener('click', () => openGroupModal());
  $('btn-ug-save')?.addEventListener('click', saveGroupModal);
  $('btn-ug-cancel')?.addEventListener('click', () => closeModal('ug-modal'));
  $('ug-member-search')?.addEventListener('input', buildMemberDropdown);

  // Add email manually on Enter
  $('ug-member-search')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim().toLowerCase();
      if (val && val.includes('@')) {
        _memberEmails.add(val);
        e.target.value = '';
        renderMemberChips(); buildMemberDropdown();
      }
    }
  });

  window._openGroupModal = openGroupModal;
  window._deleteGroup    = confirmDeleteGroup;
}
