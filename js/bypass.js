import { D } from './state.js';
import { $, esc, fmtF, showAlert } from './utils.js';
import { saveData } from './api.js';

const ACTIVITY_LABELS = {
  all: 'All activities',
  browse: 'Browse',
  download: 'Download',
  upload: 'Upload',
};

function normalizeActivity(value) {
  const low = String(value || '').trim().toLowerCase();
  return ['browse', 'download', 'upload', 'all'].includes(low) ? low : 'all';
}

function makeToken() {
  return 'BYPASS-' + Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

function renderDuration(durationMs) {
  return durationMs ? Math.round(durationMs / 60000) + ' min' : '-';
}

export function loadBypass() {
  const tokens = [...(D.bypassTokens || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $('bp-tb').innerHTML = tokens.map(b => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:#a5b4fc">${esc(b.token)}</td>
      <td>${esc(b.domain || 'All sites')}</td>
      <td>${esc(ACTIVITY_LABELS[normalizeActivity(b.activity)] || ACTIVITY_LABELS.all)}</td>
      <td>${renderDuration(b.durationMs)}</td>
      <td style="color:#64748b">${esc(b.label || '-')}</td>
      <td style="font-size:11px;color:#64748b">${b.expiresAt ? fmtF(b.expiresAt) : '-'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="window._delBypass('${esc(b.token)}')">x</button></td>
    </tr>`
  ).join('') || '<tr><td colspan="7" class="loading">No bypass codes</td></tr>';
}

export async function createBypass() {
  const btn = $('btn-create-bypass');
  const token = ($('bp-code')?.value || '').trim().toUpperCase() || makeToken();
  const durationMinutes = Math.max(1, parseInt($('bp-dur')?.value || '30', 10) || 30);
  const now = Date.now();
  const next = {
    token,
    domain: $('bp-dom')?.value.trim().toLowerCase() || null,
    activity: normalizeActivity($('bp-activity')?.value || 'all'),
    mode: ($('bp-dom')?.value || '').trim() ? 'domain_timed' : 'timed',
    durationMs: durationMinutes * 60000,
    label: $('bp-lbl')?.value.trim() || '',
    createdAt: now,
    expiresAt: now + durationMinutes * 60000,
  };

  const previous = [...(D.bypassTokens || [])];
  D.bypassTokens = [...previous, next];
  loadBypass();

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  const ok = await saveData();
  if (!ok) {
    D.bypassTokens = previous;
    loadBypass();
    showAlert('bp-al', 'error', 'Save failed - bypass code was not stored in Supabase');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '+ Create Code';
    }
    return;
  }

  showAlert('bp-al', 'success', `Saved and synced code ${token}`);
  if ($('bp-code')) $('bp-code').value = '';
  if ($('bp-dom')) $('bp-dom').value = '';
  if ($('bp-lbl')) $('bp-lbl').value = '';
  if ($('bp-activity')) $('bp-activity').value = 'all';
  loadBypass();

  if (btn) {
    btn.disabled = false;
    btn.textContent = '+ Create Code';
  }
}

async function delBypass(token) {
  const previous = [...(D.bypassTokens || [])];
  D.bypassTokens = previous.filter(b => b.token !== token);
  loadBypass();

  const ok = await saveData();
  if (!ok) {
    D.bypassTokens = previous;
    loadBypass();
    showAlert('bp-al', 'error', 'Delete failed - bypass code is still stored in Supabase');
    return;
  }

  showAlert('bp-al', 'success', `Deleted code ${token}`);
}

export function initBypass() {
  $('btn-create-bypass')?.addEventListener('click', createBypass);
  window._delBypass = delBypass;
}
