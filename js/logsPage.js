import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initLogs } from './logs.js';

renderAppShell({
  activeKey: 'logs',
  content: `
    <div class="page active" id="page-logs">
      <div class="page-header">
        <div><div class="page-title">Activity Logs</div><div class="page-sub">All user browsing and download activity</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" id="btn-logs-refresh">Refresh</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div class="toolbar-search compact" style="max-width:25%">
          <span class="toolbar-search-icon">Search</span>
          <input type="text" id="log-search" class="toolbar-search-input" placeholder="Search domain, user, URL...">
        </div>
        <button class="btn btn-success btn-sm" id="btn-export-csv" style="margin-left:auto">Export CSV</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;position:relative">
        <div class="log-filter-btn-wrap" style="position:relative">
          <button class="log-filter-btn" id="fbtn-action" onclick="window._toggleFilterPanel('action')">Action <span id="fbtn-action-count"></span> v</button>
          <div class="filter-panel" id="fpanel-action">
            <div class="fp-title">Action</div>
            <label class="fp-opt"><input type="checkbox" value="block"> Block</label>
            <label class="fp-opt"><input type="checkbox" value="warn"> Warn</label>
            <label class="fp-opt"><input type="checkbox" value="allow"> Allow</label>
            <button class="fp-apply" onclick="window._applyFilter('action')">Apply</button>
          </div>
        </div>
        <div class="log-filter-btn-wrap" style="position:relative">
          <button class="log-filter-btn" id="fbtn-user" onclick="window._toggleFilterPanel('user')">User <span id="fbtn-user-count"></span> v</button>
          <div class="filter-panel" id="fpanel-user" style="width:260px">
            <div class="fp-title">User Email</div>
            <input type="text" id="fp-user-search" placeholder="Search users..." style="margin-bottom:8px;font-size:12px;padding:7px 10px" oninput="window._filterUserOptions(this.value)">
            <div id="fp-user-list" style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
              <div style="font-size:11px;color:#475569;padding:4px 0">Loading users...</div>
            </div>
            <button class="fp-apply" onclick="window._applyFilter('user')">Apply</button>
          </div>
        </div>
        <div class="log-filter-btn-wrap" style="position:relative">
          <button class="log-filter-btn" id="fbtn-threat" onclick="window._toggleFilterPanel('threat')">Threat <span id="fbtn-threat-count"></span> v</button>
          <div class="filter-panel" id="fpanel-threat">
            <div class="fp-title">Threat Level</div>
            <label class="fp-opt"><input type="checkbox" value="malicious"> Known Malicious</label>
            <label class="fp-opt"><input type="checkbox" value="high"> High Risk (>=55)</label>
            <label class="fp-opt"><input type="checkbox" value="medium"> Medium Risk (30-54)</label>
            <button class="fp-apply" onclick="window._applyFilter('threat')">Apply</button>
          </div>
        </div>
        <div class="log-filter-btn-wrap" style="position:relative">
          <button class="log-filter-btn" id="fbtn-activity" onclick="window._toggleFilterPanel('activity')">Activity <span id="fbtn-activity-count"></span> v</button>
          <div class="filter-panel" id="fpanel-activity">
            <div class="fp-title">Activity Type</div>
            <label class="fp-opt"><input type="checkbox" value="browse"> Browse</label>
            <label class="fp-opt"><input type="checkbox" value="download"> Download</label>
            <label class="fp-opt"><input type="checkbox" value="warn"> Warn Proceeded</label>
            <button class="fp-apply" onclick="window._applyFilter('activity')">Apply</button>
          </div>
        </div>
        <div class="log-filter-btn-wrap" style="position:relative;margin-left:auto">
          <button class="log-filter-btn" id="fbtn-date" onclick="window._toggleFilterPanel('date')" style="background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.3);color:#10b981">Date Range <span id="fbtn-date-label"></span> v</button>
          <div class="filter-panel" id="fpanel-date" style="width:320px;right:0;left:auto">
            <div class="fp-title">Date Range</div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
              <label class="fp-opt fp-radio"><input type="radio" name="datepreset" value="today"> Today Only</label>
              <label class="fp-opt fp-radio"><input type="radio" name="datepreset" value="last7"> Last 7 Days</label>
              <label class="fp-opt fp-radio"><input type="radio" name="datepreset" value="last30"> Last 30 Days</label>
              <label class="fp-opt fp-radio"><input type="radio" name="datepreset" value="custom"> Custom Range</label>
            </div>
            <div id="custom-cal-wrap" style="display:none;border-top:1px solid rgba(255,255,255,.06);padding-top:10px">
              <div id="cal-container" style="margin-bottom:10px"></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div>
                  <div style="font-size:10px;color:#64748b;margin-bottom:4px">FROM TIME</div>
                  <input type="time" id="cal-from-time" value="00:00" style="font-size:11px;padding:5px 8px;margin:0;width:100%">
                </div>
                <div>
                  <div style="font-size:10px;color:#64748b;margin-bottom:4px">TO TIME</div>
                  <input type="time" id="cal-to-time" value="23:59" style="font-size:11px;padding:5px 8px;margin:0;width:100%">
                </div>
              </div>
              <div id="cal-range-display" style="font-size:11px;color:#a5b4fc;margin-top:8px;min-height:16px;text-align:center"></div>
            </div>
            <button class="fp-apply" onclick="window._applyFilter('date')">Apply</button>
          </div>
        </div>
      </div>
      <div id="log-filter-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;min-height:0"></div>
      <div style="display:none"><div id="log-filter-dd"></div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Domain / Path</th><th>Activity</th><th>Action</th><th>Category</th><th>Score</th><th>Policy</th><th></th></tr></thead>
      <tbody id="logs-tb"><tr><td colspan="9" class="loading">Loading...</td></tr></tbody></table></div>
      <div id="log-pagination"></div>
    </div>
  `,
  extraMarkup: `
    <div id="inv-overlay"></div>
    <div id="inv-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:#0b1120;z-index:2">
        <div style="font-size:14px;font-weight:800;color:#e2e8f0">Investigation Detail</div>
        <button id="inv-close" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#f87171;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:600">Close</button>
      </div>
      <div id="inv-content" style="padding:16px 20px"></div>
    </div>
  `,
});

await bootstrapProtectedPage();
initLogs();
