import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initPolicies, renderPols } from './policies.js';

renderAppShell({
  activeKey: 'policies',
  content: `
    <div class="page active" id="page-policies">
      <div class="page-header">
        <div>
          <div class="page-title">Policies</div>
          <div class="page-sub">Evaluated top-to-bottom through groups, then policies within each group. First match wins.</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div id="pending-bar" style="display:none;align-items:center;gap:8px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:7px 14px;font-size:12px;color:#fbbf24">
            <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;animation:pulse 1.5s ease-in-out infinite"></span>
            <span id="pending-count">0 pending changes</span>
            <button id="btn-apply-changes" style="background:#f59e0b;border:none;color:#000;border-radius:7px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer">Apply</button>
            <button id="btn-discard-changes" style="background:transparent;border:1px solid rgba(245,158,11,.3);color:#f59e0b;border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">Discard</button>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-new-group">New Group</button>
          <button class="btn btn-primary btn-sm" id="btn-new-policy">+ New Policy</button>
          <select id="def-action" title="Default Action" style="width:auto;margin:0;padding:6px 12px;border-color:rgba(99,102,241,.3)"><option value="allow">ALLOW</option><option value="warn">WARN</option><option value="block">BLOCK</option></select>
          <button class="btn btn-success btn-sm" id="push-btn">Push to Users</button>
        </div>
      </div>
      <div class="alert" id="pol-al"></div>
      <div id="pol-stat-chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <div class="toolbar-search">
          <span class="toolbar-search-icon" style="font-size:14px">Search</span>
          <input type="text" id="pol-search" class="toolbar-search-input policy" placeholder="Search policy name...">
        </div>
        <button id="btn-pol-filter" class="btn btn-ghost btn-sm" style="white-space:nowrap">ADD FILTER</button>
        <button id="btn-pol-clear-filter" class="btn btn-sm" style="background:transparent;border:1px solid rgba(255,255,255,.08);color:#64748b;white-space:nowrap">Clear</button>
        <span id="pol-match-count" style="display:none;font-size:12px;color:#a5b4fc;white-space:nowrap"></span>
      </div>
      <div id="pol-filter-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;min-height:0"></div>
      <div class="policy-board-shell">
        <div id="pol-con"><div class="loading">Loading...</div></div>
      </div>
    </div>
  `,
  extraMarkup: `
    <div class="modal-bg" id="pol-modal">
      <div class="modal">
        <div class="modal-title">Policy <span id="pm-title">New Policy</span></div>
        <div class="alert" id="pm-al"></div>
        <div style="margin-bottom:14px">
          <label>Policy Name *</label><input type="text" id="pm-name" placeholder="e.g. Block Social Media" style="margin:0">
        </div>
        <div class="policy-source-panel">
          <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Source <span style="color:#374151;font-weight:400;text-transform:none;letter-spacing:0">(who this policy applies to - leave empty for everyone)</span></div>
          <div style="margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <span style="font-size:12px;color:#94a3b8;font-weight:600;width:52px;flex-shrink:0">User =</span>
              <div id="pm-source-users-wrap" style="flex:1"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:#94a3b8;font-weight:600;width:52px;flex-shrink:0">Group =</span>
              <div id="pm-source-groups-wrap" style="flex:1"></div>
            </div>
          </div>
        </div>
        <label>Policy Type</label>
        <div class="type-cards">
          <div class="pm-type-card sel" data-t="domain"><div class="type-card-icon">&#127760;</div><div class="type-card-name">Domain</div><div class="type-card-sub">Specific domains</div></div>
          <div class="pm-type-card" data-t="category"><div class="type-card-icon">&#128193;</div><div class="type-card-name">Category</div><div class="type-card-sub">Content category</div></div>
          <div class="pm-type-card" data-t="list"><div class="type-card-icon">&#128203;</div><div class="type-card-name">URL List</div><div class="type-card-sub">Custom list</div></div>
          <div class="pm-type-card" data-t="threat"><div class="type-card-icon">&#9889;</div><div class="type-card-name">Threat Score</div><div class="type-card-sub">Heuristic risk</div></div>
          <div class="pm-type-card" data-t="reputation"><div class="type-card-icon">&#129504;</div><div class="type-card-name">Known Malicious</div><div class="type-card-sub">Reputation DB</div></div>
        </div>
        <div id="crit-domain">
          <label>Domains (one per line)</label>
          <textarea id="pm-doms" placeholder="facebook.com&#10;instagram.com&#10;tiktok.com"></textarea>
        </div>
        <div id="crit-category" class="hid">
          <label>Select Categories</label>
          <div id="pm-cat-wrap" style="margin-bottom:14px"></div>
        </div>
        <div id="crit-list" class="hid">
          <label>Select URL Lists</label>
          <div id="pm-list-wrap" style="margin-bottom:14px"></div>
        </div>
        <div id="crit-threat" class="hid">
          <div class="grid2">
            <div><label>Operator</label><select id="pm-sop" style="margin:0"><option value="gte">>= at least</option><option value="gt">> more than</option></select></div>
            <div><label>Threshold (0-100)</label><input type="number" id="pm-sthr" value="55" min="0" max="100" style="margin:0"></div>
          </div>
        </div>
        <div id="crit-reputation" class="hid">
          <div style="background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:12px;font-size:12px;color:#fbbf24;margin-bottom:14px">
            Blocks URLs confirmed malicious by URLhaus or Google Safe Browsing reputation database.
          </div>
        </div>
        <label>Action</label>
        <div class="action-btns">
          <button class="abtn sel-block" data-a="block">Block</button>
          <button class="abtn" data-a="warn">Warn</button>
          <button class="abtn" data-a="allow">Allow</button>
        </div>
        <label>Activity</label>
        <div class="act-btns">
          <button class="abtn sel-act" data-v="browse">Browse</button>
          <button class="abtn" data-v="download">Download</button>
          <button class="abtn" data-v="upload">Upload</button>
          <button class="abtn" data-v="all">Both</button>
        </div>
        <div id="pm-ftrow" class="hid"><label>File Type List (blank = all)</label><select id="pm-ftl" style="margin-bottom:14px"></select></div>
        <div class="policy-schedule-panel">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <input type="checkbox" id="pm-sched-enabled" style="width:16px;height:16px;accent-color:#6366f1;margin:0">
            <label style="text-transform:none;letter-spacing:0;font-size:13px;color:#e2e8f0;margin:0">Enable Schedule</label>
          </div>
          <div id="pm-sched-fields" style="display:none">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
              <div class="pm-day-btn" data-day="Mon">Mon</div><div class="pm-day-btn" data-day="Tue">Tue</div><div class="pm-day-btn" data-day="Wed">Wed</div><div class="pm-day-btn" data-day="Thu">Thu</div><div class="pm-day-btn" data-day="Fri">Fri</div><div class="pm-day-btn" data-day="Sat">Sat</div><div class="pm-day-btn" data-day="Sun">Sun</div>
            </div>
            <div class="grid2">
              <div><label>Start Time</label><input type="time" id="pm-sched-start" value="09:00" style="margin:0"></div>
              <div><label>End Time</label><input type="time" id="pm-sched-end" value="17:00" style="margin:0"></div>
            </div>
            <div style="margin-top:10px"><label>Outside Schedule Action</label>
              <select id="pm-sched-outside" style="margin:0"><option value="allow">Allow</option><option value="warn">Warn</option><option value="block">Block</option></select>
            </div>
          </div>
        </div>
        <label>Note (shown to user on block/warn page)</label>
        <input type="text" id="pm-note" placeholder="Optional explanation for the user" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:12px;color:#94a3b8">Enabled</span>
          <button class="toggle on" id="pm-en" onclick="this.classList.toggle('on')"></button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-cancel-pol">Cancel</button>
          <button class="btn btn-primary" id="btn-save-pol">Save Policy</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="grp-modal">
      <div class="modal modal-sm">
        <div class="modal-title">New Group</div>
        <label>Group Name *</label>
        <input type="text" id="gm-name" placeholder="e.g. Threat Protection">
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-cancel-grp">Cancel</button>
          <button class="btn btn-primary" id="btn-save-grp">Create Group</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="move-to-group-modal">
      <div class="modal modal-sm">
        <div class="modal-title">Move Policy to Group</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:16px">
          Moving: <strong style="color:#e2e8f0" id="mtg-pol-name"></strong>
        </div>
        <label>Target Group *</label>
        <select id="mtg-grp-select" style="margin-bottom:20px"></select>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-cancel-mtg">Cancel</button>
          <button class="btn btn-primary" id="btn-save-mtg">Move Policy</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="discard-confirm-modal">
      <div class="modal modal-sm">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:36px;margin-bottom:12px">Delete</div>
          <div class="modal-title" style="justify-content:center">Discard All Pending Changes?</div>
          <p style="font-size:13px;color:#94a3b8;margin-top:8px">
            All <strong style="color:#fbbf24">NOT APPLIED</strong> policies will be permanently removed.<br>
            <span style="color:#64748b;font-size:12px">Your live policies will not be affected.</span>
          </p>
        </div>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-ghost" id="btn-discard-cancel" style="min-width:100px">Cancel</button>
          <button class="btn btn-danger" id="btn-discard-confirm" style="min-width:140px">Discard All</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="place-modal">
      <div class="modal modal-sm">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <span style="font-size:20px">Place</span>
          <div>
            <div class="modal-title" style="margin:0">Place Policy</div>
            <div style="font-size:12px;color:#64748b">Choose where <strong style="color:#e2e8f0" id="place-pol-name"></strong> should appear</div>
          </div>
        </div>
        <label>Group</label>
        <select id="place-grp-select" style="margin-bottom:16px"></select>
        <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Position in Group</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          <div class="place-opt" data-pos="top" style="padding:12px 16px;border-radius:10px;border:1.5px solid rgba(255,255,255,.08);cursor:pointer;transition:.1s"><div style="font-size:13px;font-weight:600;color:#e2e8f0">Top of Group</div><div style="font-size:11px;color:#475569">First in group - highest priority</div></div>
          <div class="place-opt sel" data-pos="bottom" style="padding:12px 16px;border-radius:10px;border:1.5px solid rgba(99,102,241,.5);background:rgba(99,102,241,.08);cursor:pointer;transition:.1s"><div style="font-size:13px;font-weight:600;color:#a5b4fc">Bottom of Group (default)</div><div style="font-size:11px;color:#475569">Last in group</div></div>
          <div class="place-opt" data-pos="after" style="padding:12px 16px;border-radius:10px;border:1.5px solid rgba(255,255,255,.08);cursor:pointer;transition:.1s"><div style="font-size:13px;font-weight:600;color:#e2e8f0">After a Policy</div><div style="font-size:11px;color:#475569">Place directly after</div></div>
          <div class="place-opt" data-pos="before" style="padding:12px 16px;border-radius:10px;border:1.5px solid rgba(255,255,255,.08);cursor:pointer;transition:.1s"><div style="font-size:13px;font-weight:600;color:#e2e8f0">Before a Policy</div><div style="font-size:11px;color:#475569">Place directly before</div></div>
        </div>
        <div id="place-ref-row" style="display:none;margin-bottom:14px">
          <label>Reference Policy</label>
          <select id="place-ref-select" style="margin:0"></select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-place-cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-place-add">Add to Group</button>
        </div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});
initPolicies();
renderPols();
