import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initCategoryPolicies, renderCategoryPolicies } from './categoryPolicies.js';

renderAppShell({
  activeKey: 'categoryPolicies',
  content: `
    <div class="page active" id="page-categoryPolicies">
      <div class="page-header">
        <div><div class="page-title">Category Rules</div><div class="page-sub">Set default actions for auto-detected site categories.</div></div>
        <button class="btn btn-success btn-sm" id="btn-save-cat-policies">Save & Push to Users</button>
      </div>
      <div class="alert" id="cat-policy-alert"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:6px;background:#060d1a;border:1px solid rgba(99,102,241,.3);border-radius:8px;padding:6px 10px;flex:1">
          <span style="color:#64748b;font-size:13px">Search</span>
          <input type="text" id="cat-policy-search" placeholder="Search categories..." style="background:transparent;border:none;outline:none;color:#e2e8f0;font-size:12px;width:100%;margin:0">
        </div>
        <span id="cat-policy-count" style="font-size:12px;color:#64748b;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:5px 14px;white-space:nowrap"></span>
      </div>
      <div id="cat-policy-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>
    </div>
  `,
});

await bootstrapProtectedPage();
initCategoryPolicies();
renderCategoryPolicies();
