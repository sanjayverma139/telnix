// dashboard.js — Dashboard with stats, category chart, clickable stats

import { $, esc, fmt }   from './utils.js';
import { fetchDashStats } from './api.js';
import { CAT_COLORS }     from './config.js';
import { showPage }       from './nav.js';

export async function loadDash() {
  $('dash-tb').innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';
  const logs = await fetchDashStats();

  const blocked   = logs.filter(l => l.action === 'block').length;
  const warned    = logs.filter(l => l.action === 'warn').length;
  const allowed   = logs.filter(l => l.action === 'allow').length;
  const bypassed  = logs.filter(l => l.proceeded === true).length;
  const users     = new Set(logs.map(l => l.user_email).filter(Boolean)).size;

  $('s-t').textContent = logs.length;
  $('s-b').textContent = blocked;
  $('s-w').textContent = warned;
  $('s-a').textContent = allowed;
  $('s-bp').textContent = bypassed;
  $('s-u').textContent = users;

  // Category breakdown chart
  const catMap = {};
  logs.forEach(l => { if (l.category) { catMap[l.category] = (catMap[l.category]||0)+1; } });
  const catEntries = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,8);
  const chartEl = $('dash-cat-chart');
  if (chartEl) {
    if (!catEntries.length) {
      chartEl.innerHTML = '<div style="color:#475569;font-size:12px;padding:10px 0">No activity today.</div>';
    } else {
      const max = catEntries[0][1];
      chartEl.innerHTML = catEntries.map(([cat, count]) => {
        const pct = Math.round(count / max * 100);
        const col = CAT_COLORS[cat] || '#64748b';
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
            <span style="color:${col};font-weight:600">${esc(cat)}</span>
            <span style="color:#64748b">${count}</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,.05);border-radius:3px">
            <div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .4s"></div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Recent activity table
  $('dash-tb').innerHTML = logs.slice(0, 20).map(l => `
    <tr>
      <td style="color:#64748b;font-size:11px;white-space:nowrap">${fmt(l.ts)}</td>
      <td style="color:#a5b4fc">${esc(l.user_email||'—')}</td>
      <td style="font-weight:600">${esc(l.domain||'—')}</td>
      <td><span class="badge badge-${l.activity||'browse'}">${l.activity||'browse'}</span></td>
      <td><span class="badge badge-${l.action}">${l.action}</span></td>
      <td style="color:#64748b;font-size:11px">${esc(l.policy_name||l.reason||'—')}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="loading">No activity yet today</td></tr>';
}

export function initDashboard() {
  $('btn-dash-refresh')?.addEventListener('click', loadDash);

  // Clickable stat cards → filtered log view
  document.querySelectorAll('.dash-stat[data-filter]').forEach(card => {
    card.addEventListener('click', async () => {
      const f = card.dataset.filter;
      const { addLogFilter } = await import('./logs.js');
      if (f === 'block') { addLogFilter('action','block','Action = Block'); }
      else if (f === 'warn') { addLogFilter('action','warn','Action = Warn'); }
      else if (f === 'allow') { addLogFilter('action','allow','Action = Allow'); }
      else if (f === 'bypassed') { addLogFilter('proceeded','true','User Bypassed Warning'); }
      showPage('logs');
    });
  });

  setInterval(() => {
    if ($('page-dashboard')?.classList.contains('active')) loadDash();
  }, 30000);
}
