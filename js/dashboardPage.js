import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initDashboard, loadDash } from './dashboard.js';

renderAppShell({
  activeKey: 'dashboard',
  content: `
    <div class="page active" id="page-dashboard">
      <div class="page-header">
        <div><div class="page-title">Dashboard</div><div class="page-sub">Last 24 hours across all users</div></div>
        <button class="btn btn-ghost btn-sm" id="btn-dash-refresh">Refresh</button>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-num" id="s-t" style="color:#818cf8">-</div><div class="stat-lbl">Total</div></div>
        <div class="stat dash-stat" data-filter="block"><div class="stat-num" id="s-b" style="color:#f87171">-</div><div class="stat-lbl">Blocked</div><div class="stat-hint">CLICK TO VIEW</div></div>
        <div class="stat dash-stat" data-filter="warn"><div class="stat-num" id="s-w" style="color:#fbbf24">-</div><div class="stat-lbl">Warned</div><div class="stat-hint">CLICK TO VIEW</div></div>
        <div class="stat dash-stat" data-filter="allow"><div class="stat-num" id="s-a" style="color:#10b981">-</div><div class="stat-lbl">Allowed</div><div class="stat-hint">CLICK TO VIEW</div></div>
        <div class="stat dash-stat" data-filter="bypassed"><div class="stat-num" id="s-bp" style="color:#a78bfa">-</div><div class="stat-lbl">Bypassed</div><div class="stat-hint">CLICK TO VIEW</div></div>
        <div class="stat"><div class="stat-num" id="s-u" style="color:#34d399">-</div><div class="stat-lbl">Active Users</div></div>
      </div>
      <div class="card"><div class="card-title">Category Breakdown (Today)</div><div id="dash-cat-chart"><div style="color:#475569;font-size:12px">Loading...</div></div></div>
      <div class="card"><div class="card-title">Recent Activity</div>
        <div class="tbl-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Domain</th><th>Activity</th><th>Action</th><th>Policy</th></tr></thead>
        <tbody id="dash-tb"><tr><td colspan="6" class="loading">Loading...</td></tr></tbody></table></div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initDashboard();
loadDash();
