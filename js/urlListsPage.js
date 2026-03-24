import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initUrlLists, renderUL } from './urllists.js';

renderAppShell({
  activeKey: 'urllists',
  content: `
    <div class="page active" id="page-urllists">
      <div class="page-header">
        <div><div class="page-title">URL Lists</div><div class="page-sub">Named domain lists referenced in policies</div></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div id="ul-pending-bar" style="display:none;align-items:center;gap:8px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:7px 14px;font-size:12px;color:#fbbf24">
            <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;animation:pulse 1.5s ease-in-out infinite"></span>
            <span id="ul-pending-count">0 pending changes</span>
            <button id="btn-ul-apply" style="background:#f59e0b;border:none;color:#000;border-radius:7px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer">Apply</button>
            <button id="btn-ul-discard" style="background:transparent;border:1px solid rgba(245,158,11,.3);color:#f59e0b;border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">Discard</button>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-urllist">+ New URL List</button>
        </div>
      </div>
      <div class="alert" id="ul-alert"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <input type="text" id="ul-search" placeholder="Search URL lists..." style="flex:1;margin:0">
        <span id="ul-count" style="font-size:12px;color:#64748b;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:5px 14px;white-space:nowrap"></span>
      </div>
      <div id="ul-con"><div class="loading">Loading...</div></div>
    </div>
  `,
  extraMarkup: `
    <div class="modal-bg" id="list-modal">
      <div class="modal">
        <div class="modal-title" id="lm-title">New List</div>
        <div class="alert" id="lm-al"></div>
        <div class="grid2"><div><label>Name *</label><input type="text" id="lm-name" placeholder="My List"></div><div><label>Description</label><input type="text" id="lm-desc"></div></div>
        <label id="lm-lbl">Domains (one per line)</label>
        <textarea id="lm-con" rows="8" placeholder="facebook.com&#10;twitter.com"></textarea>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-cancel-list">Cancel</button>
          <button class="btn btn-primary" id="btn-save-list">Save</button>
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
initUrlLists();
renderUL();
