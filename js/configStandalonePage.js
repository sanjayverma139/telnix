import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initConfigPage, loadConfigPage } from './configPage.js';

renderAppShell({
  activeKey: 'config',
  content: `
    <div class="page active" id="page-config">
      <div class="page-header">
        <div><div class="page-title">Configuration</div><div class="page-sub">Agent settings synced to all extension users via Supabase</div></div>
        <button class="btn btn-success btn-sm" id="btn-save-config">Save & Push to All Agents</button>
      </div>
      <div class="alert" id="cfg-alert"></div>
      <div class="card"><div class="card-title">Agent Settings</div>
        <div class="grid2">
          <div><label>Agent ID <span style="color:#475569;font-weight:400;text-transform:none">(optional identifier)</span></label><input type="text" id="cfg-agent-id" placeholder="e.g. AGENT-NYC-01"></div>
          <div><label>Timezone</label><input type="text" id="cfg-timezone" placeholder="e.g. Asia/Kolkata"></div>
          <div>
            <label>Google Safe Browsing API Key <span style="color:#475569;font-weight:400;text-transform:none">(optional - enables live malware/phishing detection)</span></label>
            <input type="password" id="cfg-gsb-key" placeholder="AIza...">
            <div style="font-size:10px;color:#475569;margin-top:-8px;margin-bottom:8px">Get a free key at <a href="https://console.cloud.google.com" target="_blank" style="color:#818cf8">console.cloud.google.com</a> -> Enable Safe Browsing API</div>
          </div>
          <div>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="cfg-urlhaus-enabled" checked style="width:auto;margin:0">
              <span>Enable URLhaus Reputation Check <span style="color:#475569;font-weight:400;text-transform:none">(recommended)</span></span>
            </label>
            <div style="font-size:10px;color:#475569;margin-top:6px;margin-bottom:8px">URLhaus now requires an Auth-Key. Add it here so the extension can check URLhaus in parallel with Google Safe Browsing.</div>
            <input type="password" id="cfg-urlhaus-auth-key" placeholder="URLhaus Auth-Key">
            <input type="text" id="cfg-urlhaus-api-url" placeholder="https://urlhaus-api.abuse.ch/v1/url/">
          </div>
          <div><label>Bypass Mode</label>
            <select id="cfg-bypass-mode" style="margin:0">
              <option value="local">Local only (codes stored in extension)</option>
              <option value="remote">Remote (verify via API endpoint)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initConfigPage();
loadConfigPage();
