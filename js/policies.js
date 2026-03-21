// policies.js — Full policy editor: all 6 types, schedule, activity, enabled, groups

import { ALL_CATS, THREAT_CATEGORIES, DAYS }        from './config.js';
import { D, setCurAct, setCurActiv, setCurType,
         setEPolId, curAct, curActiv, curType, ePolId } from './state.js';
import { $, esc, showAlert, openModal, closeModal }  from './utils.js';
import { saveData }                                  from './api.js';

const TC = { domain:'#818cf8',category:'#34d399',list:'#60a5fa',combo:'#a78bfa',threat:'#f87171',reputation:'#fb923c',customcat:'#f59e0b' };

// ── Render ────────────────────────────────────────────────────────────────────
export function renderPols() {
  $('def-action').value = D.policySettings?.defaultAction || 'allow';
  const c = $('pol-con');
  if (!D.policyGroups?.length) { c.innerHTML = '<div class="loading">No groups — click New Group.</div>'; return; }

  c.innerHTML = D.policyGroups.map((g, gi) => {
    const ps = (g.policyIds||[]).map(id => D.orderedPolicies.find(p => p.id === id)).filter(Boolean);
    return `<div class="pol-group">
      <div class="pol-group-hdr">
        <span style="color:#64748b;font-size:12px;font-weight:700">${gi+1}.</span>
        <span class="pol-group-name">${esc(g.name)}</span>
        ${!g._isDefault?`<button class="btn btn-sm btn-danger" onclick="window._delGrp('${g.id}')">Del</button>`:''}
      </div>
      ${ps.map((pol,pi) => {
        const ac = {block:'#f87171',warn:'#fbbf24',allow:'#10b981'}[pol.action]||'#94a3b8';
        const tc = TC[pol.type]||'#818cf8';
        const condSummary = buildCondSummary(pol);
        const schedIcon = pol.schedule ? '⏰ ' : '';
        const actIcon = pol.activity === 'download' ? '📥' : pol.activity === 'all' ? '🔒' : '🌐';
        return `<div class="pol-row" style="${pol.enabled===false?'opacity:0.45':''}">
          <div>
            <div class="pol-name">${gi+1}.${pi+1} ${esc(pol.name)}</div>
            ${pol.note?`<div style="font-size:10px;color:#475569">${esc(pol.note)}</div>`:''}
          </div>
          <span style="background:${tc}18;color:${tc};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${pol.type||'domain'}</span>
          <span style="font-size:11px;color:#64748b;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(condSummary)}">${condSummary}</span>
          <span class="badge badge-${pol.action||'block'}">${pol.action||'block'}</span>
          <span style="font-size:13px" title="${pol.activity||'browse'}">${actIcon}</span>
          <span style="font-size:11px;color:#64748b">${schedIcon}${pol.schedule?'Sched':'—'}</span>
          <button class="toggle ${pol.enabled!==false?'on':''}" onclick="window._togPol('${pol.id}')"></button>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-ghost" onclick="window._openPolModal('${pol.id}')">✏</button>
            <button class="btn btn-sm btn-danger" onclick="window._delPol('${pol.id}')">✕</button>
          </div>
        </div>`;
      }).join('')}
      ${ps.length===0?`<div style="padding:12px 16px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,.04)">No policies — click + New Policy</div>`:''}
    </div>`;
  }).join('');
}

function buildCondSummary(pol) {
  if (!pol.conditions) return '—';
  if (pol.type === 'domain')     return (pol.conditions.domains||[]).slice(0,2).join(', ') + ((pol.conditions.domains||[]).length>2?` +${(pol.conditions.domains||[]).length-2}`:'');
  if (pol.type === 'category')   return (pol.conditions.categories||[]).slice(0,2).join(', ') || '—';
  if (pol.type === 'list')       { const names = (pol.conditions.listIds||[]).map(id=>(D.urlLists||[]).find(l=>l.id===id)?.name||id); return names.slice(0,2).join(', ') || '—'; }
  if (pol.type === 'threat')     return `score ${pol.conditions.scoreOp||'gte'} ${pol.conditions.scoreThreshold??55}`;
  if (pol.type === 'reputation') return 'known malicious';
  if (pol.type === 'customcat')  { const names = (pol.conditions.customCategoryIds||[]).map(id=>(D.customCategories||[]).find(c=>c.id===id)?.name||id); return names.slice(0,2).join(', ') || '—'; }
  if (pol.type === 'combo')      return 'multi-criteria';
  return '—';
}

// ── Groups ────────────────────────────────────────────────────────────────────
export function openGrpModal() { $('gm-name').value=''; openModal('grp-modal'); setTimeout(()=>$('gm-name').focus(),100); }
export function saveGrp()  { const n=$('gm-name').value.trim(); if(!n)return; (D.policyGroups=D.policyGroups||[]).push({id:'grp_'+Date.now(),name:n,policyIds:[]}); closeModal('grp-modal'); renderPols(); }
function delGrp(id)  { if(!confirm('Delete group? Policies will be moved to Default.'))return; const dest=D.policyGroups.find(g=>g.id!==id); D.policyGroups.find(g=>g.id===id)?.policyIds?.forEach(pid=>{dest?.policyIds.push(pid);}); D.policyGroups=D.policyGroups.filter(g=>g.id!==id); renderPols(); }
function togPol(id)  { const p=(D.orderedPolicies||[]).find(p=>p.id===id); if(p) p.enabled=p.enabled===false?true:false; renderPols(); }
function delPol(id)  { if(!confirm('Delete policy?'))return; D.orderedPolicies=(D.orderedPolicies||[]).filter(p=>p.id!==id); (D.policyGroups||[]).forEach(g=>{g.policyIds=(g.policyIds||[]).filter(i=>i!==id);}); renderPols(); }

// ── Policy Modal ──────────────────────────────────────────────────────────────
export function openPolModal(id = null) {
  setEPolId(id);
  setCurAct('block'); setCurActiv('browse'); setCurType('domain');
  $('pm-title').textContent = id ? 'Edit Policy' : 'New Policy';
  $('pm-al').style.display = 'none';
  $('pm-grp').innerHTML = (D.policyGroups||[]).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  $('pm-ftl').innerHTML = '<option value="">All file types</option>'+(D.fileTypeLists||[]).map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');

  // Reset all fields
  ['pm-name','pm-doms','pm-note','pm-combo-doms'].forEach(x=>{const e=$(x);if(e)e.value='';});
  $('pm-cat-chips').innerHTML=''; $('pm-list-cbs').innerHTML='';
  $('pm-sthr').value=55; $('pm-en').className='toggle on';
  $('pm-sched-enabled').checked=false; $('pm-sched-fields').style.display='none';
  $('pm-sched-start').value='09:00'; $('pm-sched-end').value='17:00'; $('pm-sched-outside').value='allow';
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.classList.remove('active'));
  buildCatList(); buildCustomCatList(); buildListCbs();

  setType('domain'); setAct('block'); setActiv('browse');

  if (id) {
    const pol = (D.orderedPolicies||[]).find(p=>p.id===id); if (!pol) return;
    $('pm-name').value = pol.name||'';
    $('pm-note').value = pol.note||'';
    if (pol.enabled===false) $('pm-en').className='toggle';
    const grpOf = (D.policyGroups||[]).find(g=>g.policyIds?.includes(id));
    if (grpOf) $('pm-grp').value=grpOf.id;
    setType(pol.type||'domain'); setAct(pol.action||'block'); setActiv(pol.activity||'browse');
    const c=pol.conditions||{};
    if (c.domains)    $('pm-doms').value=c.domains.join('\n');
    if (c.categories) { c.categories.forEach(v=>addCatChip(v)); buildCatList(); }
    if (c.listIds)    { buildListCbs(); c.listIds.forEach(lid=>{const cb=$('pm-list-cbs').querySelector(`[value="${lid}"]`);if(cb)cb.checked=true;}); }
    if (c.scoreOp)    $('pm-sop').value=c.scoreOp;
    if (c.scoreThreshold!=null) $('pm-sthr').value=c.scoreThreshold;
    if (c.customCategoryIds) { c.customCategoryIds.forEach(v=>addCCChip(v)); buildCustomCatList(); }
    if (c.domains && pol.type==='combo') $('pm-combo-doms').value=c.domains.join('\n');
    if (pol.fileTypeListId) $('pm-ftl').value=pol.fileTypeListId;
    // Schedule
    if (pol.schedule) {
      $('pm-sched-enabled').checked=true; $('pm-sched-fields').style.display='block';
      $('pm-sched-start').value=pol.schedule.startTime||'09:00';
      $('pm-sched-end').value=pol.schedule.endTime||'17:00';
      $('pm-sched-outside').value=pol.schedule.outsideScheduleAction||'allow';
      const dayRevMap={1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',0:'Sun'};
      (pol.schedule.days||[]).forEach(d=>{document.querySelector(`.pm-day-btn[data-day="${dayRevMap[d]}"]`)?.classList.add('active');});
    }
  }
  openModal('pol-modal');
}

export function setType(t) {
  setCurType(t);
  document.querySelectorAll('.pm-type-card').forEach(c=>c.classList.toggle('sel',c.dataset.t===t));
  ['domain','category','list','threat','reputation','customcat','combo'].forEach(x=>$('crit-'+x)?.classList.toggle('hid',x!==t));
  if (t==='list'||t==='combo') buildListCbs();
  if (t==='category'||t==='combo') buildCatList();
  if (t==='customcat') buildCustomCatList();
}
export function setAct(a) {
  setCurAct(a);
  document.querySelectorAll('.abtn[data-a]').forEach(b=>{ b.className='abtn'+(b.dataset.a===a?` sel-${a}`:''); });
}
export function setActiv(a) {
  setCurActiv(a);
  document.querySelectorAll('.abtn[data-v]').forEach(b=>b.classList.toggle('sel-act',b.dataset.v===a));
  $('pm-ftrow')?.classList.toggle('hid',a==='browse');
}

// Category chip selector
export function buildCatList() {
  const selected = new Set([...$('pm-cat-chips').querySelectorAll('[data-c]')].map(c=>c.dataset.c));
  const q = $('pm-cat-search')?.value.toLowerCase()||'';
  const all = [...ALL_CATS,...(D.customCategories||[]).map(c=>c.name)];
  const filtered = q ? all.filter(c=>c.includes(q)) : all;
  $('pm-cat-list').innerHTML = filtered.map(v=>`
    <div class="cat-item${selected.has(v)?' selected':''}" onclick="window._toggleCat('${esc(v)}')">
      <input type="checkbox" ${selected.has(v)?'checked':''} onclick="event.stopPropagation();window._toggleCat('${esc(v)}')">
      <span>${esc(v)}</span>
    </div>`).join('');
}
function toggleCat(v) { const chips=$('pm-cat-chips'); const ex=chips.querySelector(`[data-c="${CSS.escape(v)}"]`); if(ex)ex.remove(); else addCatChip(v); buildCatList(); }
function addCatChip(v) { if($('pm-cat-chips').querySelector(`[data-c="${CSS.escape(v)}"]`))return; const d=document.createElement('div'); d.className='chip'; d.dataset.c=v; d.innerHTML=`${esc(v)}<button onclick="window._toggleCat('${esc(v)}')">✕</button>`; $('pm-cat-chips').appendChild(d); }

// Custom category selector
function buildCustomCatList() {
  const el = $('pm-cc-list'); if (!el) return;
  const selected = new Set([...$('pm-cc-chips').querySelectorAll('[data-cc]')].map(c=>c.dataset.cc));
  if (!(D.customCategories||[]).length) { el.innerHTML='<div style="color:#64748b;font-size:12px">No custom categories yet</div>'; return; }
  el.innerHTML = (D.customCategories||[]).map(c=>`
    <div class="cat-item${selected.has(c.id)?' selected':''}" onclick="window._toggleCC('${c.id}')">
      <input type="checkbox" ${selected.has(c.id)?'checked':''} onclick="event.stopPropagation();window._toggleCC('${c.id}')">
      <span>${esc(c.name)}</span>
    </div>`).join('');
}
function toggleCC(id) { const chips=$('pm-cc-chips'); const ex=chips.querySelector(`[data-cc="${id}"]`); if(ex)ex.remove(); else addCCChip(id); buildCustomCatList(); }
function addCCChip(id) { const cc=(D.customCategories||[]).find(c=>c.id===id); if(!cc)return; if($('pm-cc-chips').querySelector(`[data-cc="${id}"]`))return; const d=document.createElement('div'); d.className='chip'; d.dataset.cc=id; d.innerHTML=`${esc(cc.name)}<button onclick="window._toggleCC('${id}')">✕</button>`; $('pm-cc-chips').appendChild(d); }

function buildListCbs() {
  if(!(D.urlLists||[]).length){$('pm-list-cbs').innerHTML='<div style="color:#64748b;font-size:12px">No URL lists</div>';return;}
  $('pm-list-cbs').innerHTML=(D.urlLists||[]).map(l=>`<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;padding:3px 0"><input type="checkbox" value="${l.id}" style="accent-color:#6366f1;width:14px;height:14px;margin:0"> ${esc(l.name)} <span style="color:#475569">(${(l.domains||[]).length})</span></label>`).join('');
}

// ── Save ──────────────────────────────────────────────────────────────────────
export function savePol() {
  const name=$('pm-name')?.value.trim(); if(!name){showAlert('pm-al','error','Policy name required');return;}
  const grpId=$('pm-grp')?.value; if(!grpId){showAlert('pm-al','error','Select a group');return;}

  const cats    = [...$('pm-cat-chips').querySelectorAll('[data-c]')].map(c=>c.dataset.c);
  const ccIds   = [...$('pm-cc-chips').querySelectorAll('[data-cc]')].map(c=>c.dataset.cc);
  const listIds = [...$('pm-list-cbs').querySelectorAll('input:checked')].map(i=>i.value);
  const doms    = ($('pm-doms')?.value||'').split('\n').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);
  const comboDoms = ($('pm-combo-doms')?.value||'').split('\n').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(Boolean);

  const conditions = {};
  if (curType==='domain')    conditions.domains=doms;
  if (curType==='category')  conditions.categories=cats;
  if (curType==='list')      conditions.listIds=listIds;
  if (curType==='threat')    { conditions.scoreOp=$('pm-sop')?.value; conditions.scoreThreshold=parseInt($('pm-sthr')?.value||55); }
  if (curType==='reputation')conditions.requireKnownMalicious=true;
  if (curType==='customcat') conditions.customCategoryIds=ccIds;
  if (curType==='combo')     { conditions.domains=comboDoms; conditions.categories=cats; conditions.listIds=listIds; }

  // Schedule
  let schedule = null;
  if ($('pm-sched-enabled')?.checked) {
    const dayMap = {Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0};
    const days = [...document.querySelectorAll('.pm-day-btn.active')].map(b=>dayMap[b.dataset.day]).filter(d=>d!=null);
    schedule = {
      startTime: $('pm-sched-start')?.value||'09:00',
      endTime:   $('pm-sched-end')?.value||'17:00',
      days:      days.length ? days : [1,2,3,4,5],
      outsideScheduleAction: $('pm-sched-outside')?.value||'allow',
    };
  }

  const pol = {
    name, type:curType, action:curAct, activity:curActiv, conditions,
    note:$('pm-note')?.value.trim()||'',
    enabled: $('pm-en').classList.contains('on'),
    fileTypeListId: $('pm-ftl')?.value||null,
    schedule,
  };

  if (ePolId) {
    const i=(D.orderedPolicies||[]).findIndex(p=>p.id===ePolId);
    if(i>=0) D.orderedPolicies[i]={...D.orderedPolicies[i],...pol};
  } else {
    const id='pol_'+Date.now(); pol.id=id;
    (D.orderedPolicies=D.orderedPolicies||[]).push(pol);
    const grp=(D.policyGroups||[]).find(g=>g.id===grpId);
    if(grp) grp.policyIds.push(id);
  }
  closeModal('pol-modal');
  renderPols();
}

// ── Push ──────────────────────────────────────────────────────────────────────
export async function pushAll() {
  const btn=$('push-btn'); btn.disabled=true; btn.textContent='Pushing...';
  try {
    D.policySettings = D.policySettings || {};
    D.policySettings.defaultAction = $('def-action')?.value || 'allow';
    const ok = await saveData();
    showAlert('pol-al', ok?'success':'error', ok?'✓ Pushed — all extension users sync within 1 minute':'Push failed — check Supabase RLS and GRANT permissions.');
  } catch(e) { showAlert('pol-al','error','Error: '+e.message); }
  btn.disabled=false; btn.textContent='☁ Push to Users';
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPolicies() {
  $('btn-new-policy')?.addEventListener('click',()=>openPolModal());
  $('btn-new-group')?.addEventListener('click',openGrpModal);
  $('push-btn')?.addEventListener('click',pushAll);
  $('btn-save-grp')?.addEventListener('click',saveGrp);
  $('btn-cancel-grp')?.addEventListener('click',()=>closeModal('grp-modal'));
  $('btn-save-pol')?.addEventListener('click',savePol);
  $('btn-cancel-pol')?.addEventListener('click',()=>closeModal('pol-modal'));
  $('pm-cat-search')?.addEventListener('input',buildCatList);
  $('pm-sched-enabled')?.addEventListener('change',function(){ $('pm-sched-fields').style.display=this.checked?'block':'none'; });
  document.querySelectorAll('.pm-type-card').forEach(c=>c.addEventListener('click',()=>setType(c.dataset.t)));
  document.querySelectorAll('.abtn[data-a]').forEach(b=>b.addEventListener('click',()=>setAct(b.dataset.a)));
  document.querySelectorAll('.abtn[data-v]').forEach(b=>b.addEventListener('click',()=>setActiv(b.dataset.v)));
  document.querySelectorAll('.pm-day-btn').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('active')));

  window._togPol=togPol; window._delPol=delPol; window._delGrp=delGrp;
  window._openPolModal=openPolModal; window._toggleCat=toggleCat;
  window._toggleCC=toggleCC;
}
