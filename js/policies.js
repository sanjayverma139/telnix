// policies.js — Full policy management with pending system, searchable dropdowns, place modal

import { ALL_CATS, THREAT_CATEGORIES, DAYS }          from './config.js';
import { D, setCurAct, setCurActiv, setCurType,
         setEPolId, curAct, curActiv, curType, ePolId } from './state.js';
import { $, esc, showAlert, openModal, closeModal }    from './utils.js';
import { saveData, loadData }                          from './api.js';

const TC = {
  domain:'#818cf8', category:'#34d399', list:'#60a5fa',
  combo:'#a78bfa', threat:'#f87171', reputation:'#fb923c', customcat:'#f59e0b'
};

// ── Pending system ────────────────────────────────────────────────────────────
let pendingChanges = [];

function updatePendingBar() {
  const bar   = $('pending-bar');
  const count = $('pending-count');
  // D.pendingPolicies is the source of truth — survives page refresh
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
    const pending = D.pendingPolicies || [];
    for (const item of pending) {
      if (item.type === 'create_policy') {
        const pol = { ...item.policyData }; delete pol._pendingId;
        D.orderedPolicies.push(pol);
        const grp = (D.policyGroups||[]).find(g => g.id === item.groupId);
        if (grp && !grp.policyIds.includes(pol.id)) {
          if (item.position === 'top') grp.policyIds.unshift(pol.id);
          else if (item.position === 'after' && item.afterPolId) {
            const idx = grp.policyIds.indexOf(item.afterPolId);
            grp.policyIds.splice(idx >= 0 ? idx + 1 : grp.policyIds.length, 0, pol.id);
          } else if (item.position === 'before' && item.beforePolId) {
            const idx = grp.policyIds.indexOf(item.beforePolId);
            grp.policyIds.splice(idx >= 0 ? idx : 0, 0, pol.id);
          } else {
            grp.policyIds.push(pol.id);
          }
        }
      } else if (item.type === 'edit_policy') {
        const idx = D.orderedPolicies.findIndex(p => p.id === item.policyId);
        if (idx >= 0) D.orderedPolicies[idx] = { ...D.orderedPolicies[idx], ...item.changes };
        if (item.newGroupId && item.oldGroupId !== item.newGroupId) {
          const og = (D.policyGroups||[]).find(g=>g.id===item.oldGroupId);
          const ng = (D.policyGroups||[]).find(g=>g.id===item.newGroupId);
          if (og) og.policyIds = og.policyIds.filter(id=>id!==item.policyId);
          if (ng && !ng.policyIds.includes(item.policyId)) ng.policyIds.push(item.policyId);
        }
      } else if (item.type === 'delete_policy') {
        D.orderedPolicies = D.orderedPolicies.filter(p=>p.id!==item.policyId);
        (D.policyGroups||[]).forEach(g=>{g.policyIds=(g.policyIds||[]).filter(id=>id!==item.policyId);});
      } else if (item.type === 'create_group') {
        if (!D.policyGroups.find(g=>g.id===item.group.id)) D.policyGroups.push(item.group);
      } else if (item.type === 'rename_group') {
        const g=D.policyGroups.find(g=>g.id===item.groupId); if(g) g.name=item.newName;
      } else if (item.type === 'delete_group') {
        const dest=D.policyGroups.find(g=>g.id!==item.groupId);
        const grp=D.policyGroups.find(g=>g.id===item.groupId);
        if(grp)(grp.policyIds||[]).forEach(pid=>{if(dest)dest.policyIds.push(pid);});
        D.policyGroups=D.policyGroups.filter(g=>g.id!==item.groupId);
      } else if (item.type === 'move_group') {
        const idx=D.policyGroups.findIndex(g=>g.id===item.groupId);
        const to=item.direction==='up'?idx-1:idx+1;
        if(idx>=0&&to>=0&&to<D.policyGroups.length)[D.policyGroups[idx],D.policyGroups[to]]=[D.policyGroups[to],D.policyGroups[idx]];
      } else if (item.type === 'move_policy') {
        const grp=D.policyGroups.find(g=>g.id===item.groupId);
        if(grp){const idx=grp.policyIds.indexOf(item.policyId);const to=item.direction==='up'?idx-1:idx+1;if(idx>=0&&to>=0&&to<grp.policyIds.length)[grp.policyIds[idx],grp.policyIds[to]]=[grp.policyIds[to],grp.policyIds[idx]];}
      } else if (item.type === 'move_policy_to_group') {
        const fg=D.policyGroups.find(g=>g.id===item.fromGroupId);
        const tg=D.policyGroups.find(g=>g.id===item.toGroupId);
        if(fg)fg.policyIds=fg.policyIds.filter(id=>id!==item.policyId);
        if(tg&&!tg.policyIds.includes(item.policyId))tg.policyIds.push(item.policyId);
      } else if (item.type === 'toggle_policy') {
        const p=D.orderedPolicies.find(p=>p.id===item.policyId); if(p)p.enabled=item.newValue;
      }
    }
    D.pendingPolicies=[]; D.policySettings=D.policySettings||{};
    D.policySettings.defaultAction=$('def-action')?.value||'allow';
    pendingChanges=[];
    const ok=await saveData();
    showAlert('pol-al',ok?'success':'error',ok?'✓ All changes applied and pushed — extension syncs in 1 minute':'Push failed — check Supabase permissions');
    renderPols();
  } catch(e){showAlert('pol-al','error','Error: '+e.message);}
  if(btn){btn.disabled=false;btn.textContent='▶ Apply';}
}

function discardAllPending() {
  // Use styled modal instead of browser confirm()
  openModal('discard-confirm-modal');
}

async function doDiscardAllPending() {
  closeModal('discard-confirm-modal');
  pendingChanges = [];
  D.pendingPolicies = [];
  // Save immediately to clear pending from Supabase
  await saveData();
  updatePendingBar();
  // Reload live data fresh from Supabase
  const payload = await loadData();
  if (payload) {
    D.orderedPolicies  = payload.orderedPolicies  || [];
    D.policyGroups     = payload.policyGroups     || [];
    D.pendingPolicies  = [];
  }
  showAlert('pol-al', 'success', 'All pending changes discarded.');
  renderPols();
}

async function stagePending(item) {
  D.pendingPolicies=D.pendingPolicies||[];
  D.pendingPolicies=D.pendingPolicies.filter(p=>p._pendingId!==item._pendingId);
  D.pendingPolicies.push(item);
  await saveData();
}

async function removePendingItem(pendingId) {
  D.pendingPolicies=(D.pendingPolicies||[]).filter(p=>p._pendingId!==pendingId);
  await saveData(); updatePendingBar(); renderPols();
}

// ── Searchable chip dropdown (shared helper) ───────────────────────────────────
function buildChipDropdown(containerId, allItems, selectedIds, opts={}) {
  const el=$(containerId); if(!el)return null;
  el.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative';

  const inputRow=document.createElement('div');
  inputRow.style.cssText='display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:6px 10px;background:#060d1a;border:1.5px solid rgba(99,102,241,.2);border-radius:8px;min-height:38px;cursor:text;transition:border-color .15s';

  const chipsWrap=document.createElement('div');
  chipsWrap.style.cssText='display:flex;flex-wrap:wrap;gap:4px;flex:1;align-items:center';

  const searchInput=document.createElement('input');
  searchInput.placeholder=opts.placeholder||'Search and select...';
  searchInput.style.cssText='background:transparent;border:none;outline:none;color:#e2e8f0;font-size:12px;min-width:80px;flex:1;margin:0';

  const dd=document.createElement('div');
  dd.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0d1424;border:1px solid rgba(99,102,241,.3);border-radius:10px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.6);overflow:hidden';

  let selected=new Set(selectedIds||[]);
  let filterMode='all'; // all | predefined | custom

  function renderChips(){
    chipsWrap.innerHTML='';
    selected.forEach(id=>{
      const item=allItems.find(x=>(x.id||x)===id);
      const label=item?.name||item?.label||id;
      const chip=document.createElement('div');
      chip.style.cssText='display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.3)';
      chip.innerHTML=`${esc(label)}<button style="background:none;border:none;color:#a5b4fc;cursor:pointer;font-size:11px;padding:0 0 0 2px;line-height:1">✕</button>`;
      chip.querySelector('button').addEventListener('click',e=>{e.stopPropagation();selected.delete(id);renderChips();renderDd(searchInput.value);});
      chipsWrap.appendChild(chip);
    });
    const selCount=document.createElement('span');
    if(selected.size>0){selCount.style.cssText='font-size:10px;color:#6366f1;font-weight:700;margin-left:4px;flex-shrink:0';selCount.textContent=selected.size+' selected';}
    chipsWrap.appendChild(searchInput);
    if(selected.size>0)inputRow.appendChild(selCount);
    else{const old=inputRow.querySelector('span[data-selcount]');if(old)old.remove();}
  }

  function renderDd(q){
    let items=allItems;
    if(opts.hasFilter){
      if(filterMode==='predefined') items=allItems.filter(x=>!x.isCustom);
      else if(filterMode==='custom') items=allItems.filter(x=>x.isCustom);
    }
    if(q) items=items.filter(x=>(x.name||x.label||x||'').toLowerCase().includes(q.toLowerCase()));

    let html='';
    // Filter tabs
    if(opts.hasFilter){
      html+=`<div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,.06)">
        ${['all','predefined','custom'].map(m=>`<button data-fm="${m}" style="flex:1;padding:7px;font-size:11px;font-weight:${filterMode===m?'700':'500'};color:${filterMode===m?'#a5b4fc':'#64748b'};background:${filterMode===m?'rgba(99,102,241,.1)':'transparent'};border:none;cursor:pointer;border-bottom:2px solid ${filterMode===m?'#6366f1':'transparent'}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join('')}
      </div>`;
    }
    html+=`<div style="max-height:180px;overflow-y:auto">`;
    if(!items.length){html+='<div style="padding:12px 14px;font-size:12px;color:#475569">No results</div>';}
    else html+=items.map(item=>{
      const id=item?.id||item;
      const label=item?.name||item?.label||item||id;
      const isSel=selected.has(id);
      const dot=item?.color?`<span style="width:8px;height:8px;border-radius:50%;background:${item.color};flex-shrink:0;display:inline-block"></span>`:'';
      return `<div data-id="${esc(String(id))}" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:12px;color:${isSel?'#a5b4fc':'#cbd5e1'};background:${isSel?'rgba(99,102,241,.1)':'transparent'}">
        <input type="checkbox" ${isSel?'checked':''} style="accent-color:#6366f1;margin:0;flex-shrink:0;width:14px;height:14px">
        ${dot}<span>${esc(label)}</span>
        ${item?.isCustom?'<span style="font-size:9px;color:#475569;margin-left:auto">custom</span>':''}
      </div>`;
    }).join('');
    html+='</div>';
    dd.innerHTML=html;

    // Filter tab listeners
    dd.querySelectorAll('[data-fm]').forEach(btn=>{
      btn.addEventListener('click',e=>{e.stopPropagation();filterMode=btn.dataset.fm;renderDd(searchInput.value);});
    });
    // Row click
    dd.querySelectorAll('[data-id]').forEach(row=>{
      row.addEventListener('click',e=>{
        e.stopPropagation();
        const id=row.dataset.id;
        if(selected.has(id))selected.delete(id);else selected.add(id);
        renderChips();renderDd(searchInput.value);
      });
    });
  }

  searchInput.addEventListener('input',()=>renderDd(searchInput.value));
  searchInput.addEventListener('focus',()=>{renderDd(searchInput.value);dd.style.display='block';inputRow.style.borderColor='rgba(99,102,241,.6)';});
  inputRow.addEventListener('click',()=>searchInput.focus());
  document.addEventListener('click',e=>{if(!wrap.contains(e.target)){dd.style.display='none';inputRow.style.borderColor='rgba(99,102,241,.2)';}},true);

  renderChips(); renderDd('');
  inputRow.appendChild(chipsWrap);
  wrap.appendChild(inputRow);
  wrap.appendChild(dd);
  el.appendChild(wrap);
  return {getSelected:()=>[...selected]};
}

// Dropdown instances for policy modal
let _ddCat=null, _ddList=null, _ddCCat=null, _ddComboList=null;

// ── Render ────────────────────────────────────────────────────────────────────
export function renderPols() {
  $('def-action').value=D.policySettings?.defaultAction||'allow';
  updatePendingBar();
  const c=$('pol-con');
  if(!D.policyGroups?.length){c.innerHTML='<div class="loading">No groups — click New Group.</div>';return;}

  const pendingByGroup={};
  (D.pendingPolicies||[]).forEach(item=>{
    if(item.type==='create_policy'){
      const gid=item.groupId||(D.policyGroups[0]?.id||'ungrouped');
      if(!pendingByGroup[gid])pendingByGroup[gid]=[];
      pendingByGroup[gid].push(item);
    }
  });

  c.innerHTML=D.policyGroups.map((g,gi)=>{
    const canUp=gi>0, canDown=gi<D.policyGroups.length-1;
    const ps=(g.policyIds||[]).map(id=>D.orderedPolicies.find(p=>p.id===id)).filter(Boolean);
    const ghosts=pendingByGroup[g.id]||[];

    const liveRows=ps.map((pol,pi)=>{
      const tc=TC[pol.type]||'#818cf8';
      const cond=buildCondSummary(pol);
      const actIcon=pol.activity==='download'?'📥':pol.activity==='all'?'🔒':'🌐';
      const schedIcon=pol.schedule?'⏰':'';
      return `<div class="pol-row" style="${pol.enabled===false?'opacity:0.45':''}">
        <div>
          <div class="pol-name">${gi+1}.${pi+1} ${esc(pol.name)}</div>
          ${pol.note?`<div style="font-size:10px;color:#475569">${esc(pol.note)}</div>`:''}
        </div>
        <span style="background:${tc}18;color:${tc};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${pol.type||'domain'}</span>
        <span style="font-size:11px;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(cond)}">${esc(cond)}</span>
        <span class="badge badge-${pol.action||'block'}">${pol.action||'block'}</span>
        <span style="font-size:12px">${actIcon} ${schedIcon}</span>
        <button class="toggle ${pol.enabled!==false?'on':''}" onclick="window._togPol('${pol.id}','${g.id}')"></button>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._polMoveUp('${pol.id}','${g.id}')" ${pi>0?'':'disabled'}>▲</button>
          <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._polMoveDown('${pol.id}','${g.id}')" ${pi<ps.length-1?'':'disabled'}>▼</button>
          <button class="btn btn-sm btn-ghost" style="padding:3px 8px" onclick="window._openMoveToGroup('${pol.id}','${g.id}')">↔</button>
          <button class="btn btn-sm btn-ghost" onclick="window._openPolModal('${pol.id}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="window._delPol('${pol.id}','${g.id}')">✕</button>
        </div>
      </div>`;
    }).join('');

    const ghostRows=ghosts.map(item=>{
      const pol=item.policyData;
      const tc=TC[pol.type]||'#818cf8';
      return `<div class="pol-row" style="border:1px dashed rgba(245,158,11,.5);background:rgba(245,158,11,.03)">
        <div>
          <div class="pol-name" style="display:flex;align-items:center;gap:8px">
            ${esc(pol.name)}
            <span style="font-size:9px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);border-radius:4px;padding:1px 6px;flex-shrink:0">NOT APPLIED</span>
          </div>
        </div>
        <span style="background:${tc}18;color:${tc};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${pol.type||'domain'}</span>
        <span style="font-size:11px;color:#64748b">${esc(buildCondSummary(pol))}</span>
        <span class="badge badge-${pol.action||'block'}">${pol.action||'block'}</span>
        <span style="font-size:11px;color:#475569">${pol.enabled!==false?'Enabled':'Disabled'}</span>
        <span></span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-ghost" onclick="window._editPendingPol('${item._pendingId}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="window._discardOnePending('${item._pendingId}')">✕</button>
        </div>
      </div>`;
    }).join('');

    return `<div class="pol-group">
      <div class="pol-group-hdr">
        <span style="color:#64748b;font-size:12px;font-weight:700">${gi+1}.</span>
        <span class="pol-group-name">${esc(g.name)}</span>
        <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._moveGrp('${g.id}','up')" ${canUp?'':'disabled'}>▲</button>
        <button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="window._moveGrp('${g.id}','down')" ${canDown?'':'disabled'}>▼</button>
        <button class="btn btn-sm btn-ghost" style="padding:3px 8px" onclick="window._renameGrp('${g.id}')">✏</button>
        ${!g._isDefault?`<button class="btn btn-sm btn-danger" onclick="window._delGrp('${g.id}')">✕</button>`:''}
      </div>
      ${liveRows}${ghostRows}
      ${ps.length===0&&ghosts.length===0?`<div style="padding:12px 16px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,.04)">No policies — click + New Policy</div>`:''}
    </div>`;
  }).join('');
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

// ── Group CRUD ────────────────────────────────────────────────────────────────
export function openGrpModal(){$('gm-name').value='';openModal('grp-modal');setTimeout(()=>$('gm-name').focus(),100);}
export function saveGrp(){
  const n=$('gm-name').value.trim();if(!n)return;
  const group={id:'grp_'+Date.now(),name:n,policyIds:[]};
  D.policyGroups.push(group);
  addPending('create_grp_'+group.id,`Create group "${n}"`,()=>Promise.resolve(),()=>{D.policyGroups=D.policyGroups.filter(g=>g.id!==group.id);return Promise.resolve();});
  stagePending({_pendingId:'create_grp_'+group.id,type:'create_group',group});
  closeModal('grp-modal');renderPols();
}
function renameGrp(id){
  const grp=D.policyGroups.find(g=>g.id===id);if(!grp)return;
  const n=prompt(`Rename "${grp.name}":`,grp.name);if(!n?.trim()||n.trim()===grp.name)return;
  const old=grp.name;grp.name=n.trim();
  addPending('rename_grp_'+id,`Rename group "${old}" → "${n.trim()}"`,()=>Promise.resolve(),()=>{grp.name=old;renderPols();return Promise.resolve();});
  stagePending({_pendingId:'rename_grp_'+id,type:'rename_group',groupId:id,newName:n.trim()});
  renderPols();
}
function delGrp(id){
  if(D.policyGroups.length<=1){alert('Cannot delete the only group.');return;}
  const grp=D.policyGroups.find(g=>g.id===id);if(!grp)return;
  if(!confirm(`Delete group "${grp.name}"?`))return;
  const dest=D.policyGroups.find(g=>g.id!==id);
  (grp.policyIds||[]).forEach(pid=>{if(dest)dest.policyIds.push(pid);});
  D.policyGroups=D.policyGroups.filter(g=>g.id!==id);
  addPending('del_grp_'+id,`Delete group "${grp.name}"`,()=>Promise.resolve(),()=>{D.policyGroups.push(grp);renderPols();return Promise.resolve();});
  stagePending({_pendingId:'del_grp_'+id,type:'delete_group',groupId:id});renderPols();
}
function moveGrp(id,dir){
  const idx=D.policyGroups.findIndex(g=>g.id===id);if(idx<0)return;
  const to=dir==='up'?idx-1:idx+1;if(to<0||to>=D.policyGroups.length)return;
  [D.policyGroups[idx],D.policyGroups[to]]=[D.policyGroups[to],D.policyGroups[idx]];
  addPending('move_grp_'+id+'_'+Date.now(),`Move group ${dir}`,()=>Promise.resolve(),()=>{[D.policyGroups[idx],D.policyGroups[to]]=[D.policyGroups[to],D.policyGroups[idx]];renderPols();return Promise.resolve();});
  stagePending({_pendingId:'move_grp_'+id+'_'+Date.now(),type:'move_group',groupId:id,direction:dir});renderPols();
}

// ── Policy CRUD ───────────────────────────────────────────────────────────────
function togPol(id){
  const p=D.orderedPolicies.find(p=>p.id===id);if(!p)return;
  p.enabled=p.enabled===false;
  addPending('tog_'+id,`${p.enabled?'Enable':'Disable'} "${p.name}"`,()=>Promise.resolve(),()=>{p.enabled=!p.enabled;renderPols();return Promise.resolve();});
  stagePending({_pendingId:'tog_'+id,type:'toggle_policy',policyId:id,newValue:p.enabled});renderPols();
}
function delPol(id){
  const pol=D.orderedPolicies.find(p=>p.id===id);if(!pol)return;
  if(!confirm(`Delete policy "${pol.name}"?`))return;
  D.orderedPolicies=D.orderedPolicies.filter(p=>p.id!==id);
  (D.policyGroups||[]).forEach(g=>{g.policyIds=(g.policyIds||[]).filter(i=>i!==id);});
  addPending('del_pol_'+id,`Delete "${pol.name}"`,()=>Promise.resolve(),()=>{D.orderedPolicies.push(pol);renderPols();return Promise.resolve();});
  stagePending({_pendingId:'del_pol_'+id,type:'delete_policy',policyId:id});renderPols();
}
function polMoveUp(polId,grpId){
  const grp=D.policyGroups.find(g=>g.id===grpId);if(!grp)return;
  const idx=grp.policyIds.indexOf(polId);if(idx<=0)return;
  [grp.policyIds[idx-1],grp.policyIds[idx]]=[grp.policyIds[idx],grp.policyIds[idx-1]];
  addPending('pol_up_'+polId,`Move up`,()=>Promise.resolve(),()=>{[grp.policyIds[idx-1],grp.policyIds[idx]]=[grp.policyIds[idx],grp.policyIds[idx-1]];renderPols();return Promise.resolve();});
  stagePending({_pendingId:'pol_up_'+polId+'_'+Date.now(),type:'move_policy',policyId:polId,groupId:grpId,direction:'up'});renderPols();
}
function polMoveDown(polId,grpId){
  const grp=D.policyGroups.find(g=>g.id===grpId);if(!grp)return;
  const idx=grp.policyIds.indexOf(polId);if(idx<0||idx>=grp.policyIds.length-1)return;
  [grp.policyIds[idx],grp.policyIds[idx+1]]=[grp.policyIds[idx+1],grp.policyIds[idx]];
  addPending('pol_dn_'+polId,`Move down`,()=>Promise.resolve(),()=>{[grp.policyIds[idx],grp.policyIds[idx+1]]=[grp.policyIds[idx+1],grp.policyIds[idx]];renderPols();return Promise.resolve();});
  stagePending({_pendingId:'pol_dn_'+polId+'_'+Date.now(),type:'move_policy',policyId:polId,groupId:grpId,direction:'down'});renderPols();
}

// Move to group
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
  const fromGrp=D.policyGroups.find(g=>g.id===_movingFromGrpId);
  const toGrp=D.policyGroups.find(g=>g.id===toGrpId);if(!fromGrp||!toGrp)return;
  fromGrp.policyIds=fromGrp.policyIds.filter(id=>id!==_movingPolId);
  if(!toGrp.policyIds.includes(_movingPolId))toGrp.policyIds.push(_movingPolId);
  addPending('mtg_'+_movingPolId,`Move to "${toGrp.name}"`,()=>Promise.resolve(),()=>Promise.resolve());
  stagePending({_pendingId:'mtg_'+_movingPolId,type:'move_policy_to_group',policyId:_movingPolId,fromGroupId:_movingFromGrpId,toGroupId:toGrpId});
  closeModal('move-to-group-modal');renderPols();
}

// ── Policy Modal ──────────────────────────────────────────────────────────────
let _savedPolData=null; // holds pol data between policy modal and place modal

export function openPolModal(id=null,pendingItem=null){
  setEPolId(id);
  _savedPolData=null;
  const isEdit=!!id,isPending=!!pendingItem;
  $('pm-title').textContent=isPending?`Edit Pending: ${pendingItem.policyData?.name||''}`:(isEdit?'Edit Policy':'New Policy');
  $('pm-al').style.display='none';
  $('pm-ftl').innerHTML='<option value="">All file types</option>'+(D.fileTypeLists||[]).map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');

  // Reset
  ['pm-name','pm-doms','pm-note','pm-combo-doms'].forEach(x=>{const e=$(x);if(e)e.value='';});
  $('pm-sthr').value=55;$('pm-en').className='toggle on';
  $('pm-sched-enabled').checked=false;$('pm-sched-fields').style.display='none';
  $('pm-sched-start').value='09:00';$('pm-sched-end').value='17:00';$('pm-sched-outside').value='allow';
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.classList.remove('active'));
  setCurAct('block');setCurActiv('browse');setCurType('domain');
  setType('domain');setAct('block');setActiv('browse');

  // Build dropdowns
  const catItems=[
    ...ALL_CATS.map(c=>({id:c,name:c.charAt(0).toUpperCase()+c.slice(1),isCustom:false})),
    ...(D.customCategories||[]).map(c=>({id:c.id,name:c.name,isCustom:true})),
  ];
  const listItems=(D.urlLists||[]).map(l=>({id:l.id,name:l.name}));

  _ddCat=buildChipDropdown('pm-cat-wrap',catItems,[],{placeholder:'Search categories...',hasFilter:true});
  _ddList=buildChipDropdown('pm-list-wrap',listItems,[],{placeholder:'Search URL lists...'});
  _ddComboList=buildChipDropdown('pm-combo-list-wrap',listItems,[],{placeholder:'Search URL lists...'});

  const pol=isPending?pendingItem.policyData:(isEdit?D.orderedPolicies.find(p=>p.id===id):null);
  if(pol){
    $('pm-name').value=pol.name||'';
    $('pm-note').value=pol.note||'';
    if(pol.enabled===false)$('pm-en').className='toggle';
    setType(pol.type||'domain');setAct(pol.action||'block');setActiv(pol.activity||'browse');
    const c=pol.conditions||{};
    if(c.domains)$('pm-doms').value=c.domains.join('\n');
    if(c.scoreOp)$('pm-sop').value=c.scoreOp;
    if(c.scoreThreshold!=null)$('pm-sthr').value=c.scoreThreshold;
    if(pol.fileTypeListId)$('pm-ftl').value=pol.fileTypeListId;
    if(pol.schedule){
      $('pm-sched-enabled').checked=true;$('pm-sched-fields').style.display='block';
      $('pm-sched-start').value=pol.schedule.startTime||'09:00';
      $('pm-sched-end').value=pol.schedule.endTime||'17:00';
      $('pm-sched-outside').value=pol.schedule.outsideScheduleAction||'allow';
      const dm={1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',0:'Sun'};
      (pol.schedule.days||[]).forEach(d=>document.querySelector(`.pm-day-btn[data-day="${dm[d]}"]`)?.classList.add('active'));
    }
    // Rebuild dropdowns with existing values
    if(c.categories?.length||c.customCategoryIds?.length){
      const selCats=[...(c.categories||[]),...(c.customCategoryIds||[])];
      _ddCat=buildChipDropdown('pm-cat-wrap',catItems,selCats,{placeholder:'Search categories...',hasFilter:true});
    }
    if(c.listIds?.length)
      _ddList=buildChipDropdown('pm-list-wrap',listItems,c.listIds||[],{placeholder:'Search URL lists...'});
  }
  $('btn-save-pol').dataset.editingPendingId=pendingItem?._pendingId||'';
  openModal('pol-modal');
}

export function setType(t){
  setCurType(t);
  document.querySelectorAll('.pm-type-card').forEach(c=>c.classList.toggle('sel',c.dataset.t===t));
  ['domain','category','list','customcat','combo','threat','reputation'].forEach(x=>$('crit-'+x)?.classList.toggle('hid',x!==t));
}
export function setAct(a){setCurAct(a);document.querySelectorAll('.abtn[data-a]').forEach(b=>{b.className='abtn'+(b.dataset.a===a?` sel-${a}`:'');});}
export function setActiv(a){setCurActiv(a);document.querySelectorAll('.abtn[data-v]').forEach(b=>b.classList.toggle('sel-act',b.dataset.v===a));$('pm-ftrow')?.classList.toggle('hid',a==='browse');}

// ── Collect policy data from form ─────────────────────────────────────────────
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
  if($('pm-sched-enabled')?.checked){
    const dm={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0};
    const days=[...document.querySelectorAll('.pm-day-btn.active')].map(b=>dm[b.dataset.day]).filter(d=>d!=null);
    schedule={startTime:$('pm-sched-start')?.value||'09:00',endTime:$('pm-sched-end')?.value||'17:00',days:days.length?days:[1,2,3,4,5],outsideScheduleAction:$('pm-sched-outside')?.value||'allow'};
  }

  return {name,type:curType,action:curAct,activity:curActiv,conditions,note:$('pm-note')?.value.trim()||'',enabled:$('pm-en').classList.contains('on'),fileTypeListId:$('pm-ftl')?.value||null,schedule};
}

// ── Save Policy → show Place Policy modal for new, stage for edits ─────────────
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
    const idx=D.orderedPolicies.findIndex(p=>p.id===ePolId);
    if(idx>=0)D.orderedPolicies[idx]={...D.orderedPolicies[idx],...polData};
    addPending('edit_pol_'+ePolId,`Edit "${polData.name}"`,()=>Promise.resolve(),()=>Promise.resolve());
    stagePending({_pendingId:'edit_pol_'+ePolId,type:'edit_policy',policyId:ePolId,changes:polData,oldGroupId:oldGrp?.id});
    closeModal('pol-modal');renderPols();
  } else {
    // New policy → show Place Policy modal
    _savedPolData=polData;
    closeModal('pol-modal');
    openPlaceModal(polData.name);
  }
}

// ── Place Policy Modal ────────────────────────────────────────────────────────
let _placePosition='bottom', _placeRefPolId=null;

function openPlaceModal(polName){
  $('place-pol-name').textContent=polName;
  $('place-grp-select').innerHTML=D.policyGroups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  _placePosition='bottom';_placeRefPolId=null;
  document.querySelectorAll('.place-opt').forEach(o=>o.classList.toggle('sel',o.dataset.pos==='bottom'));
  buildPlaceRefSelect();
  $('place-ref-row').style.display='none';
  openModal('place-modal');
}

function buildPlaceRefSelect(){
  const grpId=$('place-grp-select')?.value;
  const grp=D.policyGroups.find(g=>g.id===grpId);
  const ps=(grp?.policyIds||[]).map(id=>D.orderedPolicies.find(p=>p.id===id)).filter(Boolean);
  const sel=$('place-ref-select');
  if(sel)sel.innerHTML=ps.map((p,i)=>`<option value="${p.id}">#${i+1} — ${esc(p.name)}</option>`).join('');
}

function savePlacement(){
  if(!_savedPolData){closeModal('place-modal');return;}
  const id='pol_'+Date.now();
  _savedPolData.id=id;
  const grpId=$('place-grp-select')?.value;
  const refPolId=$('place-ref-select')?.value||null;
  const pendingId='pending_pol_'+id;
  stagePending({_pendingId:pendingId,type:'create_policy',policyData:{..._savedPolData},groupId:grpId,position:_placePosition,afterPolId:_placePosition==='after'?refPolId:null,beforePolId:_placePosition==='before'?refPolId:null});
  closeModal('place-modal');
  updatePendingBar();renderPols();
}

function editPendingPol(pendingId){
  const item=(D.pendingPolicies||[]).find(p=>p._pendingId===pendingId);if(!item)return;
  openPolModal(null,item);
}

export async function pushAll(){
  if((D.pendingPolicies||[]).length>0||pendingChanges.length>0){
    showAlert('pol-al','error','You have pending changes — click ▶ Apply first.');return;
  }
  const btn=$('push-btn');btn.disabled=true;btn.textContent='Pushing...';
  try{
    D.policySettings=D.policySettings||{};
    D.policySettings.defaultAction=$('def-action')?.value||'allow';
    const ok=await saveData();
    showAlert('pol-al',ok?'success':'error',ok?'✓ Pushed to all users':'Push failed');
  }catch(e){showAlert('pol-al','error','Error: '+e.message);}
  btn.disabled=false;btn.textContent='☁ Push to Users';
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

  document.querySelectorAll('.place-opt').forEach(o=>{
    o.addEventListener('click',()=>{
      _placePosition=o.dataset.pos;
      document.querySelectorAll('.place-opt').forEach(x=>x.classList.remove('sel'));
      o.classList.add('sel');
      const showRef=_placePosition==='after'||_placePosition==='before';
      $('place-ref-row').style.display=showRef?'block':'none';
    });
  });

  $('pm-sched-enabled')?.addEventListener('change',function(){$('pm-sched-fields').style.display=this.checked?'block':'none';});
  document.querySelectorAll('.pm-type-card').forEach(c=>c.addEventListener('click',()=>setType(c.dataset.t)));
  document.querySelectorAll('.abtn[data-a]').forEach(b=>b.addEventListener('click',()=>setAct(b.dataset.a)));
  document.querySelectorAll('.abtn[data-v]').forEach(b=>b.addEventListener('click',()=>setActiv(b.dataset.v)));
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('active')));

  window._togPol=togPol;window._delPol=delPol;window._delGrp=delGrp;
  window._renameGrp=renameGrp;window._moveGrp=moveGrp;
  window._polMoveUp=polMoveUp;window._polMoveDown=polMoveDown;
  window._openPolModal=openPolModal;window._openMoveToGroup=openMoveToGroup;
  window._editPendingPol=editPendingPol;window._discardOnePending=removePendingItem;
}
