// logs.js — Activity Logs with filter chips + investigation panel

import { $, esc, fmt, fmtF } from './utils.js';
import { fetchLogs }          from './api.js';
import { setAllLogs }         from './state.js';
import { showPage }           from './nav.js';

// ── Active filters state ──────────────────────────────────────────────────────
let activeFilters = [];

export function addLogFilter(type, val, label) {
  activeFilters = activeFilters.filter(f => f.type !== type);
  activeFilters.push({ type, val, label });
  renderFilterChips();
  loadLogs();
}

function removeLogFilter(type) {
  activeFilters = activeFilters.filter(f => f.type !== type);
  renderFilterChips();
  loadLogs();
}

function clearAllFilters() {
  activeFilters = [];
  const sv = $('log-search'); if (sv) sv.value = '';
  renderFilterChips();
  loadLogs();
}

function renderFilterChips() {
  const c = $('log-filter-chips'); if (!c) return;
  const sv = $('log-search');
  const hasAny = activeFilters.length > 0 || (sv?.value.trim());
  if (!hasAny) { c.innerHTML = ''; return; }
  c.innerHTML = activeFilters.map(f =>
    `<div class="filter-chip" data-chip-type="${f.type}">
      <span>${esc(f.label)}</span>
      <button class="filter-chip-x" data-remove="${f.type}">✕</button>
    </div>`
  ).join('') + (hasAny ? `<button onclick="window._clearLogFilters()" style="background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171;border-radius:20px;padding:4px 10px;font-size:11px;cursor:pointer">✕ Clear all</button>` : '');
}

// ── Main load function ────────────────────────────────────────────────────────
export async function loadLogs() {
  const search = $('log-search')?.value.trim().toLowerCase() || '';
  const filters = { search };
  activeFilters.forEach(f => {
    if (f.type === 'action')   filters.action   = f.val;
    if (f.type === 'activity') filters.activity = f.val;
    if (f.type === 'category') filters.category = f.val;
    if (f.type === 'today')    filters.today    = true;
    if (f.type === 'proceeded') filters.proceeded = true;
    if (f.type === 'threat' && f.val === 'malicious') filters.knownMalicious = true;
    if (f.type === 'threat' && f.val === 'high')      filters.highRisk = true;
    if (f.type === 'threat' && f.val === 'medium')    filters.medRisk  = true;
  });

  const logs = await fetchLogs(filters);
  setAllLogs(logs);
  renderLogTable(logs);
}

function renderLogTable(logs) {
  const tbody = $('logs-tb'); if (!tbody) return;
  if (!logs.length) { tbody.innerHTML = '<tr><td colspan="9" class="loading">No logs found</td></tr>'; return; }
  tbody.innerHTML = logs.map((l, i) => {
    const score = l.threat_score;
    const scoreColor = score >= 55 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981';
    const scoreDisplay = score != null ? `<span style="font-weight:700;color:${scoreColor}">${score}</span>` : '—';
    return `<tr>
      <td style="color:#64748b;font-size:11px;white-space:nowrap">${fmt(l.ts)}</td>
      <td style="color:#a5b4fc;font-size:11px">${esc(l.user_email||'—')}</td>
      <td style="font-weight:600;font-size:12px">${esc(l.domain||'—')}</td>
      <td><span class="badge badge-${l.activity||'browse'}">${l.activity||'browse'}</span></td>
      <td><span class="badge badge-${l.action}">${l.action}</span></td>
      <td style="font-size:11px;color:#64748b">${esc(l.category||'—')}</td>
      <td style="text-align:center;font-size:12px">${scoreDisplay}</td>
      <td style="font-size:11px;color:#94a3b8">${esc(l.policy_name||'—')}</td>
      <td style="text-align:center"><button class="btn btn-sm btn-ghost" style="padding:3px 8px;font-size:10px" onclick="window._openInvestigation(${i})">🔍</button></td>
    </tr>`;
  }).join('');
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
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([[h.join(','),...rows].join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `telnix-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });
}

export function filterByUser(email) {
  $('log-search').value = email;
  showPage('logs');
}

// ── Investigation Panel ───────────────────────────────────────────────────────
function openInvestigation(idx) {
  import('./state.js').then(({ allLogs }) => {
    const l = allLogs[idx]; if (!l) return;
    const panel = $('inv-panel');
    const content = $('inv-content');
    if (!panel || !content) return;

    const score = l.threat_score;
    const scoreColor = score >= 55 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981';
    const scoreLabel = score >= 55 ? 'HIGH RISK' : score >= 30 ? 'MEDIUM RISK' : 'CLEAN';

    function row(label, val, color) {
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <span style="font-size:11px;color:#64748b;flex-shrink:0;margin-right:12px">${label}</span>
        <span style="font-size:12px;color:${color||'#e2e8f0'};text-align:right;word-break:break-all">${val}</span>
      </div>`;
    }

    content.innerHTML = `
      <div style="margin-bottom:20px">
        <div style="font-size:18px;font-weight:800;color:#e2e8f0;margin-bottom:4px">${esc(l.domain||'—')}</div>
        <span class="badge badge-${l.action}" style="font-size:12px;padding:4px 12px">${(l.action||'').toUpperCase()}</span>
        ${l.proceeded ? '<span class="badge" style="background:rgba(139,92,246,.15);color:#a78bfa;margin-left:6px">BYPASSED</span>' : ''}
      </div>

      <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Event Details</div>
      ${row('Timestamp', new Date(l.ts).toISOString())}
      ${row('Local Time', fmtF(l.ts))}
      ${row('User', l.user_email||'—', '#a5b4fc')}
      ${row('Full URL', (l.url||'—').slice(0,200))}
      ${row('Domain', l.domain||'—')}
      ${row('Activity', l.activity||'browse')}
      ${row('Reason', l.reason||'—')}
      ${row('Policy', l.policy_name||'—', '#818cf8')}
      ${row('Group', l.group_name||'—')}
      ${row('Category', l.category||'—')}
      ${l.download_filename ? row('File', l.download_filename, '#fbbf24') : ''}
      ${l.proceeded ? row('Bypassed Warning', 'Yes', '#a78bfa') : ''}

      ${score != null ? `
        <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px">🛡 Threat Intelligence</div>
        <div style="background:${scoreColor}0d;border:1px solid ${scoreColor}33;border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="text-align:center">
              <div style="font-size:32px;font-weight:900;color:${scoreColor};line-height:1">${score}</div>
              <div style="font-size:9px;color:#64748b">/100</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:700;color:${scoreColor}">${scoreLabel}</div>
              ${l.known_malicious ? '<div style="font-size:11px;color:#f87171;margin-top:2px">⚠ Known Malicious Site</div>' : ''}
            </div>
          </div>
        </div>` : ''}
    `;

    panel.classList.add('open');
    $('inv-overlay').classList.add('open');
  });
}

// ── Filter dropdown ───────────────────────────────────────────────────────────
export function initLogs() {
  $('log-search')?.addEventListener('input', () => { renderFilterChips(); loadLogs(); });
  $('btn-logs-refresh')?.addEventListener('click', loadLogs);
  $('btn-export-csv')?.addEventListener('click', exportLogs);

  // ADD FILTER dropdown
  document.addEventListener('click', e => {
    const addBtn = e.target.closest('#btn-add-log-filter');
    const dd = $('log-filter-dd');
    if (!dd) return;
    if (addBtn) { dd.style.display = dd.style.display === 'block' ? 'none' : 'block'; return; }
    const item = e.target.closest('[data-lf-type]');
    if (item) {
      addLogFilter(item.dataset.lfType, item.dataset.lfVal, item.dataset.lfLabel);
      dd.style.display = 'none'; return;
    }
    const rem = e.target.closest('[data-remove]');
    if (rem) { removeLogFilter(rem.dataset.remove); return; }
    if (!e.target.closest('#log-filter-dd') && !e.target.closest('#btn-add-log-filter')) {
      if (dd) dd.style.display = 'none';
    }
    // Investigation panel close
    if (e.target.closest('#inv-close') || e.target.id === 'inv-overlay') {
      $('inv-panel')?.classList.remove('open');
      $('inv-overlay')?.classList.remove('open');
    }
  });

  // Expose globals
  window._clearLogFilters = clearAllFilters;
  window._openInvestigation = openInvestigation;
}
