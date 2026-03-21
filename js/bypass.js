// ─────────────────────────────────────────────────────────────────────────────
// bypass.js — Bypass Codes page
// ─────────────────────────────────────────────────────────────────────────────

import { D }                        from './state.js';
import { $, esc, fmtF, showAlert }  from './utils.js';

export function loadBypass() {
  const tokens = D.bypassTokens || [];
  $('bp-tb').innerHTML = tokens.map(b => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:#a5b4fc">${esc(b.token)}</td>
      <td>${esc(b.domain || 'All sites')}</td>
      <td>${b.durationMs ? Math.round(b.durationMs / 60000) + ' min' : '—'}</td>
      <td style="color:#64748b">${esc(b.label || '—')}</td>
      <td style="font-size:11px;color:#64748b">${b.expiresAt ? fmtF(b.expiresAt) : '—'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="window._delBypass('${esc(b.token)}')">✕</button></td>
    </tr>`
  ).join('') || '<tr><td colspan="6" class="loading">No bypass codes</td></tr>';
}

export function createBypass() {
  let tok = ($('bp-code')?.value || '').trim().toUpperCase() ||
    'BYPASS-' + Math.random().toString(36).slice(2,6).toUpperCase() +
                Math.random().toString(36).slice(2,6).toUpperCase();
  const dur = parseInt($('bp-dur')?.value || '30');
  D.bypassTokens = D.bypassTokens || [];
  const domain = $('bp-dom')?.value.trim() || null;
  D.bypassTokens.push({
    token:      tok,
    mode:       domain ? 'domain_timed' : 'timed',
    domain:     domain,
    durationMs: dur * 60000,
    label:      $('bp-lbl')?.value.trim() || '',
    createdAt:  Date.now(),
    expiresAt:  Date.now() + dur * 60000,
  });
  showAlert('bp-al', 'success', `✓ Code: ${tok} — remember to Push to Users to deploy it`);
  if ($('bp-code')) $('bp-code').value = '';
  if ($('bp-lbl'))  $('bp-lbl').value  = '';
  loadBypass();
}

function delBypass(token) {
  D.bypassTokens = (D.bypassTokens || []).filter(b => b.token !== token);
  loadBypass();
}

export function initBypass() {
  $('btn-create-bypass')?.addEventListener('click', createBypass);
  window._delBypass = delBypass;
}
