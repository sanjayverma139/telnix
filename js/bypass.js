// bypass.js — Admin panel bypass code management
//
// Token lifecycle:
//   active   → admin can Discard (marks expiresAt = now, sets discardedAt)
//   expired  → time ran out naturally, shown for record-keeping
//   discarded → admin revoked early, shown for record-keeping
//   After 45 days past expiry/discard, tokens are auto-removed from payload on save.

import { D }                  from './state.js';
import { $, esc, fmtF, showAlert } from './utils.js';
import { saveData, sbf }      from './api.js';
import { ORG }                from './config.js';

const FORTY_FIVE_DAYS_MS = 45 * 24 * 60 * 60 * 1000;

const ACTIVITY_LABELS = {
  all:      'All activities',
  browse:   'Browse',
  download: 'Download',
  upload:   'Upload',
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

// Returns the effective "dead at" timestamp for a token
function deadAt(token) {
  return token.discardedAt || (token.expiresAt && token.expiresAt <= Date.now() ? token.expiresAt : null);
}

// Filter out tokens that have been dead for more than 45 days
function withinRetention(token) {
  const dead = deadAt(token);
  if (!dead) return true; // still active
  return (Date.now() - dead) < FORTY_FIVE_DAYS_MS;
}

function getTokenStatus(token) {
  if (token.discardedAt) return 'discarded';
  if (token.expiresAt && token.expiresAt <= Date.now()) return 'expired';
  return 'active';
}

// ── Status badge HTML ─────────────────────────────────────────────────────────
function statusBadge(token) {
  const st = getTokenStatus(token);
  const cfg = {
    active:    { color: '#22c55e', bg: '#22c55e18', label: '● Active' },
    expired:   { color: '#f59e0b', bg: '#f59e0b18', label: '✕ Expired' },
    discarded: { color: '#ef4444', bg: '#ef444418', label: '⊘ Discarded' },
  }[st] || { color: '#64748b', bg: '#64748b18', label: st };
  return `<span style="
    font-size:10px;font-weight:700;color:${cfg.color};
    background:${cfg.bg};border:1px solid ${cfg.color}44;
    border-radius:4px;padding:2px 7px;white-space:nowrap;letter-spacing:.3px
  ">${cfg.label}</span>`;
}

// ── Populate user dropdown from activity_logs ─────────────────────────────────
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
    // Remove any previous dynamically added options (keep the "any user" default)
    while (sel.options.length > 1) sel.remove(1);
    for (const email of emails) {
      const opt = document.createElement('option');
      opt.value = email;
      opt.textContent = email;
      sel.appendChild(opt);
    }
  } catch (_) {}
}

// ── Render the tokens table ───────────────────────────────────────────────────
export function loadBypass() {
  const now    = Date.now();
  const tokens = [...(D.bypassTokens || [])]
    .filter(withinRetention)                                       // drop >45-day-old dead tokens
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (!tokens.length) {
    $('bp-tb').innerHTML = '<tr><td colspan="8" class="loading">No bypass codes</td></tr>';
    return;
  }

  $('bp-tb').innerHTML = tokens.map(b => {
    const status = getTokenStatus(b);
    const isActive = status === 'active';

    const scopeUserCell = b.scopeEmail
      ? `<span style="color:#a5b4fc;font-size:11px">${esc(b.scopeEmail)}</span>`
      : `<span style="color:#334155;font-size:11px">Any</span>`;

    // Show discard timestamp or expiry depending on status
    let timeCell = '';
    if (b.discardedAt) {
      timeCell = `<span style="color:#ef4444;font-size:11px">Discarded ${fmtF(b.discardedAt)}</span>`;
    } else if (b.expiresAt) {
      const expired = b.expiresAt <= now;
      timeCell = `<span style="color:${expired ? '#f59e0b' : '#64748b'};font-size:11px">
        ${expired ? 'Expired' : 'Expires'} ${fmtF(b.expiresAt)}
      </span>`;
    } else {
      timeCell = '<span style="color:#64748b;font-size:11px">-</span>';
    }

    // Only active tokens can be discarded; expired/discarded show nothing
    const actionCell = isActive
      ? `<button class="btn btn-sm btn-danger"
           title="Revoke this code immediately — it will be blocked on the next extension sync"
           onclick="window._discardBypass('${esc(b.token)}')">Discard</button>`
      : `<span style="color:#334155;font-size:11px">—</span>`;

    return `
    <tr style="${!isActive ? 'opacity:.55' : ''}">
      <td style="font-family:monospace;font-weight:700;color:${isActive ? '#a5b4fc' : '#64748b'}">${esc(b.token)}</td>
      <td>${statusBadge(b)}</td>
      <td>${scopeUserCell}</td>
      <td style="color:#94a3b8">${esc(b.domain || 'All sites')}</td>
      <td style="color:#94a3b8">${esc(ACTIVITY_LABELS[normalizeActivity(b.activity)] || ACTIVITY_LABELS.all)}</td>
      <td style="color:#94a3b8">${renderDuration(b.durationMs)}</td>
      <td style="color:#64748b">${esc(b.label || '-')}</td>
      <td>${timeCell}</td>
      <td>${actionCell}</td>
    </tr>`;
  }).join('');
}

// ── Create a new bypass code ──────────────────────────────────────────────────
export async function createBypass() {
  const btn            = $('btn-create-bypass');
  const token          = ($('bp-code')?.value || '').trim().toUpperCase() || makeToken();
  const durationMinutes = Math.max(1, parseInt($('bp-dur')?.value || '30', 10) || 30);
  const scopeEmail     = ($('bp-user')?.value || '').trim().toLowerCase() || null;
  const now            = Date.now();

  const next = {
    token,
    domain:     $('bp-dom')?.value.trim().toLowerCase() || null,
    activity:   normalizeActivity($('bp-activity')?.value || 'all'),
    mode:       ($('bp-dom')?.value || '').trim() ? 'domain_timed' : 'timed',
    durationMs: durationMinutes * 60000,
    label:      $('bp-lbl')?.value.trim() || '',
    createdAt:  now,
    expiresAt:  now + durationMinutes * 60000,
    scopeEmail: scopeEmail || null,
    discardedAt: null,
  };

  const previous = [...(D.bypassTokens || [])];
  // Remove >45-day dead tokens before saving (cleanup on every write)
  D.bypassTokens = [...previous.filter(withinRetention), next];
  loadBypass();

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const ok = await saveData();
  if (!ok) {
    D.bypassTokens = previous;
    loadBypass();
    showAlert('bp-al', 'error', 'Save failed — bypass code was not stored in Supabase');
    if (btn) { btn.disabled = false; btn.textContent = '+ Create Code'; }
    return;
  }

  const userMsg = scopeEmail ? ` (restricted to ${scopeEmail})` : ' (any user)';
  showAlert('bp-al', 'success', `Saved and synced code ${token}${userMsg}`);
  if ($('bp-code'))     $('bp-code').value     = '';
  if ($('bp-dom'))      $('bp-dom').value       = '';
  if ($('bp-lbl'))      $('bp-lbl').value       = '';
  if ($('bp-activity')) $('bp-activity').value  = 'all';
  if ($('bp-user'))     $('bp-user').value       = '';
  loadBypass();
  if (btn) { btn.disabled = false; btn.textContent = '+ Create Code'; }
}

// ── Discard a token (mark as expired NOW — kept in DB for 45 days) ────────────
async function discardBypass(token) {
  const now      = Date.now();
  const previous = [...(D.bypassTokens || [])];
  const idx      = previous.findIndex(b => b.token === token);

  if (idx === -1) {
    showAlert('bp-al', 'error', 'Token not found');
    return;
  }
  if (getTokenStatus(previous[idx]) !== 'active') {
    showAlert('bp-al', 'error', 'Only active tokens can be discarded');
    return;
  }

  // Mark as discarded: set expiresAt to now-1 AND record discardedAt
  const discarded = {
    ...previous[idx],
    expiresAt:   now - 1,     // expired immediately
    discardedAt: now,         // record when it was revoked
  };

  D.bypassTokens = previous.map((b, i) => (i === idx ? discarded : b));
  loadBypass();

  const ok = await saveData();
  if (!ok) {
    D.bypassTokens = previous;
    loadBypass();
    showAlert('bp-al', 'error', 'Discard failed — Supabase could not be updated');
    return;
  }

  showAlert('bp-al', 'success',
    `Code ${token} discarded — extension will block the site on its next sync (within 1 minute)`);
}

export function initBypass() {
  $('btn-create-bypass')?.addEventListener('click', createBypass);
  window._discardBypass = discardBypass;
}
