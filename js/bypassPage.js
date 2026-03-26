import { bootstrapProtectedPage }              from './auth.js';
import { renderAppShell }                      from './appShell.js';
import { initBypass, loadBypass, loadBypassUserOptions } from './bypass.js';

renderAppShell({
  activeKey: 'bypass',
  content: `
    <div class="page active" id="page-bypass">
      <div class="page-header">
        <div>
          <div class="page-title">Bypass Codes</div>
          <div class="page-sub">
            Time-limited codes that let users pass through a block.
            Discard a code to revoke it immediately — the extension enforces the change on its next sync (within&nbsp;1&nbsp;min).
          </div>
        </div>
      </div>

      <!-- Create form -->
      <div class="card">
        <div class="card-title">Create Bypass Code</div>
        <div class="alert" id="bp-al"></div>
        <div class="grid2">
          <div>
            <label>Code <span style="color:#64748b;font-weight:400;font-size:11px">(blank = auto-generate)</span></label>
            <input type="text" id="bp-code" placeholder="BYPASS-ABC123" style="text-transform:uppercase">
          </div>
          <div>
            <label>Duration (minutes)</label>
            <input type="number" id="bp-dur" value="30" min="1">
          </div>
          <div>
            <label>Domain <span style="color:#64748b;font-weight:400;font-size:11px">(blank = all sites)</span></label>
            <input type="text" id="bp-dom" placeholder="youtube.com">
          </div>
          <div>
            <label>Activity</label>
            <select id="bp-activity">
              <option value="all">All activities</option>
              <option value="browse">Browse only</option>
              <option value="download">Download only</option>
              <option value="upload">Upload only</option>
            </select>
          </div>
          <div>
            <label>Label / Reason</label>
            <input type="text" id="bp-lbl" placeholder="Who requested this">
          </div>
          <div>
            <label>Restrict to User <span style="color:#64748b;font-weight:400;font-size:11px">(blank = any user)</span></label>
            <select id="bp-user">
              <option value="">— Any user (shared code) —</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-create-bypass">+ Create Code</button>
      </div>

      <!-- Active + history table -->
      <div class="card">
        <div class="card-title">Bypass Code History</div>
        <div class="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>User</th>
                <th>Domain</th>
                <th>Activity</th>
                <th>Duration</th>
                <th>Label</th>
                <th>Expiry / Discarded</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="bp-tb">
              <tr><td colspan="9" class="loading">Loading...</td></tr>
            </tbody>
          </table>
        </div>
        <div style="font-size:11px;color:#475569;margin-top:10px;padding:0 4px">
          ⓘ Expired and discarded codes are retained for audit purposes and automatically removed after 45 days.
        </div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initBypass();
await loadBypassUserOptions();
loadBypass();
