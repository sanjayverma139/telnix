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
        <div class="toolbar-search compact">
          <span class="toolbar-search-icon">Search</span>
          <input type="text" id="cat-policy-search" class="toolbar-search-input" placeholder="Search categories...">
        </div>
        <span id="cat-policy-count" class="soft-count"></span>
      </div>
      <div id="cat-policy-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>
    </div>
  `,
});

await bootstrapProtectedPage();
initCategoryPolicies();
renderCategoryPolicies();
