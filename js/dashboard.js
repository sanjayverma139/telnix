// ─────────────────────────────────────────────────────────────────────────────
// dashboard.js — Dashboard page: 24h stats + recent activity table
// ─────────────────────────────────────────────────────────────────────────────

import { $, esc, fmt } from './utils.js';
import { fetchDashStats } from './api.js';

export async function loadDash() {
  $('dash-tb').innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';
  const logs = await fetchDashStats();

  $('s-t').textContent = logs.length;
  $('s-b').textContent = logs.filter(l => l.action === 'block').length;
  $('s-w').textContent = logs.filter(l => l.action === 'warn').length;
  $('s-u').textContent = new Set(logs.map(l => l.user_email).filter(Boolean)).size;

  $('dash-tb').innerHTML = logs.slice(0, 20).map(l => `
    <tr>
      <td style="color:#64748b;font-size:11px;white-space:nowrap">${fmt(l.ts)}</td>
      <td style="color:#a5b4fc">${esc(l.user_email || '—')}</td>
      <td style="font-weight:600">${esc(l.domain || '—')}</td>
      <td><span class="badge badge-${l.activity || 'browse'}">${l.activity || 'browse'}</span></td>
      <td><span class="badge badge-${l.action}">${l.action}</span></td>
      <td style="color:#64748b;font-size:11px">${esc(l.policy_name || l.reason || '—')}</td>
    </tr>`
  ).join('') || '<tr><td colspan="6" class="loading">No activity yet today</td></tr>';
}

export function initDashboard() {
  $('btn-dash-refresh')?.addEventListener('click', loadDash);
  // Auto-refresh every 30 seconds when dashboard is active
  setInterval(() => {
    if ($('page-dashboard')?.classList.contains('active')) loadDash();
  }, 30000);
}
