import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initNoise } from './noise.js';

renderAppShell({
  activeKey: 'noise',
  content: `
    <div class="page active" id="page-noise">
      <div class="page-header">
        <div><div class="page-title">Noise Filter</div><div class="page-sub">Domains added here will be ignored by the XHR interceptor.</div></div>
        <button class="btn btn-success btn-sm" id="btn-push-noise">Push to Users</button>
      </div>
      <div class="alert" id="noise-alert"></div>
      <div class="card">
        <div class="card-title">Add Domain to Noise Filter</div>
        <div style="display:flex;gap:10px;align-items:flex-end">
          <div style="flex:1">
            <label>Domain</label>
            <input type="text" id="noise-input" placeholder="example.com" style="margin:0">
          </div>
          <button class="btn btn-primary" onclick="window._addNoise()" style="margin-bottom:0;flex-shrink:0">+ Add</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Custom Noise Domains <span id="noise-count" style="font-size:11px;color:#64748b;font-weight:400"></span></div>
        <div id="noise-list"><div class="loading">No custom domains added yet</div></div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initNoise();
window._renderNoise?.();
