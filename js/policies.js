// policies.js — Full policy management with Supabase-persisted pending system

import { ALL_CATS, THREAT_CATEGORIES, DAYS }          from './config.js';
import { D, setCurAct, setCurActiv, setCurType,
         setEPolId, curAct, curActiv, curType, ePolId } from './state.js';
import { $, esc, showAlert, openModal, closeModal }    from './utils.js';
import { saveData, loadData }                          from './api.js';

const TC = {
  domain:'#818cf8', category:'#34d399', list:'#60a5fa',
  combo:'#a78bfa', threat:'#f87171', reputation:'#fb923c', customcat:'#f59e0b'
};

// ── Pending count helper ──────────────────────────────────────────────────────
function getPendingCount() { return (D.pendingPolicies || []).length; }

function updatePendingBar() {
  const bar   = $('pending-bar');
  const count = $('pending-count');
  const n     = getPendingCount();
  if (!bar) return;
  bar.style.display = n > 0 ? 'flex' : 'none';
  if (count) count.textContent = n + ' pending change' + (n > 1 ? 's' : '');
}

// ── Auto-save a pending policy to Supabase immediately ───────────────────────
async function autosavePending() {
  // Save D (which now includes updated pendingPolicies) to Supabase
  // This is lightweight — just a PATCH with the full payload
  await saveData();
  updatePendingBar();
}

// ── Apply all pending → move to orderedPolicies ──────────────────────────────
async function applyAllPending() {
  const btn = $('btn-apply-changes');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }
  try {
    const pending = D.pendingPolicies || [];
    if (!pending.length) { showAlert('pol-al', 'error', 'No pending changes to apply.'); return; }

    for (const item of pending) {
      if (item.type === 'create_policy') {
        // Move from pending → live
        const pol = { ...item.policyData };
        delete pol._pendingId;
        D.orderedPolicies.push(pol);
        // Add to correct group
        const grp = (D.policyGroups || []).find(g => g.id === item.groupId);
        if (grp && !grp.policyIds.includes(pol.id)) grp.policyIds.push(pol.id);

      } else if (item.type === 'edit_policy') {
        const idx = D.orderedPolicies.findIndex(p => p.id === item.policyId);
        if (idx >= 0) {
          D.orderedPolicies[idx] = { ...D.orderedPolicies[idx], ...item.changes };
          // Handle group change
          if (item.newGroupId && item.oldGroupId !== item.newGroupId) {
            const oldGrp = (D.policyGroups||[]).find(g => g.id === item.oldGroupId);
            const newGrp = (D.policyGroups||[]).find(g => g.id === item.newGroupId);
            if (oldGrp) oldGrp.policyIds = oldGrp.policyIds.filter(id => id !== item.policyId);
            if (newGrp && !newGrp.policyIds.includes(item.policyId)) newGrp.policyIds.push(item.policyId);
          }
        }
      } else if (item.type === 'delete_policy') {
        D.orderedPolicies = D.orderedPolicies.filter(p => p.id !== item.policyId);
        (D.policyGroups||[]).forEach(g => {
          g.policyIds = (g.policyIds||[]).filter(id => id !== item.policyId);
        });
      } else if (item.type === 'create_group') {
        if (!D.policyGroups.find(g => g.id === item.group.id))
          D.policyGroups.push(item.group);
      } else if (item.type === 'rename_group') {
        const g = D.policyGroups.find(g => g.id === item.groupId);
        if (g) g.name = item.newName;
      } else if (item.type === 'delete_group') {
        const dest = D.policyGroups.find(g => g.id !== item.groupId);
        const grp  = D.policyGroups.find(g => g.id === item.groupId);
        if (grp) (grp.policyIds||[]).forEach(pid => { if (dest) dest.policyIds.push(pid); });
        D.policyGroups = D.policyGroups.filter(g => g.id !== item.groupId);
      } else if (item.type === 'move_group') {
        const idx = D.policyGroups.findIndex(g => g.id === item.groupId);
        const to  = item.direction === 'up' ? idx - 1 : idx + 1;
        if (idx >= 0 && to >= 0 && to < D.policyGroups.length)
          [D.policyGroups[idx], D.policyGroups[to]] = [D.policyGroups[to], D.policyGroups[idx]];
      } else if (item.type === 'move_policy') {
        const grp = D.policyGroups.find(g => g.id === item.groupId);
        if (grp) {
          const idx = grp.policyIds.indexOf(item.policyId);
          const to  = item.direction === 'up' ? idx - 1 : idx + 1;
          if (idx >= 0 && to >= 0 && to < grp.policyIds.length)
            [grp.policyIds[idx], grp.policyIds[to]] = [grp.policyIds[to], grp.policyIds[idx]];
        }
      } else if (item.type === 'move_policy_to_group') {
        const fromGrp = D.policyGroups.find(g => g.id === item.fromGroupId);
        const toGrp   = D.policyGroups.find(g => g.id === item.toGroupId);
        if (fromGrp) fromGrp.policyIds = fromGrp.policyIds.filter(id => id !== item.policyId);
        if (toGrp && !toGrp.policyIds.includes(item.policyId)) toGrp.policyIds.push(item.policyId);
      } else if (item.type === 'toggle_policy') {
        const p = D.orderedPolicies.find(p => p.id === item.policyId);
        if (p) p.enabled = item.newValue;
      }
    }

    // Clear pending
    D.pendingPolicies = [];
    D.policySettings  = D.policySettings || {};
    D.policySettings.defaultAction = $('def-action')?.value || 'allow';

    const ok = await saveData();
    showAlert('pol-al', ok ? 'success' : 'error',
      ok ? '✓ All changes applied and pushed to users — extension syncs in 1 minute'
         : 'Push failed — check Supabase permissions');
    renderPols();
  } catch (e) {
    showAlert('pol-al', 'error', 'Error applying changes: ' + e.message);
    console.error(e);
  }
  if (btn) { btn.disabled = false; btn.textContent = '▶ Apply'; }
}

// ── Discard all pending ───────────────────────────────────────────────────────
async function discardAllPending() {
  if (!confirm('Discard all pending changes? They will be permanently removed.')) return;
  D.pendingPolicies = [];
  await autosavePending();
  renderPols();
  showAlert('pol-al', 'success', 'Pending changes discarded.');
}

// ── Stage a pending item + autosave ──────────────────────────────────────────
async function stagePending(item) {
  D.pendingPolicies = D.pendingPolicies || [];
  // For edits, replace existing staging for same policy
  D.pendingPolicies = D.pendingPolicies.filter(p => p._pendingId !== item._pendingId);
  D.pendingPolicies.push(item);
  await autosavePending();
}

// ── Remove a pending item (on discard single) ─────────────────────────────────
async function removePendingItem(pendingId) {
  D.pendingPolicies = (D.pendingPolicies||[]).filter(p => p._pendingId !== pendingId);
  await autosavePending();
  renderPols();
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderPols() {
  $('def-action').value = D.policySettings?.defaultAction || 'allow';
  updatePendingBar();
  const c = $('pol-con');
  if (!D.policyGroups?.length) { c.innerHTML = '<div class="loading">No groups — click New Group.</div>'; return; }

  // Build map of pending creates grouped by groupId for ghost rows
  const pendingByGroup = {};
  (D.pendingPolicies || []).forEach(item => {
    if (item.type === 'create_policy') {
      const gid = item.groupId || (D.policyGroups[0]?.id || 'ungrouped');
      if (!pendingByGroup[gid]) pendingByGroup[gid] = [];
      pendingByGroup[gid].push(item);
    }
  });

  c.innerHTML = D.policyGroups.map((g, gi) => {
    const canUp   = gi > 0;
    const canDown = gi < D.policyGroups.length - 1;
    const ps = (g.policyIds || []).map(id => D.orderedPolicies.find(p => p.id === id)).filter(Boolean);
    const ghosts = pendingByGroup[g.id] || [];

    // Build live policy rows
    const liveRows = ps.map((pol, pi) => {
      const ac = {block:'#f87171',warn:'#fbbf24',allow:'#10b981'}[pol.action]||'#94a3b8';
      const tc = TC[pol.type]||'#818cf8';
      const cond = buildCondSummary(pol);
      const canPolUp   = pi > 0;
      const canPolDown = pi < ps.length - 1;
      const schedIcon  = pol.schedule ? '⏰ ' : '';
      const actIcon    = pol.activity === 'download' ? '📥' : pol.activity === 'all' ? '🔒' : '🌐';
      return `<div class="pol-row" style="${pol.enabled===false?'opacity:0.45':''}">
        <div>
          <div class="pol-name">${gi+1}.${pi+1} ${esc(pol.name)}</div>
          ${pol.note?`<div style="font-size:10px;color:#475569">${esc(pol.note)}</div>`:''}
        </div>
        <span style="background:${tc}18;color:${tc};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${pol.type||'domain'}</span>
        <span style="font-size:11px;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(cond)}">${esc(cond)}</span>
        <span class="badge badge-${pol.action||'block'}">${pol.action||'block'}</span>
        <span style="font-size:12px" title="${pol.activity||'browse'}">${actIcon}${schedIcon}</span>
        <button class="toggle ${pol.enabled!==false?'on':''}" onclick="window._togPol('${pol.id}','${g.id}')"></button>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._polMoveUp('${pol.id}','${g.id}')" ${canPolUp?'':'disabled'} title="Move up">▲</button>
          <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._polMoveDown('${pol.id}','${g.id}')" ${canPolDown?'':'disabled'} title="Move down">▼</button>
          <button class="btn btn-sm btn-ghost" style="padding:3px 8px" onclick="window._openMoveToGroup('${pol.id}','${g.id}')" title="Move to group">↔</button>
          <button class="btn btn-sm btn-ghost" onclick="window._openPolModal('${pol.id}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="window._delPol('${pol.id}','${g.id}')">✕</button>
        </div>
      </div>`;
    }).join('');

    // Build ghost (pending) rows
    const ghostRows = ghosts.map(item => {
      const pol = item.policyData;
      const ac  = {block:'#f87171',warn:'#fbbf24',allow:'#10b981'}[pol.action]||'#94a3b8';
      const tc  = TC[pol.type]||'#818cf8';
      return `<div class="pol-row" style="border:1px dashed rgba(245,158,11,.5);background:rgba(245,158,11,.03)">
        <div>
          <div class="pol-name" style="display:flex;align-items:center;gap:8px">
            ${esc(pol.name)}
            <span style="font-size:9px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);border-radius:4px;padding:1px 6px;flex-shrink:0">NOT APPLIED</span>
          </div>
          ${pol.note?`<div style="font-size:10px;color:#475569">${esc(pol.note)}</div>`:''}
        </div>
        <span style="background:${tc}18;color:${tc};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${pol.type||'domain'}</span>
        <span style="font-size:11px;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(buildCondSummary(pol))}</span>
        <span class="badge badge-${pol.action||'block'}">${pol.action||'block'}</span>
        <span style="font-size:11px;color:#475569">${pol.enabled!==false?'Enabled':'Disabled'}</span>
        <span></span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-ghost" onclick="window._editPendingPol('${item._pendingId}')">✏ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="window._discardOnePending('${item._pendingId}')">✕</button>
        </div>
      </div>`;
    }).join('');

    return `<div class="pol-group">
      <div class="pol-group-hdr">
        <span style="color:#64748b;font-size:12px;font-weight:700">${gi+1}.</span>
        <span class="pol-group-name">${esc(g.name)}</span>
        <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._moveGrp('${g.id}','up')" ${canUp?'':'disabled'} title="Move group up">▲</button>
        <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._moveGrp('${g.id}','down')" ${canDown?'':'disabled'} title="Move group down">▼</button>
        <button class="btn btn-sm btn-ghost" style="padding:3px 8px" onclick="window._renameGrp('${g.id}')" title="Rename">✏</button>
        ${!g._isDefault ? `<button class="btn btn-sm btn-danger" onclick="window._delGrp('${g.id}')">✕</button>` : ''}
      </div>
      ${liveRows}${ghostRows}
      ${ps.length===0 && ghosts.length===0 ? `<div style="padding:12px 16px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,.04)">No policies — click + New Policy and select group <strong style="color:#a5b4fc">${esc(g.name)}</strong></div>` : ''}
    </div>`;
  }).join('');
}

function buildCondSummary(pol) {
  if (!pol.conditions) return '—';
  if (pol.type==='domain')     { const d=pol.conditions.domains||[]; return d.slice(0,2).join(', ')+(d.length>2?` +${d.length-2}`:''); }
  if (pol.type==='category')   return (pol.conditions.categories||[]).slice(0,2).join(', ')||'—';
  if (pol.type==='list')       { const n=(pol.conditions.listIds||[]).map(id=>(D.urlLists||[]).find(l=>l.id===id)?.name||id); return n.slice(0,2).join(', ')||'—'; }
  if (pol.type==='threat')     return `score ${pol.conditions.scoreOp||'gte'} ${pol.conditions.scoreThreshold??55}`;
  if (pol.type==='reputation') return 'known malicious';
  if (pol.type==='customcat')  { const n=(pol.conditions.customCategoryIds||[]).map(id=>(D.customCategories||[]).find(c=>c.id===id)?.name||id); return n.slice(0,2).join(', ')||'—'; }
  if (pol.type==='combo')      return 'multi-criteria';
  return '—';
}

// ── Group CRUD ────────────────────────────────────────────────────────────────
export function openGrpModal() { $('gm-name').value=''; openModal('grp-modal'); setTimeout(()=>$('gm-name').focus(),100); }

export function saveGrp() {
  const n = $('gm-name').value.trim(); if (!n) return;
  const group = { id: 'grp_'+Date.now(), name: n, policyIds: [] };
  D.policyGroups.push(group);
  stagePending({ _pendingId: 'create_grp_'+group.id, type: 'create_group', group });
  closeModal('grp-modal');
  renderPols();
}

function renameGrp(id) {
  const grp = D.policyGroups.find(g=>g.id===id); if (!grp) return;
  const newName = prompt(`Rename "${grp.name}":`, grp.name);
  if (!newName?.trim() || newName.trim()===grp.name) return;
  const oldName = grp.name;
  grp.name = newName.trim();
  stagePending({ _pendingId:'rename_grp_'+id, type:'rename_group', groupId:id, newName:newName.trim(), oldName });
  renderPols();
}

function delGrp(id) {
  if (D.policyGroups.length <= 1) { alert('Cannot delete the only group.'); return; }
  const grp = D.policyGroups.find(g=>g.id===id); if (!grp) return;
  if (!confirm(`Delete group "${grp.name}"? Its policies will move to the next group.`)) return;
  const dest = D.policyGroups.find(g=>g.id!==id);
  (grp.policyIds||[]).forEach(pid => { if(dest) dest.policyIds.push(pid); });
  D.policyGroups = D.policyGroups.filter(g=>g.id!==id);
  stagePending({ _pendingId:'del_grp_'+id, type:'delete_group', groupId:id });
  renderPols();
}

function moveGrp(id, direction) {
  const idx = D.policyGroups.findIndex(g=>g.id===id); if (idx<0) return;
  const to  = direction==='up' ? idx-1 : idx+1;
  if (to<0 || to>=D.policyGroups.length) return;
  [D.policyGroups[idx], D.policyGroups[to]] = [D.policyGroups[to], D.policyGroups[idx]];
  stagePending({ _pendingId:'move_grp_'+id+'_'+Date.now(), type:'move_group', groupId:id, direction });
  renderPols();
}

// ── Policy CRUD ───────────────────────────────────────────────────────────────
function togPol(id, grpId) {
  const p = D.orderedPolicies.find(p=>p.id===id); if (!p) return;
  p.enabled = p.enabled === false;
  stagePending({ _pendingId:'tog_'+id, type:'toggle_policy', policyId:id, newValue:p.enabled });
  renderPols();
}

function delPol(id, grpId) {
  const pol = D.orderedPolicies.find(p=>p.id===id); if (!pol) return;
  if (!confirm(`Delete policy "${pol.name}"?`)) return;
  D.orderedPolicies = D.orderedPolicies.filter(p=>p.id!==id);
  (D.policyGroups||[]).forEach(g=>{ g.policyIds=(g.policyIds||[]).filter(i=>i!==id); });
  stagePending({ _pendingId:'del_pol_'+id, type:'delete_policy', policyId:id });
  renderPols();
}

function polMoveUp(polId, grpId) {
  const grp = D.policyGroups.find(g=>g.id===grpId); if (!grp) return;
  const idx = grp.policyIds.indexOf(polId); if (idx<=0) return;
  [grp.policyIds[idx-1], grp.policyIds[idx]] = [grp.policyIds[idx], grp.policyIds[idx-1]];
  stagePending({ _pendingId:'move_pol_up_'+polId+'_'+Date.now(), type:'move_policy', policyId:polId, groupId:grpId, direction:'up' });
  renderPols();
}

function polMoveDown(polId, grpId) {
  const grp = D.policyGroups.find(g=>g.id===grpId); if (!grp) return;
  const idx = grp.policyIds.indexOf(polId); if (idx<0||idx>=grp.policyIds.length-1) return;
  [grp.policyIds[idx], grp.policyIds[idx+1]] = [grp.policyIds[idx+1], grp.policyIds[idx]];
  stagePending({ _pendingId:'move_pol_down_'+polId+'_'+Date.now(), type:'move_policy', policyId:polId, groupId:grpId, direction:'down' });
  renderPols();
}

// ── Move to group ─────────────────────────────────────────────────────────────
let _movingPolId=null, _movingFromGrpId=null;

function openMoveToGroup(polId, fromGrpId) {
  _movingPolId=polId; _movingFromGrpId=fromGrpId;
  const pol = D.orderedPolicies.find(p=>p.id===polId);
  $('mtg-pol-name').textContent = pol?.name||polId;
  $('mtg-grp-select').innerHTML = D.policyGroups.filter(g=>g.id!==fromGrpId)
    .map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  openModal('move-to-group-modal');
}

function saveMoveToGroup() {
  const toGrpId   = $('mtg-grp-select')?.value; if (!toGrpId) return;
  const polId     = _movingPolId;
  const fromGrpId = _movingFromGrpId;
  const fromGrp   = D.policyGroups.find(g=>g.id===fromGrpId);
  const toGrp     = D.policyGroups.find(g=>g.id===toGrpId);
  if (!fromGrp||!toGrp) return;
  fromGrp.policyIds = fromGrp.policyIds.filter(id=>id!==polId);
  if (!toGrp.policyIds.includes(polId)) toGrp.policyIds.push(polId);
  stagePending({ _pendingId:'mtg_'+polId, type:'move_policy_to_group', policyId:polId, fromGroupId:fromGrpId, toGroupId:toGrpId });
  closeModal('move-to-group-modal');
  renderPols();
}

// ── Edit a pending (not-yet-applied) policy ──────────────────────────────────
function editPendingPol(pendingId) {
  const item = (D.pendingPolicies||[]).find(p=>p._pendingId===pendingId); if (!item) return;
  // Open the modal pre-filled — on save it will replace this pending item
  openPolModal(null, item);
}

// ── Policy Modal ──────────────────────────────────────────────────────────────
export function openPolModal(id=null, pendingItem=null) {
  setEPolId(id);
  const isEdit   = !!id;
  const isPending= !!pendingItem;

  setCurAct('block'); setCurActiv('browse'); setCurType('domain');
  $('pm-title').textContent = isPending ? `Edit Pending: ${pendingItem.policyData?.name||''}` : isEdit ? 'Edit Policy' : 'New Policy';
  $('pm-al').style.display = 'none';

  const currentGrp = id ? D.policyGroups.find(g=>(g.policyIds||[]).includes(id)) : null;
  $('pm-grp').innerHTML = D.policyGroups.map(g=>
    `<option value="${g.id}"${currentGrp?.id===g.id||pendingItem?.groupId===g.id?' selected':''}>${esc(g.name)}</option>`
  ).join('');
  $('pm-ftl').innerHTML = '<option value="">All file types</option>'+
    (D.fileTypeLists||[]).map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');

  // Reset
  ['pm-name','pm-doms','pm-note','pm-combo-doms'].forEach(x=>{const e=$(x);if(e)e.value='';});
  ['pm-cat-chips','pm-cc-chips','pm-combo-cat-chips'].forEach(x=>{const e=$(x);if(e)e.innerHTML='';});
  $('pm-sthr').value=55;
  $('pm-en').className='toggle on';
  $('pm-sched-enabled').checked=false; $('pm-sched-fields').style.display='none';
  $('pm-sched-start').value='09:00'; $('pm-sched-end').value='17:00'; $('pm-sched-outside').value='allow';
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.classList.remove('active'));
  buildCatList(); buildCustomCatList(); buildListCbs('pm-list-cbs'); buildListCbs('pm-combo-list-cbs');
  setType('domain'); setAct('block'); setActiv('browse');

  // The source policy data (either live or pending)
  const pol = isPending ? pendingItem.policyData : isEdit ? D.orderedPolicies.find(p=>p.id===id) : null;
  if (pol) {
    $('pm-name').value = pol.name||'';
    $('pm-note').value = pol.note||'';
    if (pol.enabled===false) $('pm-en').className='toggle';
    setType(pol.type||'domain'); setAct(pol.action||'block'); setActiv(pol.activity||'browse');
    const c = pol.conditions||{};
    if (c.domains)    $('pm-doms').value=c.domains.join('\n');
    if (c.categories) { c.categories.forEach(v=>addCatChip(v)); buildCatList(); }
    if (c.listIds)    { buildListCbs('pm-list-cbs'); setTimeout(()=>c.listIds.forEach(lid=>{const cb=$('pm-list-cbs')?.querySelector(`[value="${lid}"]`);if(cb)cb.checked=true;}),50); }
    if (c.scoreOp)    $('pm-sop').value=c.scoreOp;
    if (c.scoreThreshold!=null) $('pm-sthr').value=c.scoreThreshold;
    if (c.customCategoryIds) { c.customCategoryIds.forEach(v=>addCCChip(v)); buildCustomCatList(); }
    if (pol.fileTypeListId) $('pm-ftl').value=pol.fileTypeListId;
    if (pol.schedule) {
      $('pm-sched-enabled').checked=true; $('pm-sched-fields').style.display='block';
      $('pm-sched-start').value=pol.schedule.startTime||'09:00';
      $('pm-sched-end').value=pol.schedule.endTime||'17:00';
      $('pm-sched-outside').value=pol.schedule.outsideScheduleAction||'allow';
      const dm={1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',0:'Sun'};
      (pol.schedule.days||[]).forEach(d=>document.querySelector(`.pm-day-btn[data-day="${dm[d]}"]`)?.classList.add('active'));
    }
  }

  // Store reference to pending item being edited
  $('btn-save-pol').dataset.editingPendingId = pendingItem?._pendingId || '';
  openModal('pol-modal');
}

export function setType(t)   { setCurType(t); document.querySelectorAll('.pm-type-card').forEach(c=>c.classList.toggle('sel',c.dataset.t===t)); ['domain','category','list','customcat','combo','threat','reputation'].forEach(x=>$('crit-'+x)?.classList.toggle('hid',x!==t)); if(t==='list'||t==='combo'){buildListCbs('pm-list-cbs');buildListCbs('pm-combo-list-cbs');}if(t==='category'||t==='combo')buildCatList();if(t==='customcat')buildCustomCatList(); }
export function setAct(a)    { setCurAct(a); document.querySelectorAll('.abtn[data-a]').forEach(b=>{b.className='abtn'+(b.dataset.a===a?` sel-${a}`:'');}); }
export function setActiv(a)  { setCurActiv(a); document.querySelectorAll('.abtn[data-v]').forEach(b=>b.classList.toggle('sel-act',b.dataset.v===a)); $('pm-ftrow')?.classList.toggle('hid',a==='browse'); }

export function buildCatList() {
  const el=$('pm-cat-list'); if(!el)return;
  const selected=new Set([...($('pm-cat-chips')?.querySelectorAll('[data-c]')||[])].map(c=>c.dataset.c));
  const q=$('pm-cat-search')?.value.toLowerCase()||'';
  const all=[...ALL_CATS,...(D.customCategories||[]).map(c=>c.name)];
  const filtered=q?all.filter(c=>c.includes(q)):all;
  el.innerHTML=filtered.map(v=>`<div class="cat-item${selected.has(v)?' selected':''}" onclick="window._toggleCat('${esc(v)}')"><input type="checkbox" ${selected.has(v)?'checked':''} onclick="event.stopPropagation();window._toggleCat('${esc(v)}')"><span>${esc(v)}</span></div>`).join('');
}
function toggleCat(v){const chips=$('pm-cat-chips');const ex=chips?.querySelector(`[data-c="${CSS.escape(v)}"]`);if(ex)ex.remove();else addCatChip(v);buildCatList();}
function addCatChip(v){if($('pm-cat-chips')?.querySelector(`[data-c="${CSS.escape(v)}"]`))return;const d=document.createElement('div');d.className='chip';d.dataset.c=v;d.innerHTML=`${esc(v)}<button onclick="window._toggleCat('${esc(v)}')">✕</button>`;$('pm-cat-chips')?.appendChild(d);}
function buildCustomCatList(){const el=$('pm-cc-list');if(!el)return;const selected=new Set([...($('pm-cc-chips')?.querySelectorAll('[data-cc]')||[])].map(c=>c.dataset.cc));if(!(D.customCategories||[]).length){el.innerHTML='<div style="color:#64748b;font-size:12px">No custom categories</div>';return;}el.innerHTML=(D.customCategories||[]).map(c=>`<div class="cat-item${selected.has(c.id)?' selected':''}" onclick="window._toggleCC('${c.id}')"><input type="checkbox" ${selected.has(c.id)?'checked':''} onclick="event.stopPropagation();window._toggleCC('${c.id}')"><span>${esc(c.name)}</span></div>`).join('');}
function toggleCC(id){const chips=$('pm-cc-chips');const ex=chips?.querySelector(`[data-cc="${id}"]`);if(ex)ex.remove();else addCCChip(id);buildCustomCatList();}
function addCCChip(id){const cc=(D.customCategories||[]).find(c=>c.id===id);if(!cc||$('pm-cc-chips')?.querySelector(`[data-cc="${id}"]`))return;const d=document.createElement('div');d.className='chip';d.dataset.cc=id;d.innerHTML=`${esc(cc.name)}<button onclick="window._toggleCC('${id}')">✕</button>`;$('pm-cc-chips')?.appendChild(d);}
function buildListCbs(cid){const el=$(cid);if(!el)return;if(!(D.urlLists||[]).length){el.innerHTML='<div style="color:#64748b;font-size:12px">No URL lists</div>';return;}el.innerHTML=(D.urlLists||[]).map(l=>`<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;padding:3px 0"><input type="checkbox" value="${l.id}" style="accent-color:#6366f1;width:14px;height:14px;margin:0"> ${esc(l.name)} <span style="color:#475569">(${(l.domains||[]).length})</span></label>`).join('');}

// ── Save Policy → stages to pendingPolicies + autosaves to Supabase ────────────
export function savePol() {
  const name  = $('pm-name')?.value.trim(); if(!name){showAlert('pm-al','error','Policy name required');return;}
  const grpId = $('pm-grp')?.value;         if(!grpId){showAlert('pm-al','error','Select a group');return;}

  const cats      = [...($('pm-cat-chips')?.querySelectorAll('[data-c]')||[])].map(c=>c.dataset.c);
  const ccIds     = [...($('pm-cc-chips')?.querySelectorAll('[data-cc]')||[])].map(c=>c.dataset.cc);
  const listIds   = [...($('pm-list-cbs')?.querySelectorAll('input:checked')||[])].map(i=>i.value);
  const doms      = ($('pm-doms')?.value||'').split('\n').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);
  const comboDoms = ($('pm-combo-doms')?.value||'').split('\n').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);
  const comboListIds = [...($('pm-combo-list-cbs')?.querySelectorAll('input:checked')||[])].map(i=>i.value);

  const conditions = {};
  if(curType==='domain')     conditions.domains=doms;
  if(curType==='category')   conditions.categories=cats;
  if(curType==='list')       conditions.listIds=listIds;
  if(curType==='threat')     {conditions.scoreOp=$('pm-sop')?.value;conditions.scoreThreshold=parseInt($('pm-sthr')?.value||55);}
  if(curType==='reputation') conditions.requireKnownMalicious=true;
  if(curType==='customcat')  conditions.customCategoryIds=ccIds;
  if(curType==='combo')      {conditions.domains=comboDoms;conditions.categories=cats;conditions.listIds=comboListIds;}

  let schedule=null;
  if($('pm-sched-enabled')?.checked){
    const dm={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0};
    const days=[...document.querySelectorAll('.pm-day-btn.active')].map(b=>dm[b.dataset.day]).filter(d=>d!=null);
    schedule={startTime:$('pm-sched-start')?.value||'09:00',endTime:$('pm-sched-end')?.value||'17:00',days:days.length?days:[1,2,3,4,5],outsideScheduleAction:$('pm-sched-outside')?.value||'allow'};
  }

  const polData = {
    name, type:curType, action:curAct, activity:curActiv, conditions,
    note:$('pm-note')?.value.trim()||'',
    enabled:$('pm-en').classList.contains('on'),
    fileTypeListId:$('pm-ftl')?.value||null,
    schedule,
  };

  const editingPendingId = $('btn-save-pol')?.dataset.editingPendingId || '';
  const isEditLive = !!ePolId;

  if (editingPendingId) {
    // Editing an existing pending item — replace it
    const idx = (D.pendingPolicies||[]).findIndex(p=>p._pendingId===editingPendingId);
    if (idx>=0) {
      D.pendingPolicies[idx].policyData = { ...D.pendingPolicies[idx].policyData, ...polData };
      D.pendingPolicies[idx].groupId    = grpId;
    }
    stagePending(D.pendingPolicies[idx]);
  } else if (isEditLive) {
    // Editing a live policy — stage as edit
    const oldGrp = D.policyGroups.find(g=>(g.policyIds||[]).includes(ePolId));
    // Reflect changes in D immediately for UI
    const idx = D.orderedPolicies.findIndex(p=>p.id===ePolId);
    if (idx>=0) D.orderedPolicies[idx]={ ...D.orderedPolicies[idx], ...polData };
    if (oldGrp && oldGrp.id!==grpId) {
      oldGrp.policyIds=oldGrp.policyIds.filter(id=>id!==ePolId);
      const newGrp=D.policyGroups.find(g=>g.id===grpId);
      if(newGrp&&!newGrp.policyIds.includes(ePolId)) newGrp.policyIds.push(ePolId);
    }
    stagePending({_pendingId:'edit_pol_'+ePolId, type:'edit_policy', policyId:ePolId, changes:polData, newGroupId:grpId, oldGroupId:oldGrp?.id});
  } else {
    // Brand new policy → stage in pendingPolicies, auto-save to Supabase
    const id = 'pol_'+Date.now();
    polData.id = id;
    const pendingId = 'pending_pol_'+id;
    stagePending({ _pendingId:pendingId, type:'create_policy', policyData:polData, groupId:grpId });
  }

  closeModal('pol-modal');
  renderPols();
}

// ── Direct push (for default action, no pending) ──────────────────────────────
export async function pushAll() {
  if ((D.pendingPolicies||[]).length > 0) {
    showAlert('pol-al','error','You have pending changes — click ▶ Apply first to push them live, or ✕ Discard to cancel.');
    return;
  }
  const btn=$('push-btn'); btn.disabled=true; btn.textContent='Pushing...';
  try {
    D.policySettings = D.policySettings||{};
    D.policySettings.defaultAction = $('def-action')?.value||'allow';
    const ok = await saveData();
    showAlert('pol-al', ok?'success':'error', ok?'✓ Pushed to all users':'Push failed — check Supabase permissions');
  } catch(e){showAlert('pol-al','error','Error: '+e.message);}
  btn.disabled=false; btn.textContent='☁ Push to Users';
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPolicies() {
  $('btn-new-policy')?.addEventListener('click', ()=>openPolModal());
  $('btn-new-group')?.addEventListener('click', openGrpModal);
  $('push-btn')?.addEventListener('click', pushAll);
  $('btn-apply-changes')?.addEventListener('click', applyAllPending);
  $('btn-discard-changes')?.addEventListener('click', discardAllPending);
  $('btn-save-grp')?.addEventListener('click', saveGrp);
  $('btn-cancel-grp')?.addEventListener('click', ()=>closeModal('grp-modal'));
  $('btn-save-pol')?.addEventListener('click', savePol);
  $('btn-cancel-pol')?.addEventListener('click', ()=>closeModal('pol-modal'));
  $('btn-save-mtg')?.addEventListener('click', saveMoveToGroup);
  $('btn-cancel-mtg')?.addEventListener('click', ()=>closeModal('move-to-group-modal'));
  $('pm-cat-search')?.addEventListener('input', buildCatList);
  $('pm-sched-enabled')?.addEventListener('change', function(){ $('pm-sched-fields').style.display=this.checked?'block':'none'; });
  document.querySelectorAll('.pm-type-card').forEach(c=>c.addEventListener('click',()=>setType(c.dataset.t)));
  document.querySelectorAll('.abtn[data-a]').forEach(b=>b.addEventListener('click',()=>setAct(b.dataset.a)));
  document.querySelectorAll('.abtn[data-v]').forEach(b=>b.addEventListener('click',()=>setActiv(b.dataset.v)));
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('active')));

  window._togPol            = togPol;
  window._delPol            = delPol;
  window._delGrp            = delGrp;
  window._renameGrp         = renameGrp;
  window._moveGrp           = moveGrp;
  window._polMoveUp         = polMoveUp;
  window._polMoveDown       = polMoveDown;
  window._openPolModal      = openPolModal;
  window._toggleCat         = toggleCat;
  window._toggleCC          = toggleCC;
  window._openMoveToGroup   = openMoveToGroup;
  window._editPendingPol    = editPendingPol;
  window._discardOnePending = removePendingItem;
}
