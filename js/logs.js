// logs.js — Activity Logs with new filter system + pagination

import { $, esc, fmt, fmtF } from './utils.js';
import { fetchLogs, PAGE_SIZE } from './api.js';
import { setAllLogs, allLogs } from './state.js';
import { showPage }           from './nav.js';
import { ORG } from './config.js';
import { sbf } from './api.js';

const LOGS_FILTER_KEY = 'telnix_logs_filter_v1';

// ── State ─────────────────────────────────────────────────────────────────────
let currentPage  = 0;
let totalLogs    = 0;
let activeFilters = {}; // { action:[], user:[], threat:[], activity:[], date:{} }

// Calendar state
let calYear, calMonth, calFrom = null, calTo = null, hoverDate = null;

// Known users cache
let knownUsers = [];

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetFilters() {
  activeFilters = {};
  currentPage   = 0;
  // Uncheck all checkboxes/radios in panels
  document.querySelectorAll('.filter-panel input[type=checkbox]').forEach(c => c.checked = false);
  document.querySelectorAll('.filter-panel input[type=radio]').forEach(r => r.checked = false);
  calFrom = calTo = null;
  const s = $('log-search'); if (s) s.value = '';
  updateFilterBtnStates();
  renderFilterChips();
  loadLogs();
}

// ── Build filters for API ─────────────────────────────────────────────────────
function buildFilters() {
  const search = $('log-search')?.value.trim().toLowerCase() || '';
  const f = { search };

  if (activeFilters.action?.length)   f.actions   = activeFilters.action;
  if (activeFilters.activity?.length) f.activities = activeFilters.activity;
  if (activeFilters.user?.length)     f.users      = activeFilters.user;
  if (activeFilters.threat?.length) {
    if (activeFilters.threat.includes('malicious')) f.knownMalicious = true;
    if (activeFilters.threat.includes('high'))      f.highRisk = true;
    if (activeFilters.threat.includes('medium'))    f.medRisk  = true;
  }
  if (activeFilters.date) {
    f.tsFrom = activeFilters.date.from;
    f.tsTo   = activeFilters.date.to;
  }
  return f;
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadLogs() {
  const tbody = $('logs-tb');
  if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';
  renderPagination(0, 0);

  const { logs, total } = await fetchLogs(buildFilters(), currentPage);
  totalLogs = total;
  setAllLogs(logs);
  renderLogTable(logs);
  renderPagination(currentPage, total);
}

// ── Table ─────────────────────────────────────────────────────────────────────
function renderLogTable(logs) {
  const tbody = $('logs-tb'); if (!tbody) return;
  if (!logs.length) { tbody.innerHTML = '<tr><td colspan="9" class="loading">No logs found</td></tr>'; return; }
  tbody.innerHTML = logs.map((l, i) => {
    const score = l.threat_score;
    const sc = score >= 55 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981';
    const sd = score != null ? `<span style="font-weight:700;color:${sc}">${score}</span>` : '—';
      const path = (() => {
        try {
          const u = new URL(l.url || '');
          const p = u.pathname + u.search;
          return p && p !== '/' ? p.slice(0, 60) + (p.length > 60 ? '…' : '') : '';
        } catch { return ''; }
      })();
      return `<tr>
      <td style="color:#64748b;font-size:11px;white-space:nowrap">${fmt(l.ts)}</td>
      <td style="color:#a5b4fc;font-size:11px">${esc(l.user_email||'—')}</td>
      <td style="font-size:12px">
        <div style="font-weight:600">${esc(l.domain||'—')}</div>
        ${path ? `<div style="font-size:10px;color:#475569;margin-top:1px">${esc(path)}</div>` : ''}
      </td>
      <td><span class="badge badge-${l.activity||'browse'}">${l.activity||'browse'}</span></td>
      <td><span class="badge badge-${l.action}">${l.action}</span></td>
      <td style="font-size:11px;color:#64748b">${esc(l.category||'—')}</td>
      <td style="text-align:center;font-size:12px">${sd}</td>
      <td style="font-size:11px;color:#94a3b8">${esc(l.policy_name||'—')}</td>
      <td style="text-align:center"><button class="btn btn-sm btn-ghost" style="padding:3px 8px;font-size:10px" onclick="window._openInvestigation(${i})">🔍</button></td>
    </tr>`;
  }).join('');
}

// ── Pagination ────────────────────────────────────────────────────────────────
function renderPagination(page, total) {
  const el = $('log-pagination'); if (!el) return;
  if (!total) { el.innerHTML = ''; return; }
  const tp   = Math.ceil(total / PAGE_SIZE);
  const from = page * PAGE_SIZE + 1;
  const to   = Math.min((page+1)*PAGE_SIZE, total);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;justify-content:space-between">
      <span style="font-size:12px;color:#64748b">Showing <strong style="color:#e2e8f0">${from}–${to}</strong> of <strong style="color:#e2e8f0">${total.toLocaleString()}</strong> logs</span>
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="window._logPage(${page-1})" ${page===0?'disabled':''} style="padding:5px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:${page===0?'#374151':'#94a3b8'};font-size:12px;cursor:${page===0?'not-allowed':'pointer'}">← Prev</button>
        <span style="font-size:12px;color:#64748b;padding:0 8px">Page <strong style="color:#e2e8f0">${page+1}</strong> of <strong style="color:#e2e8f0">${tp}</strong></span>
        <button onclick="window._logPage(${page+1})" ${page>=tp-1?'disabled':''} style="padding:5px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:${page>=tp-1?'#374151':'#94a3b8'};font-size:12px;cursor:${page>=tp-1?'not-allowed':'pointer'}">Next →</button>
      </div>
    </div>`;
}

// ── Filter chips ──────────────────────────────────────────────────────────────
function renderFilterChips() {
  const c = $('log-filter-chips'); if (!c) return;
  const chips = [];
  if (activeFilters.action?.length)   chips.push({ key:'action',   label:'Action: '+activeFilters.action.join(', ') });
  if (activeFilters.user?.length)     chips.push({ key:'user',     label:'User: '+activeFilters.user.slice(0,2).join(', ')+(activeFilters.user.length>2?` +${activeFilters.user.length-2}`:'') });
  if (activeFilters.threat?.length)   chips.push({ key:'threat',   label:'Threat: '+activeFilters.threat.join(', ') });
  if (activeFilters.activity?.length) chips.push({ key:'activity', label:'Activity: '+activeFilters.activity.join(', ') });
  if (activeFilters.date)             chips.push({ key:'date',     label: activeFilters.date.label || 'Date range' });
  const search = $('log-search')?.value.trim();
  if (search) chips.push({ key:'search', label:'Search: '+search });

  c.innerHTML = chips.map(ch =>
    `<div class="filter-chip"><span>${esc(ch.label)}</span><button class="filter-chip-x" onclick="window._removeFilter('${ch.key}')">✕</button></div>`
  ).join('') + (chips.length ? `<button onclick="window._clearLogFilters()" style="background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171;border-radius:20px;padding:4px 10px;font-size:11px;cursor:pointer">✕ Clear all</button>` : '');
}

// ── Filter button active state ────────────────────────────────────────────────
function updateFilterBtnStates() {
  const btns = { action:'fbtn-action', user:'fbtn-user', threat:'fbtn-threat', activity:'fbtn-activity', date:'fbtn-date' };
  for (const [key, id] of Object.entries(btns)) {
    const btn = $(id); if (!btn) continue;
    const has = key === 'date' ? !!activeFilters.date : (activeFilters[key]?.length > 0);
    btn.classList.toggle('active', has);
    const countEl = $(`${id}-count`);
    if (countEl) {
      if (key === 'date' && activeFilters.date) countEl.textContent = '';
      else countEl.textContent = activeFilters[key]?.length > 0 ? `(${activeFilters[key].length})` : '';
    }
  }
  // Update date label
  const dateLbl = $('fbtn-date-label');
  if (dateLbl) dateLbl.textContent = activeFilters.date?.label ? `· ${activeFilters.date.label}` : '';
}

// ── Toggle filter panel ───────────────────────────────────────────────────────
function toggleFilterPanel(type) {
  const panel = $(`fpanel-${type}`); if (!panel) return;
  const isOpen = panel.classList.contains('open');
  // Close all panels first
  document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('open'));
  if (!isOpen) {
    panel.classList.add('open');
    // Load users if opening user panel
    if (type === 'user') loadUserOptions();
    // Show calendar if custom range radio already selected
    if (type === 'date') {
      const radio = document.querySelector('input[name="datepreset"]:checked');
      if (radio?.value === 'custom') showCalendar();
    }
  }
}

// ── Apply filter ──────────────────────────────────────────────────────────────
function applyFilter(type) {
  if (type === 'action') {
    activeFilters.action = [...document.querySelectorAll('#fpanel-action input:checked')].map(c => c.value);
  }
  if (type === 'user') {
    activeFilters.user = [...document.querySelectorAll('#fp-user-list input:checked')].map(c => c.value);
  }
  if (type === 'threat') {
    activeFilters.threat = [...document.querySelectorAll('#fpanel-threat input:checked')].map(c => c.value);
  }
  if (type === 'activity') {
    activeFilters.activity = [...document.querySelectorAll('#fpanel-activity input:checked')].map(c => c.value);
  }
  if (type === 'date') {
    const preset = document.querySelector('input[name="datepreset"]:checked')?.value;
    if (!preset) { delete activeFilters.date; }
    else if (preset === 'today') {
      const m = new Date(); m.setHours(0,0,0,0);
      activeFilters.date = { from: m.getTime(), to: Date.now(), label: 'Today' };
    } else if (preset === 'last7') {
      activeFilters.date = { from: Date.now()-7*86400000, to: Date.now(), label: 'Last 7 days' };
    } else if (preset === 'last30') {
      activeFilters.date = { from: Date.now()-30*86400000, to: Date.now(), label: 'Last 30 days' };
    } else if (preset === 'custom') {
      if (!calFrom) { alert('Please select a start date on the calendar'); return; }
      const endDate = calTo || calFrom;
      const fromTime = $('cal-from-time')?.value || '00:00';
      const toTime   = $('cal-to-time')?.value   || '23:59';
      const tsFrom = new Date(`${calFrom}T${fromTime}:00`).getTime();
      const tsTo   = new Date(`${endDate}T${toTime}:59`).getTime();
      activeFilters.date = {
        from:  tsFrom,
        to:    tsTo,
        label: `${calFrom} ${fromTime} → ${endDate} ${toTime}`
      };
    }
  }
  // Cleanup empty arrays
  for (const k of ['action','user','threat','activity']) {
    if (activeFilters[k]?.length === 0) delete activeFilters[k];
  }

  document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('open'));
  currentPage = 0;
  updateFilterBtnStates();
  renderFilterChips();
  loadLogs();
}

function removeFilter(key) {
  delete activeFilters[key];
  if (key === 'search') { const s=$('log-search'); if(s) s.value=''; }
  if (key === 'action')   document.querySelectorAll('#fpanel-action input').forEach(c=>c.checked=false);
  if (key === 'user')     document.querySelectorAll('#fp-user-list input').forEach(c=>c.checked=false);
  if (key === 'threat')   document.querySelectorAll('#fpanel-threat input').forEach(c=>c.checked=false);
  if (key === 'activity') document.querySelectorAll('#fpanel-activity input').forEach(c=>c.checked=false);
  if (key === 'date') {
    document.querySelectorAll('input[name="datepreset"]').forEach(r=>r.checked=false);
    calFrom=calTo=null;
    const w=$('custom-cal-wrap'); if(w) w.style.display='none';
  }
  currentPage=0;
  updateFilterBtnStates();
  renderFilterChips();
  loadLogs();
}

// ── User options ──────────────────────────────────────────────────────────────
async function loadUserOptions(search='') {
  if (!knownUsers.length) {
    try {
      const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&select=user_email&order=ts.desc&limit=500`);
      const rows = r.ok ? await r.json() : [];
      knownUsers = [...new Set(rows.map(row => row.user_email).filter(Boolean))].sort();
    } catch { knownUsers = []; }
  }
  renderUserOptions(search);
}

function renderUserOptions(search='') {
  const list = $('fp-user-list'); if (!list) return;
  const checked = new Set([...document.querySelectorAll('#fp-user-list input:checked')].map(c=>c.value));
  const filtered = knownUsers.filter(u => !search || u.toLowerCase().includes(search.toLowerCase()));
  if (!filtered.length) { list.innerHTML = '<div style="font-size:11px;color:#475569;padding:4px">No users found</div>'; return; }
  list.innerHTML = filtered.map(u =>
    `<label class="fp-opt"><input type="checkbox" value="${esc(u)}" ${checked.has(u)?'checked':''}> ${esc(u)}</label>`
  ).join('');
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function showCalendar() {
  const wrap = $('custom-cal-wrap'); if (!wrap) return;
  wrap.style.display = 'block';
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

function renderCalendar() {
  const cont = $('cal-container'); if (!cont) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days   = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const today  = new Date().toISOString().slice(0,10);

  const first = new Date(calYear, calMonth, 1);
  const last  = new Date(calYear, calMonth+1, 0);
  // Monday-first: 0=Mon .. 6=Sun
  let startDow = first.getDay(); // 0=Sun..6=Sat
  startDow = startDow === 0 ? 6 : startDow - 1;

  let cells = '';
  for (let i=0; i<startDow; i++) cells += `<div class="cal-day empty"></div>`;
  for (let d=1; d<=last.getDate(); d++) {
    const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let cls = 'cal-day';
    if (ds === today) cls += ' today';
    if (ds === calFrom) cls += ' selected-start';
    if (ds === calTo)   cls += ' selected-end';
    if (calFrom && calTo && ds > calFrom && ds < calTo) cls += ' in-range';
    cells += `<div class="${cls}" data-date="${ds}" onclick="event.stopPropagation();window._calClick('${ds}')" onmouseenter="window._calHover('${ds}')">${d}</div>`;
  }

  cont.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav" onclick="event.stopPropagation();window._calNav(-1)">‹</button>
      <span class="cal-month">${months[calMonth]} ${calYear}</span>
      <button class="cal-nav" onclick="event.stopPropagation();window._calNav(1)">›</button>
    </div>
    <div class="cal-grid">
      ${days.map(d=>`<div class="cal-day-hdr">${d}</div>`).join('')}
      ${cells}
    </div>`;
  updateRangeDisplay();
}

function calClick(ds) {
  if (!calFrom || (calFrom && calTo)) { calFrom=ds; calTo=null; }
  else if (ds < calFrom)              { calTo=calFrom; calFrom=ds; }
  else                                { calTo=ds; }
  renderCalendar();
}
function calHover(ds) {
  if (!calFrom || calTo) return; // only show hover range when picking second date
  document.querySelectorAll('.cal-day[data-date]').forEach(el => {
    const d = el.dataset.date;
    el.classList.toggle('in-range', d > calFrom && d <= ds);
  });
}
function calNav(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth=0; calYear++; }
  if (calMonth < 0)  { calMonth=11; calYear--; }
  renderCalendar();
}
function updateRangeDisplay() {
  const el=$('cal-range-display'); if(!el) return;
  if (calFrom && calTo)  el.textContent = `${calFrom}  →  ${calTo}`;
  else if (calFrom)      el.textContent = `From: ${calFrom}  (select end date)`;
  else                   el.textContent = '';
}

// ── Export ────────────────────────────────────────────────────────────────────
export function exportLogs() {
  import('./state.js').then(({ allLogs }) => {
    if (!allLogs.length) return;
    const h = ['Time','User','Domain','Activity','Action','Category','ThreatScore','Policy','File'];
    const rows = allLogs.map(l => [
      new Date(l.ts).toISOString(), l.user_email||'', l.domain||'',
      l.activity||'', l.action||'', l.category||'', l.threat_score??'',
      l.policy_name||'', l.download_filename||''
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([[h.join(','),...rows].join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `telnix-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });
}

export function filterByUser(email) {
  activeFilters.user = [email];
  updateFilterBtnStates();
  renderFilterChips();
  if ($('page-logs')) showPage('logs');
  else loadLogs();
}

// ── Investigation Panel ───────────────────────────────────────────────────────
function openInvestigation(idx) {
  // Helper: format bytes into human readable
  function formatBytes(b) {
    if (!b || b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  import('./state.js').then(({ allLogs }) => {
    const l = allLogs[idx]; if (!l) return;
    const panel=document.getElementById('inv-panel');
    const content=document.getElementById('inv-content');
    if(!panel||!content) return;
    const isLight=document.body.classList.contains('light-theme');
    const textCol=isLight?'#142033':'#e2e8f0';
    const mutedCol=isLight?'#64748b':'#94a3b8';
    const lineCol=isLight?'rgba(15,23,42,.08)':'rgba(255,255,255,.04)';
    const sectionCol=isLight?'#526173':'#475569';
    const score=l.threat_score;
    const sc=score>=55?'#ef4444':score>=30?'#f59e0b':'#10b981';
    const sl=score>=55?'HIGH RISK':score>=30?'MEDIUM RISK':'CLEAN';
    function row(label,val,color){return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${lineCol}"><span style="font-size:11px;color:${mutedCol};flex-shrink:0;margin-right:12px;font-weight:600">${label}</span><span style="font-size:12px;color:${color||textCol};text-align:right;word-break:break-all;font-weight:600">${val}</span></div>`;}
    content.innerHTML=`
      <div style="margin-bottom:20px">
        <div style="font-size:20px;font-weight:900;color:${textCol};margin-bottom:4px">${esc(l.domain||'—')}</div>
        <span class="badge badge-${l.action}" style="font-size:12px;padding:4px 12px">${(l.action||'').toUpperCase()}</span>
        ${l.proceeded?'<span class="badge" style="background:rgba(139,92,246,.15);color:#a78bfa;margin-left:6px">BYPASSED</span>':''}
      </div>
      <div style="font-size:10px;font-weight:800;color:${sectionCol};text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Event Details</div>
      ${row('Timestamp',new Date(l.ts).toISOString())}
      ${row('Local Time',fmtF(l.ts))}
      ${row('User',l.user_email||'—','#a5b4fc')}
      ${row('Full URL',(l.url||'—').slice(0,200))}
      ${row('Domain',l.domain||'—')}
      ${row('Activity',l.activity||'browse')}
      ${row('Reason',l.reason||'—')}
      ${row('Policy',l.policy_name||'—','#818cf8')}
      ${row('Group',l.group_name||'—')}
      ${row('Category',l.category||'—')}
      ${l.download_filename?row('File',l.download_filename,'#fbbf24'):''}
      ${l.proceeded?row('Bypassed Warning','Yes','#a78bfa'):''}
      ${(l.activity==='xhr'||l.activity==='upload')?`
        <div style="font-size:10px;font-weight:800;color:${sectionCol};text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px">📡 Request Details</div>
        ${l.xhr_method||l.xhrMethod    ? row('Method',      l.xhr_method||l.xhrMethod,                                                          '#60a5fa') : ''}
        ${l.xhr_risk||l.xhrRisk        ? row('Risk',        (l.xhr_risk||l.xhrRisk||'').toUpperCase(),
            (l.xhr_risk||l.xhrRisk)==='high'?'#f87171':(l.xhr_risk||l.xhrRisk)==='medium'?'#fbbf24':'#10b981') : ''}
        ${l.initiator                  ? row('Initiator',   l.initiator,                                                                         '#94a3b8') : ''}
        ${l.xhr_content_type||l.xhrContentType ? row('Content-Type', l.xhr_content_type||l.xhrContentType,                                      '#94a3b8') : ''}
        ${l.xhr_size||l.xhrSize        ? row('Size',        formatBytes(l.xhr_size||l.xhrSize||0),                                               '#94a3b8') : ''}
        ${l.xhr_has_file||l.xhrHasFile ? row('File Upload', '⚠️ Yes — file detected in request body',                                          '#f87171') : ''}
        ${l.page_domain||l.pageDomain  ? row('Page Domain', l.page_domain||l.pageDomain,                                                         '#64748b') : ''}
      `:''}
      ${score!=null?`
        <div style="font-size:10px;font-weight:800;color:${sectionCol};text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px">🛡 Threat Intelligence</div>
        <div style="background:${sc}0d;border:1px solid ${sc}33;border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="text-align:center"><div style="font-size:32px;font-weight:900;color:${sc};line-height:1">${score}</div><div style="font-size:9px;color:${mutedCol}">/100</div></div>
            <div><div style="font-size:13px;font-weight:700;color:${sc}">${sl}</div>${l.known_malicious?'<div style="font-size:11px;color:#f87171;margin-top:2px">⚠ Known Malicious Site</div>':''}</div>
          </div>
        </div>`:''}`;
    panel.classList.add('open');
    document.getElementById('inv-overlay')?.classList.add('open');
  });
}

// ── Compatibility export for dashboard.js ────────────────────────────────────
export function addLogFilter(type, val, label) {
  // Map old single-value filter calls to new multi-value system
  if (type === 'action')    { activeFilters.action   = [val]; }
  else if (type === 'activity')  { activeFilters.activity = [val]; }
  else if (type === 'proceeded') { activeFilters.threat   = ['proceeded']; }
  else if (type === 'userEmail') { activeFilters.user     = [val]; }
  else if (type === 'today')     { activeFilters.date = { from: (() => { const m=new Date(); m.setHours(0,0,0,0); return m.getTime(); })(), to: Date.now(), label: 'Today' }; }
  else if (type === 'last7')     { activeFilters.date = { from: Date.now()-7*86400000,  to: Date.now(), label: 'Last 7 days'  }; }
  else if (type === 'last30')    { activeFilters.date = { from: Date.now()-30*86400000, to: Date.now(), label: 'Last 30 days' }; }
  currentPage = 0;
  updateFilterBtnStates();
  renderFilterChips();
  loadLogs();
}

// ── Supabase Realtime sync ────────────────────────────────────────────────────
let realtimeChannel = null;

function initRealtimeSync() {
  if (realtimeChannel) return; // already connected

  try {
    // Use native WebSocket — no Supabase JS SDK needed
    const wsUrl = `wss://nsauxvxopajdsgglcvpk.supabase.co/realtime/v1/websocket?apikey=${ANON}&vsn=1.0.0`;
    const ws    = new WebSocket(wsUrl);
    realtimeChannel = ws;

    ws.onopen = () => {
      // Join the activity_logs channel — filter by org_id
      ws.send(JSON.stringify({
        topic:   'realtime:public:activity_logs',
        event:   'phx_join',
        payload: { config: { postgres_changes: [{ event: 'UPDATE', schema: 'public', table: 'activity_logs', filter: `org_id=eq.${ORG}` }] } },
        ref:     '1',
      }));
      console.log('[Telnix Admin] Realtime connected');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // Heartbeat — reply to keep connection alive
        if (msg.event === 'phx_reply' && msg.ref === '1') return;
        if (msg.event === 'heartbeat') {
          ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: '2' }));
          return;
        }

        // Postgres change event — a row was updated
        if (msg.event === 'postgres_changes') {
          const record = msg.payload?.data?.record;
          if (!record) return;

          // Update filename in the displayed table row if it's visible
          const localId = record.local_id;
          const filename = record.download_filename;
          if (!localId || !filename) return;

          // Find the row in current allLogs and update it
          import('./state.js').then(({ allLogs }) => {
            const idx = allLogs.findIndex(l => l.local_id === localId);
            if (idx !== -1) {
              allLogs[idx].download_filename = filename;
              // Update just that cell in the table — no full reload
              const rows = document.querySelectorAll('#logs-tb tr');
              if (rows[idx]) {
                // File column is not in table — update investigation panel if open
                // Reload current page data silently
                loadLogs();
              }
            }
          }).catch(() => {});
        }
      } catch (_e) {}
    };

    ws.onclose = () => {
      realtimeChannel = null;
      console.log('[Telnix Admin] Realtime disconnected — reconnecting in 5s');
      setTimeout(initRealtimeSync, 5000); // auto-reconnect
    };

    ws.onerror = () => {
      // Error handled by onclose
    };

  } catch (_e) {
    console.warn('[Telnix Admin] Realtime setup failed:', _e.message);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initLogs() {
  $('log-search')?.addEventListener('input', () => { currentPage=0; renderFilterChips(); loadLogs(); });
  $('btn-logs-refresh')?.addEventListener('click', () => { currentPage=0; loadLogs(); });
  $('btn-export-csv')?.addEventListener('click', exportLogs);

  // Date preset radio change
  document.querySelectorAll('input[name="datepreset"]').forEach(r => r.addEventListener('change', () => {
    const wrap=$('custom-cal-wrap');
    if(r.value==='custom'){ if(wrap) wrap.style.display='block'; showCalendar(); }
    else { if(wrap) wrap.style.display='none'; }
  }));

  // Close panels on outside click — but NOT when clicking inside a panel or its button
  document.addEventListener('click', e => {
    if (!e.target.closest('.log-filter-btn-wrap')) {
      document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('open'));
    }
    if (e.target.closest('#inv-close') || e.target.id==='inv-overlay') {
      document.getElementById('inv-panel')?.classList.remove('open');
      document.getElementById('inv-overlay')?.classList.remove('open');
    }
  });

  // Expose globals
  window._toggleFilterPanel = toggleFilterPanel;
  window._applyFilter       = applyFilter;
  window._removeFilter      = removeFilter;
  window._clearLogFilters   = () => resetFilters();
  window._openInvestigation = openInvestigation;
  window._filterUserOptions = (v) => renderUserOptions(v);
  window._logPage = (page) => {
    const tp = Math.ceil(totalLogs/PAGE_SIZE);
    if (page<0||page>=tp) return;
    currentPage=page; loadLogs();
  };
  window._calClick = calClick;
  window._calHover = calHover;
  window._calNav   = calNav;

  // Start Supabase Realtime for live filename updates
  initRealtimeSync();
  if (!applyPendingNavigationFilter()) loadLogs();
}

function applyPendingNavigationFilter() {
  let raw = null;
  try {
    raw = sessionStorage.getItem(LOGS_FILTER_KEY);
  } catch {}
  if (!raw) return false;

  try {
    const { type, val, label } = JSON.parse(raw);
    addLogFilter(type, val, label);
  } catch {
    return false;
  }

  try {
    sessionStorage.removeItem(LOGS_FILTER_KEY);
  } catch {}
  return true;
}
