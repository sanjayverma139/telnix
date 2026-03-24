import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initTester, populateTesterGroups } from './tester.js';

renderAppShell({
  activeKey: 'urltester',
  content: `
    <div class="page active" id="page-urltester">
      <div class="page-header"><div><div class="page-title">URL Tester</div><div class="page-sub">Test a URL against current policies.</div></div></div>
      <div class="card">
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <input type="text" id="tu-url" placeholder="https://youtube.com" style="margin:0;flex:1">
          <button class="btn btn-primary" id="btn-test-url">Test URL</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px">
          <div>
            <label style="display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">User Email (optional)</label>
            <input type="text" id="tu-user" placeholder="sanjay@gmail.com" style="margin:0">
          </div>
          <div>
            <label style="display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Group (optional)</label>
            <select id="tu-group" style="margin:0">
              <option value="">- All groups (no filter) -</option>
            </select>
          </div>
        </div>
        <div style="font-size:11px;color:#475569;margin-bottom:14px">Leave both blank to test global policy.</div>
        <div id="tu-res" style="margin-top:4px"></div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initTester();
populateTesterGroups();
