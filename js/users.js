// ─────────────────────────────────────────────────────────────────────────────
// users.js — Users page (reads from Supabase Auth + activity log counts)
// NOTE: Creating/deleting users requires the Supabase dashboard or an
// Edge Function. The service role key must never live in a public page.
// ─────────────────────────────────────────────────────────────────────────────

import { $, esc, fmtF, showAlert } from './utils.js';
import { fetchAuthUsers, fetchUserLogMap } from './api.js';

const LOGS_FILTER_KEY = 'telnix_logs_filter_v1';

export async function loadUsers() {
  $('users-tb').innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';

  const [authUsers, logMap] = await Promise.all([
    fetchAuthUsers(),
    fetchUserLogMap(),
  ]);

  if (authUsers && authUsers.length) {
    $('users-tb').innerHTML = authUsers.map(u => `
      <tr>
        <td style="color:#a5b4fc">${esc(u.email)}</td>
        <td style="color:#64748b;font-size:11px">${u.last_sign_in_at ? fmtF(new Date(u.last_sign_in_at).getTime()) : 'Never'}</td>
        <td style="font-weight:700">${logMap[u.email]?.count || 0}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="window._filterByUser('${esc(u.email)}')">View Logs</button></td>
      </tr>`
    ).join('');
  } else {
    // Fallback: derive user list from activity logs
    const entries = Object.entries(logMap);
    $('users-tb').innerHTML = entries.length ? entries.map(([email, info]) => `
      <tr>
        <td style="color:#a5b4fc">${esc(email)}</td>
        <td style="color:#64748b;font-size:11px">${info.last ? fmtF(info.last) : '—'}</td>
        <td style="font-weight:700">${info.count}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="window._filterByUser('${esc(email)}')">View Logs</button></td>
      </tr>`
    ).join('') : '<tr><td colspan="4" class="loading">No users yet</td></tr>';
  }
}

export function initUsers() {
  // User creation must go through Supabase dashboard or an Edge Function
  $('btn-create-user')?.addEventListener('click', () => {
    showAlert('u-al', 'error',
      'User creation requires the Supabase dashboard (Auth → Users → Invite) or a backend Edge Function. ' +
      'The service role key cannot be placed in a public page for security reasons.');
  });

  // Expose filter helper to inline onclick handlers
  window._filterByUser = (email) => {
    sessionStorage.setItem(LOGS_FILTER_KEY, JSON.stringify({
      type: 'userEmail',
      val: email,
      label: `User = ${email}`,
    }));

    if (document.getElementById('page-logs')) {
      import('./logs.js').then(m => m.filterByUser(email));
    } else {
      location.href = './logs.html';
    }
  };
}
