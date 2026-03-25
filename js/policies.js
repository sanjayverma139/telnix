// policies.js — Netskope-style policy page: table, stat chips, filters, hamburger menu

import { ALL_CATS, THREAT_CATEGORIES, DAYS } from './config.js';
import { D, setCurAct, setCurActiv, setCurType,
         setEPolId, curAct, curActiv, curType, ePolId } from './state.js';
import { $, esc, showAlert, openModal, closeModal } from './utils.js';
import { saveData, loadData } from './api.js';


const TC = {
  domain:'#818cf8', category:'#34d399', list:'#60a5fa',
  combo:'#a78bfa', threat:'#f87171', reputation:'#fb923c', customcat:'#f59e0b'
};
const TC_ICON = {
  domain:'🌐', category:'📁', list:'📋', combo:'🔀',
  threat:'⚡', reputation:'🧠', customcat:'📂'
};

// ── Active filters ────────────────────────────────────────────────────────────
let activeFilters = []; // [{type, val, label}]
let searchQuery   = '';

function addFilter(type, val, label) {
  activeFilters = activeFilters.filter(f => f.type !== type);
  activeFilters.push({ type, val, label });
  renderPols();
}
function removeFilter(type) { activeFilters = activeFilters.filter(f => f.type !== type); renderPols(); }
function clearFilters() { activeFilters = []; searchQuery = ''; const s=$('pol-search'); if(s)s.value=''; renderPols(); }

function matchesFilters(pol, grp) {
  if (searchQuery && !pol.name.toLowerCase().includes(searchQuery)) return false;
  for (const f of activeFilters) {
    if (f.type === 'action'   && pol.action !== f.val) return false;
    if (f.type === 'type'     && pol.type   !== f.val) return false;
    if (f.type === 'status'   && f.val === 'enabled'  && pol.enabled === false) return false;
    if (f.type === 'status'   && f.val === 'disabled' && pol.enabled !== false) return false;
    if (f.type === 'schedule' && !pol.schedule) return false;
  }
  return true;
}

// ── Pending system ────────────────────────────────────────────────────────────
let pendingChanges = [];

function updatePendingBar() {
  const bar = $('pending-bar'), count = $('pending-count');
  const n = (D.pendingPolicies || []).length;
  if (!bar) return;
  bar.style.display = n > 0 ? 'flex' : 'none';
  if (count) count.textContent = n + ' pending change' + (n > 1 ? 's' : '');
}

function addPending(id, label, applyFn, discardFn) {
  pendingChanges = pendingChanges.filter(p => p.id !== id);
  pendingChanges.push({ id, label, applyFn, discardFn });
  updatePendingBar();
}

async function applyAllPending() {
  const btn = $('btn-apply-changes');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }
  try {
    for (const item of (D.pendingPolicies || [])) {
      if (item.type === 'create_policy') {
        const pol = { ...item.policyData }; delete pol._pendingId;
        D.orderedPolicies.push(pol);
        const grp = (D.policyGroups||[]).find(g => g.id === item.groupId);
        if (grp && !grp.policyIds.includes(pol.id)) {
          if (item.position === 'top') grp.policyIds.unshift(pol.id);
          else if (item.position === 'after' && item.afterPolId) { const i=grp.policyIds.indexOf(item.afterPolId); grp.policyIds.splice(i>=0?i+1:grp.policyIds.length,0,pol.id); }
          else if (item.position === 'before' && item.beforePolId) { const i=grp.policyIds.indexOf(item.beforePolId); grp.policyIds.splice(i>=0?i:0,0,pol.id); }
          else grp.policyIds.push(pol.id);
        }
      } else if (item.type==='edit_policy') {
        const i=D.orderedPolicies.findIndex(p=>p.id===item.policyId);
        if(i>=0)D.orderedPolicies[i]={...D.orderedPolicies[i],...item.changes};
        if(item.newGroupId&&item.oldGroupId!==item.newGroupId){
          const og=D.policyGroups.find(g=>g.id===item.oldGroupId);
          const ng=D.policyGroups.find(g=>g.id===item.newGroupId);
          if(og)og.policyIds=og.policyIds.filter(id=>id!==item.policyId);
          if(ng&&!ng.policyIds.includes(item.policyId))ng.policyIds.push(item.policyId);
        }
      } else if (item.type==='delete_policy') {
        D.orderedPolicies=D.orderedPolicies.filter(p=>p.id!==item.policyId);
        D.policyGroups.forEach(g=>{g.policyIds=(g.policyIds||[]).filter(id=>id!==item.policyId);});
      } else if (item.type==='create_group')  { if(!D.policyGroups.find(g=>g.id===item.group.id))D.policyGroups.push(item.group); }
        else if (item.type==='rename_group')  { const g=D.policyGroups.find(g=>g.id===item.groupId);if(g)g.name=item.newName; }
        else if (item.type==='delete_group')  { const dest=D.policyGroups.find(g=>g.id!==item.groupId);const grp=D.policyGroups.find(g=>g.id===item.groupId);if(grp)(grp.policyIds||[]).forEach(pid=>{if(dest)dest.policyIds.push(pid);});D.policyGroups=D.policyGroups.filter(g=>g.id!==item.groupId); }
        else if (item.type==='move_group')    { const idx=D.policyGroups.findIndex(g=>g.id===item.groupId);const to=item.direction==='up'?idx-1:idx+1;if(idx>=0&&to>=0&&to<D.policyGroups.length)[D.policyGroups[idx],D.policyGroups[to]]=[D.policyGroups[to],D.policyGroups[idx]]; }
        else if (item.type==='move_policy')   { const grp=D.policyGroups.find(g=>g.id===item.groupId);if(grp){const idx=grp.policyIds.indexOf(item.policyId);const to=item.direction==='up'?idx-1:idx+1;if(idx>=0&&to>=0&&to<grp.policyIds.length)[grp.policyIds[idx],grp.policyIds[to]]=[grp.policyIds[to],grp.policyIds[idx]];} }
        else if (item.type==='move_policy_to_group') { const fg=D.policyGroups.find(g=>g.id===item.fromGroupId);const tg=D.policyGroups.find(g=>g.id===item.toGroupId);if(fg)fg.policyIds=fg.policyIds.filter(id=>id!==item.policyId);if(tg&&!tg.policyIds.includes(item.policyId))tg.policyIds.push(item.policyId); }
        else if (item.type==='toggle_policy') {
          // Apply the toggled value to the live policy
          const p=D.orderedPolicies.find(p=>p.id===item.policyId);
          if(p) p.enabled=item.newValue;
        }
    }
    D.pendingPolicies=[]; pendingChanges=[];
    D.policySettings=D.policySettings||{};
    D.policySettings.defaultAction=$('def-action')?.value||'allow';
    const ok=await saveData();
    showAlert('pol-al',ok?'success':'error',ok?'✓ Applied and pushed — extension syncs in 1 minute':'Push failed');
    updatePendingBar(); renderPols();
  } catch(e){showAlert('pol-al','error','Error: '+e.message);}
  if(btn){btn.disabled=false;btn.textContent='▶ Apply';}
}

function discardAllPending() { openModal('discard-confirm-modal'); }

async function doDiscardAllPending() {
  closeModal('discard-confirm-modal');
  for (const item of (D.pendingPolicies||[])) {
    if (item.type==='toggle_policy') { /* toggle was never applied to D.orderedPolicies — just removing from pending is enough */ }
    else if (item.type==='rename_group') { const g=D.policyGroups.find(g=>g.id===item.groupId);if(g)g.name=item.oldName; }
    else if (item.type==='move_group') { const idx=D.policyGroups.findIndex(g=>g.id===item.groupId);const to=item.direction==='up'?idx+1:idx-1;if(idx>=0&&to>=0&&to<D.policyGroups.length)[D.policyGroups[idx],D.policyGroups[to]]=[D.policyGroups[to],D.policyGroups[idx]]; }
    else if (item.type==='move_policy') { const grp=D.policyGroups.find(g=>g.id===item.groupId);if(grp){const idx=grp.policyIds.indexOf(item.policyId);const to=item.direction==='up'?idx+1:idx-1;if(idx>=0&&to>=0&&to<grp.policyIds.length)[grp.policyIds[idx],grp.policyIds[to]]=[grp.policyIds[to],grp.policyIds[idx]];} }
    else if (item.type==='move_policy_to_group') { const fg=D.policyGroups.find(g=>g.id===item.toGroupId);const tg=D.policyGroups.find(g=>g.id===item.fromGroupId);if(fg)fg.policyIds=fg.policyIds.filter(id=>id!==item.policyId);if(tg&&!tg.policyIds.includes(item.policyId))tg.policyIds.push(item.policyId); }
  }
  pendingChanges=[]; D.pendingPolicies=[];
  await saveData(); updatePendingBar();
  const payload=await loadData();
  if(payload){D.orderedPolicies=payload.orderedPolicies||[];D.policyGroups=payload.policyGroups||[];D.pendingPolicies=[];}
  showAlert('pol-al','success','All pending changes discarded.');
  renderPols();
}

async function stagePending(item) {
  D.pendingPolicies=D.pendingPolicies||[];
  D.pendingPolicies=D.pendingPolicies.filter(p=>p._pendingId!==item._pendingId);
  D.pendingPolicies.push(item);
  await saveData(); updatePendingBar();
}

async function removePendingItem(pendingId) {
  D.pendingPolicies=(D.pendingPolicies||[]).filter(p=>p._pendingId!==pendingId);
  await saveData(); updatePendingBar(); renderPols();
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderPols() {
  $('def-action').value = D.policySettings?.defaultAction||'allow';
  updatePendingBar();

  // Compute stats
  const allPols   = D.orderedPolicies || [];
  const enabled   = allPols.filter(p=>p.enabled!==false).length;
  const disabled  = allPols.filter(p=>p.enabled===false).length;
  const grpCount  = (D.policyGroups||[]).length;
  const pending   = (D.pendingPolicies||[]).filter(p=>p.type==='create_policy').length;

  // Stat chips
  const chips = $('pol-stat-chips');
  if (chips) {
    const isEnabled  = activeFilters.find(f=>f.type==='status'&&f.val==='enabled');
    const isDisabled = activeFilters.find(f=>f.type==='status'&&f.val==='disabled');
    chips.innerHTML = `
      <span class="stat-chip" style="background:rgba(99,102,241,.12);color:#a5b4fc">${allPols.length + pending} policies</span>
      <span class="stat-chip stat-chip-click ${isEnabled?'stat-chip-active':''}" style="background:rgba(16,185,129,.1);color:#10b981;cursor:pointer" onclick="window._polFilterStatus('enabled')">${enabled} enabled</span>
      <span class="stat-chip stat-chip-click ${isDisabled?'stat-chip-active':''}" style="background:rgba(239,68,68,.1);color:#f87171;cursor:pointer" onclick="window._polFilterStatus('disabled')">${disabled} disabled</span>
      <span class="stat-chip" style="background:rgba(255,255,255,.05);color:#64748b">${grpCount} groups</span>
      ${pending?`<span class="stat-chip" style="background:rgba(245,158,11,.12);color:#fbbf24">${pending} pending</span>`:''}`;
  }

  // Filter chips row
  const filterRow = $('pol-filter-chips');
  if (filterRow) {
    filterRow.innerHTML = activeFilters.map(f=>`
      <div class="filter-chip" style="font-size:12px">
        ${esc(f.label)}
        <button class="filter-chip-x" onclick="window._removePolFilter('${f.type}')">✕</button>
      </div>`).join('') +
      (activeFilters.length > 0 ? `<button onclick="window._clearPolFilters()" style="background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171;border-radius:20px;padding:4px 10px;font-size:11px;cursor:pointer">✕ Clear all</button>` : '');
  }

  // Match count
  let totalMatch = 0;
  const matchEl = $('pol-match-count');

  const c = $('pol-con');
  if (!D.policyGroups?.length) { c.innerHTML = '<div class="loading">No groups — click New Group.</div>'; return; }

  // Build pending map
  const pendingByGroup = {};
  (D.pendingPolicies||[]).forEach(item=>{
    if(item.type==='create_policy'){
      const gid=item.groupId||(D.policyGroups[0]?.id||'?');
      if(!pendingByGroup[gid])pendingByGroup[gid]=[];
      pendingByGroup[gid].push(item);
    }
  });

  c.innerHTML = D.policyGroups.map((g,gi)=>{
    const ps=(g.policyIds||[]).map(id=>D.orderedPolicies.find(p=>p.id===id)).filter(Boolean);
    const filtered=ps.filter(p=>matchesFilters(p,g));
    const ghosts=pendingByGroup[g.id]||[];
    totalMatch+=filtered.length;

    const canUp=gi>0, canDown=gi<D.policyGroups.length-1;

    const liveRows=filtered.map((pol,fi)=>{
      const globalIdx=ps.indexOf(pol);
      const tc=TC[pol.type]||'#818cf8';
      const icon=TC_ICON[pol.type]||'🌐';
      const cond=buildCondSummary(pol);
      const schedBadge=pol.schedule?`<span style="font-size:10px;color:#a5b4fc">⏰ Sched</span>`:'<span style="color:#374151">—</span>';
      const actBadge=pol.activity==='download'?'📥':pol.activity==='upload'?'📤':pol.activity==='all'?'🔒':'🌐';
      // Check for any pending change on this policy
      const pendingTog  = (D.pendingPolicies||[]).find(x=>x._pendingId==='tog_'+pol.id&&x.type==='toggle_policy');
      const pendingEdit = (D.pendingPolicies||[]).find(x=>x.policyId===pol.id&&x.type==='edit_policy');
      const pendingDel  = (D.pendingPolicies||[]).find(x=>x._pendingId==='del_pol_'+pol.id&&x.type==='delete_policy');
      const hasPending  = !!(pendingTog||pendingEdit||pendingDel);
      const pendingBorder = pendingDel ? 'border-left:3px solid #ef4444;' : hasPending ? 'border-left:3px solid #f59e0b;' : '';
      const displayEnabled = pendingTog ? pendingTog.newValue : pol.enabled !== false;
      return `<tr class="pol-tr" style="${pendingBorder}${pendingDel?'opacity:0.4;':''}${!pendingDel&&!displayEnabled?'opacity:0.45':''}">
        <td style="color:#475569;font-size:11px;padding-left:28px">${gi+1}.${globalIdx+1}</td>
        <td style="font-weight:600;font-size:13px;color:#e2e8f0">
          ${esc(pendingEdit ? pendingEdit.changes.name : pol.name)}
          ${pendingDel  ? '<span style="font-size:9px;font-weight:800;color:#ef4444;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.4);border-radius:4px;padding:1px 6px;margin-left:6px">DELETE PENDING</span>' : ''}
          ${pendingEdit && !pendingDel ? '<span style="font-size:9px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);border-radius:4px;padding:1px 6px;margin-left:6px">EDIT PENDING</span>' : ''}
          ${(pendingEdit?pendingEdit.changes.note:pol.note)?`<div style="font-size:10px;color:#475569;font-weight:400">${esc(pendingEdit?pendingEdit.changes.note:pol.note)}</div>`:''}
        </td>
        <td><span style="background:${tc}18;color:${tc};padding:2px 9px;border-radius:6px;font-size:11px;font-weight:700">${icon} ${pol.type||'domain'}</span></td>
        <td style="font-size:11px;color:#64748b;max-width:200px">
          <span title="${esc(cond)}" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cond)}</span>
          ${(pendingEdit?pendingEdit.changes.source:pol.source) ? buildSourceSummary(pendingEdit?pendingEdit.changes.source:pol.source) : ''}
        </td>
        <td><span class="badge badge-${pol.action||'block'}" style="font-size:11px">${pol.action||'block'}</span> <span style="font-size:11px;color:#475569">${actBadge}</span></td>
        <td style="text-align:center">${schedBadge}</td>
        <td style="text-align:center;color:#64748b;font-size:12px">—</td>
        <td style="text-align:center">
          <button class="toggle ${pendingTog ? (pendingTog.newValue?'on':'') : (pol.enabled!==false?'on':'')}" style="width:34px;height:20px" onclick="window._togPol('${pol.id}','${g.id}')"></button>
        </td>
        <td style="text-align:right;position:relative">
          <button class="pol-menu-btn" onclick="window._openPolMenu(event,'${pol.id}','${g.id}',${globalIdx},${ps.length})">⋯</button>
        </td>
      </tr>`;
    }).join('');

    const ghostRows=ghosts.map(item=>{
      const pol=item.policyData;
      const tc=TC[pol.type]||'#818cf8';
      const icon=TC_ICON[pol.type]||'🌐';
      return `<tr class="pol-tr" style="border-left:3px solid #f59e0b;background:rgba(245,158,11,.03)">
        <td style="color:#f59e0b;font-size:10px;padding-left:28px">—</td>
        <td style="font-weight:600;font-size:13px">
          ${esc(pol.name)}
          <span style="font-size:9px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);border-radius:4px;padding:1px 6px;margin-left:6px">NOT APPLIED</span>
        </td>
        <td><span style="background:${tc}18;color:${tc};padding:2px 9px;border-radius:6px;font-size:11px;font-weight:700">${icon} ${pol.type||'domain'}</span></td>
        <td style="font-size:11px;color:#64748b">${esc(buildCondSummary(pol))}</td>
        <td><span class="badge badge-${pol.action||'block'}" style="font-size:11px">${pol.action||'block'}</span></td>
        <td>—</td><td>—</td>
        <td style="font-size:11px;color:#475569">${pol.enabled!==false?'Enabled':'Disabled'}</td>
        <td style="text-align:right">
          <button class="btn btn-sm btn-ghost" style="padding:3px 8px;font-size:11px" onclick="window._editPendingPol('${item._pendingId}')">✏</button>
          <button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px" onclick="window._discardOnePending('${item._pendingId}')">✕</button>
        </td>
      </tr>`;
    }).join('');

    const grpMenu=`<div style="position:relative;display:inline-block">
      <button class="pol-menu-btn" onclick="window._openGrpMenu(event,'${g.id}',${gi})" title="Group actions">⋯</button>
    </div>`;

    return `<div class="pol-group-wrap" style="margin-bottom:6px">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr class="pol-group-head">
            <td colspan="9" style="padding:10px 16px;border-radius:10px">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="color:#64748b;font-size:12px;font-weight:700">${gi+1}.</span>
                <span style="font-size:13px;font-weight:700;color:#a5b4fc">${esc(g.name)}</span>
                <span style="font-size:11px;color:#374151">${ps.length} ${ps.length===1?'policy':'policies'}</span>
                <div style="margin-left:auto">${grpMenu}</div>
              </div>
            </td>
          </tr>
          ${filtered.length>0||ghosts.length>0?`<tr class="pol-group-subhead">
            <th style="width:50px;padding:8px 8px 8px 28px;font-size:10px;color:#374151">#</th>
            <th style="font-size:10px;color:#374151;text-align:left;padding:8px">NAME</th>
            <th style="font-size:10px;color:#374151;text-align:left;padding:8px">TYPE</th>
            <th style="font-size:10px;color:#374151;text-align:left;padding:8px">CONDITIONS</th>
            <th style="font-size:10px;color:#374151;text-align:left;padding:8px">ACTION</th>
            <th style="font-size:10px;color:#374151;text-align:center;padding:8px">SCHEDULE</th>
            <th style="font-size:10px;color:#374151;text-align:center;padding:8px">HITS</th>
            <th style="font-size:10px;color:#374151;text-align:center;padding:8px">ON</th>
            <th style="width:40px"></th>
          </tr>`:''}
        </thead>
        <tbody>
          ${liveRows}${ghostRows}
          ${filtered.length===0&&ghosts.length===0?`<tr><td colspan="9" style="padding:14px 16px;font-size:12px;color:#374151;text-align:center">No policies${activeFilters.length?' matching filter':''} — click + New Policy and select group <strong style="color:#a5b4fc">${esc(g.name)}</strong></td></tr>`:''}
        </tbody>
      </table>
    </div>`;
  }).join('');

  if (matchEl) {
    if (activeFilters.length > 0 || searchQuery) {
      matchEl.textContent = totalMatch + ' match' + (totalMatch!==1?'es':'');
      matchEl.style.display='inline';
    } else {
      matchEl.style.display='none';
    }
  }
}

function buildCondSummary(pol) {
  if(!pol.conditions)return'—';
  if(pol.type==='domain'){const d=pol.conditions.domains||[];return d.slice(0,2).join(', ')+(d.length>2?` +${d.length-2}`:'');}
  if(pol.type==='category')return(pol.conditions.categories||[]).slice(0,2).join(', ')||'—';
  if(pol.type==='list'){const n=(pol.conditions.listIds||[]).map(id=>(D.urlLists||[]).find(l=>l.id===id)?.name||id);return n.slice(0,2).join(', ')||'—';}
  if(pol.type==='threat')return`score ${pol.conditions.scoreOp||'gte'} ${pol.conditions.scoreThreshold??55}`;
  if(pol.type==='reputation')return'known malicious';
  if(pol.type==='customcat'){const n=(pol.conditions.customCategoryIds||[]).map(id=>(D.customCategories||[]).find(c=>c.id===id)?.name||id);return n.slice(0,2).join(', ')||'—';}
  if(pol.type==='combo')return'multi-criteria';
  return'—';
}

// ── Hamburger menus ───────────────────────────────────────────────────────────
function closeAllMenus() { document.querySelectorAll('.pol-dd-menu').forEach(m=>m.remove()); }

function openPolMenu(e, polId, grpId, idx, total) {
  e.stopPropagation(); closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'pol-dd-menu';
  menu.style.cssText = 'position:fixed;min-width:190px;z-index:9999';
  menu.classList.add('surface-menu');
  const isPendingDel = !!(D.pendingPolicies||[]).find(x=>x._pendingId==='del_pol_'+polId);
  menu.innerHTML = `
    <div class="pol-dd-item ${isPendingDel?'pol-dd-disabled':''}" onclick="window._openPolModal('${polId}')">✏ Edit Policy</div>
    <div class="pol-dd-sep"></div>
    <div class="pol-dd-item ${idx<=0||isPendingDel?'pol-dd-disabled':''}" onclick="window._polMoveUp('${polId}','${grpId}')">▲ Move Up in Group</div>
    <div class="pol-dd-item ${idx>=total-1||isPendingDel?'pol-dd-disabled':''}" onclick="window._polMoveDown('${polId}','${grpId}')">▼ Move Down in Group</div>
    <div class="pol-dd-item ${isPendingDel?'pol-dd-disabled':''}" onclick="window._openMoveToGroup('${polId}','${grpId}')">↔ Reposition Policy…</div>
    <div class="pol-dd-sep"></div>
    ${isPendingDel
      ? `<div class="pol-dd-item" onclick="window._discardOnePending('del_pol_${polId}')">↩ Cancel Delete</div>`
      : `<div class="pol-dd-item pol-dd-danger" onclick="window._delPol('${polId}','${grpId}')">🗑 Delete Policy</div>`
    }`;
  document.body.appendChild(menu);
  const r = e.target.getBoundingClientRect();
  menu.style.top  = (r.bottom + 4) + 'px';
  menu.style.right = (window.innerWidth - r.right) + 'px';
}

function openGrpMenu(e, grpId, gi) {
  e.stopPropagation(); closeAllMenus();
  const canUp=gi>0, canDown=gi<D.policyGroups.length-1;
  const grp=D.policyGroups.find(g=>g.id===grpId);
  const isDefault=grp?._isDefault;
  const menu = document.createElement('div');
  menu.className = 'pol-dd-menu';
  menu.style.cssText = 'position:fixed;min-width:180px;z-index:9999';
  menu.classList.add('surface-menu');
  menu.innerHTML = `
    <div class="pol-dd-item ${canUp?'':'pol-dd-disabled'}" onclick="window._moveGrp('${grpId}','up')">▲ Move Group Up</div>
    <div class="pol-dd-item ${canDown?'':'pol-dd-disabled'}" onclick="window._moveGrp('${grpId}','down')">▼ Move Group Down</div>
    <div class="pol-dd-sep"></div>
    <div class="pol-dd-item" onclick="window._renameGrp('${grpId}')">✏ Rename Group</div>
    ${!isDefault?`<div class="pol-dd-sep"></div><div class="pol-dd-item pol-dd-danger" onclick="window._delGrp('${grpId}')">🗑 Delete Group</div>`:''}`;
  document.body.appendChild(menu);
  const r = e.target.getBoundingClientRect();
  menu.style.top  = (r.bottom + 4) + 'px';
  menu.style.right = (window.innerWidth - r.right) + 'px';
}

// Add filter dropdown
function openFilterDropdown(e) {
  e.stopPropagation(); closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'pol-dd-menu';
  menu.style.cssText = 'position:fixed;min-width:220px;z-index:9999';
  menu.classList.add('surface-menu','soft');
  menu.innerHTML = `
    <div style="padding:6px 14px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.8px">Action</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('action','block','Action = Block')">🔴 Action = Block</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('action','warn','Action = Warn')">🟡 Action = Warn</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('action','allow','Action = Allow')">🟢 Action = Allow</div>
    <div class="pol-dd-sep"></div>
    <div style="padding:6px 14px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.8px">Type</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('type','domain','Type = Domain')">🌐 Domain</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('type','category','Type = Category')">📁 Category</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('type','list','Type = URL List')">📋 URL List</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('type','combo','Type = Combo')">🔀 Combo</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('type','threat','Type = Threat Score')">⚡ Threat Score</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('type','reputation','Type = Known Malicious')">🧠 Known Malicious</div>
    <div class="pol-dd-sep"></div>
    <div style="padding:6px 14px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.8px">Status</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('status','enabled','Enabled Only')">✅ Enabled Only</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('status','disabled','Disabled Only')">⛔ Disabled Only</div>
    <div class="pol-dd-sep"></div>
    <div style="padding:6px 14px;font-size:9px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.8px">Schedule</div>
    <div class="pol-dd-item" onclick="window._addPolFilter('schedule','yes','Has Schedule')">⏰ Has Schedule</div>`;
  document.body.appendChild(menu);
  const r = e.target.getBoundingClientRect();
  menu.style.top  = (r.bottom + 4) + 'px';
  menu.style.left = r.left + 'px';
}

// ── Group CRUD ────────────────────────────────────────────────────────────────
export function openGrpModal(){$('gm-name').value='';openModal('grp-modal');setTimeout(()=>$('gm-name').focus(),100);}
export function saveGrp(){
  const n=$('gm-name').value.trim();if(!n)return;
  const group={id:'grp_'+Date.now(),name:n,policyIds:[]};
  D.policyGroups.push(group);
  stagePending({_pendingId:'create_grp_'+group.id,type:'create_group',group});
  closeModal('grp-modal');renderPols();
}
function renameGrp(id){
  const grp=D.policyGroups.find(g=>g.id===id);if(!grp)return;
  const n=prompt(`Rename "${grp.name}":`,grp.name);if(!n?.trim()||n.trim()===grp.name)return;
  const old=grp.name;grp.name=n.trim();
  stagePending({_pendingId:'rename_grp_'+id,type:'rename_group',groupId:id,newName:n.trim(),oldName:old});
  renderPols();
}
function delGrp(id){
  if(D.policyGroups.length<=1){alert('Cannot delete the only group.');return;}
  const grp=D.policyGroups.find(g=>g.id===id);if(!grp)return;
  if(!confirm(`Delete group "${grp.name}"?`))return;
  const dest=D.policyGroups.find(g=>g.id!==id);
  (grp.policyIds||[]).forEach(pid=>{if(dest)dest.policyIds.push(pid);});
  D.policyGroups=D.policyGroups.filter(g=>g.id!==id);
  stagePending({_pendingId:'del_grp_'+id,type:'delete_group',groupId:id});renderPols();
}
function moveGrp(id,dir){
  const idx=D.policyGroups.findIndex(g=>g.id===id);if(idx<0)return;
  const to=dir==='up'?idx-1:idx+1;if(to<0||to>=D.policyGroups.length)return;
  [D.policyGroups[idx],D.policyGroups[to]]=[D.policyGroups[to],D.policyGroups[idx]];
  stagePending({_pendingId:'move_grp_'+id+'_'+Date.now(),type:'move_group',groupId:id,direction:dir});renderPols();
}

// ── Policy CRUD ───────────────────────────────────────────────────────────────
function togPol(id){
  const p=D.orderedPolicies.find(p=>p.id===id);if(!p)return;
  const oldValue = p.enabled !== false;
  // Check if there's already a pending toggle for this policy
  const existing = (D.pendingPolicies||[]).find(x=>x._pendingId==='tog_'+id);
  if (existing) {
    // Toggle is being reversed — cancel the pending toggle instead
    D.pendingPolicies = (D.pendingPolicies||[]).filter(x=>x._pendingId!=='tog_'+id);
    saveData(); updatePendingBar(); renderPols();
    return;
  }
  // New toggle — stage it but DO NOT modify D.orderedPolicies
  // The render function will show the pending state visually
  stagePending({_pendingId:'tog_'+id, type:'toggle_policy', policyId:id, newValue:!oldValue, oldValue});
  renderPols();
}
function delPol(id){
  const pol=D.orderedPolicies.find(p=>p.id===id);if(!pol)return;
  if(!confirm(`Delete policy "${pol.name}"?`))return;
  // DO NOT remove from D.orderedPolicies yet — only stage
  // Row will show DELETE PENDING badge; applied on Apply
  const grp=(D.policyGroups||[]).find(g=>(g.policyIds||[]).includes(id));
  stagePending({_pendingId:'del_pol_'+id, type:'delete_policy', policyId:id, originalPol:{...pol}, groupId:grp?.id});
  renderPols();
}
function polMoveUp(polId,grpId){
  const grp=D.policyGroups.find(g=>g.id===grpId);if(!grp)return;
  const idx=grp.policyIds.indexOf(polId);if(idx<=0)return;
  [grp.policyIds[idx-1],grp.policyIds[idx]]=[grp.policyIds[idx],grp.policyIds[idx-1]];
  stagePending({_pendingId:'pol_up_'+polId+'_'+Date.now(),type:'move_policy',policyId:polId,groupId:grpId,direction:'up'});renderPols();
}
function polMoveDown(polId,grpId){
  const grp=D.policyGroups.find(g=>g.id===grpId);if(!grp)return;
  const idx=grp.policyIds.indexOf(polId);if(idx<0||idx>=grp.policyIds.length-1)return;
  [grp.policyIds[idx],grp.policyIds[idx+1]]=[grp.policyIds[idx+1],grp.policyIds[idx]];
  stagePending({_pendingId:'pol_dn_'+polId+'_'+Date.now(),type:'move_policy',policyId:polId,groupId:grpId,direction:'down'});renderPols();
}
let _movingPolId=null,_movingFromGrpId=null;
function openMoveToGroup(polId,fromGrpId){
  _movingPolId=polId;_movingFromGrpId=fromGrpId;
  const pol=D.orderedPolicies.find(p=>p.id===polId);
  $('mtg-pol-name').textContent=pol?.name||polId;
  $('mtg-grp-select').innerHTML=D.policyGroups.filter(g=>g.id!==fromGrpId).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  openModal('move-to-group-modal');
}
function saveMoveToGroup(){
  const toGrpId=$('mtg-grp-select')?.value;if(!toGrpId)return;
  const fg=D.policyGroups.find(g=>g.id===_movingFromGrpId),tg=D.policyGroups.find(g=>g.id===toGrpId);
  if(!fg||!tg)return;
  fg.policyIds=fg.policyIds.filter(id=>id!==_movingPolId);
  if(!tg.policyIds.includes(_movingPolId))tg.policyIds.push(_movingPolId);
  stagePending({_pendingId:'mtg_'+_movingPolId,type:'move_policy_to_group',policyId:_movingPolId,fromGroupId:_movingFromGrpId,toGroupId:toGrpId});
  closeModal('move-to-group-modal');renderPols();
}

// ── Searchable chip dropdown ──────────────────────────────────────────────────
function buildChipDropdown(containerId, allItems, selectedIds, opts={}) {
  const el=$(containerId);if(!el)return null;el.innerHTML='';
  const wrap=document.createElement('div');wrap.style.cssText='position:relative';
  const inputRow=document.createElement('div');
  inputRow.className='search-chip-input';
  const chipsWrap=document.createElement('div');chipsWrap.style.cssText='display:flex;flex-wrap:wrap;gap:4px;flex:1;align-items:center';
  const searchInput=document.createElement('input');
  searchInput.placeholder=opts.placeholder||'Search and select...';
  searchInput.className='search-chip-field';
  searchInput.style.cssText='background:transparent;border:none;outline:none;font-size:12px;min-width:80px;flex:1;margin:0';
  const dd=document.createElement('div');
  dd.className='search-chip-dd';
  let selected=new Set(selectedIds||[]),filterMode='all';
  function renderChips(){chipsWrap.innerHTML='';selected.forEach(id=>{const item=allItems.find(x=>(x.id||x)===id);const label=item?.name||item?.label||id;const chip=document.createElement('div');chip.className='search-chip';chip.innerHTML=`${esc(label)}<button style="background:none;border:none;color:#a5b4fc;cursor:pointer;font-size:11px;padding:0 0 0 2px;line-height:1">✕</button>`;chip.querySelector('button').addEventListener('click',e=>{e.stopPropagation();selected.delete(id);renderChips();renderDd(searchInput.value);});chipsWrap.appendChild(chip);});chipsWrap.appendChild(searchInput);}
  function renderDd(q){let items=allItems;if(opts.hasFilter){if(filterMode==='predefined')items=allItems.filter(x=>!x.isCustom);else if(filterMode==='custom')items=allItems.filter(x=>x.isCustom);}if(q)items=items.filter(x=>(x.name||x.label||x||'').toLowerCase().includes(q.toLowerCase()));let html='';if(opts.hasFilter){html+=`<div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,.06)">${['all','predefined','custom'].map(m=>`<button data-fm="${m}" style="flex:1;padding:7px;font-size:11px;font-weight:${filterMode===m?'700':'500'};color:${filterMode===m?'#a5b4fc':'#64748b'};background:${filterMode===m?'rgba(99,102,241,.1)':'transparent'};border:none;cursor:pointer;border-bottom:2px solid ${filterMode===m?'#6366f1':'transparent'}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join('')}</div>`;}html+=`<div style="max-height:180px;overflow-y:auto">`;if(!items.length){html+='<div style="padding:12px 14px;font-size:12px;color:#475569">No results</div>';}else html+=items.map(item=>{const id=item?.id||item;const label=item?.name||item?.label||item||id;const isSel=selected.has(id);return`<div data-id="${esc(String(id))}" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:12px;color:${isSel?'#a5b4fc':'#cbd5e1'};background:${isSel?'rgba(99,102,241,.1)':'transparent'}"><input type="checkbox" ${isSel?'checked':''} style="accent-color:#6366f1;margin:0;flex-shrink:0;width:14px;height:14px"><span>${esc(label)}</span>${item?.isCustom?'<span style="font-size:9px;color:#475569;margin-left:auto">custom</span>':''}</div>`;}).join('');html+='</div>';dd.innerHTML=html;dd.querySelectorAll('[data-fm]').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();filterMode=btn.dataset.fm;renderDd(searchInput.value);});});dd.querySelectorAll('[data-id]').forEach(row=>{row.addEventListener('click',e=>{e.stopPropagation();const id=row.dataset.id;if(selected.has(id))selected.delete(id);else selected.add(id);renderChips();renderDd(searchInput.value);});});}
  searchInput.addEventListener('input',()=>renderDd(searchInput.value));
  searchInput.addEventListener('focus',()=>{renderDd(searchInput.value);dd.style.display='block';inputRow.style.borderColor='rgba(99,102,241,.6)';});
  inputRow.addEventListener('click',()=>searchInput.focus());
  document.addEventListener('click',e=>{if(!wrap.contains(e.target)){dd.style.display='none';inputRow.style.borderColor='rgba(99,102,241,.2)';}},true);
  renderChips();renderDd('');inputRow.appendChild(chipsWrap);wrap.appendChild(inputRow);wrap.appendChild(dd);el.appendChild(wrap);
  return{getSelected:()=>[...selected]};
}

let _ddCat=null,_ddList=null,_ddComboList=null,_savedPolData=null;
let _ddSourceUsers=null,_ddSourceGroups=null;

// ── Policy modal ──────────────────────────────────────────────────────────────
export function openPolModal(id=null,pendingItem=null){
  setEPolId(id);_savedPolData=null;
  const isEdit=!!id,isPending=!!pendingItem;
  $('pm-title').textContent=isPending?`Edit Pending`:(isEdit?'Edit Policy':'New Policy');
  $('pm-al').style.display='none';
  $('pm-ftl').innerHTML='<option value="">All file types</option>'+(D.fileTypeLists||[]).map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');
  ['pm-name','pm-doms','pm-note','pm-combo-doms'].forEach(x=>{const e=$(x);if(e)e.value='';});
  $('pm-sthr').value=55;$('pm-en').className='toggle on';
  $('pm-sched-enabled').checked=false;$('pm-sched-fields').style.display='none';
  $('pm-sched-start').value='09:00';$('pm-sched-end').value='17:00';$('pm-sched-outside').value='allow';
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.classList.remove('active'));
  setCurAct('block');setCurActiv('browse');setCurType('domain');
  setType('domain');setAct('block');setActiv('browse');
  const catItems=[...ALL_CATS.map(c=>({id:c,name:c.charAt(0).toUpperCase()+c.slice(1),isCustom:false})),...(D.customCategories||[]).map(c=>({id:c.id,name:c.name,isCustom:true}))];
  const listItems=(D.urlLists||[]).map(l=>({id:l.id,name:l.name}));
  _ddCat=buildChipDropdown('pm-cat-wrap',catItems,[],{placeholder:'Search categories...',hasFilter:true});
  _ddList=buildChipDropdown('pm-list-wrap',listItems,[],{placeholder:'Search URL lists...'});
  _ddComboList=buildChipDropdown('pm-combo-list-wrap',listItems,[],{placeholder:'Search URL lists...'});
  
  const pol=isPending?pendingItem.policyData:(isEdit?D.orderedPolicies.find(p=>p.id===id):null);
  // Source dropdowns — built asynchronously after modal opens
  _ddSourceUsers=null; _ddSourceGroups=null;
  buildSourceDropdowns(pol?.source?.users||[], pol?.source?.groups||[]);
  if(pol){
    $('pm-name').value=pol.name||'';$('pm-note').value=pol.note||'';
    if(pol.enabled===false)$('pm-en').className='toggle';
    setType(pol.type||'domain');setAct(pol.action||'block');setActiv(pol.activity||'browse');
    const c=pol.conditions||{};
    if(c.domains)$('pm-doms').value=c.domains.join('\n');
    if(c.scoreOp)$('pm-sop').value=c.scoreOp;
    if(c.scoreThreshold!=null)$('pm-sthr').value=c.scoreThreshold;
    if(pol.fileTypeListId)$('pm-ftl').value=pol.fileTypeListId;
    if(pol.schedule){$('pm-sched-enabled').checked=true;$('pm-sched-fields').style.display='block';$('pm-sched-start').value=pol.schedule.startTime||'09:00';$('pm-sched-end').value=pol.schedule.endTime||'17:00';$('pm-sched-outside').value=pol.schedule.outsideScheduleAction||'allow';const dm={1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',0:'Sun'};(pol.schedule.days||[]).forEach(d=>document.querySelector(`.pm-day-btn[data-day="${dm[d]}"]`)?.classList.add('active'));}
    const selCats=[...(c.categories||[]),...(c.customCategoryIds||[])];
    if(selCats.length)_ddCat=buildChipDropdown('pm-cat-wrap',catItems,selCats,{placeholder:'Search categories...',hasFilter:true});
    if((c.listIds||[]).length)_ddList=buildChipDropdown('pm-list-wrap',listItems,c.listIds||[],{placeholder:'Search URL lists...'});
  }
  $('btn-save-pol').dataset.editingPendingId=pendingItem?._pendingId||'';
  openModal('pol-modal');
}

export function setType(t){setCurType(t);document.querySelectorAll('.pm-type-card').forEach(c=>c.classList.toggle('sel',c.dataset.t===t));['domain','category','list','customcat','combo','threat','reputation'].forEach(x=>$('crit-'+x)?.classList.toggle('hid',x!==t));}
export function setAct(a){setCurAct(a);document.querySelectorAll('.abtn[data-a]').forEach(b=>{b.className='abtn'+(b.dataset.a===a?` sel-${a}`:'');});}
export function setActiv(a){setCurActiv(a);document.querySelectorAll('.abtn[data-v]').forEach(b=>b.classList.toggle('sel-act',b.dataset.v===a));$('pm-ftrow')?.classList.toggle('hid',a==='browse');}

function collectPolData(){
  const name=$('pm-name')?.value.trim();if(!name){showAlert('pm-al','error','Policy name required');return null;}
  const allCatSel=_ddCat?.getSelected()||[];
  const predCatIds=allCatSel.filter(id=>ALL_CATS.includes(id));
  const customCatIds=allCatSel.filter(id=>!ALL_CATS.includes(id));
  const listIds=_ddList?.getSelected()||[];
  const comboListIds=_ddComboList?.getSelected()||[];
  const doms=($('pm-doms')?.value||'').split('\n').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);
  const comboDoms=($('pm-combo-doms')?.value||'').split('\n').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);
  const conditions={};
  if(curType==='domain')    conditions.domains=doms;
  if(curType==='category')  {conditions.categories=predCatIds;conditions.customCategoryIds=customCatIds;}
  if(curType==='list')      conditions.listIds=listIds;
  if(curType==='threat')    {conditions.scoreOp=$('pm-sop')?.value;conditions.scoreThreshold=parseInt($('pm-sthr')?.value||55);}
  if(curType==='reputation')conditions.requireKnownMalicious=true;
  if(curType==='customcat') conditions.customCategoryIds=customCatIds;
  if(curType==='combo')     {conditions.domains=comboDoms;conditions.categories=predCatIds;conditions.listIds=comboListIds;}
  let schedule=null;
  if($('pm-sched-enabled')?.checked){const dm={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0};const days=[...document.querySelectorAll('.pm-day-btn.active')].map(b=>dm[b.dataset.day]).filter(d=>d!=null);schedule={startTime:$('pm-sched-start')?.value||'09:00',endTime:$('pm-sched-end')?.value||'17:00',days:days.length?days:[1,2,3,4,5],outsideScheduleAction:$('pm-sched-outside')?.value||'allow'};}
  const sourceUsers  = _ddSourceUsers?.getSelected()  || [];
  const sourceGroups = _ddSourceGroups?.getSelected() || [];
  const source = (sourceUsers.length || sourceGroups.length) ? { users: sourceUsers, groups: sourceGroups } : null;
  return{name,type:curType,action:curAct,activity:curActiv,conditions,note:$('pm-note')?.value.trim()||'',enabled:$('pm-en').classList.contains('on'),fileTypeListId:$('pm-ftl')?.value||null,schedule,source};
}

export function savePol(){
  const polData=collectPolData();if(!polData)return;
  const editingPendingId=$('btn-save-pol')?.dataset.editingPendingId||'';
  const isEditLive=!!ePolId;
  if(editingPendingId){
    const idx=(D.pendingPolicies||[]).findIndex(p=>p._pendingId===editingPendingId);
    if(idx>=0){D.pendingPolicies[idx].policyData={...D.pendingPolicies[idx].policyData,...polData};stagePending(D.pendingPolicies[idx]);}
    closeModal('pol-modal');renderPols();
  } else if(isEditLive){
    const oldGrp=D.policyGroups.find(g=>(g.policyIds||[]).includes(ePolId));
    // DO NOT modify D.orderedPolicies — only stage, extension sees old version until Apply
    stagePending({_pendingId:'edit_pol_'+ePolId, type:'edit_policy', policyId:ePolId, changes:polData, oldGroupId:oldGrp?.id});
    closeModal('pol-modal');renderPols();
  } else {
    _savedPolData=polData;closeModal('pol-modal');openPlaceModal(polData.name);
  }
}

// ── Place modal ───────────────────────────────────────────────────────────────
let _placePosition='bottom',_placeRefPolId=null;
function openPlaceModal(polName){
  $('place-pol-name').textContent=polName;
  $('place-grp-select').innerHTML=D.policyGroups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  _placePosition='bottom';_placeRefPolId=null;
  document.querySelectorAll('.place-opt').forEach(o=>o.classList.toggle('sel',o.dataset.pos==='bottom'));
  buildPlaceRefSelect();$('place-ref-row').style.display='none';openModal('place-modal');
}
function buildPlaceRefSelect(){
  const grpId=$('place-grp-select')?.value;const grp=D.policyGroups.find(g=>g.id===grpId);
  const ps=(grp?.policyIds||[]).map(id=>D.orderedPolicies.find(p=>p.id===id)).filter(Boolean);
  const sel=$('place-ref-select');if(sel)sel.innerHTML=ps.map((p,i)=>`<option value="${p.id}">#${i+1} — ${esc(p.name)}</option>`).join('');
}
function savePlacement(){
  if(!_savedPolData){closeModal('place-modal');return;}
  const id='pol_'+Date.now();_savedPolData.id=id;
  const grpId=$('place-grp-select')?.value;
  const refPolId=$('place-ref-select')?.value||null;
  stagePending({_pendingId:'pending_pol_'+id,type:'create_policy',policyData:{..._savedPolData},groupId:grpId,position:_placePosition,afterPolId:_placePosition==='after'?refPolId:null,beforePolId:_placePosition==='before'?refPolId:null});
  closeModal('place-modal');updatePendingBar();renderPols();
}
function editPendingPol(pendingId){const item=(D.pendingPolicies||[]).find(p=>p._pendingId===pendingId);if(!item)return;openPolModal(null,item);}

export async function pushAll(){
  if((D.pendingPolicies||[]).length>0){showAlert('pol-al','error','You have pending changes — click ▶ Apply first.');return;}
  const btn=$('push-btn');btn.disabled=true;btn.textContent='Pushing...';
  try{D.policySettings=D.policySettings||{};D.policySettings.defaultAction=$('def-action')?.value||'allow';const ok=await saveData();showAlert('pol-al',ok?'success':'error',ok?'✓ Pushed to all users':'Push failed');}catch(e){showAlert('pol-al','error','Error: '+e.message);}
  btn.disabled=false;btn.textContent='☁ Push to Users';
}

// ── Source dropdowns ─────────────────────────────────────────────────────────
async function buildSourceDropdowns(selectedUsers=[], selectedGroups=[]) {
  // Get known users from activity logs
  try {
    const { sbf }   = await import('./api.js');
    const { ORG }   = await import('./config.js');
    const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&select=user_email&limit=500`);
    let userEmails = [];
    if (r.ok) {
      const rows = await r.json();
      userEmails = [...new Set(rows.map(l=>l.user_email).filter(Boolean))].sort();
    }
    const userItems  = userEmails.map(e => ({ id:e, name:e }));
    let groupItems = [];
    try {
      const { sbf } = await import('./api.js');
      const { ORG } = await import('./config.js');
      const gr = await sbf(`/rest/v1/user_groups?org_id=eq.${ORG}&order=name.asc`);
      if (gr.ok) {
        const groups = await gr.json();
        groupItems = groups.map(g => ({ id: g.id, name: g.name }));
      }
    } catch(e) { console.warn('[Source] groups fetch failed:', e); }

    _ddSourceUsers  = buildChipDropdown('pm-source-users-wrap',  userItems,  selectedUsers,  { placeholder:'Search or type email...' });
    _ddSourceGroups = buildChipDropdown('pm-source-groups-wrap', groupItems, selectedGroups, { placeholder:'Search groups...' });

    // Show/hide group row based on whether source section has any selection
    updateSourceGroupVisibility();
  } catch(e) { console.warn('[Source] failed to load users:', e); }
}

function updateSourceGroupVisibility() {
  // Group row is always shown — user can select groups independently
}

function buildSourceSummary(source) {
  if (!source) return '';
  const parts = [];
  if (source.users?.length)  parts.push(`<span style="font-size:10px;color:#a5b4fc">👤 ${source.users.length} user${source.users.length!==1?'s':''}</span>`);
  if (source.groups?.length) parts.push(`<span style="font-size:10px;color:#34d399">👥 ${source.groups.length} group${source.groups.length!==1?'s':''}</span>`);
  return parts.length ? `<div style="display:flex;gap:6px;margin-top:3px">${parts.join('')}</div>` : '';
}

export function initPolicies(){
  $('btn-new-policy')?.addEventListener('click',()=>openPolModal());
  $('btn-new-group')?.addEventListener('click',openGrpModal);
  $('push-btn')?.addEventListener('click',pushAll);
  $('btn-apply-changes')?.addEventListener('click',applyAllPending);
  $('btn-discard-changes')?.addEventListener('click',discardAllPending);
  $('btn-discard-confirm')?.addEventListener('click',doDiscardAllPending);
  $('btn-discard-cancel')?.addEventListener('click',()=>closeModal('discard-confirm-modal'));
  $('btn-save-grp')?.addEventListener('click',saveGrp);
  $('btn-cancel-grp')?.addEventListener('click',()=>closeModal('grp-modal'));
  $('btn-save-pol')?.addEventListener('click',savePol);
  $('btn-cancel-pol')?.addEventListener('click',()=>closeModal('pol-modal'));
  $('btn-save-mtg')?.addEventListener('click',saveMoveToGroup);
  $('btn-cancel-mtg')?.addEventListener('click',()=>closeModal('move-to-group-modal'));
  $('btn-place-add')?.addEventListener('click',savePlacement);
  $('btn-place-cancel')?.addEventListener('click',()=>closeModal('place-modal'));
  $('place-grp-select')?.addEventListener('change',buildPlaceRefSelect);
  $('btn-pol-filter')?.addEventListener('click',openFilterDropdown);
  $('btn-pol-clear-filter')?.addEventListener('click',clearFilters);
  $('pol-search')?.addEventListener('input',e=>{searchQuery=e.target.value.toLowerCase();renderPols();});
  document.querySelectorAll('.place-opt').forEach(o=>{o.addEventListener('click',()=>{_placePosition=o.dataset.pos;document.querySelectorAll('.place-opt').forEach(x=>x.classList.remove('sel'));o.classList.add('sel');$('place-ref-row').style.display=(_placePosition==='after'||_placePosition==='before')?'block':'none';});});
  $('pm-sched-enabled')?.addEventListener('change',function(){$('pm-sched-fields').style.display=this.checked?'block':'none';});
  document.querySelectorAll('.pm-type-card').forEach(c=>c.addEventListener('click',()=>setType(c.dataset.t)));
  document.querySelectorAll('.abtn[data-a]').forEach(b=>b.addEventListener('click',()=>setAct(b.dataset.a)));
  document.querySelectorAll('.abtn[data-v]').forEach(b=>b.addEventListener('click',()=>setActiv(b.dataset.v)));
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('active')));
  document.addEventListener('click',e=>{if(!e.target.closest('.pol-menu-btn'))closeAllMenus();});

  window._togPol=togPol;window._delPol=delPol;window._delGrp=delGrp;
  window._renameGrp=renameGrp;window._moveGrp=moveGrp;
  window._polMoveUp=polMoveUp;window._polMoveDown=polMoveDown;
  window._openPolModal=openPolModal;window._openMoveToGroup=openMoveToGroup;
  window._editPendingPol=editPendingPol;window._discardOnePending=removePendingItem;
  window._openPolMenu=openPolMenu;window._openGrpMenu=openGrpMenu;
  window._addPolFilter=(type,val,label)=>{closeAllMenus();addFilter(type,val,label);};
  window._removePolFilter=removeFilter;window._clearPolFilters=clearFilters;
  window._polFilterStatus=(val)=>{ const label=val==='enabled'?'Enabled Only':'Disabled Only'; if(activeFilters.find(f=>f.type==='status'&&f.val===val)){removeFilter('status');}else{addFilter('status',val,label);}};
}
