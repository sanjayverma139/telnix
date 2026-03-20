// ─────────────────────────────────────────────────────────────────────────────
// filetypes.js — File Type Lists page
// ─────────────────────────────────────────────────────────────────────────────

import { D }                            from './state.js';
import { $, esc }                       from './utils.js';
import { openListModal }                from './urllists.js';

export function renderFT() {
  const c = $('ft-con');
  if (!D.fileTypeLists.length) {
    c.innerHTML = '<div class="loading">No file type lists — click + New File Type List.</div>';
    return;
  }
  c.innerHTML = D.fileTypeLists.map(l => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(l.name)}</div></div>
        <span style="background:rgba(167,139,250,.12);color:#a78bfa;border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700">${(l.extensions || []).length} extensions</span>
        <button class="btn btn-sm btn-ghost" onclick="window._openListModal('ft','${l.id}')">✏ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="window._delList('ft','${l.id}')">✕</button>
      </div>
      <div style="font-size:11px;color:#c7d2fe;font-family:monospace">
        ${(l.extensions || []).slice(0, 12).join('  ')}
        ${(l.extensions || []).length > 12 ? ` +${(l.extensions || []).length - 12} more` : ''}
      </div>
    </div>`).join('');
}

export function initFileTypes() {
  $('btn-new-filetype')?.addEventListener('click', () => openListModal('ft'));
}
