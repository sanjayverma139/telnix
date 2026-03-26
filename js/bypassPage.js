import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initBypass, loadBypass } from './bypass.js';

renderAppShell({
  activeKey: 'bypass',
  content: `
    <div class="page active" id="page-bypass">
      <div class="page-header"><div><div class="page-title">Bypass Codes</div><div class="page-sub">Time-limited codes that let users pass through a block</div></div></div>
      <div class="card"><div class="card-title">Create Bypass Code</div>
        <div class="alert" id="bp-al"></div>
        <div class="grid2">
          <div><label>Code (blank = auto)</label><input type="text" id="bp-code" placeholder="BYPASS-ABC123" style="text-transform:uppercase"></div>
          <div><label>Duration (minutes)</label><input type="number" id="bp-dur" value="30" min="1"></div>
          <div><label>Domain (blank = all)</label><input type="text" id="bp-dom" placeholder="youtube.com"></div>
          <div><label>Activity</label><select id="bp-activity"><option value="all">All activities</option><option value="browse">Browse only</option><option value="download">Download only</option><option value="upload">Upload only</option></select></div>
          <div><label>Label / Reason</label><input type="text" id="bp-lbl" placeholder="Who requested this"></div>
        </div>
        <button class="btn btn-primary" id="btn-create-bypass">+ Create Code</button>
      </div>
      <div class="card"><div class="card-title">Active Codes</div>
        <div class="tbl-wrap"><table><thead><tr><th>Code</th><th>Domain</th><th>Activity</th><th>Duration</th><th>Label</th><th>Expires</th><th></th></tr></thead>
        <tbody id="bp-tb"><tr><td colspan="7" class="loading">No codes</td></tr></tbody></table></div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initBypass();
loadBypass();
