import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initUserGroups, loadUserGroups } from './usergroups.js';

renderAppShell({
  activeKey: 'usergroups',
  content: `
    <div class="page active" id="page-usergroups">
      <div class="page-header">
        <div><div class="page-title">User Groups</div><div class="page-sub">Create groups and assign members.</div></div>
        <button class="btn btn-primary btn-sm" id="btn-new-ug">+ New Group</button>
      </div>
      <div class="alert" id="ug-list-alert"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <input type="text" id="ug-search" placeholder="Search groups..." style="flex:1;margin:0">
        <span id="ug-count" style="font-size:12px;color:#64748b;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:5px 14px;white-space:nowrap"></span>
      </div>
      <div id="ug-con"><div class="loading">Loading...</div></div>
    </div>
  `,
  extraMarkup: `
    <div class="modal-bg" id="ug-modal">
      <div class="modal">
        <div class="modal-title" id="ug-modal-title">New Group</div>
        <div class="alert" id="ug-al"></div>
        <label>Group Name *</label>
        <input type="text" id="ug-group-name" placeholder="e.g. Engineering, HR, Marketing" style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Members</div>
        <div id="ug-member-chips" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#060d1a;border:1px solid rgba(255,255,255,.06);border-radius:8px;min-height:36px;margin-bottom:8px"></div>
        <input type="text" id="ug-member-search" placeholder="Search users or type email + Enter to add manually..." style="margin-bottom:4px">
        <div id="ug-member-dd" style="background:#060d1a;border:1px solid rgba(99,102,241,.2);border-radius:8px;max-height:200px;overflow-y:auto;margin-bottom:14px"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-ug-cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-ug-save">Save Group</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="ug-del-modal">
      <div class="modal modal-sm">
        <div class="modal-title" style="color:#f87171">Delete Group?</div>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:20px">
          Delete group "<strong style="color:#e2e8f0" id="ug-del-name"></strong>"?
        </p>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-ug-del-cancel">Cancel</button>
          <button class="btn btn-danger" id="btn-ug-del-confirm">Delete Group</button>
        </div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
document.querySelectorAll('.modal-bg').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));
initUserGroups();
loadUserGroups();
