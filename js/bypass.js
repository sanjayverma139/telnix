import { D } from './state.js';
import { $, esc, fmtF, showAlert } from './utils.js';
import { saveData, sbf } from './api.js';
import { ORG } from './config.js';

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

// Fetch known user emails from activity_logs and populate the bp-user dropdown
export async function loadBypassUserOptions() {
  try {
    const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&select=user_email&limit=5000`);
    if (!r.ok) return;
    const rows = await r.json();
    const emails = [...new Set(
      rows.map(r => (r.user_email || '').trim().toLowerCase()).filter(Boolean)
    )].sort();
    const sel = $('bp-user');
    if (!sel) return;
    for (const email of emails) {
      const opt = document.createElement('option');
      opt.value = email;
      opt.textContent = email;
      sel.appendChild(opt);
    }
  } catch (_) {}
}

export function loadBypass() {
  const tokens = [...(D.bypassTokens || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $('bp-tb').innerHTML = tokens.map(b => {
    const scopeUser = b.scopeEmail
      ? `<span style="color:#a5b4fc;font-size:11px">${esc(b.scopeEmail)}</span>`
      : `<span style="color:#334155;font-size:11px">Any</span>`;
    return `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:#a5b4fc">${esc(b.token)}</td>
      <td>${scopeUser}</td>
      <td>${esc(b.domain || 'All sites')}</td>
      <td>${esc(ACTIVITY_LABELS[normalizeActivity(b.activity)] || ACTIVITY_LABELS.all)}</td>
      <td>${renderDuration(b.durationMs)}</td>
      <td style="color:#64748b">${esc(b.label || '-')}</td>
      <td style="font-size:11px;color:#64748b">${b.expiresAt ? fmtF(b.expiresAt) : '-'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="window._delBypass('${esc(b.token)}')">x</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="loading">No bypass codes</td></tr>';
}

export async function createBypass() {
  const btn = $('btn-create-bypass');
  const token = ($('bp-code')?.value || '').trim().toUpperCase() || makeToken();
  const durationMinutes = Math.max(1, parseInt($('bp-dur')?.value || '30', 10) || 30);
  const scopeEmail = ($('bp-user')?.value || '').trim().toLowerCase() || null;
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
    // null means any user can redeem; a non-null email restricts to that user only
    scopeEmail: scopeEmail || null,
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

  const userMsg = scopeEmail ? ` (restricted to ${scopeEmail})` : ' (any user)';
  showAlert('bp-al', 'success', `Saved and synced code ${token}${userMsg}`);
  if ($('bp-code')) $('bp-code').value = '';
  if ($('bp-dom')) $('bp-dom').value = '';
  if ($('bp-lbl')) $('bp-lbl').value = '';
  if ($('bp-activity')) $('bp-activity').value = 'all';
  if ($('bp-user')) $('bp-user').value = '';
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

