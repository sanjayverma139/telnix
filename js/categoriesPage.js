import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initCategories, renderCats } from './categories.js';

renderAppShell({
  activeKey: 'categories',
  content: `
    <div class="page active" id="page-categories">
      <div class="page-header">
        <div><div class="page-title">Custom Categories</div><div class="page-sub">Combine URL lists, predefined categories, and exclusions into reusable groups</div></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div id="cc-pending-bar" style="display:none;align-items:center;gap:8px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:7px 14px;font-size:12px;color:#fbbf24">
            <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;animation:pulse 1.5s ease-in-out infinite"></span>
            <span id="cc-pending-count">0 pending changes</span>
            <button id="btn-cc-apply" style="background:#f59e0b;border:none;color:#000;border-radius:7px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer">Apply</button>
            <button id="btn-cc-discard" style="background:transparent;border:1px solid rgba(245,158,11,.3);color:#f59e0b;border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">Discard</button>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-cc">+ New Category</button>
        </div>
      </div>
      <div class="alert" id="cc-alert"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:6px;background:#060d1a;border:1px solid rgba(99,102,241,.3);border-radius:8px;padding:6px 10px;flex:1">
          <span style="color:#64748b">Search</span>
          <input type="text" id="cat-search" placeholder="Search..." style="background:transparent;border:none;outline:none;color:#e2e8f0;font-size:12px;width:100%;margin:0">
        </div>
        <span id="custom-cat-count" style="font-size:12px;color:#64748b;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:5px 14px;white-space:nowrap"></span>
      </div>
      <div id="cat-con"><div class="loading">Loading...</div></div>
    </div>
  `,
  extraMarkup: `
    <div class="modal-bg" id="cc-modal">
      <div class="modal">
        <div class="modal-title" id="cc-modal-title">New Custom Category</div>
        <div class="alert" id="cc-al"></div>
        <div class="grid2" style="margin-bottom:16px">
          <div><label>Name *</label><input type="text" id="cc-name" placeholder="e.g. Blocked Entertainment" style="margin:0"></div>
          <div><label>Description</label><input type="text" id="cc-desc" placeholder="Optional" style="margin:0"></div>
        </div>
        <div style="margin-bottom:14px"><label>Predefined Categories</label><div id="cc-pred-cats-wrap"></div></div>
        <div style="margin-bottom:14px"><label>URL Lists (Included)</label><div id="cc-url-lists-wrap"></div></div>
        <div style="margin-bottom:14px"><label>Domains (one per line, optional)</label><textarea id="cc-domains" rows="3" placeholder="domain1.com&#10;domain2.com"></textarea></div>
        <div style="background:#0a1120;border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:14px;margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">Exclusions</div>
          <label style="color:#94a3b8;font-size:10px;margin-bottom:6px">Exclude URL Lists</label>
          <div id="cc-excl-lists-wrap" style="margin-bottom:12px"></div>
          <label style="color:#94a3b8;font-size:10px;margin-bottom:6px">Exclude Specific Domains</label>
          <textarea id="cc-excl-urls" rows="2" placeholder="e.g. allowedsite.com" style="margin:0"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-cancel-cc">Cancel</button>
          <button class="btn btn-primary" id="btn-save-cc">Save Category</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="del-confirm-modal">
      <div class="modal modal-sm">
        <div class="modal-title" style="color:#f87171">Delete <span id="del-modal-type"></span>?</div>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:20px">
          You are about to delete <strong style="color:#e2e8f0" id="del-modal-name"></strong>.
        </p>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-del-cancel">Cancel</button>
          <button class="btn btn-danger" id="btn-del-confirm">Stage Delete</button>
        </div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
document.querySelectorAll('.modal-bg').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));
initCategories();
renderCats();
