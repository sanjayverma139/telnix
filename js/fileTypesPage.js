import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initUrlLists } from './urllists.js';
import { initFileTypes, renderFT } from './filetypes.js';

renderAppShell({
  activeKey: 'filetypes',
  content: `
    <div class="page active" id="page-filetypes">
      <div class="page-header">
        <div><div class="page-title">File Type Lists</div><div class="page-sub">Extension groups for download policies</div></div>
        <button class="btn btn-primary btn-sm" id="btn-new-filetype">+ New File Type List</button>
      </div>
      <div id="ft-con"><div class="loading">Loading...</div></div>
    </div>
  `,
  extraMarkup: `
    <div class="modal-bg" id="list-modal">
      <div class="modal">
        <div class="modal-title" id="lm-title">New List</div>
        <div class="alert" id="lm-al"></div>
        <div class="grid2"><div><label>Name *</label><input type="text" id="lm-name" placeholder="My List"></div><div><label>Description</label><input type="text" id="lm-desc"></div></div>
        <label id="lm-lbl">Extensions (one per line)</label>
        <textarea id="lm-con" rows="8" placeholder=".exe&#10;.msi"></textarea>
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
initFileTypes();
renderFT();
