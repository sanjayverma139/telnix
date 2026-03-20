// ─────────────────────────────────────────────────────────────────────────────
// logs.js — Activity Logs page
// ─────────────────────────────────────────────────────────────────────────────

import { $, esc, fmt }  from './utils.js';
import { fetchLogs }     from './api.js';
import { setAllLogs }    from './state.js';
import { showPage }      from './nav.js';

export async function loadLogs() {
  const filters = {
    action:    $('f-a')?.value   || '',
    activity:  $('f-ac')?.value  || '',
    search:    $('f-s')?.value.trim().toLowerCase()  || '',
    userEmail: $('f-u')?.value.trim().toLowerCase()  || '',
  };

  const logs = await fetchLogs(filters);
  setAllLogs(logs);

  $('logs-tb').innerHTML = logs.map(l => `
    <tr>
      <td style="color:#64748b;font-size:11px;white-space:nowrap">${fmt(l.ts)}</td>
      <td style="color:#a5b4fc">${esc(l.user_email || '—')}</td>
      <td style="font-weight:600">${esc(l.domain || '—')}</td>
      <td><span class="badge badge-${l.activity || 'browse'}">${l.activity || 'browse'}</span></td>
      <td><span class="badge badge-${l.action}">${l.action}</span></td>
      <td style="color:#64748b;font-size:11px">${esc(l.category || '—')}</td>
      <td style="color:#94a3b8;font-size:11px">${esc(l.policy_name || '—')}</td>
      <td style="color:#fbbf24;font-size:11px">${esc(l.download_filename || '')}</td>
    </tr>`
  ).join('') || '<tr><td colspan="8" class="loading">No logs found</td></tr>';
}

export function exportLogs() {
  import('./state.js').then(({ allLogs }) => {
    if (!allLogs.length) return;
    const headers = ['Time','User','Domain','Activity','Action','Category','Policy','File'];
    const rows = allLogs.map(l => [
      new Date(l.ts).toISOString(), l.user_email||'', l.domain||'',
      l.activity||'', l.action||'', l.category||'', l.policy_name||'', l.download_filename||''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `telnix-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });
}

/** Called from users.js — filter logs by a specific email */
export function filterByUser(email) {
  $('f-u').value = email;
  showPage('logs');
}

export function initLogs() {
  $('f-s')?.addEventListener('input',  loadLogs);
  $('f-a')?.addEventListener('change', loadLogs);
  $('f-ac')?.addEventListener('change',loadLogs);
  $('f-u')?.addEventListener('input',  loadLogs);
  $('btn-logs-refresh')?.addEventListener('click', loadLogs);
  $('btn-export-csv')?.addEventListener('click', exportLogs);
}
